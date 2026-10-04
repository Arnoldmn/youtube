const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { readConfig } = require("../server/config.js");
const { createApp } = require("../server/app.js");

function startServer(env = {}) {
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), "asw-test-"));
  const config = readConfig({ WHATSAPP_NUMBER: "254700000000", ADMIN_PASSWORD: "admin-secret", DATA_DIR: dataDir, ...env });
  const server = createApp(config);
  return new Promise((resolve) =>
    server.listen(0, () => {
      const base = `http://127.0.0.1:${server.address().port}`;
      resolve({ server, base, dataDir, close: () => new Promise((r) => server.close(r)) });
    })
  );
}

/** Minimal cookie-keeping client. */
function client(base) {
  const jar = {};
  return async (pathname, { method = "GET", body, headers = {} } = {}) => {
    const res = await fetch(base + pathname, {
      method,
      headers: { ...(body !== undefined ? { "Content-Type": "application/json" } : {}), Cookie: Object.entries(jar).map(([k, v]) => `${k}=${v}`).join("; "), ...headers },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    for (const c of res.headers.getSetCookie()) {
      const [pair] = c.split(";");
      const [k, v] = pair.split("=");
      if (v) jar[k] = v;
      else delete jar[k];
    }
    const text = await res.text();
    let json;
    try {
      json = JSON.parse(text);
    } catch {
      json = text;
    }
    return { status: res.status, body: json, headers: res.headers };
  };
}

const CART = [
  { id: "sh-velvet-stiletto", colorway: 0, size: 7, qty: 1 },
  { id: "hb-mini-crossbody", colorway: 2, size: null, qty: 1 },
];
const SIGNUP = { name: "Jane Wanjiru", email: "Jane@Example.com", phone: "+254 712 345 678", password: "supersecret" };
const ORDER = { items: CART, promoCode: "ANNIE10", payment: "Cash on delivery", delivery: { address: "12 Riverside Dr", city: "Nairobi", notes: "Gate B" } };

test("full shopper journey: signup → order → WhatsApp link → tracking → admin update", async (t) => {
  const srv = await startServer();
  t.after(srv.close);
  const api = client(srv.base);

  // Static site + config
  const home = await fetch(srv.base + "/");
  assert.equal(home.status, 200);
  assert.match(home.headers.get("content-security-policy"), /default-src 'self'/);
  const cfg = await api("/api/config");
  assert.equal(cfg.body.whatsappNumber, "254700000000");

  // Checkout requires authentication
  assert.equal((await api("/api/orders", { method: "POST", body: ORDER })).status, 401);

  // Sign up
  const bad = await api("/api/auth/signup", { method: "POST", body: { ...SIGNUP, password: "short", phone: "12" } });
  assert.equal(bad.status, 400);
  assert.ok(bad.body.fields.password && bad.body.fields.phone);
  const su = await api("/api/auth/signup", { method: "POST", body: SIGNUP });
  assert.equal(su.status, 201);
  assert.equal(su.body.user.email, "jane@example.com");
  assert.equal(su.body.user.phone, "254712345678");
  assert.equal(su.body.user.passwordHash, undefined);
  assert.equal((await api("/api/auth/signup", { method: "POST", body: SIGNUP })).status, 400, "duplicate email");

  // Password is hashed at rest
  const saved = JSON.parse(fs.readFileSync(path.join(srv.dataDir, "db.json"), "utf8"));
  assert.ok(saved.users[0].passwordHash.startsWith("scrypt$"));
  assert.ok(!JSON.stringify(saved).includes("supersecret"));

  // Place order: server re-prices from the catalog (ignores client price fields)
  const placed = await api("/api/orders", { method: "POST", body: { ...ORDER, items: CART.map((l) => ({ ...l, unitPrice: 1 })) } });
  assert.equal(placed.status, 201);
  const order = placed.body.order;
  assert.match(order.id, /^ASW-[A-Z0-9]{6}$/);
  assert.equal(order.totals.subtotal, 120 + 89);
  assert.equal(order.totals.discount, 20.9);
  assert.equal(order.totals.total, 188.1);
  assert.equal(order.status, "pending");
  const waUrl = new URL(placed.body.whatsappUrl);
  assert.equal(waUrl.origin + waUrl.pathname, "https://wa.me/254700000000");
  const text = waUrl.searchParams.get("text");
  assert.ok(text.includes(order.id) && text.includes("Classic Stiletto Pump") && text.includes(`/#/track/${order.id}`));

  // Invalid orders rejected
  assert.equal((await api("/api/orders", { method: "POST", body: { ...ORDER, items: [{ id: "sh-velvet-stiletto", colorway: 0, size: 11, qty: 1 }] } })).status, 400);
  assert.equal((await api("/api/orders", { method: "POST", body: { ...ORDER, payment: "Bitcoin" } })).status, 400);

  // My orders
  const mine = await api("/api/orders");
  assert.equal(mine.body.orders.length, 1);

  // Public tracking needs the last 4 digits of the WhatsApp number
  const anon = client(srv.base);
  assert.equal((await anon(`/api/track/${order.id}`)).status, 404);
  assert.equal((await anon(`/api/track/${order.id}?phone=0000`)).status, 404);
  const tracked = await anon(`/api/track/${order.id.toLowerCase()}?phone=5678`);
  assert.equal(tracked.status, 200);
  assert.equal(tracked.body.order.status, "pending");
  assert.equal(tracked.body.order.customerFirstName, "Jane");
  assert.equal(tracked.body.order.delivery, undefined, "no address in public tracking");
  assert.match(tracked.body.whatsappUrl, /^https:\/\/wa\.me\/254700000000\?text=/);
  // The owner can track without the digits
  assert.equal((await api(`/api/track/${order.id}`)).status, 200);

  // Admin
  const admin = client(srv.base);
  assert.equal((await admin("/api/admin/orders")).status, 401);
  assert.equal((await admin("/api/admin/login", { method: "POST", body: { password: "nope" } })).status, 401);
  assert.equal((await admin("/api/admin/login", { method: "POST", body: { password: "admin-secret" } })).status, 200);
  assert.equal((await admin("/api/admin/orders")).body.orders.length, 1);
  assert.equal((await api("/api/admin/orders")).status, 401, "shopper session is not admin");
  const upd = await admin(`/api/admin/orders/${order.id}`, { method: "PATCH", body: { status: "shipped", note: "Rider arrives 2-4pm" } });
  assert.equal(upd.status, 200);
  assert.equal(upd.body.order.status, "shipped");
  assert.ok(upd.body.whatsappUrl.startsWith("https://wa.me/254712345678?text="));
  assert.match(decodeURIComponent(upd.body.whatsappUrl), /Out for delivery[\s\S]*Rider arrives 2-4pm/);
  assert.equal((await admin(`/api/admin/orders/${order.id}`, { method: "PATCH", body: { status: "lost" } })).status, 400);

  const after = await anon(`/api/track/${order.id}?phone=5678`);
  assert.equal(after.body.order.status, "shipped");
  assert.equal(after.body.order.history.length, 2);

  // Logout ends the session
  await api("/api/auth/logout", { method: "POST", body: {} });
  assert.equal((await api("/api/auth/me")).body.user, null);

  // Login
  assert.equal((await api("/api/auth/login", { method: "POST", body: { email: SIGNUP.email, password: "wrong-pass" } })).status, 401);
  const li = await api("/api/auth/login", { method: "POST", body: { email: SIGNUP.email, password: SIGNUP.password } });
  assert.equal(li.status, 200);
  assert.equal((await api("/api/auth/me")).body.user.name, "Jane Wanjiru");
});

test("security basics", async (t) => {
  const srv = await startServer({ ADMIN_PASSWORD: "" });
  t.after(srv.close);
  const api = client(srv.base);
  // Non-JSON posts (e.g. cross-site forms) are rejected
  const form = await fetch(srv.base + "/api/auth/login", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: "email=a&password=b" });
  assert.equal(form.status, 415);
  // Path traversal
  assert.notEqual((await fetch(srv.base + "/..%2f..%2fserver%2fapp.js")).status, 200);
  assert.notEqual((await fetch(srv.base + "/../package.json")).status, 200);
  // Admin disabled without a password
  assert.equal((await api("/api/admin/login", { method: "POST", body: { password: "" } })).status, 503);
  // Login rate limiting
  let last;
  for (let i = 0; i < 11; i++) last = await api("/api/auth/login", { method: "POST", body: { email: "x@y.z", password: "whatever1" } });
  assert.equal(last.status, 429);
});

test("checkout is blocked until the shop WhatsApp number is configured", async (t) => {
  const srv = await startServer({ WHATSAPP_NUMBER: "" });
  t.after(srv.close);
  const api = client(srv.base);
  await api("/api/auth/signup", { method: "POST", body: SIGNUP });
  const res = await api("/api/orders", { method: "POST", body: ORDER });
  assert.equal(res.status, 503);
  assert.match(res.body.error, /WHATSAPP_NUMBER/);
});

test("WhatsApp webhook verification and automatic tracking reply", async (t) => {
  const sent = [];
  const realFetch = globalThis.fetch;
  const srv = await startServer({ WHATSAPP_TOKEN: "tok", WHATSAPP_PHONE_NUMBER_ID: "999", WHATSAPP_VERIFY_TOKEN: "verify-me" });
  t.after(async () => {
    globalThis.fetch = realFetch;
    await srv.close();
  });
  const api = client(srv.base);
  await api("/api/auth/signup", { method: "POST", body: SIGNUP });
  const { order } = (await api("/api/orders", { method: "POST", body: ORDER })).body;

  assert.equal((await realFetch(`${srv.base}/webhook/whatsapp?hub.mode=subscribe&hub.verify_token=wrong&hub.challenge=1`)).status, 403);
  const ok = await realFetch(`${srv.base}/webhook/whatsapp?hub.mode=subscribe&hub.verify_token=verify-me&hub.challenge=42`);
  assert.equal(await ok.text(), "42");

  // Capture outgoing Graph API calls
  globalThis.fetch = async (url, opts) => {
    if (String(url).startsWith("https://graph.facebook.com/")) {
      sent.push(JSON.parse(opts.body));
      return { ok: true, text: async () => "" };
    }
    return realFetch(url, opts);
  };
  const payload = { entry: [{ changes: [{ value: { messages: [{ from: "254712345678", type: "text", text: { body: `status ${order.id}` } }] } }] }] };
  const hook = await realFetch(`${srv.base}/webhook/whatsapp`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
  assert.equal(hook.status, 200);
  await new Promise((r) => setTimeout(r, 50));
  assert.equal(sent.length, 1);
  assert.equal(sent[0].to, "254712345678");
  assert.match(sent[0].text.body, new RegExp(`${order.id}\\* — Order placed`));
});
