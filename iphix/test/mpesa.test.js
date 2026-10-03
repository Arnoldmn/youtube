'use strict';
process.env.DB_FILE = ':memory:';
process.env.SESSION_SECRET = 'test-secret';
process.env.WHATSAPP_NUMBER = '254711000000';
process.env.ADMIN_EMAIL = 'admin@test.local';
process.env.ADMIN_PASSWORD = 'AdminPass123';
process.env.BASE_URL = 'https://shop.example.com';
process.env.MPESA_ENV = 'sandbox';
process.env.MPESA_CONSUMER_KEY = 'key';
process.env.MPESA_CONSUMER_SECRET = 'secret';
process.env.MPESA_SHORTCODE = '174379';
process.env.MPESA_PASSKEY = 'passkey';
process.env.MPESA_PAYBILL = '529914';
process.env.MPESA_PAYBILL_ACCOUNT = '638804';

const test = require('node:test');
const assert = require('node:assert/strict');
const config = require('../server/config');
const auth = require('../server/auth');
const { openDb } = require('../server/db');
const { seed } = require('../server/seed');
const { createApp } = require('../server/app');
const { createMpesa, darajaTimestamp } = require('../server/mpesa');

// Fake Safaricom Daraja API.
const daraja = { pushes: [], queryResult: null, tokenCalls: 0 };
async function fakeFetch(url, opts) {
  const reply = (body, status = 200) => ({ ok: status < 400, status, text: async () => JSON.stringify(body) });
  if (url.includes('/oauth/v1/generate')) {
    daraja.tokenCalls += 1;
    assert.equal(opts.headers.Authorization, `Basic ${Buffer.from('key:secret').toString('base64')}`);
    return reply({ access_token: 'tok', expires_in: '3599' });
  }
  assert.equal(opts.headers.Authorization, 'Bearer tok');
  const body = JSON.parse(opts.body);
  if (url.includes('/stkpush/v1/processrequest')) {
    daraja.pushes.push(body);
    return reply({ MerchantRequestID: 'm1', CheckoutRequestID: `ws_CO_${daraja.pushes.length}`, ResponseCode: '0', CustomerMessage: 'Success. Request accepted for processing' });
  }
  if (url.includes('/stkpushquery/v1/query')) {
    return daraja.queryResult ? reply(daraja.queryResult) : reply({ errorCode: '500.001.1001', errorMessage: 'The transaction is being processed' }, 500);
  }
  throw new Error(`unexpected url ${url}`);
}

let base;
let server;
let db;
const callbackToken = auth.hmac('test-secret', 'mpesa-callback').replace(/[^A-Za-z0-9]/g, '').slice(0, 32);

test.before(async () => {
  db = openDb(':memory:');
  seed(db, config);
  server = createApp({ db, config, mpesa: createMpesa(config, fakeFetch) }).listen(0);
  await new Promise((r) => server.once('listening', r));
  base = `http://127.0.0.1:${server.address().port}`;
});
test.after(() => server.close());

