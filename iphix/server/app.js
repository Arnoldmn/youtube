'use strict';
const path = require('path');
const fs = require('fs');
const os = require('os');
const crypto = require('crypto');
const express = require('express');
const auth = require('./auth');
const { createWhatsApp, waLink } = require('./whatsapp');
const { createMpesa, isSafaricomNumber } = require('./mpesa');
const brand = require('./brand');
const { writeReceipt } = require('./receipt');
const { slugify } = require('./seed');
const { SECTIONS, PART_LABELS } = require('./catalog');

const STATUSES = {
  pending: 'Order placed',
  confirmed: 'Confirmed',
  processing: 'Being prepared',
  shipped: 'Dispatched',
  out_for_delivery: 'Out for delivery',
  ready_for_pickup: 'Ready for pickup',
  delivered: 'Delivered / Collected',
  cancelled: 'Cancelled',
};
const FINAL_STATUSES = new Set(['delivered', 'cancelled']);
const DELIVERY_METHODS = { delivery: 'Home / office delivery', pickup: 'Pickup at shop' };
const PAYMENT_METHODS = {
  mpesa: 'M-Pesa',
  cod: 'Cash / M-Pesa on delivery',
  shop: 'Pay at the shop',
};

const PAYMENT_STATUSES = {
  unpaid: 'Not paid',
  verifying: 'Verifying M-Pesa payment',
  partial: 'Partly paid',
  paid: 'Paid',
};

class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}
const bad = (msg) => new HttpError(400, msg);

function str(v, max = 200) {
  return String(v ?? '').trim().slice(0, max);
}

