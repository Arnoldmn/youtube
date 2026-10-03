// HTTP server: static storefront + JSON API. Zero dependencies (Node 18+).
const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");

const { PRODUCTS, PROMO_CODES } = require("../public/js/products.js");
const store = require("../public/js/store.js");
const { JsonDB } = require("./db.js");
const auth = require("./auth.js");
const wa = require("./whatsapp.js");

const PAYMENT_METHODS = ["Mobile money (M-Pesa)", "Card on delivery", "Cash on delivery"];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ID_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const MAX_BODY = 100 * 1024;

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".avif": "image/avif",
  ".gif": "image/gif",
  ".ico": "image/x-icon",
  ".txt": "text/plain; charset=utf-8",
};

const SECURITY_HEADERS = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Content-Security-Policy": [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdnjs.cloudflare.com",
    "font-src 'self' https://fonts.gstatic.com https://cdnjs.cloudflare.com",
    "img-src 'self' data: https:",
    "connect-src 'self'",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join("; "),
};

class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

function createApp(config) {
  const db = new JsonDB(config.dataDir);
  const limiter = new Map();

  // ---------- helpers ----------
  const send = (res, status, body, headers = {}) => {
    res.writeHead(status, { ...SECURITY_HEADERS, "Cache-Control": "no-store", "Content-Type": "application/json", ...headers });
    res.end(typeof body === "string" ? body : JSON.stringify(body));
  };

  const readBody = (req) =>
    new Promise((resolve, reject) => {
      let size = 0;
      const chunks = [];
      req.on("data", (c) => {
        size += c.length;
        if (size > MAX_BODY) {
          reject(new HttpError(413, "Request too large"));
          req.destroy();
        } else chunks.push(c);
      });
      req.on("end", () => resolve(Buffer.concat(chunks)));
      req.on("error", reject);
    });

  const readJson = async (req) => {
    // Requiring JSON blocks cross-site form posts (CSRF) in addition to SameSite cookies.
    if (!String(req.headers["content-type"] || "").includes("application/json")) {
      throw new HttpError(415, "Expected application/json");
    }
    const raw = await readBody(req);
    try {
      const data = JSON.parse(raw.toString("utf8") || "{}");
      if (!data || typeof data !== "object" || Array.isArray(data)) throw new Error();
      return data;
    } catch {
      throw new HttpError(400, "Invalid JSON");
    }
  };

  const cookies = (req) =>
    Object.fromEntries(
      String(req.headers.cookie || "")
        .split(";")
        .map((c) => c.trim().split("="))
        .filter(([k, v]) => k && v)
        .map(([k, ...v]) => [k, decodeURIComponent(v.join("="))])
    );

  const isSecure = (req) => config.cookieSecure || req.headers["x-forwarded-proto"] === "https";

  const cookie = (req, name, value, maxAgeMs) =>
    `${name}=${encodeURIComponent(value)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${Math.floor(maxAgeMs / 1000)}${isSecure(req) ? "; Secure" : ""}`;

  const ip = (req) => String(req.headers["x-forwarded-for"] || "").split(",")[0].trim() || req.socket.remoteAddress || "?";

  function rateLimit(req, bucket, max = 10, windowMs = 15 * 60 * 1000) {
    const key = `${bucket}:${ip(req)}`;
    const now = Date.now();
    const hits = (limiter.get(key) || []).filter((t) => now - t < windowMs);
    if (hits.length >= max) throw new HttpError(429, "Too many attempts. Please wait a few minutes and try again.");
    hits.push(now);
    limiter.set(key, hits);
  }

  const baseUrl = (req) => config.publicUrl || `${isSecure(req) ? "https" : "http"}://${req.headers.host}`;
  const trackUrl = (req, id) => `${baseUrl(req)}/#/track/${id}`;

  const publicUser = (u) => ({ id: u.id, name: u.name, email: u.email, phone: u.phone });

  function currentUser(req) {
    const s = auth.findSession(db, cookies(req).asw_session);
    if (!s || s.admin) return null;
    return db.users.find((u) => u.id === s.userId) || null;
  }

  function requireUser(req) {
    const u = currentUser(req);
    if (!u) throw new HttpError(401, "Please sign in to continue");
    return u;
  }

  function requireAdmin(req) {
    if (!config.adminPassword) throw new HttpError(503, "Admin is disabled. Set ADMIN_PASSWORD to enable it.");
    const s = auth.findSession(db, cookies(req).asw_admin);
    if (!s || !s.admin) throw new HttpError(401, "Admin sign-in required");
  }

  function newOrderId() {
    for (;;) {
      const bytes = crypto.randomBytes(6);
      const id = "ASW-" + [...bytes].map((b) => ID_ALPHABET[b % ID_ALPHABET.length]).join("");
      if (!db.orders.some((o) => o.id === id)) return id;
    }
  }

  const str = (v, max) => String(v ?? "").trim().slice(0, max);

  const publicTracking = (o) => ({
    id: o.id,
    status: o.status,
    createdAt: o.createdAt,
    history: o.history,
    customerFirstName: o.customer.name.split(" ")[0],
    items: o.items.map(({ name, qty, colorName, size, category }) => ({ name, qty, colorName, size, category })),
    total: o.totals.total,
  });

  // ---------- route handlers ----------
  const routes = {
    "GET /api/config": () => ({
      storeName: config.storeName,
      whatsappNumber: config.whatsappNumber,
      currency: config.currency,
      locale: config.locale,
      paymentMethods: PAYMENT_METHODS,
      autoTracking: wa.cloudEnabled(config),
    }),

    "POST /api/auth/signup": async (req, res) => {
      rateLimit(req, "signup");
      const b = await readJson(req);
      const name = str(b.name, 80);
      const email = str(b.email, 120).toLowerCase();
      const phone = wa.normalizePhone(b.phone, config.defaultCountryCode);
      const password = String(b.password || "");
      const errors = {};
      if (name.length < 2) errors.name = "Enter your name";
      if (!EMAIL_RE.test(email)) errors.email = "Enter a valid email";
      if (!phone) errors.phone = "Enter your WhatsApp number with country code";
      if (password.length < 8) errors.password = "Use at least 8 characters";
      if (password.length > 200) errors.password = "Password is too long";
      if (!errors.email && db.users.some((u) => u.email === email)) errors.email = "An account with this email already exists";
      if (Object.keys(errors).length) return send(res, 400, { error: "Please fix the highlighted fields", fields: errors });
      const user = { id: crypto.randomUUID(), name, email, phone, passwordHash: auth.hashPassword(password), createdAt: Date.now() };
      db.users.push(user);
      const token = auth.createSession(db, { userId: user.id });
      await db.save();
      return send(res, 201, { user: publicUser(user) }, { "Set-Cookie": cookie(req, "asw_session", token, auth.SESSION_TTL_MS) });
    },

    "POST /api/auth/login": async (req, res) => {
      rateLimit(req, "login");
      const b = await readJson(req);
      const email = str(b.email, 120).toLowerCase();
      const user = db.users.find((u) => u.email === email);
      const ok = user ? auth.verifyPassword(String(b.password || ""), user.passwordHash) : auth.verifyPassword("x", auth.hashPassword("y"));
      if (!user || !ok) throw new HttpError(401, "Wrong email or password");
      const token = auth.createSession(db, { userId: user.id });
      await db.save();
      return send(res, 200, { user: publicUser(user) }, { "Set-Cookie": cookie(req, "asw_session", token, auth.SESSION_TTL_MS) });
    },

    "POST /api/auth/logout": async (req, res) => {
      auth.destroySession(db, cookies(req).asw_session);
      await db.save();
      return send(res, 200, { ok: true }, { "Set-Cookie": cookie(req, "asw_session", "", 0) });
    },

    "GET /api/auth/me": (req) => {
      const u = currentUser(req);
      return { user: u ? publicUser(u) : null };
    },

    "POST /api/orders": async (req, res) => {
      const user = requireUser(req);
      rateLimit(req, "order", 20, 60 * 60 * 1000);
      if (!config.whatsappNumber) throw new HttpError(503, "The shop's WhatsApp number isn't set up yet (WHATSAPP_NUMBER).");
      const b = await readJson(req);
      const { lines, errors } = store.resolveLines(b.items, PRODUCTS);
      if (errors.length) throw new HttpError(400, errors[0]);
      const fields = {};
      const phone = wa.normalizePhone(b.phone || user.phone, config.defaultCountryCode);
      const address = str(b.delivery?.address, 200);
      const city = str(b.delivery?.city, 80);
      const notes = str(b.delivery?.notes, 300);
      const payment = PAYMENT_METHODS.includes(b.payment) ? b.payment : null;
      if (!phone) fields.phone = "Enter your WhatsApp number with country code";
      if (address.length < 4) fields.address = "Enter your delivery address";
      if (city.length < 2) fields.city = "Enter your town or city";
      if (!payment) fields.payment = "Choose a payment method";
      if (Object.keys(fields).length) return send(res, 400, { error: "Please fix the highlighted fields", fields });

      const totals = store.cartTotals(lines, PRODUCTS, b.promoCode, PROMO_CODES);
      const now = Date.now();
      const order = {
        id: newOrderId(),
        userId: user.id,
        createdAt: now,
        status: "pending",
        history: [{ status: "pending", at: now, note: "" }],
        customer: { name: user.name, email: user.email, phone },
        items: lines,
        totals: { subtotal: totals.subtotal, discount: totals.discount, promoCode: totals.promoCode, delivery: totals.delivery, total: totals.total },
        payment,
        delivery: { address, city, notes },
      };
      db.orders.push(order);
      await db.save();
      const message = wa.buildOrderMessage(order, config, trackUrl(req, order.id));
      return send(res, 201, { order, whatsappUrl: wa.waLink(config.whatsappNumber, message) });
    },

    "GET /api/orders": (req) => {
      const user = requireUser(req);
      return { orders: db.orders.filter((o) => o.userId === user.id).sort((a, b) => b.createdAt - a.createdAt) };
    },

    "GET /api/orders/:id": (req, res, { id }) => {
      const user = requireUser(req);
      const order = db.orders.find((o) => o.id === id.toUpperCase() && o.userId === user.id);
      if (!order) throw new HttpError(404, "Order not found");
      const message = wa.buildOrderMessage(order, config, trackUrl(req, order.id));
      return { order, whatsappUrl: config.whatsappNumber ? wa.waLink(config.whatsappNumber, message) : null };
    },

    "GET /api/track/:id": (req, res, { id }, url) => {
      rateLimit(req, "track", 30);
      const order = db.orders.find((o) => o.id === id.toUpperCase());
      const user = currentUser(req);
      const last4 = String(url.searchParams.get("phone") || "").replace(/\D/g, "").slice(-4);
      const allowed = order && ((user && order.userId === user.id) || (last4.length === 4 && order.customer.phone.endsWith(last4)));
      if (!allowed) throw new HttpError(404, "We couldn't find that order. Check the order number and the last 4 digits of your WhatsApp number.");
      return {
        order: publicTracking(order),
        whatsappUrl: config.whatsappNumber ? wa.waLink(config.whatsappNumber, wa.buildTrackRequest(order.id)) : null,
      };
    },

    // ---------- admin ----------
    "POST /api/admin/login": async (req, res) => {
      if (!config.adminPassword) throw new HttpError(503, "Admin is disabled. Set ADMIN_PASSWORD to enable it.");
      rateLimit(req, "admin-login", 5);
      const b = await readJson(req);
      if (!auth.safeEqual(String(b.password || ""), config.adminPassword)) throw new HttpError(401, "Wrong password");
      const token = auth.createSession(db, { admin: true });
      await db.save();
      return send(res, 200, { ok: true }, { "Set-Cookie": cookie(req, "asw_admin", token, auth.ADMIN_TTL_MS) });
    },

    "POST /api/admin/logout": async (req, res) => {
      auth.destroySession(db, cookies(req).asw_admin);
      await db.save();
      return send(res, 200, { ok: true }, { "Set-Cookie": cookie(req, "asw_admin", "", 0) });
    },

    "GET /api/admin/orders": (req) => {
      requireAdmin(req);
      return {
        orders: [...db.orders].sort((a, b) => b.createdAt - a.createdAt),
        statuses: [...store.ORDER_STATUSES, store.statusInfo("cancelled")],
        autoTracking: wa.cloudEnabled(config),
        currency: config.currency,
        locale: config.locale,
      };
    },

    "PATCH /api/admin/orders/:id": async (req, res, { id }) => {
      requireAdmin(req);
      const b = await readJson(req);
      const order = db.orders.find((o) => o.id === id.toUpperCase());
      if (!order) throw new HttpError(404, "Order not found");
      if (!store.statusInfo(b.status)) throw new HttpError(400, "Unknown status");
      order.status = b.status;
      order.history.push({ status: b.status, at: Date.now(), note: str(b.note, 300) });
      await db.save();
      const message = wa.buildStatusMessage(order, config, trackUrl(req, order.id));
      const notify = b.notify === false ? { ok: false, skipped: true } : await wa.sendCloudText(config, order.customer.phone, message);
      return { order, whatsappUrl: wa.waLink(order.customer.phone, message), notified: notify };
    },

    // ---------- WhatsApp Cloud API webhook (optional) ----------
    "GET /webhook/whatsapp": (req, res, params, url) => {
      const ok =
        config.cloud.verifyToken &&
        url.searchParams.get("hub.mode") === "subscribe" &&
        auth.safeEqual(url.searchParams.get("hub.verify_token") || "", config.cloud.verifyToken);
      if (!ok) return send(res, 403, "Forbidden", { "Content-Type": "text/plain" });
      return send(res, 200, String(url.searchParams.get("hub.challenge") || ""), { "Content-Type": "text/plain" });
    },

    "POST /webhook/whatsapp": async (req, res) => {
      const raw = await readBody(req);
      if (!wa.cloudEnabled(config)) return send(res, 200, { ok: true, ignored: true });
      if (!wa.verifySignature(raw, req.headers["x-hub-signature-256"], config.cloud.appSecret)) return send(res, 401, { error: "Bad signature" });
      let payload;
      try {
        payload = JSON.parse(raw.toString("utf8"));
      } catch {
        return send(res, 400, { error: "Invalid JSON" });
      }
      send(res, 200, { ok: true }); // acknowledge fast; reply asynchronously
      for (const msg of wa.parseIncoming(payload)) {
        const reply = wa.buildTrackingReply(msg.text, msg.from, db.orders, config, (oid) => trackUrl(req, oid));
        wa.sendCloudText(config, msg.from, reply).then((r) => r.ok || console.warn("[whatsapp] reply failed:", r.error));
      }
    },
  };

  const compiled = Object.entries(routes).map(([key, handler]) => {
    const [method, pattern] = key.split(" ");
    const names = [];
    const re = new RegExp("^" + pattern.replace(/:(\w+)/g, (_, n) => (names.push(n), "([^/]+)")) + "$");
    return { method, re, names, handler };
  });

  // ---------- static files ----------
  function serveStatic(req, res, pathname) {
    if (pathname === "/admin" || pathname === "/admin/") pathname = "/admin.html";
    if (pathname.endsWith("/")) pathname += "index.html";
    let decoded;
    try {
      decoded = decodeURIComponent(pathname);
    } catch {
      return send(res, 400, { error: "Bad path" });
    }
    const file = path.normalize(path.join(config.publicDir, decoded));
    if (!file.startsWith(config.publicDir + path.sep)) return send(res, 403, { error: "Forbidden" });
    fs.stat(file, (err, stat) => {
      if (err || !stat.isFile()) return send(res, 404, "Not found", { "Content-Type": "text/plain" });
      const ext = path.extname(file).toLowerCase();
      res.writeHead(200, {
        ...SECURITY_HEADERS,
        "Content-Type": MIME[ext] || "application/octet-stream",
        "Content-Length": stat.size,
        "Cache-Control": ext === ".html" ? "no-cache" : "public, max-age=300",
      });
      if (req.method === "HEAD") return res.end();
      fs.createReadStream(file).pipe(res);
    });
  }

  // ---------- dispatcher ----------
  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, "http://localhost");
    const { pathname } = url;
    try {
      if (pathname.startsWith("/api/") || pathname.startsWith("/webhook/")) {
        const methodMatches = compiled.filter((r) => r.re.test(pathname));
        const route = methodMatches.find((r) => r.method === req.method);
        if (!route) throw new HttpError(methodMatches.length ? 405 : 404, "Not found");
        const m = pathname.match(route.re);
        const params = Object.fromEntries(route.names.map((n, i) => [n, decodeURIComponent(m[i + 1])]));
        const result = await route.handler(req, res, params, url);
        if (!res.headersSent && result !== undefined) send(res, 200, result);
        return;
      }
      if (req.method !== "GET" && req.method !== "HEAD") throw new HttpError(405, "Method not allowed");
      serveStatic(req, res, pathname);
    } catch (err) {
      if (res.headersSent) return;
      if (err instanceof HttpError) return send(res, err.status, { error: err.message });
      console.error(err);
      send(res, 500, { error: "Something went wrong. Please try again." });
    }
  });

  server.db = db;
  return server;
}

module.exports = { createApp, PAYMENT_METHODS };