function client() {
  let cookie = '';
  return async (path, { method = 'GET', body } = {}) => {
    const res = await fetch(base + path, {
      method,
      headers: { ...(body ? { 'Content-Type': 'application/json' } : {}), ...(cookie ? { Cookie: cookie } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
    const set = res.headers.get('set-cookie');
    if (set) cookie = set.split(';')[0];
    return { status: res.status, data: await res.json().catch(() => ({})) };
  };
}

let n = 0;
async function newCustomerWithOrder() {
  n += 1;
  const c = client();
  const phone = `07120000${String(n).padStart(2, '0')}`;
  await c('/api/auth/register', { method: 'POST', body: { name: `Mary Mpesa${n}`, email: `m${n}@example.com`, phone, password: 'password123' } });
  const { data } = await c('/api/products?section=accessories&limit=1');
  const placed = await c('/api/orders', {
    method: 'POST',
    body: { items: [{ productId: data.products[0].id, qty: 1 }], customer: { name: 'Mary', phone }, deliveryMethod: 'pickup', paymentMethod: 'mpesa' },
  });
  assert.equal(placed.status, 201);
  return { c, order: placed.data.order, phone: `254${phone.slice(1)}` };
}

const callback = (checkoutId, resultCode, items = []) => client()(`/api/mpesa/callback/${callbackToken}`, {
  method: 'POST',
  body: { Body: { stkCallback: { MerchantRequestID: 'm1', CheckoutRequestID: checkoutId, ResultCode: resultCode, ResultDesc: resultCode ? 'Request cancelled by user' : 'The service request is processed successfully.', ...(items.length ? { CallbackMetadata: { Item: items } } : {}) } } },
});

test('timestamp is in Kenyan time', () => {
  assert.equal(darajaTimestamp(new Date('2026-10-03T21:30:05Z')), '20261004003005');
});

test('config exposes paybill and STK availability', async () => {
  const { data } = await client()('/api/config');
  assert.deepEqual(data.mpesa, { stkEnabled: true, sandbox: true, paybill: '529914', account: '638804', name: '' });
});

test('STK push → successful callback marks the order paid and confirmed (idempotent)', async () => {
  const { c, order, phone } = await newCustomerWithOrder();
  assert.equal(order.paymentStatus, 'unpaid');
  assert.ok(decodeURIComponent(order.whatsappUrl).includes('Paybill 529914, Account 638804'));

  // Non-Safaricom numbers are rejected before calling Daraja.
  assert.equal((await c(`/api/orders/${order.code}/mpesa/stk`, { method: 'POST', body: { phone: '+255712345678' } })).status, 400);

  const r = await c(`/api/orders/${order.code}/mpesa/stk`, { method: 'POST', body: { phone: '0712 000 001' } });
  assert.equal(r.status, 201);
  const push = daraja.pushes.at(-1);
  assert.equal(push.Amount, order.total);
  assert.equal(push.PartyA, '254712000001');
  assert.equal(push.PhoneNumber, '254712000001');
  assert.equal(push.BusinessShortCode, '174379');
  assert.equal(push.TransactionType, 'CustomerPayBillOnline');
  assert.equal(push.Password, Buffer.from(`174379passkey${push.Timestamp}`).toString('base64'));
  assert.equal(push.CallBackURL, `https://shop.example.com/api/mpesa/callback/${callbackToken}`);
  assert.equal(push.AccountReference, order.code.replace('IPX-', '').replace('-', ''));

  // A second prompt within 20s is throttled.
  assert.equal((await c(`/api/orders/${order.code}/mpesa/stk`, { method: 'POST', body: { phone } })).status, 429);

  // Forged callbacks (wrong secret path) are ignored.
  assert.equal((await client()('/api/mpesa/callback/wrong', { method: 'POST', body: {} })).status, 404);

  const items = [{ Name: 'Amount', Value: order.total }, { Name: 'MpesaReceiptNumber', Value: 'TJ4AB1CD2E' }, { Name: 'PhoneNumber', Value: 254712000001 }];
  assert.deepEqual((await callback(r.data.payment.checkoutRequestId, 0, items)).data, { ResultCode: 0, ResultDesc: 'Accepted' });
  await callback(r.data.payment.checkoutRequestId, 0, items); // Safaricom retry

  const after = await c(`/api/orders/${order.code}/payment`);
  assert.equal(after.data.payment.status, 'paid');
  assert.equal(after.data.order.paymentStatus, 'paid');
  assert.equal(after.data.order.amountPaid, order.total);
  assert.equal(after.data.order.mpesaReceipt, 'TJ4AB1CD2E');
  assert.equal(after.data.order.status, 'confirmed');
  assert.equal(after.data.order.canCancel, false);

  // Paid orders cannot be charged again.
  assert.equal((await c(`/api/orders/${order.code}/mpesa/stk`, { method: 'POST', body: { phone } })).status, 400);
});

test('cancelled prompt leaves the order unpaid', async () => {
  const { c, order, phone } = await newCustomerWithOrder();
  const r = await c(`/api/orders/${order.code}/mpesa/stk`, { method: 'POST', body: { phone } });
  await callback(r.data.payment.checkoutRequestId, 1032);
  const after = await c(`/api/orders/${order.code}/payment`);
  assert.equal(after.data.payment.status, 'cancelled');
  assert.equal(after.data.order.paymentStatus, 'unpaid');
  assert.equal(after.data.order.status, 'pending');
});

test('status query fallback confirms payment when the callback never arrives', async () => {
  const { c, order, phone } = await newCustomerWithOrder();
  const r = await c(`/api/orders/${order.code}/mpesa/stk`, { method: 'POST', body: { phone } });
  db.run("UPDATE mpesa_payments SET created_at = datetime('now', '-30 seconds') WHERE checkout_request_id = ?", r.data.payment.checkoutRequestId);

  daraja.queryResult = null; // still processing
  assert.equal((await c(`/api/orders/${order.code}/payment`)).data.payment.status, 'pending');

  db.run('UPDATE mpesa_payments SET last_query_at = 0 WHERE checkout_request_id = ?', r.data.payment.checkoutRequestId);
  daraja.queryResult = { ResponseCode: '0', ResultCode: '0', ResultDesc: 'The service request is processed successfully.' };
  const after = await c(`/api/orders/${order.code}/payment`);
  assert.equal(after.data.payment.status, 'paid');
  assert.equal(after.data.order.paymentStatus, 'paid');
  assert.equal(after.data.order.status, 'confirmed');

  // The late callback still fills in the receipt number without double-counting.
  await callback(r.data.payment.checkoutRequestId, 0, [{ Name: 'Amount', Value: order.total }, { Name: 'MpesaReceiptNumber', Value: 'TJ5ZZ1CD2E' }]);
  const final = await c(`/api/orders/${order.code}/payment`);
  assert.equal(final.data.order.mpesaReceipt, 'TJ5ZZ1CD2E');
  assert.equal(final.data.order.amountPaid, order.total);
  daraja.queryResult = null;
});

test('manual Paybill code → verifying → admin confirms', async () => {
  const { c, order } = await newCustomerWithOrder();
  assert.equal((await c(`/api/orders/${order.code}/mpesa/confirm`, { method: 'POST', body: { receipt: 'abc' } })).status, 400);
  const sent = await c(`/api/orders/${order.code}/mpesa/confirm`, { method: 'POST', body: { receipt: 'tk7ab1cd2e' } });
  assert.equal(sent.status, 200);
  assert.equal(sent.data.order.paymentStatus, 'verifying');
  assert.equal(sent.data.order.mpesaReceipt, 'TK7AB1CD2E');
  // Customer can no longer cancel online once a payment is claimed.
  assert.equal((await c(`/api/orders/${order.code}/cancel`, { method: 'POST', body: {} })).status, 400);

  // The same code cannot be reused on another order.
  const other = await newCustomerWithOrder();
  assert.equal((await other.c(`/api/orders/${other.order.code}/mpesa/confirm`, { method: 'POST', body: { receipt: 'TK7AB1CD2E' } })).status, 400);

  // Strangers cannot see or pay someone else's order without the signed link.
  assert.equal((await client()(`/api/orders/${order.code}/payment`)).status, 404);
  const t = new URL(order.receiptUrl).searchParams.get('t');
  assert.equal((await client()(`/api/orders/${order.code}/payment?t=${t}`)).status, 200);

  const admin = client();
  await admin('/api/auth/login', { method: 'POST', body: { identifier: 'admin@test.local', password: 'AdminPass123' } });
  assert.equal((await c(`/api/admin/orders/${order.code}/payment`, { method: 'PUT', body: { status: 'paid' } })).status, 403);
  const ok = await admin(`/api/admin/orders/${order.code}/payment`, { method: 'PUT', body: { status: 'paid' } });
  assert.equal(ok.data.order.paymentStatus, 'paid');
  assert.equal(ok.data.order.status, 'confirmed');
  assert.ok(ok.data.customerWhatsappUrl.includes('wa.me/'));
});

test('STK is refused cleanly when Daraja is not configured', async () => {
  const d = openDb(':memory:');
  seed(d, config);
  const s = createApp({ db: d, config, mpesa: { enabled: false } }).listen(0);
  await new Promise((r) => s.once('listening', r));
  const old = base;
  base = `http://127.0.0.1:${s.address().port}`;
  try {
    const { c, order } = await newCustomerWithOrder();
    const r = await c(`/api/orders/${order.code}/mpesa/stk`, { method: 'POST', body: {} });
    assert.equal(r.status, 400);
    assert.match(r.data.error, /Paybill 529914, Account 638804/);
  } finally {
    s.close();
    base = old;
  }
});
