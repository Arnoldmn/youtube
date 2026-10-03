// WhatsApp helpers: click-to-chat links (work with any WhatsApp number, no API needed)
// plus optional WhatsApp Business Cloud API messaging for automatic tracking replies.
const crypto = require("node:crypto");
const { statusInfo, ORDER_STATUSES } = require("../public/js/store.js");

const ORDER_ID_RE = /\bASW-[A-Z0-9]{6}\b/i;

/** Normalise to international digits-only format (what wa.me expects). Returns "" if invalid. */
function normalizePhone(input, defaultCountryCode = "") {
  let digits = String(input || "").replace(/\D/g, "");
  if (digits.startsWith("00")) digits = digits.slice(2);
  else if (digits.startsWith("0") && defaultCountryCode) digits = defaultCountryCode + digits.slice(1);
  return digits.length >= 8 && digits.length <= 15 ? digits : "";
}

const waLink = (phone, text) => `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;

const moneyFormatter = (config) => {
  const fmt = new Intl.NumberFormat(config.locale || "en-US", { style: "currency", currency: config.currency || "USD" });
  return (n) => fmt.format(n);
};

function itemLine(l, money) {
  const opts = [l.colorName, l.size != null ? `Size ${l.size}` : null].filter(Boolean).join(", ");
  return `• ${l.qty}× ${l.name} (${opts}) — ${money(l.lineTotal)}`;
}

/** The message the buyer sends to the shop when placing an order. */
function buildOrderMessage(order, config, trackUrl) {
  const money = moneyFormatter(config);
  const t = order.totals;
  return [
    `🛍️ *New order — ${config.storeName}*`,
    `Order: *${order.id}*`,
    "",
    `*Customer:* ${order.customer.name}`,
    `*WhatsApp:* +${order.customer.phone}`,
    `*Email:* ${order.customer.email}`,
    "",
    "*Items:*",
    ...order.items.map((l) => itemLine(l, money)),
    "",
    `Subtotal: ${money(t.subtotal)}`,
    ...(t.discount ? [`Discount (${t.promoCode}): −${money(t.discount)}`] : []),
    `Delivery: ${t.delivery ? money(t.delivery) : "Free"}`,
    `*Total: ${money(t.total)}*`,
    "",
    `*Payment:* ${order.payment}`,
    `*Deliver to:* ${order.delivery.address}, ${order.delivery.city}`,
    ...(order.delivery.notes ? [`*Notes:* ${order.delivery.notes}`] : []),
    "",
    `Track this order: ${trackUrl}`,
  ].join("\n");
}

/** Status update the shop sends to the buyer. */
function buildStatusMessage(order, config, trackUrl) {
  const info = statusInfo(order.status);
  const firstName = order.customer.name.split(" ")[0];
  const lastNote = order.history[order.history.length - 1]?.note;
  return [
    `Hi ${firstName}! 💕 Update on your ${config.storeName} order *${order.id}*:`,
    "",
    `*${info.label}* — ${info.text}`,
    ...(lastNote ? ["", lastNote] : []),
    "",
    `Track anytime: ${trackUrl}`,
  ].join("\n");
}

/** Message a buyer sends to ask for tracking (used for the "Track on WhatsApp" button). */
const buildTrackRequest = (orderId) => `Hi! Please send me an update on my order ${orderId} 📦`;

function statusLine(order) {
  const info = statusInfo(order.status);
  const step = ORDER_STATUSES.findIndex((s) => s.key === order.status);
  const progress = step >= 0 ? ` (${step + 1}/${ORDER_STATUSES.length})` : "";
  return `*${order.id}* — ${info.label}${progress}\n${info.text}`;
}

/**
 * Automatic reply for an incoming WhatsApp message (Cloud API webhook).
 * Only reveals orders that belong to the sender's phone number.
 */
function buildTrackingReply(text, fromPhone, orders, config, trackUrlFor) {
  const mine = orders.filter((o) => o.customer.phone === fromPhone).sort((a, b) => b.createdAt - a.createdAt);
  const match = String(text || "").match(ORDER_ID_RE);
  if (match) {
    const id = match[0].toUpperCase();
    const order = mine.find((o) => o.id === id);
    if (!order) {
      return `We couldn't find order ${id} for this number. For privacy, please message us from the WhatsApp number used at checkout.`;
    }
    return `${statusLine(order)}\n\nFull timeline: ${trackUrlFor(order.id)}`;
  }
  if (mine.length) {
    const recent = mine.slice(0, 3).map(statusLine).join("\n\n");
    return `Here's the latest on your ${config.storeName} orders 💕\n\n${recent}\n\nReply with an order number (e.g. ${mine[0].id}) for details.`;
  }
  return `Hi from ${config.storeName}! 💕 To track an order, reply with your order number (it looks like ASW-ABC123).`;
}

// ---------- Cloud API (optional) ----------

const cloudEnabled = (config) => Boolean(config.cloud.token && config.cloud.phoneNumberId);

async function sendCloudText(config, to, body, fetchImpl = globalThis.fetch) {
  if (!cloudEnabled(config)) return { ok: false, skipped: true };
  const url = `https://graph.facebook.com/${config.cloud.graphVersion}/${config.cloud.phoneNumberId}/messages`;
  try {
    const res = await fetchImpl(url, {
      method: "POST",
      headers: { Authorization: `Bearer ${config.cloud.token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ messaging_product: "whatsapp", to, type: "text", text: { body, preview_url: true } }),
    });
    if (!res.ok) return { ok: false, error: `WhatsApp API ${res.status}: ${(await res.text()).slice(0, 300)}` };
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

function verifySignature(rawBody, signatureHeader, appSecret) {
  if (!appSecret) return true; // signature check disabled
  if (!signatureHeader || !signatureHeader.startsWith("sha256=")) return false;
  const expected = Buffer.from(crypto.createHmac("sha256", appSecret).update(rawBody).digest("hex"), "hex");
  const given = Buffer.from(signatureHeader.slice(7), "hex");
  return given.length === expected.length && crypto.timingSafeEqual(given, expected);
}

/** Extract { from, text } text messages from a Cloud API webhook payload. */
function parseIncoming(payload) {
  const out = [];
  for (const entry of payload?.entry || []) {
    for (const change of entry.changes || []) {
      for (const m of change.value?.messages || []) {
        if (m.type === "text" && m.from) out.push({ from: String(m.from), text: m.text?.body || "" });
        else if (m.from) out.push({ from: String(m.from), text: "" });
      }
    }
  }
  return out;
}

module.exports = {
  ORDER_ID_RE,
  normalizePhone,
  waLink,
  buildOrderMessage,
  buildStatusMessage,
  buildTrackRequest,
  buildTrackingReply,
  cloudEnabled,
  sendCloudText,
  verifySignature,
  parseIncoming,
};
