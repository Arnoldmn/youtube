const test = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const wa = require("../server/whatsapp.js");

const config = { storeName: "Annie's Shoes World", currency: "USD", locale: "en-US", cloud: { token: "", phoneNumberId: "", graphVersion: "v21.0" } };
const order = {
  id: "ASW-ABC234",
  createdAt: 1,
  status: "pending",
  history: [{ status: "pending", at: 1, note: "" }],
  customer: { name: "Jane Wanjiru", email: "jane@example.com", phone: "254712345678" },
  items: [{ name: "Velvet Stiletto", colorName: "Blush", size: 7, qty: 2, lineTotal: 240 }],
  totals: { subtotal: 240, discount: 24, promoCode: "ANNIE10", delivery: 0, total: 216 },
  payment: "Mobile money (M-Pesa)",
  delivery: { address: "12 Riverside Dr", city: "Nairobi", notes: "Gate B" },
};

test("normalizePhone handles international and local formats", () => {
  assert.equal(wa.normalizePhone("+254 712-345-678"), "254712345678");
  assert.equal(wa.normalizePhone("00254712345678"), "254712345678");
  assert.equal(wa.normalizePhone("0712345678", "254"), "254712345678");
  assert.equal(wa.normalizePhone("123"), "");
  assert.equal(wa.normalizePhone(""), "");
});

test("waLink encodes the message", () => {
  const url = wa.waLink("254700000000", "Hi & bye #1");
  assert.equal(url, "https://wa.me/254700000000?text=Hi%20%26%20bye%20%231");
});

test("order message contains everything the shop needs", () => {
  const msg = wa.buildOrderMessage(order, config, "https://shop.test/#/track/ASW-ABC234");
  for (const s of ["ASW-ABC234", "Jane Wanjiru", "+254712345678", "2× Velvet Stiletto (Blush, Size 7)", "$240.00", "ANNIE10", "−$24.00", "Total: $216.00", "M-Pesa", "12 Riverside Dr, Nairobi", "Gate B", "https://shop.test/#/track/ASW-ABC234"]) {
    assert.ok(msg.includes(s), `missing ${s}`);
  }
});

test("status message uses first name, label and note", () => {
  const o = { ...order, status: "shipped", history: [...order.history, { status: "shipped", at: 2, note: "Rider arrives 2-4pm" }] };
  const msg = wa.buildStatusMessage(o, config, "https://shop.test/#/track/ASW-ABC234");
  assert.match(msg, /^Hi Jane!/);
  assert.match(msg, /Out for delivery/);
  assert.match(msg, /Rider arrives 2-4pm/);
});

test("tracking replies only reveal the sender's own orders", () => {
  const orders = [order, { ...order, id: "ASW-ZZZ999", customer: { ...order.customer, phone: "254799999999" } }];
  const url = (id) => `https://shop.test/#/track/${id}`;
  assert.match(wa.buildTrackingReply("where is asw-abc234?", "254712345678", orders, config, url), /ASW-ABC234\* — Order placed/);
  assert.match(wa.buildTrackingReply("ASW-ZZZ999", "254712345678", orders, config, url), /couldn't find/);
  assert.match(wa.buildTrackingReply("hello", "254712345678", orders, config, url), /latest on your/);
  assert.match(wa.buildTrackingReply("hello", "254700000001", orders, config, url), /reply with your order number/);
});

test("webhook signature verification and parsing", () => {
  const body = Buffer.from(JSON.stringify({ entry: [{ changes: [{ value: { messages: [{ from: "254712345678", type: "text", text: { body: "ASW-ABC234" } }] } }] }] }));
  const sig = "sha256=" + crypto.createHmac("sha256", "secret").update(body).digest("hex");
  assert.ok(wa.verifySignature(body, sig, "secret"));
  assert.ok(!wa.verifySignature(body, "sha256=00", "secret"));
  assert.ok(!wa.verifySignature(body, undefined, "secret"));
  assert.deepEqual(wa.parseIncoming(JSON.parse(body)), [{ from: "254712345678", text: "ASW-ABC234" }]);
});

test("sendCloudText posts to the Graph API when configured", async () => {
  const calls = [];
  const fakeFetch = async (url, opts) => (calls.push({ url, opts }), { ok: true, text: async () => "" });
  const skipped = await wa.sendCloudText(config, "254712345678", "hi", fakeFetch);
  assert.ok(skipped.skipped);
  const cfg = { ...config, cloud: { ...config.cloud, token: "T", phoneNumberId: "123" } };
  const res = await wa.sendCloudText(cfg, "254712345678", "hi", fakeFetch);
  assert.ok(res.ok);
  assert.equal(calls[0].url, "https://graph.facebook.com/v21.0/123/messages");
  assert.equal(JSON.parse(calls[0].opts.body).to, "254712345678");
  assert.equal(calls[0].opts.headers.Authorization, "Bearer T");
});
