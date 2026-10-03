'use strict';
process.env.DB_FILE = ':memory:';
process.env.SESSION_SECRET = 'test-secret';
process.env.WHATSAPP_NUMBER = '254711000000';
process.env.ADMIN_EMAIL = 'admin@test.local';
process.env.ADMIN_PASSWORD = 'AdminPass123';
process.env.COMMISSION_PCT = '5';
process.env.REFERRAL_DISCOUNT_PCT = '3';
process.env.MIN_PAYOUT = '50';

const test = require('node:test');
const assert = require('node:assert/strict');
const config = require('../server/config');
const { openDb } = require('../server/db');
const { seed } = require('../server/seed');
const { createApp } = require('../server/app');

let server;
let base;

test.before(async () => {
  const db = openDb(':memory:');
  seed(db, config);
  server = createApp({ db, config }).listen(0);
  await new Promise((r) => server.once('listening', r));
  base = `http://127.0.0.1:${server.address().port}`;
});
test.after(() => server.close());

function client() {
  let cookie = '';
  return async (path, { method = 'GET', body, raw = false } = {}) => {
    const res = await fetch(base + path, {
      method,
      headers: { ...(body ? { 'Content-Type': 'application/json' } : {}), ...(cookie ? { Cookie: cookie } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
    const set = res.headers.get('set-cookie');
    if (set) cookie = set.split(';')[0];
    if (raw) return res;
    return { status: res.status, data: await res.json() };
  };
}

test('catalogue lists sections, brands and products', async () => {
  const c = client();
  const { data } = await c('/api/catalog');
  assert.deepEqual(data.sections.map((s) => s.key), ['accessories', 'spares', 'services']);
  assert.ok(data.brands.find((b) => b.slug === 'iphone').parts.some((p) => p.label === 'Back glass'));
  const screens = await c('/api/products?brand=samsung&part=screen');
  assert.ok(screens.data.total > 0);
  const search = await c('/api/products?q=iphone%2011%20battery');
  assert.ok(search.data.products.some((p) => p.name === 'iPhone 11 Replacement Battery'));
  const img = await c(`/img/p/${screens.data.products[0].id}.svg`, { raw: true });
  assert.equal(img.headers.get('content-type'), 'image/svg+xml; charset=utf-8');
});

test('full flow: register via referral, checkout, receipt, tracking, delivery commission and payout', async () => {
  const promoter = client();
  const reg1 = await promoter('/api/auth/register', { method: 'POST', body: { name: 'Pat Promoter', email: 'pat@example.com', phone: '0722000001', password: 'password123' } });
  assert.equal(reg1.status, 201);
  const code = reg1.data.user.referralCode;
  assert.equal(reg1.data.user.phone, '254722000001');

  const buyer = client();
  assert.equal((await buyer('/api/ref/click', { method: 'POST', body: { code } })).data.valid, true);
  const reg2 = await buyer('/api/auth/register', { method: 'POST', body: { name: 'Bo Buyer', email: 'bo@example.com', phone: '+254 733 000 002', password: 'password123', ref: code } });
  assert.equal(reg2.status, 201);

  // Duplicate registration and bad login are rejected.
  assert.equal((await client()('/api/auth/register', { method: 'POST', body: { name: 'X', email: 'bo@example.com', phone: '0700000009', password: 'password123' } })).status, 400);
  assert.equal((await client()('/api/auth/login', { method: 'POST', body: { identifier: 'bo@example.com', password: 'nope' } })).status, 401);
  // Login with phone works.
  assert.equal((await client()('/api/auth/login', { method: 'POST', body: { identifier: '0733000002', password: 'password123' } })).status, 200);

  // Checkout requires auth.
  assert.equal((await client()('/api/orders', { method: 'POST', body: {} })).status, 401);

  const { data: list } = await buyer('/api/products?section=spares&sort=price-desc&limit=1');
  const product = list.products[0];
  const items = [{ productId: product.id, qty: 2 }];
  const quote = await buyer('/api/cart/quote', { method: 'POST', body: { items, deliveryMethod: 'pickup' } });
  assert.equal(quote.data.subtotal, product.price * 2);
  assert.equal(quote.data.discount, Math.round(product.price * 2 * 0.03));
  assert.equal(quote.data.deliveryFee, 0);
  assert.equal(quote.data.referral.code, code);

  const placed = await buyer('/api/orders', {
    method: 'POST',
    body: { items, customer: { name: 'Bo Buyer', phone: '0733000002' }, deliveryMethod: 'pickup', paymentMethod: 'mpesa', notes: 'Black colour' },
  });
  assert.equal(placed.status, 201);
  const order = placed.data.order;
  assert.match(order.code, /^IPX-\d{6}-[A-Z0-9]{4}$/);
  assert.equal(order.total, quote.data.total);
  assert.ok(order.whatsappUrl.startsWith('https://wa.me/254711000000?text='));
  assert.ok(decodeURIComponent(order.whatsappUrl).includes(order.code));
  assert.ok(decodeURIComponent(order.whatsappUrl).includes('receipt.pdf'));

  // Stock decremented.
  const after = await buyer(`/api/products/${product.slug}`);
  assert.equal(after.data.product.stock, product.stock - 2);

  // PDF receipt: owner can fetch, stranger needs the signed token.
  const pdf = await buyer(`/api/orders/${order.code}/receipt.pdf`, { raw: true });
  assert.equal(pdf.status, 200);
  assert.equal(pdf.headers.get('content-type'), 'application/pdf');
  assert.equal(Buffer.from(await pdf.arrayBuffer()).subarray(0, 5).toString(), '%PDF-');
  assert.equal((await client()(`/api/orders/${order.code}/receipt.pdf`, { raw: true })).status, 404);
  const token = new URL(order.receiptUrl).searchParams.get('t');
  assert.equal((await client()(`/api/orders/${order.code}/receipt.pdf?t=${token}`, { raw: true })).status, 200);

  // Public tracking by order number + phone.
  assert.equal((await client()('/api/track', { method: 'POST', body: { code: order.code, phone: '0700000000' } })).status, 404);
  const tracked = await client()('/api/track', { method: 'POST', body: { code: order.code.toLowerCase(), phone: '0733000002' } });
  assert.equal(tracked.data.order.status, 'pending');

  // Promoter sees the pending commission.
  let aff = await promoter('/api/affiliate');
  const expectedCommission = Math.round((quote.data.subtotal - quote.data.discount) * 0.05);
  assert.equal(aff.data.stats.pending, expectedCommission);
  assert.equal(aff.data.stats.clicks, 1);
  assert.equal(aff.data.stats.signups, 1);

  // Non-admins cannot use admin APIs.
  assert.equal((await buyer('/api/admin/orders')).status, 403);

  const admin = client();
  assert.equal((await admin('/api/auth/login', { method: 'POST', body: { identifier: 'admin@test.local', password: 'AdminPass123' } })).status, 200);
  const upd = await admin(`/api/admin/orders/${order.code}/status`, { method: 'PUT', body: { status: 'ready_for_pickup', note: 'Come any time before 7pm' } });
  assert.equal(upd.status, 200);
  assert.ok(upd.data.customerWhatsappUrl.startsWith('https://wa.me/254733000002?text='));
  assert.equal((await admin(`/api/admin/orders/${order.code}/status`, { method: 'PUT', body: { status: 'delivered' } })).status, 200);
  assert.equal((await admin(`/api/admin/orders/${order.code}/status`, { method: 'PUT', body: { status: 'cancelled' } })).status, 400);

  aff = await promoter('/api/affiliate');
  assert.equal(aff.data.stats.available, expectedCommission);
  assert.equal(aff.data.stats.pending, 0);

  // Payout request cannot exceed balance; valid request reduces availability.
  assert.equal((await promoter('/api/affiliate/payouts', { method: 'POST', body: { amount: expectedCommission + 1, account: '0722000001' } })).status, 400);
  assert.equal((await promoter('/api/affiliate/payouts', { method: 'POST', body: { amount: expectedCommission, account: '0722000001' } })).status, 201);
  aff = await promoter('/api/affiliate');
  assert.equal(aff.data.stats.available, 0);
  const payouts = await admin('/api/admin/payouts');
  assert.equal((await admin(`/api/admin/payouts/${payouts.data.payouts[0].id}`, { method: 'PUT', body: { status: 'paid' } })).status, 200);
  aff = await promoter('/api/affiliate');
  assert.equal(aff.data.stats.paid, expectedCommission);

  // Second order: no referral discount, commission still tracked (lifetime referral).
  const second = await buyer('/api/cart/quote', { method: 'POST', body: { items: [{ productId: product.id, qty: 1 }] } });
  assert.equal(second.data.discount, 0);
  assert.equal(second.data.referral.code, code);
});

test('customer can cancel a pending order and stock is restored', async () => {
  const c = client();
  await c('/api/auth/register', { method: 'POST', body: { name: 'Cy Cancel', email: 'cy@example.com', phone: '0744000003', password: 'password123' } });
  const { data: list } = await c('/api/products?section=accessories&limit=1');
  const p = list.products[0];
  const placed = await c('/api/orders', {
    method: 'POST',
    body: { items: [{ productId: p.id, qty: 1 }], customer: { name: 'Cy', phone: '0744000003', city: 'Nairobi', address: 'Moi Avenue' }, deliveryMethod: 'delivery', paymentMethod: 'cod' },
  });
  assert.equal(placed.status, 201);
  assert.equal(placed.data.order.deliveryFee, p.price >= config.freeDeliveryOver ? 0 : config.deliveryFee);
  const cancelled = await c(`/api/orders/${placed.data.order.code}/cancel`, { method: 'POST', body: {} });
  assert.equal(cancelled.data.order.status, 'cancelled');
  assert.equal((await c(`/api/products/${p.slug}`)).data.product.stock, p.stock);
});

test('orders validate stock, wholesale pricing and delivery details', async () => {
  const c = client();
  await c('/api/auth/register', { method: 'POST', body: { name: 'Wes Wholesale', email: 'wes@example.com', phone: '0755000004', password: 'password123' } });
  const { data } = await c('/api/products?section=accessories&sort=price-asc&limit=60');
  const p = data.products.find((x) => x.stock >= 10 && x.wholesalePrice);
  const q = await c('/api/cart/quote', { method: 'POST', body: { items: [{ productId: p.id, qty: 10 }] } });
  assert.equal(q.data.lines[0].unitPrice, p.wholesalePrice);
  assert.equal((await c('/api/cart/quote', { method: 'POST', body: { items: [{ productId: p.id, qty: p.stock + 1 }] } })).status, 400);
  const noAddress = await c('/api/orders', { method: 'POST', body: { items: [{ productId: p.id, qty: 1 }], customer: { name: 'Wes', phone: '0755000004' }, deliveryMethod: 'delivery', paymentMethod: 'cod' } });
  assert.equal(noAddress.status, 400);
  // Non-JSON writes are refused (CSRF defence).
  const form = await fetch(`${base}/api/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: 'identifier=a&password=b' });
  assert.equal(form.status, 415);
});

test('WhatsApp webhook verification', async () => {
  const c = client();
  const res = await c('/api/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=wrong&hub.challenge=123', { raw: true });
  assert.equal(res.status, 403);
});

test('IPHIX Paybill 529914 / Account 638804 is built into payments by default', async () => {
  const { data } = await client()('/api/config');
  assert.equal(data.mpesa.paybill, '529914');
  assert.equal(data.mpesa.account, '638804');
  assert.match(data.mpesa.name, /Kingdom Bank/);
});

test('hero slider: default slides, admin edits and photo uploads', async () => {
  const pub = await client()('/api/slides');
  assert.equal(pub.data.slides.length, 6);
  assert.ok(pub.data.slides.every((s) => s.image.startsWith('/img/slides/')));

  const shopper = client();
  await shopper('/api/auth/register', { method: 'POST', body: { name: 'Sam Slider', email: 'sam@example.com', phone: '0766000006', password: 'password123' } });
  assert.equal((await shopper('/api/admin/slides', { method: 'POST', body: { title: 'Hack', image: '/img/x.svg' } })).status, 403);

  const admin = client();
  await admin('/api/auth/login', { method: 'POST', body: { identifier: 'admin@test.local', password: 'AdminPass123' } });

  // Upload: real PNG accepted, fake "image" rejected.
  const png = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
  const up = await admin('/api/admin/uploads', { method: 'POST', body: { data: `data:image/png;base64,${png}` } });
  assert.equal(up.status, 201);
  assert.match(up.data.url, /^\/uploads\/[\w-]+\.png$/);
  const served = await fetch(base + up.data.url);
  assert.equal(served.status, 200);
  assert.equal(served.headers.get('content-type'), 'image/png');
  const fake = Buffer.from('<script>alert(1)</script>').toString('base64');
  assert.equal((await admin('/api/admin/uploads', { method: 'POST', body: { data: `data:image/png;base64,${fake}` } })).status, 400);

  // Unsafe links/images are refused.
  assert.equal((await admin('/api/admin/slides', { method: 'POST', body: { title: 'Bad link', image: up.data.url, ctaLink: 'javascript:alert(1)' } })).status, 400);
  assert.equal((await admin('/api/admin/slides', { method: 'POST', body: { title: 'Bad image', image: 'http://insecure.example/x.jpg' } })).status, 400);

  const created = await admin('/api/admin/slides', { method: 'POST', body: { title: 'New iPhone 15 screens', subtitle: 'In stock now', ctaLabel: 'Shop', ctaLink: '#/brand/iphone', image: up.data.url } });
  assert.equal(created.status, 201);
  assert.equal(created.data.slide.sort, 6);
  assert.equal((await client()('/api/slides')).data.slides.length, 7);

  await admin(`/api/admin/slides/${created.data.slide.id}`, { method: 'PUT', body: { active: false } });
  assert.equal((await client()('/api/slides')).data.slides.length, 6);
  assert.equal((await admin(`/api/admin/slides/${created.data.slide.id}`, { method: 'DELETE' })).status, 200);
  assert.equal((await admin('/api/admin/slides')).data.slides.length, 6);
});

test('app icon and manifest fall back cleanly when the logo PNGs are not uploaded yet', async () => {
  const icon = await fetch(`${base}/app-icon`);
  assert.equal(icon.status, 200);
  const manifest = await (await fetch(`${base}/manifest.webmanifest`)).json();
  assert.equal(manifest.short_name, 'IPHIX');
  assert.equal(manifest.icons[0].src, '/app-icon');
  const { data } = await client()('/api/config');
  assert.ok('brand' in data);
});