function createApp({ db, config, mpesa: mpesaClient }) {
  const app = express();
  const wa = createWhatsApp(config);
  const mpesa = mpesaClient || createMpesa(config);
  const stkLimiter = auth.rateLimiter({ windowMs: 20e3, max: 1 });
  const loginLimiter = auth.rateLimiter({ windowMs: 15 * 60e3, max: 10 });
  const writeLimiter = auth.rateLimiter({ windowMs: 60e3, max: 30 });
  const money = (n) => `${config.currency} ${Number(n).toLocaleString('en-US')}`;

  // ---------- helpers ----------
  function normalizePhone(input) {
    let d = String(input || '').replace(/\D/g, '');
    if (d.startsWith('00')) d = d.slice(2);
    else if (d.startsWith('0')) d = config.countryCode + d.slice(1);
    else if (d.length <= 9) d = config.countryCode + d;
    return d.length >= 10 && d.length <= 15 ? d : null;
  }

  function publicUser(u) {
    return u && { id: u.id, name: u.name, email: u.email, phone: u.phone, role: u.role, referralCode: u.referral_code, createdAt: u.created_at };
  }

  function orderToken(code) {
    return auth.hmac(config.sessionSecret, `order:${code}`).slice(0, 24);
  }

  function orderLinks(code) {
    const t = orderToken(code);
    return {
      receiptUrl: `${config.baseUrl}/api/orders/${code}/receipt.pdf?t=${t}`,
      trackUrl: `${config.baseUrl}/#/track/${code}?t=${t}`,
    };
  }

  function productView(p) {
    return {
      id: p.id, slug: p.slug, name: p.name, description: p.description,
      category: { slug: p.category_slug, name: p.category_name, section: p.section, icon: p.icon },
      brand: p.brand_slug ? { slug: p.brand_slug, name: p.brand_name } : null,
      model: p.model, part: p.part,
      price: p.price, comparePrice: p.compare_price, wholesalePrice: p.wholesale_price,
      stock: p.stock, isNew: !!p.is_new, isDeal: !!p.is_deal, rating: p.rating, sold: p.sold,
      image: p.image || `/img/p/${p.id}.svg`, active: !!p.active,
    };
  }

  const PRODUCT_SELECT = `SELECT p.*, c.slug AS category_slug, c.name AS category_name, c.section, c.icon,
      b.slug AS brand_slug, b.name AS brand_name
    FROM products p JOIN categories c ON c.id = p.category_id LEFT JOIN brands b ON b.id = p.brand_id`;

  function getProduct(where, ...params) {
    return db.get(`${PRODUCT_SELECT} WHERE ${where}`, ...params);
  }

  function orderView(o) {
    const items = db.all('SELECT product_id, name, unit_price, qty, line_total FROM order_items WHERE order_id = ? ORDER BY id', o.id);
    const events = db.all('SELECT status, note, created_at FROM order_events WHERE order_id = ? ORDER BY id', o.id);
    return {
      code: o.code, status: o.status, statusLabel: STATUSES[o.status] || o.status,
      customerName: o.customer_name, phone: o.phone, email: o.email, city: o.city, address: o.address,
      deliveryMethod: o.delivery_method, deliveryLabel: DELIVERY_METHODS[o.delivery_method],
      paymentMethod: o.payment_method, paymentLabel: PAYMENT_METHODS[o.payment_method], notes: o.notes,
      subtotal: o.subtotal, discount: o.discount, deliveryFee: o.delivery_fee, total: o.total,
      createdAt: o.created_at, updatedAt: o.updated_at,
      items: items.map((i) => ({ productId: i.product_id, name: i.name, unitPrice: i.unit_price, qty: i.qty, lineTotal: i.line_total })),
      events: events.map((e) => ({ status: e.status, label: STATUSES[e.status] || e.status, note: e.note, at: e.created_at })),
      ...orderLinks(o.code),
      whatsappUrl: waLink(config.whatsappNumber, orderMessage(o, items)),
      trackWhatsappUrl: waLink(config.whatsappNumber, `TRACK ${o.code}`),
      paymentStatus: o.payment_status, paymentStatusLabel: PAYMENT_STATUSES[o.payment_status] || o.payment_status,
      amountPaid: o.amount_paid, balance: Math.max(0, o.total - o.amount_paid), mpesaReceipt: o.mpesa_receipt,
      canPay: o.status !== 'cancelled' && o.payment_status !== 'paid',
      canCancel: o.status === 'pending' && o.amount_paid === 0 && o.payment_status === 'unpaid',
    };
  }

  function paybillText() {
    const m = config.mpesa;
    return m.paybill ? `Paybill ${m.paybill}${m.paybillAccount ? `, Account ${m.paybillAccount}` : ''}` : '';
  }

  function paymentLine(o) {
    if (o.payment_status === 'paid') return `Payment: ${PAYMENT_METHODS[o.payment_method]} — PAID ✅${o.mpesa_receipt ? ` (M-Pesa ${o.mpesa_receipt})` : ''}`;
    if (o.payment_status === 'verifying') return `Payment: M-Pesa code ${o.mpesa_receipt} sent — please verify`;
    if (o.payment_status === 'partial') return `Payment: ${money(o.amount_paid)} paid, ${money(o.total - o.amount_paid)} remaining`;
    return `Payment: ${PAYMENT_METHODS[o.payment_method]} — not paid yet`;
  }

  function orderMessage(o, items) {
    const { receiptUrl, trackUrl } = orderLinks(o.code);
    const lines = [
      `*NEW ORDER — ${config.storeName}*`,
      `Order: *${o.code}*`,
      `Name: ${o.customer_name}`,
      `Phone: +${o.phone}`,
      `Delivery: ${DELIVERY_METHODS[o.delivery_method]}${o.delivery_method === 'delivery' ? ` — ${o.address}, ${o.city}` : ''}`,
      paymentLine(o),
      ...(o.payment_method === 'mpesa' && o.payment_status !== 'paid' && paybillText() ? [`Pay via M-Pesa: ${paybillText()}`] : []),
      '',
      '*Items*',
      ...items.map((i, n) => `${n + 1}. ${i.name} × ${i.qty} — ${money(i.line_total)}`),
      '',
      `Subtotal: ${money(o.subtotal)}`,
      ...(o.discount ? [`Referral discount: -${money(o.discount)}`] : []),
      `Delivery: ${o.delivery_fee ? money(o.delivery_fee) : 'FREE'}`,
      `*TOTAL: ${money(o.total)}*`,
      ...(o.notes ? ['', `Notes: ${o.notes}`] : []),
      '',
      `📄 Receipt (PDF): ${receiptUrl}`,
      `📦 Track order: ${trackUrl}`,
    ];
    return lines.join('\n');
  }

  function statusMessage(o, note) {
    const { trackUrl, receiptUrl } = orderLinks(o.code);
    return [
      `Hi ${o.customer_name.split(' ')[0]}, ${config.storeName} here 👋`,
      `Your order *${o.code}* is now: *${STATUSES[o.status]}*.`,
      ...(note ? [note] : []),
      '',
      `Total: ${money(o.total)}`,
      paymentLine(o),
      `📦 Track: ${trackUrl}`,
      `📄 Receipt: ${receiptUrl}`,
      '',
      `Reply TRACK ${o.code} any time for an update.`,
    ].join('\n');
  }

  function findReferrer(refCode, user) {
    let referrer = null;
    if (refCode) referrer = db.get('SELECT * FROM users WHERE referral_code = ?', str(refCode, 20).toUpperCase());
    if (!referrer && user && user.referred_by) referrer = db.get('SELECT * FROM users WHERE id = ?', user.referred_by);
    if (referrer && user && referrer.id === user.id) referrer = null;
    return referrer || null;
  }

  /** Price a cart server-side. Never trust client prices. */
  function quote({ items, user, refCode, deliveryMethod }) {
    if (!Array.isArray(items) || items.length === 0) throw bad('Your cart is empty.');
    if (items.length > 100) throw bad('Too many items in one order.');
    const merged = new Map();
    for (const it of items) {
      const id = Number(it && it.productId);
      const qty = Math.floor(Number(it && it.qty));
      if (!Number.isInteger(id) || !(qty >= 1 && qty <= 999)) throw bad('Invalid cart item.');
      merged.set(id, (merged.get(id) || 0) + qty);
    }
    const lines = [];
    for (const [id, qty] of merged) {
      const p = getProduct('p.id = ? AND p.active = 1', id);
      if (!p) throw bad('A product in your cart is no longer available.');
      if (p.section !== 'services' && qty > p.stock) throw bad(`Only ${p.stock} left of "${p.name}".`);
      const wholesale = Boolean(p.wholesale_price && qty >= config.wholesaleMinQty);
      const unitPrice = wholesale ? p.wholesale_price : p.price;
      lines.push({ product: productView(p), productId: p.id, name: p.name, qty, unitPrice, wholesale, lineTotal: unitPrice * qty, isService: p.section === 'services' });
    }
    const subtotal = lines.reduce((s, l) => s + l.lineTotal, 0);
    const referrer = findReferrer(refCode, user);
    let discount = 0;
    if (referrer && config.referralDiscountPct > 0) {
      const prior = user ? db.get("SELECT COUNT(*) AS n FROM orders WHERE user_id = ? AND status != 'cancelled'", user.id).n : 0;
      if (!prior) discount = Math.round((subtotal * config.referralDiscountPct) / 100);
    }
    const method = deliveryMethod === 'pickup' ? 'pickup' : 'delivery';
    const onlyServices = lines.every((l) => l.isService);
    const net = subtotal - discount;
    const deliveryFee = method === 'pickup' || onlyServices || net >= config.freeDeliveryOver ? 0 : config.deliveryFee;
    const commission = referrer ? Math.round((net * config.commissionPct) / 100) : 0;
    return {
      lines, subtotal, discount, deliveryFee, total: net + deliveryFee, deliveryMethod: method,
      referrer, referral: referrer ? { code: referrer.referral_code, name: referrer.name.split(' ')[0] } : null, commission,
    };
  }

  function newOrderCode() {
    const d = new Date();
    const ymd = `${String(d.getUTCFullYear()).slice(2)}${String(d.getUTCMonth() + 1).padStart(2, '0')}${String(d.getUTCDate()).padStart(2, '0')}`;
    for (;;) {
      const code = `IPX-${ymd}-${auth.randomCode(4)}`;
      if (!db.get('SELECT 1 FROM orders WHERE code = ?', code)) return code;
    }
  }

  function canViewOrder(req, o) {
    if (req.user && (req.user.role === 'admin' || req.user.id === o.user_id)) return true;
    return auth.safeEqual(req.query.t, orderToken(o.code));
  }

  function setSession(res, user) {
    res.setHeader('Set-Cookie', auth.sessionCookie(auth.createSessionToken(config.sessionSecret, user), config.secureCookies));
  }

  const requireAuth = (req, res, next) => (req.user ? next() : next(new HttpError(401, 'Please log in first.')));
  const requireAdmin = (req, res, next) => (req.user && req.user.role === 'admin' ? next() : next(new HttpError(403, 'Admins only.')));
  const limitWrites = (req, res, next) => (writeLimiter(`${req.ip}:${req.path}`) ? next() : next(new HttpError(429, 'Too many requests, please slow down.')));

  // ---------- middleware ----------
  app.disable('x-powered-by');
  app.set('trust proxy', 1);
  const jsonSmall = express.json({ limit: '200kb', verify: (req, res, buf) => { req.rawBody = buf; } });
  const jsonUpload = express.json({ limit: '8mb' });
  app.use((req, res, next) => (req.path === '/api/admin/uploads' ? jsonUpload : jsonSmall)(req, res, next));
  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    next();
  });
  app.use((req, res, next) => {
    const session = auth.readSessionToken(config.sessionSecret, auth.parseCookies(req.headers.cookie)[auth.COOKIE]);
    if (session) {
      const user = db.get('SELECT * FROM users WHERE id = ?', session.id);
      if (user && user.token_version === session.version) req.user = user;
    }
    next();
  });
  // Basic CSRF defence: state-changing API calls must be JSON (forms from other sites cannot send that cross-origin).
  app.use('/api', (req, res, next) => {
    // DELETE carries no body and cannot be sent by a cross-site HTML form, so it needs no content-type check.
    if (['POST', 'PUT', 'PATCH'].includes(req.method) && !req.path.startsWith('/whatsapp/') && !req.is('application/json')) {
      return next(new HttpError(415, 'Expected JSON.'));
    }
    next();
  });

  // ---------- public config & catalogue ----------
  app.get('/api/config', (req, res) => {
    res.json({
      storeName: config.storeName, storeAddress: config.storeAddress, whatsappNumber: config.whatsappNumber, currency: config.currency,
      deliveryFee: config.deliveryFee, freeDeliveryOver: config.freeDeliveryOver, wholesaleMinQty: config.wholesaleMinQty,
      commissionPct: config.commissionPct, referralDiscountPct: config.referralDiscountPct, minPayout: config.minPayout,
      deliveryMethods: DELIVERY_METHODS, paymentMethods: PAYMENT_METHODS, statuses: STATUSES, whatsappApi: wa.enabled,
      brand: { logo: (brand.mainLogo() || {}).url || null, icon: (brand.appIcon() || {}).url || null },
      mpesa: {
        stkEnabled: mpesa.enabled, sandbox: mpesa.enabled && mpesa.env !== 'production',
        paybill: config.mpesa.paybill, account: config.mpesa.paybillAccount, name: config.mpesa.paybillName,
      },
    });
  });

  app.get('/api/catalog', (req, res) => {
    const cats = db.all(`SELECT c.*, (SELECT COUNT(*) FROM products p WHERE p.category_id = c.id AND p.active = 1) AS count
      FROM categories c ORDER BY c.sort`);
    const brands = db.all(`SELECT b.*, (SELECT COUNT(*) FROM products p WHERE p.brand_id = b.id AND p.active = 1 AND p.part != '') AS count
      FROM brands b ORDER BY b.sort`);
    const partCounts = db.all(`SELECT b.slug, p.part, COUNT(*) AS n FROM products p JOIN brands b ON b.id = p.brand_id
      WHERE p.active = 1 AND p.part != '' GROUP BY b.slug, p.part`);
    res.json({
      sections: SECTIONS.map((s) => ({
        ...s,
        categories: cats.filter((c) => c.section === s.key).map((c) => ({ slug: c.slug, name: c.name, icon: c.icon, count: c.count })),
      })),
      brands: brands.map((b) => ({
        slug: b.slug, name: b.name, featured: !!b.featured, count: b.count,
        parts: JSON.parse(b.parts).map(([key, label]) => ({
          key, label, count: (partCounts.find((pc) => pc.slug === b.slug && pc.part === key) || { n: 0 }).n,
        })),
      })),
      partLabels: PART_LABELS,
    });
  });

  app.get('/api/products', (req, res) => {
    const q = req.query;
    const where = ['p.active = 1'];
    const params = [];
    if (q.section) { where.push('c.section = ?'); params.push(str(q.section, 30)); }
    if (q.category) { where.push('c.slug = ?'); params.push(str(q.category, 80)); }
    if (q.brand) { where.push('b.slug = ?'); params.push(str(q.brand, 80)); }
    if (q.part) { where.push('p.part = ?'); params.push(str(q.part, 30)); }
    if (q.deal === '1') where.push('p.is_deal = 1');
    if (q.new === '1') where.push('p.is_new = 1');
    if (q.minPrice) { where.push('p.price >= ?'); params.push(Number(q.minPrice) || 0); }
    if (q.maxPrice) { where.push('p.price <= ?'); params.push(Number(q.maxPrice) || 0); }
    if (q.q) {
      for (const term of str(q.q, 100).split(/\s+/).filter(Boolean).slice(0, 6)) {
        where.push("(p.name LIKE ? ESCAPE '\\' OR p.model LIKE ? ESCAPE '\\' OR c.name LIKE ? ESCAPE '\\' OR IFNULL(b.name, '') LIKE ? ESCAPE '\\')");
        const like = `%${term.replace(/[\\%_]/g, (m) => `\\${m}`)}%`;
        params.push(like, like, like, like);
      }
    }
    const sorts = {
      popular: 'p.sold DESC', 'price-asc': 'p.price ASC', 'price-desc': 'p.price DESC', newest: 'p.is_new DESC, p.id DESC', rating: 'p.rating DESC',
    };
    const order = sorts[q.sort] || (q.deal === '1' ? '(p.compare_price - p.price) * 1.0 / p.compare_price DESC' : sorts.popular);
    const limit = Math.min(Math.max(Number(q.limit) || 24, 1), 60);
    const page = Math.max(Number(q.page) || 1, 1);
    const whereSql = where.join(' AND ');
    const from = 'FROM products p JOIN categories c ON c.id = p.category_id LEFT JOIN brands b ON b.id = p.brand_id';
    const total = db.get(`SELECT COUNT(*) AS n ${from} WHERE ${whereSql}`, ...params).n;
    const rows = db.all(`${PRODUCT_SELECT} WHERE ${whereSql} ORDER BY ${order}, p.id LIMIT ? OFFSET ?`, ...params, limit, (page - 1) * limit);
    res.json({ total, page, pages: Math.ceil(total / limit), products: rows.map(productView) });
  });

  app.get('/api/products/:slug', (req, res, next) => {
    const p = getProduct('p.slug = ? AND p.active = 1', req.params.slug);
    if (!p) return next(new HttpError(404, 'Product not found.'));
    const related = db.all(
      `${PRODUCT_SELECT} WHERE p.active = 1 AND p.id != ? AND (p.category_id = ? OR (p.brand_id IS NOT NULL AND p.brand_id = ? AND p.model = ?))
       ORDER BY (p.model = ?) DESC, p.sold DESC LIMIT 12`,
      p.id, p.category_id, p.brand_id, p.model, p.model,
    );
    res.json({ product: productView(p), related: related.map(productView) });
  });

  // Generated product artwork (used until a real photo URL is set in admin).
  app.get('/img/p/:id.svg', (req, res, next) => {
    const p = getProduct('p.id = ?', Number(req.params.id));
    if (!p) return next(new HttpError(404, 'Not found'));
    const palettes = { accessories: ['#ff7a45', '#e62e04'], spares: ['#3b82f6', '#1e3a8a'], services: ['#10b981', '#065f46'] };
    const [c1, c2] = palettes[p.section] || palettes.accessories;
    const esc = (s) => String(s).replace(/[&<>"']/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }[m]));
    const title = p.brand_name ? `${p.brand_name === 'iPhone' ? '' : `${p.brand_name} `}${p.model}`.trim() : p.category_name.split(/[—/(]/)[0].trim();
    const sub = p.part ? PART_LABELS[p.part] || '' : p.section === 'services' ? 'Repair service' : 'Accessory';
    res.type('image/svg+xml').set('Cache-Control', 'public, max-age=86400').send(
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></linearGradient></defs>`
      + `<rect width="400" height="400" fill="url(#g)"/><circle cx="330" cy="70" r="120" fill="#fff" opacity=".08"/><circle cx="60" cy="360" r="90" fill="#fff" opacity=".08"/>`
      + `<text x="24" y="40" font-family="Arial,sans-serif" font-size="16" font-weight="700" fill="#fff" opacity=".85">IPHIX</text>`
      + `<text x="200" y="220" font-size="130" text-anchor="middle" dominant-baseline="middle">${esc(p.icon)}</text>`
      + `<text x="200" y="335" font-family="Arial,sans-serif" font-size="26" font-weight="700" fill="#fff" text-anchor="middle">${esc(title.slice(0, 26))}</text>`
      + `<text x="200" y="365" font-family="Arial,sans-serif" font-size="16" fill="#fff" opacity=".85" text-anchor="middle">${esc(sub)}</text></svg>`,
    );
  });

  // ---------- authentication ----------
  app.post('/api/auth/register', limitWrites, (req, res, next) => {
    const name = str(req.body.name, 80);
    const email = str(req.body.email, 120).toLowerCase();
    const phone = normalizePhone(req.body.phone);
    const password = String(req.body.password || '');
    if (name.length < 2) return next(bad('Please enter your full name.'));
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return next(bad('Please enter a valid email address.'));
    if (!phone) return next(bad('Please enter a valid WhatsApp phone number.'));
    if (password.length < 8) return next(bad('Password must be at least 8 characters.'));
    if (db.get('SELECT 1 FROM users WHERE email = ?', email)) return next(bad('An account with this email already exists. Please log in.'));
    if (db.get('SELECT 1 FROM users WHERE phone = ?', phone)) return next(bad('An account with this phone number already exists. Please log in.'));
    const referrer = req.body.ref ? db.get('SELECT id FROM users WHERE referral_code = ?', str(req.body.ref, 20).toUpperCase()) : null;
    const { lastInsertRowid } = db.run(
      'INSERT INTO users (name, email, phone, password_hash, referral_code, referred_by) VALUES (?, ?, ?, ?, ?, ?)',
      name, email, phone, auth.hashPassword(password), auth.newReferralCode(db, name), referrer ? referrer.id : null,
    );
    const user = db.get('SELECT * FROM users WHERE id = ?', lastInsertRowid);
    setSession(res, user);
    res.status(201).json({ user: publicUser(user) });
  });

  app.post('/api/auth/login', (req, res, next) => {
    if (!loginLimiter(req.ip)) return next(new HttpError(429, 'Too many login attempts. Try again in 15 minutes.'));
    const id = str(req.body.identifier || req.body.email, 120).toLowerCase();
    const password = String(req.body.password || '');
    const phone = normalizePhone(id);
    const user = db.get('SELECT * FROM users WHERE email = ?', id) || (phone && db.get('SELECT * FROM users WHERE phone = ?', phone));
    if (!user || !auth.verifyPassword(password, user.password_hash)) return next(new HttpError(401, 'Wrong email/phone or password.'));
    setSession(res, user);
    res.json({ user: publicUser(user) });
  });

  app.post('/api/auth/logout', (req, res) => {
    res.setHeader('Set-Cookie', auth.sessionCookie('', config.secureCookies));
    res.json({ ok: true });
  });

  app.get('/api/auth/me', (req, res) => res.json({ user: publicUser(req.user) || null }));

  app.put('/api/auth/me', requireAuth, (req, res, next) => {
    const name = str(req.body.name, 80);
    const phone = normalizePhone(req.body.phone);
    if (name.length < 2) return next(bad('Please enter your full name.'));
    if (!phone) return next(bad('Please enter a valid WhatsApp phone number.'));
    if (db.get('SELECT 1 FROM users WHERE phone = ? AND id != ?', phone, req.user.id)) return next(bad('That phone number is used by another account.'));
    db.run('UPDATE users SET name = ?, phone = ? WHERE id = ?', name, phone, req.user.id);
    res.json({ user: publicUser(db.get('SELECT * FROM users WHERE id = ?', req.user.id)) });
  });

  app.put('/api/auth/password', requireAuth, (req, res, next) => {
    const { current, next: nextPassword } = req.body;
    if (!auth.verifyPassword(String(current || ''), req.user.password_hash)) return next(bad('Current password is wrong.'));
    if (String(nextPassword || '').length < 8) return next(bad('New password must be at least 8 characters.'));
    // Bumping token_version signs out every other device.
    db.run('UPDATE users SET password_hash = ?, token_version = token_version + 1 WHERE id = ?', auth.hashPassword(String(nextPassword)), req.user.id);
    setSession(res, db.get('SELECT * FROM users WHERE id = ?', req.user.id));
    res.json({ ok: true });
  });

  // ---------- referrals ----------
  app.post('/api/ref/click', limitWrites, (req, res) => {
    const referrer = db.get('SELECT id, name FROM users WHERE referral_code = ?', str(req.body.code, 20).toUpperCase());
    if (referrer && referrer.id !== (req.user && req.user.id)) {
      const visitor = crypto.createHash('sha256').update(`${req.ip}|${req.headers['user-agent'] || ''}`).digest('hex').slice(0, 32);
      db.run('INSERT OR IGNORE INTO referral_clicks (referrer_id, visitor, day) VALUES (?, ?, date(\'now\'))', referrer.id, visitor);
    }
    res.json({ valid: Boolean(referrer), name: referrer ? referrer.name.split(' ')[0] : null });
  });

  // ---------- cart & orders ----------
  app.post('/api/cart/quote', (req, res) => {
    const q = quote({ items: req.body.items, user: req.user, refCode: req.body.refCode, deliveryMethod: req.body.deliveryMethod });
    delete q.referrer;
    delete q.commission;
    res.json(q);
  });

  app.post('/api/orders', requireAuth, limitWrites, (req, res, next) => {
    const b = req.body;
    const c = b.customer || {};
    const customerName = str(c.name, 80);
    const phone = normalizePhone(c.phone);
    const deliveryMethod = b.deliveryMethod === 'pickup' ? 'pickup' : 'delivery';
    const paymentMethod = PAYMENT_METHODS[b.paymentMethod] ? b.paymentMethod : null;
    const city = str(c.city, 80);
    const address = str(c.address, 300);
    if (customerName.length < 2) return next(bad('Please enter the name for this order.'));
    if (!phone) return next(bad('Please enter a valid WhatsApp phone number.'));
    if (!paymentMethod) return next(bad('Please choose a payment method.'));
    if (deliveryMethod === 'delivery' && (!city || address.length < 4)) return next(bad('Please enter your delivery town and address.'));

    const q = quote({ items: b.items, user: req.user, refCode: b.refCode, deliveryMethod });
    const code = newOrderCode();
    const order = db.tx(() => {
      const { lastInsertRowid: orderId } = db.run(
        `INSERT INTO orders (code, user_id, customer_name, phone, email, city, address, delivery_method, payment_method, notes,
          subtotal, discount, delivery_fee, total, referrer_id, commission_rate, commission_amount, commission_status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        code, req.user.id, customerName, phone, req.user.email, city, address, deliveryMethod, paymentMethod, str(b.notes, 500),
        q.subtotal, q.discount, q.deliveryFee, q.total, q.referrer ? q.referrer.id : null,
        q.referrer ? config.commissionPct : 0, q.commission, q.referrer ? 'pending' : 'none',
      );
      const insItem = db.prepare('INSERT INTO order_items (order_id, product_id, name, unit_price, qty, line_total) VALUES (?, ?, ?, ?, ?, ?)');
      for (const l of q.lines) {
        insItem.run(orderId, l.productId, l.wholesale ? `${l.name} (wholesale)` : l.name, l.unitPrice, l.qty, l.lineTotal);
        const upd = l.isService
          ? db.run('UPDATE products SET sold = sold + ? WHERE id = ?', l.qty, l.productId)
          : db.run('UPDATE products SET stock = stock - ?, sold = sold + ? WHERE id = ? AND stock >= ?', l.qty, l.qty, l.productId, l.qty);
        if (!upd.changes) throw bad(`"${l.name}" just sold out. Please update your cart.`);
      }
      db.run('INSERT INTO order_events (order_id, status, note) VALUES (?, ?, ?)', orderId, 'pending', 'Order placed online');
      return db.get('SELECT * FROM orders WHERE id = ?', orderId);
    });

    const view = orderView(order);
    // With the Cloud API configured, notify the shop and the customer automatically.
    wa.sendText(config.whatsappNumber, orderMessage(order, db.all('SELECT * FROM order_items WHERE order_id = ?', order.id)));
    wa.sendText(order.phone, statusMessage(order, 'Thank you! We have received your order and will confirm it shortly.'));
    res.status(201).json({ order: view });
  });

  app.get('/api/orders', requireAuth, (req, res) => {
    const rows = db.all('SELECT * FROM orders WHERE user_id = ? ORDER BY id DESC LIMIT 100', req.user.id);
    res.json({
      orders: rows.map((o) => ({
        code: o.code, status: o.status, statusLabel: STATUSES[o.status], total: o.total, createdAt: o.created_at,
        paymentStatus: o.payment_status, paymentStatusLabel: PAYMENT_STATUSES[o.payment_status],
        itemCount: db.get('SELECT COALESCE(SUM(qty), 0) AS n FROM order_items WHERE order_id = ?', o.id).n,
      })),
    });
  });

  app.get('/api/orders/:code', (req, res, next) => {
    const o = db.get('SELECT * FROM orders WHERE code = ?', str(req.params.code, 30).toUpperCase());
    if (!o || !canViewOrder(req, o)) return next(new HttpError(404, 'Order not found.'));
    res.json({ order: orderView(o) });
  });

  app.get('/api/orders/:code/receipt.pdf', (req, res, next) => {
    const o = db.get('SELECT * FROM orders WHERE code = ?', str(req.params.code, 30).toUpperCase());
    if (!o || !canViewOrder(req, o)) return next(new HttpError(404, 'Receipt not found.'));
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `${req.query.download === '1' ? 'attachment' : 'inline'}; filename="IPHIX-receipt-${o.code}.pdf"`);
    writeReceipt(res, orderView(o), config);
  });

  app.post('/api/orders/:code/cancel', requireAuth, (req, res, next) => {
    const o = db.get('SELECT * FROM orders WHERE code = ? AND user_id = ?', str(req.params.code, 30).toUpperCase(), req.user.id);
    if (!o) return next(new HttpError(404, 'Order not found.'));
    if (o.status !== 'pending') return next(bad('This order is already being processed. Please contact us on WhatsApp to change it.'));
    if (o.amount_paid > 0 || o.payment_status !== 'unpaid') return next(bad('This order has a payment. Please contact us on WhatsApp to cancel and get a refund.'));
    const updated = changeStatus(o, 'cancelled', 'Cancelled by customer');
    res.json({ order: orderView(updated) });
  });

  app.post('/api/track', limitWrites, (req, res, next) => {
    const o = db.get('SELECT * FROM orders WHERE code = ?', str(req.body.code, 30).toUpperCase());
    const phone = normalizePhone(req.body.phone);
    if (!o || !phone || o.phone !== phone) return next(new HttpError(404, 'No order matches that order number and phone.'));
    res.json({ order: orderView(o), token: orderToken(o.code) });
  });

  function changeStatus(o, status, note) {
    return db.tx(() => {
      db.run("UPDATE orders SET status = ?, updated_at = datetime('now') WHERE id = ?", status, o.id);
      db.run('INSERT INTO order_events (order_id, status, note) VALUES (?, ?, ?)', o.id, status, note || '');
      if (status === 'cancelled') {
        for (const item of db.all(`SELECT oi.* , c.section FROM order_items oi JOIN products p ON p.id = oi.product_id
          JOIN categories c ON c.id = p.category_id WHERE oi.order_id = ?`, o.id)) {
          if (item.section !== 'services') db.run('UPDATE products SET stock = stock + ?, sold = MAX(sold - ?, 0) WHERE id = ?', item.qty, item.qty, item.product_id);
        }
        if (o.referrer_id) db.run("UPDATE orders SET commission_status = 'void' WHERE id = ?", o.id);
      }
      if (status === 'delivered' && o.referrer_id) db.run("UPDATE orders SET commission_status = 'approved' WHERE id = ?", o.id);
      return db.get('SELECT * FROM orders WHERE id = ?', o.id);
    });
  }

  // ---------- M-Pesa payments ----------
  const mpesaCallbackToken = auth.hmac(config.sessionSecret, 'mpesa-callback').replace(/[^A-Za-z0-9]/g, '').slice(0, 32);
  const mpesaCallbackUrl = config.mpesa.callbackUrl || `${config.baseUrl}/api/mpesa/callback/${mpesaCallbackToken}`;

  function findViewableOrder(req) {
    const o = db.get('SELECT * FROM orders WHERE code = ?', str(req.params.code, 30).toUpperCase());
    if (!o || !canViewOrder(req, o)) throw new HttpError(404, 'Order not found.');
    return o;
  }

  function paymentView(p) {
    return p && {
      status: p.status, amount: p.amount, phone: p.phone, receipt: p.receipt, resultDesc: p.result_desc,
      createdAt: p.created_at, checkoutRequestId: p.checkout_request_id,
    };
  }

  /** Records a Safaricom result for an STK push. Safe to call more than once for the same payment. */
  function applyMpesaResult(payment, { resultCode, resultDesc = '', receipt = '', amount }) {
    let confirmOrder = null;
    db.tx(() => {
      const cur = db.get('SELECT * FROM mpesa_payments WHERE id = ?', payment.id);
      if (cur.status === 'paid') {
        // A late callback can add the receipt number to a payment we already confirmed via query.
        if (receipt && !cur.receipt) {
          db.run("UPDATE mpesa_payments SET receipt = ?, updated_at = datetime('now') WHERE id = ?", receipt, cur.id);
          db.run("UPDATE orders SET mpesa_receipt = ? WHERE id = ? AND mpesa_receipt = ''", receipt, cur.order_id);
        }
        return;
      }
      if (resultCode === 0) {
        const paid = Math.round(Number(amount) || cur.amount);
        db.run(
          "UPDATE mpesa_payments SET status = 'paid', result_code = 0, result_desc = ?, receipt = ?, amount = ?, updated_at = datetime('now') WHERE id = ?",
          resultDesc, receipt, paid, cur.id,
        );
        const o = db.get('SELECT * FROM orders WHERE id = ?', cur.order_id);
        const amountPaid = o.amount_paid + paid;
        const status = amountPaid >= o.total ? 'paid' : 'partial';
        db.run("UPDATE orders SET amount_paid = ?, payment_status = ?, mpesa_receipt = ?, updated_at = datetime('now') WHERE id = ?",
          amountPaid, status, receipt || o.mpesa_receipt, o.id);
        if (status === 'paid' && o.status === 'pending') confirmOrder = o;
      } else if (cur.status === 'pending') {
        const status = resultCode === 1032 ? 'cancelled' : 'failed';
        db.run("UPDATE mpesa_payments SET status = ?, result_code = ?, result_desc = ?, updated_at = datetime('now') WHERE id = ?",
          status, resultCode, resultDesc, cur.id);
      }
    });
    const order = db.get('SELECT * FROM orders WHERE id = ?', payment.order_id);
    if (confirmOrder) {
      const updated = changeStatus(order, 'confirmed', `Payment received via M-Pesa${order.mpesa_receipt ? ` (${order.mpesa_receipt})` : ''}`);
      wa.sendText(updated.phone, statusMessage(updated, '✅ Payment received — thank you!'));
      wa.sendText(config.whatsappNumber, `💰 M-Pesa payment received for ${updated.code}: ${money(updated.amount_paid)}${updated.mpesa_receipt ? ` (${updated.mpesa_receipt})` : ''}`);
    }
  }

  app.post('/api/orders/:code/mpesa/stk', limitWrites, async (req, res) => {
    const o = findViewableOrder(req);
    if (!mpesa.enabled) throw bad(`M-Pesa prompts are not available right now.${paybillText() ? ` Please pay via ${paybillText()}.` : ''}`);
    if (o.status === 'cancelled') throw bad('This order was cancelled.');
    if (o.payment_status === 'paid') throw bad('This order is already paid. Thank you!');
    const phone = normalizePhone(req.body.phone || o.phone);
    if (!isSafaricomNumber(phone)) throw bad('Enter a Safaricom M-Pesa number, e.g. 0712 345 678.');
    if (!stkLimiter(o.code)) throw new HttpError(429, 'A payment prompt was just sent. Check your phone, or wait 20 seconds to resend.');
    const amount = o.total - o.amount_paid;
    let result;
    try {
      result = await mpesa.stkPush({
        phone, amount,
        accountReference: config.mpesa.accountReference || o.code.replace(/^IPX-/, '').replace(/-/g, ''),
        description: `Order ${o.code.slice(-4)}`,
        callbackUrl: mpesaCallbackUrl,
      });
    } catch (err) {
      console.error('[mpesa] stk push failed:', err.message);
      throw new HttpError(502, `Could not send the M-Pesa prompt: ${err.message}`);
    }
    db.run('INSERT INTO mpesa_payments (order_id, checkout_request_id, merchant_request_id, phone, amount) VALUES (?, ?, ?, ?, ?)',
      o.id, result.checkoutRequestId, result.merchantRequestId || '', phone, amount);
    res.status(201).json({
      payment: paymentView(db.get('SELECT * FROM mpesa_payments WHERE checkout_request_id = ?', result.checkoutRequestId)),
      message: result.customerMessage || 'Check your phone and enter your M-Pesa PIN to pay.',
    });
  });

  app.get('/api/orders/:code/payment', async (req, res) => {
    const o = findViewableOrder(req);
    let p = db.get('SELECT * FROM mpesa_payments WHERE order_id = ? ORDER BY id DESC LIMIT 1', o.id);
    // If Safaricom's callback is slow or lost, ask Daraja directly (at most every 10 seconds).
    const ageMs = p ? Date.now() - Date.parse(`${p.created_at.replace(' ', 'T')}Z`) : 0;
    if (p && p.status === 'pending' && mpesa.enabled && ageMs > 15e3 && Date.now() - p.last_query_at > 10e3) {
      db.run('UPDATE mpesa_payments SET last_query_at = ? WHERE id = ?', Date.now(), p.id);
      try {
        const r = await mpesa.stkQuery(p.checkout_request_id);
        if (r) applyMpesaResult(p, r);
        else if (ageMs > 3 * 60e3) applyMpesaResult(p, { resultCode: 1037, resultDesc: 'No response from the phone. Please try again.' });
      } catch (err) {
        console.error('[mpesa] stk query failed:', err.message);
      }
      p = db.get('SELECT * FROM mpesa_payments WHERE id = ?', p.id);
    }
    res.json({ payment: paymentView(p) || null, order: orderView(db.get('SELECT * FROM orders WHERE id = ?', o.id)) });
  });

  // Safaricom posts the STK result here. The secret path stops anyone else from faking results.
  app.post('/api/mpesa/callback/:token', (req, res) => {
    if (!auth.safeEqual(req.params.token, mpesaCallbackToken)) return res.sendStatus(404);
    const cb = req.body && req.body.Body && req.body.Body.stkCallback;
    const p = cb && db.get('SELECT * FROM mpesa_payments WHERE checkout_request_id = ?', String(cb.CheckoutRequestID || ''));
    if (p) {
      const meta = Object.fromEntries(((cb.CallbackMetadata && cb.CallbackMetadata.Item) || []).map((i) => [i.Name, i.Value]));
      applyMpesaResult(p, {
        resultCode: Number(cb.ResultCode), resultDesc: String(cb.ResultDesc || ''),
        receipt: String(meta.MpesaReceiptNumber || ''), amount: meta.Amount,
      });
    }
    res.json({ ResultCode: 0, ResultDesc: 'Accepted' });
  });

  // Customer paid manually via Paybill and enters the M-Pesa confirmation code for us to verify.
  app.post('/api/orders/:code/mpesa/confirm', limitWrites, (req, res) => {
    const o = findViewableOrder(req);
    const receipt = str(req.body.receipt, 20).toUpperCase().replace(/\s/g, '');
    if (!/^[A-Z0-9]{10}$/.test(receipt)) throw bad('Enter the 10-character M-Pesa confirmation code, e.g. TJ4AB1CD2E.');
    if (o.status === 'cancelled') throw bad('This order was cancelled.');
    if (o.payment_status === 'paid') throw bad('This order is already paid. Thank you!');
    if (db.get('SELECT 1 FROM orders WHERE mpesa_receipt = ? AND id != ?', receipt, o.id)) throw bad('That M-Pesa code has already been used for another order.');
    db.run("UPDATE orders SET payment_status = 'verifying', mpesa_receipt = ?, updated_at = datetime('now') WHERE id = ?", receipt, o.id);
    wa.sendText(config.whatsappNumber, `🔎 Please verify M-Pesa payment for ${o.code}: code ${receipt}, amount due ${money(o.total - o.amount_paid)}.`);
    res.json({ order: orderView(db.get('SELECT * FROM orders WHERE id = ?', o.id)) });
  });

  // ---------- affiliate programme ----------
  function affiliateBalance(userId) {
    const sum = (sql) => db.get(sql, userId).n;
    const approved = sum("SELECT COALESCE(SUM(commission_amount), 0) AS n FROM orders WHERE referrer_id = ? AND commission_status = 'approved'");
    const pending = sum("SELECT COALESCE(SUM(commission_amount), 0) AS n FROM orders WHERE referrer_id = ? AND commission_status = 'pending'");
    const paid = sum("SELECT COALESCE(SUM(amount), 0) AS n FROM payouts WHERE user_id = ? AND status = 'paid'");
    const requested = sum("SELECT COALESCE(SUM(amount), 0) AS n FROM payouts WHERE user_id = ? AND status = 'pending'");
    return { approved, pending, paid, requested, available: approved - paid - requested };
  }

  app.get('/api/affiliate', requireAuth, (req, res) => {
    const u = req.user;
    const count = (sql) => db.get(sql, u.id).n;
    const orders = db.all(
      `SELECT code, customer_name, subtotal, discount, commission_amount, commission_status, status, created_at
       FROM orders WHERE referrer_id = ? ORDER BY id DESC LIMIT 50`, u.id,
    );
    res.json({
      code: u.referral_code,
      link: `${config.baseUrl}/?ref=${u.referral_code}`,
      commissionPct: config.commissionPct,
      referralDiscountPct: config.referralDiscountPct,
      minPayout: config.minPayout,
      stats: {
        clicks: count('SELECT COUNT(*) AS n FROM referral_clicks WHERE referrer_id = ?'),
        signups: count('SELECT COUNT(*) AS n FROM users WHERE referred_by = ?'),
        orders: count("SELECT COUNT(*) AS n FROM orders WHERE referrer_id = ? AND status != 'cancelled'"),
        sales: count("SELECT COALESCE(SUM(subtotal - discount), 0) AS n FROM orders WHERE referrer_id = ? AND status != 'cancelled'"),
        ...affiliateBalance(u.id),
      },
      orders: orders.map((o) => ({
        code: `${o.code.slice(0, -2)}••`, customer: o.customer_name.split(' ')[0], amount: o.subtotal - o.discount,
        commission: o.commission_amount, commissionStatus: o.commission_status, status: STATUSES[o.status], createdAt: o.created_at,
      })),
      payouts: db.all('SELECT id, amount, method, account, status, created_at AS createdAt FROM payouts WHERE user_id = ? ORDER BY id DESC', u.id),
    });
  });

  app.post('/api/affiliate/payouts', requireAuth, limitWrites, (req, res, next) => {
    const amount = Math.floor(Number(req.body.amount));
    const method = req.body.method === 'bank' ? 'bank' : 'mpesa';
    const account = method === 'mpesa' ? normalizePhone(req.body.account) : str(req.body.account, 120);
    if (!account) return next(bad(method === 'mpesa' ? 'Enter a valid M-Pesa number.' : 'Enter your bank account details.'));
    if (!(amount >= config.minPayout)) return next(bad(`Minimum payout is ${money(config.minPayout)}.`));
    db.tx(() => {
      if (amount > affiliateBalance(req.user.id).available) throw bad('Amount is more than your available balance.');
      db.run('INSERT INTO payouts (user_id, amount, method, account) VALUES (?, ?, ?, ?)', req.user.id, amount, method, account);
    });
    res.status(201).json({ ok: true });
  });

  // ---------- admin ----------
  app.get('/api/admin/stats', requireAdmin, (req, res) => {
    const one = (sql) => db.get(sql).n;
    res.json({
      ordersToday: one("SELECT COUNT(*) AS n FROM orders WHERE date(created_at) = date('now')"),
      openOrders: one("SELECT COUNT(*) AS n FROM orders WHERE status NOT IN ('delivered', 'cancelled')"),
      revenue: one("SELECT COALESCE(SUM(total), 0) AS n FROM orders WHERE status = 'delivered'"),
      pipeline: one("SELECT COALESCE(SUM(total), 0) AS n FROM orders WHERE status NOT IN ('delivered', 'cancelled')"),
      customers: one("SELECT COUNT(*) AS n FROM users WHERE role = 'customer'"),
      products: one('SELECT COUNT(*) AS n FROM products WHERE active = 1'),
      lowStock: one(`SELECT COUNT(*) AS n FROM products p JOIN categories c ON c.id = p.category_id
        WHERE p.active = 1 AND c.section != 'services' AND p.stock <= 3`),
      commissionsOwed: one("SELECT COALESCE(SUM(commission_amount), 0) AS n FROM orders WHERE commission_status IN ('pending', 'approved')")
        - one("SELECT COALESCE(SUM(amount), 0) AS n FROM payouts WHERE status = 'paid'"),
      pendingPayouts: one("SELECT COUNT(*) AS n FROM payouts WHERE status = 'pending'"),
      byStatus: db.all('SELECT status, COUNT(*) AS n FROM orders GROUP BY status'),
    });
  });

  app.get('/api/admin/orders', requireAdmin, (req, res) => {
    const status = STATUSES[req.query.status] ? req.query.status : null;
    const search = str(req.query.q, 60);
    const where = [];
    const params = [];
    if (status) { where.push('o.status = ?'); params.push(status); }
    if (search) { where.push('(o.code LIKE ? OR o.customer_name LIKE ? OR o.phone LIKE ?)'); params.push(`%${search}%`, `%${search}%`, `%${search}%`); }
    const rows = db.all(
      `SELECT o.*, r.name AS referrer_name FROM orders o LEFT JOIN users r ON r.id = o.referrer_id
       ${where.length ? `WHERE ${where.join(' AND ')}` : ''} ORDER BY o.id DESC LIMIT 200`, ...params,
    );
    res.json({
      orders: rows.map((o) => ({
        ...orderView(o), referrer: o.referrer_name, commission: o.commission_amount, commissionStatus: o.commission_status,
        customerWhatsappUrl: waLink(o.phone, statusMessage(o)),
      })),
    });
  });

  app.put('/api/admin/orders/:code/status', requireAdmin, (req, res, next) => {
    const o = db.get('SELECT * FROM orders WHERE code = ?', str(req.params.code, 30).toUpperCase());
    if (!o) return next(new HttpError(404, 'Order not found.'));
    const status = req.body.status;
    const note = str(req.body.note, 300);
    if (!STATUSES[status]) return next(bad('Unknown status.'));
    if (FINAL_STATUSES.has(o.status)) return next(bad(`Order is already ${STATUSES[o.status].toLowerCase()} and cannot change.`));
    if (status === o.status) return next(bad('Order already has that status.'));
    const updated = changeStatus(o, status, note);
    const message = statusMessage(updated, note);
    wa.sendText(updated.phone, message);
    res.json({ order: orderView(updated), customerWhatsappUrl: waLink(updated.phone, message), autoSent: wa.enabled });
  });

  app.put('/api/admin/orders/:code/payment', requireAdmin, (req, res, next) => {
    let o = db.get('SELECT * FROM orders WHERE code = ?', str(req.params.code, 30).toUpperCase());
    if (!o) return next(new HttpError(404, 'Order not found.'));
    const receipt = str(req.body.receipt, 20).toUpperCase();
    if (req.body.status === 'paid') {
      db.run("UPDATE orders SET payment_status = 'paid', amount_paid = total, mpesa_receipt = ?, updated_at = datetime('now') WHERE id = ?", receipt || o.mpesa_receipt, o.id);
      o = db.get('SELECT * FROM orders WHERE id = ?', o.id);
      if (o.status === 'pending') o = changeStatus(o, 'confirmed', `Payment confirmed${o.mpesa_receipt ? ` (M-Pesa ${o.mpesa_receipt})` : ''}`);
    } else if (req.body.status === 'unpaid') {
      db.run("UPDATE orders SET payment_status = 'unpaid', amount_paid = 0, mpesa_receipt = '', updated_at = datetime('now') WHERE id = ?", o.id);
      o = db.get('SELECT * FROM orders WHERE id = ?', o.id);
    } else {
      return next(bad('Status must be paid or unpaid.'));
    }
    const message = statusMessage(o, o.payment_status === 'paid' ? '✅ Payment received — thank you!' : 'We could not confirm your M-Pesa payment. Please check the code or contact us.');
    wa.sendText(o.phone, message);
    res.json({ order: orderView(o), customerWhatsappUrl: waLink(o.phone, message) });
  });

  const PRODUCT_FIELDS = ['name', 'description', 'category', 'brand', 'model', 'part', 'price', 'comparePrice', 'wholesalePrice', 'stock', 'isNew', 'isDeal', 'image', 'active'];

  function productInput(body, existing) {
    const v = {};
    for (const f of PRODUCT_FIELDS) v[f] = body[f] !== undefined ? body[f] : existing ? existing[f] : undefined;
    const name = str(v.name, 160);
    if (name.length < 3) throw bad('Product name is too short.');
    const cat = db.get('SELECT id FROM categories WHERE slug = ?', str(v.category, 80));
    if (!cat) throw bad('Choose a valid category.');
    const brand = v.brand ? db.get('SELECT id FROM brands WHERE slug = ?', str(v.brand, 80)) : null;
    if (v.brand && !brand) throw bad('Unknown brand.');
    const int = (x, label, { optional = false } = {}) => {
      if (optional && (x === null || x === undefined || x === '')) return null;
      const n = Math.round(Number(x));
      if (!Number.isFinite(n) || n < 0) throw bad(`${label} must be a positive number.`);
      return n;
    };
    const part = str(v.part, 30);
    if (part && !PART_LABELS[part]) throw bad('Unknown part type.');
    const image = str(v.image, 500);
    if (image && !/^(https:\/\/|\/)/.test(image)) throw bad('Image must be an https:// URL.');
    return {
      name, description: str(v.description, 3000), category_id: cat.id, brand_id: brand ? brand.id : null, model: str(v.model, 80), part,
      price: int(v.price, 'Price'), compare_price: int(v.comparePrice, 'Compare price', { optional: true }),
      wholesale_price: int(v.wholesalePrice, 'Wholesale price', { optional: true }), stock: int(v.stock ?? 0, 'Stock'),
      is_new: v.isNew ? 1 : 0, is_deal: v.isDeal ? 1 : 0, image, active: v.active === false ? 0 : 1,
    };
  }

  app.get('/api/admin/products', requireAdmin, (req, res) => {
    const search = str(req.query.q, 80);
    const rows = db.all(
      `${PRODUCT_SELECT} ${search ? 'WHERE p.name LIKE ? OR p.model LIKE ?' : ''} ORDER BY p.active DESC, p.stock ASC, p.id DESC LIMIT 300`,
      ...(search ? [`%${search}%`, `%${search}%`] : []),
    );
    res.json({ products: rows.map(productView) });
  });

  app.post('/api/admin/products', requireAdmin, (req, res) => {
    const v = productInput(req.body);
    let slug = slugify(v.name);
    for (let n = 2; db.get('SELECT 1 FROM products WHERE slug = ?', slug); n++) slug = `${slugify(v.name)}-${n}`;
    const { lastInsertRowid } = db.run(
      `INSERT INTO products (slug, name, description, category_id, brand_id, model, part, price, compare_price, wholesale_price, stock, is_new, is_deal, image, active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      slug, v.name, v.description, v.category_id, v.brand_id, v.model, v.part, v.price, v.compare_price, v.wholesale_price, v.stock, v.is_new, v.is_deal, v.image, v.active,
    );
    res.status(201).json({ product: productView(getProduct('p.id = ?', lastInsertRowid)) });
  });

  app.put('/api/admin/products/:id', requireAdmin, (req, res, next) => {
    const row = getProduct('p.id = ?', Number(req.params.id));
    if (!row) return next(new HttpError(404, 'Product not found.'));
    const cur = productView(row);
    const v = productInput(req.body, { ...cur, category: cur.category.slug, brand: cur.brand && cur.brand.slug, image: row.image });
    db.run(
      `UPDATE products SET name = ?, description = ?, category_id = ?, brand_id = ?, model = ?, part = ?, price = ?, compare_price = ?,
        wholesale_price = ?, stock = ?, is_new = ?, is_deal = ?, image = ?, active = ? WHERE id = ?`,
      v.name, v.description, v.category_id, v.brand_id, v.model, v.part, v.price, v.compare_price, v.wholesale_price, v.stock, v.is_new, v.is_deal, v.image, v.active, row.id,
    );
    res.json({ product: productView(getProduct('p.id = ?', row.id)) });
  });

  app.get('/api/admin/affiliates', requireAdmin, (req, res) => {
    const rows = db.all(`SELECT u.id, u.name, u.phone, u.referral_code,
        (SELECT COUNT(*) FROM users x WHERE x.referred_by = u.id) AS signups,
        (SELECT COUNT(*) FROM orders o WHERE o.referrer_id = u.id AND o.status != 'cancelled') AS orders,
        (SELECT COALESCE(SUM(o.subtotal - o.discount), 0) FROM orders o WHERE o.referrer_id = u.id AND o.status != 'cancelled') AS sales,
        (SELECT COALESCE(SUM(o.commission_amount), 0) FROM orders o WHERE o.referrer_id = u.id AND o.commission_status IN ('pending','approved')) AS earned
      FROM users u WHERE EXISTS (SELECT 1 FROM orders o WHERE o.referrer_id = u.id) OR EXISTS (SELECT 1 FROM users x WHERE x.referred_by = u.id)
      ORDER BY sales DESC LIMIT 100`);
    res.json({ affiliates: rows.map((r) => ({ ...r, balance: affiliateBalance(r.id) })) });
  });

  app.get('/api/admin/payouts', requireAdmin, (req, res) => {
    res.json({
      payouts: db.all(`SELECT p.id, p.amount, p.method, p.account, p.status, p.created_at AS createdAt, u.name, u.phone, u.referral_code AS code
        FROM payouts p JOIN users u ON u.id = p.user_id ORDER BY (p.status = 'pending') DESC, p.id DESC LIMIT 200`),
    });
  });

  app.put('/api/admin/payouts/:id', requireAdmin, (req, res, next) => {
    const status = req.body.status;
    if (!['paid', 'rejected'].includes(status)) return next(bad('Status must be paid or rejected.'));
    const { changes } = db.run("UPDATE payouts SET status = ?, updated_at = datetime('now') WHERE id = ? AND status = 'pending'", status, Number(req.params.id));
    if (!changes) return next(bad('Payout not found or already processed.'));
    res.json({ ok: true });
  });

  // ---------- WhatsApp Cloud API webhook (optional) ----------
  app.get('/api/whatsapp/webhook', (req, res) => {
    if (config.wa.verifyToken && req.query['hub.mode'] === 'subscribe' && auth.safeEqual(req.query['hub.verify_token'], config.wa.verifyToken)) {
      return res.type('text/plain').send(String(req.query['hub.challenge']));
    }
    res.sendStatus(403);
  });

  app.post('/api/whatsapp/webhook', (req, res) => {
    if (config.wa.appSecret) {
      const expected = `sha256=${crypto.createHmac('sha256', config.wa.appSecret).update(req.rawBody || '').digest('hex')}`;
      if (!auth.safeEqual(req.headers['x-hub-signature-256'], expected)) return res.sendStatus(401);
    }
    res.sendStatus(200);
    const messages = [];
    for (const entry of (req.body && req.body.entry) || []) {
      for (const change of entry.changes || []) for (const m of (change.value && change.value.messages) || []) messages.push(m);
    }
    for (const m of messages) {
      const from = String(m.from || '').replace(/\D/g, '');
      const text = String((m.text && m.text.body) || '');
      const match = text.toUpperCase().match(/IPX-\d{6}-[A-Z0-9]{4}/);
      let o = null;
      if (match) o = db.get('SELECT * FROM orders WHERE code = ?', match[0]);
      else if (/\b(TRACK|STATUS|ORDER)\b/i.test(text)) o = db.get('SELECT * FROM orders WHERE phone = ? ORDER BY id DESC LIMIT 1', from);
      if (o && o.phone === from) wa.sendText(from, statusMessage(o));
      else if (match) wa.sendText(from, `For your privacy we can only share order updates with the phone number used for the order. Track online: ${config.baseUrl}/#/track`);
      else if (/\b(TRACK|STATUS|ORDER)\b/i.test(text)) wa.sendText(from, `We couldn't find an order for this number. Send "TRACK" followed by your order number, e.g. TRACK IPX-260929-AB12.`);
    }
  });

  // ---------- hero slider ----------
  const uploadsDir = config.dbFile === ':memory:' ? path.join(os.tmpdir(), 'iphix-uploads') : path.join(path.dirname(config.dbFile), 'uploads');
  fs.mkdirSync(uploadsDir, { recursive: true });
  app.use('/uploads', express.static(uploadsDir, { maxAge: '7d', fallthrough: false }));

  const slideView = (s) => ({ id: s.id, title: s.title, subtitle: s.subtitle, ctaLabel: s.cta_label, ctaLink: s.cta_link, image: s.image, sort: s.sort, active: !!s.active });

  function slideInput(body, existing = {}) {
    const v = (k, d = '') => (body[k] !== undefined ? body[k] : existing[k] !== undefined ? existing[k] : d);
    const title = str(v('title'), 80);
    if (title.length < 3) throw bad('Slide title is too short.');
    const image = str(v('image'), 500);
    if (!/^(\/(img|uploads)\/[\w./-]+|https:\/\/\S+)$/.test(image)) throw bad('Choose an uploaded photo or an https:// image link.');
    const link = str(v('ctaLink'), 200);
    if (link && !/^(#\/|\/|https:\/\/)/.test(link)) throw bad('Button link must start with #/, / or https://');
    return {
      title, subtitle: str(v('subtitle'), 200), cta_label: str(v('ctaLabel'), 30), cta_link: link, image,
      sort: Math.round(Number(v('sort', 0)) || 0), active: v('active', true) === false ? 0 : 1,
    };
  }

  app.get('/api/slides', (req, res) => {
    res.json({ slides: db.all('SELECT * FROM slides WHERE active = 1 ORDER BY sort, id').map(slideView) });
  });
  app.get('/api/admin/slides', requireAdmin, (req, res) => {
    res.json({ slides: db.all('SELECT * FROM slides ORDER BY sort, id').map(slideView) });
  });
  app.post('/api/admin/slides', requireAdmin, (req, res) => {
    const s = slideInput(req.body);
    if (!req.body.sort && req.body.sort !== 0) s.sort = (db.get('SELECT COALESCE(MAX(sort), -1) AS n FROM slides').n) + 1;
    const { lastInsertRowid } = db.run('INSERT INTO slides (title, subtitle, cta_label, cta_link, image, sort, active) VALUES (?, ?, ?, ?, ?, ?, ?)',
      s.title, s.subtitle, s.cta_label, s.cta_link, s.image, s.sort, s.active);
    res.status(201).json({ slide: slideView(db.get('SELECT * FROM slides WHERE id = ?', lastInsertRowid)) });
  });
  app.put('/api/admin/slides/:id', requireAdmin, (req, res, next) => {
    const cur = db.get('SELECT * FROM slides WHERE id = ?', Number(req.params.id));
    if (!cur) return next(new HttpError(404, 'Slide not found.'));
    const s = slideInput(req.body, slideView(cur));
    db.run('UPDATE slides SET title = ?, subtitle = ?, cta_label = ?, cta_link = ?, image = ?, sort = ?, active = ? WHERE id = ?',
      s.title, s.subtitle, s.cta_label, s.cta_link, s.image, s.sort, s.active, cur.id);
    res.json({ slide: slideView(db.get('SELECT * FROM slides WHERE id = ?', cur.id)) });
  });
  app.delete('/api/admin/slides/:id', requireAdmin, (req, res, next) => {
    const { changes } = db.run('DELETE FROM slides WHERE id = ?', Number(req.params.id));
    if (!changes) return next(new HttpError(404, 'Slide not found.'));
    res.json({ ok: true });
  });

  // Admin photo upload (JSON with a base64 data URL; no extra dependencies). Only real JPEG/PNG/WebP files are accepted.
  app.post('/api/admin/uploads', requireAdmin, (req, res) => {
    const m = /^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/=]+)$/.exec(String(req.body.data || ''));
    if (!m) throw bad('Upload a JPG, PNG or WebP photo.');
    const buf = Buffer.from(m[2], 'base64');
    if (buf.length > 5 * 1024 * 1024) throw bad('Photo is too large (max 5 MB).');
    const isJpeg = buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff;
    const isPng = buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
    const isWebp = buf.subarray(0, 4).toString() === 'RIFF' && buf.subarray(8, 12).toString() === 'WEBP';
    const ext = isJpeg ? 'jpg' : isPng ? 'png' : isWebp ? 'webp' : null;
    if (!ext) throw bad('That file is not a valid JPG, PNG or WebP image.');
    const name = `${Date.now().toString(36)}-${crypto.randomBytes(6).toString('hex')}.${ext}`;
    fs.writeFileSync(path.join(uploadsDir, name), buf);
    res.status(201).json({ url: `/uploads/${name}` });
  });

  // ---------- app icon & home-screen manifest ----------
  const FALLBACK_ICON = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" rx="22" fill="#e62e04"/><text x="50" y="70" font-size="60" font-family="Arial" font-weight="bold" fill="#fff" text-anchor="middle">i</text></svg>`;
  app.get('/app-icon', (req, res) => {
    const icon = brand.appIcon() || brand.mainLogo();
    res.set('Cache-Control', 'public, max-age=3600');
    if (icon) return res.type('image/png').sendFile(icon.file);
    res.type('image/svg+xml').send(FALLBACK_ICON);
  });
  app.get('/manifest.webmanifest', (req, res) => {
    const icon = brand.appIcon() || brand.mainLogo();
    res.type('application/manifest+json').json({
      name: config.storeName,
      short_name: 'IPHIX',
      description: 'Phone accessories, spare parts and repair services.',
      start_url: '/',
      display: 'standalone',
      background_color: '#ffffff',
      theme_color: '#e62e04',
      icons: icon
        ? [{ src: '/app-icon', sizes: `${icon.width}x${icon.height}`, type: 'image/png', purpose: 'any' }]
        : [{ src: '/app-icon', sizes: 'any', type: 'image/svg+xml' }],
    });
  });

  // ---------- static front-end ----------
  app.use(express.static(path.join(__dirname, '..', 'public'), { extensions: ['html'], maxAge: '1h' }));

  app.use('/api', (req, res, next) => next(new HttpError(404, 'Not found.')));

  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    const status = err.status || err.statusCode || 500;
    if (status >= 500) console.error(err);
    res.status(status).json({ error: status >= 500 ? 'Something went wrong. Please try again.' : err.message });
  });

  return app;
}

module.exports = { createApp, STATUSES, PAYMENT_STATUSES };
