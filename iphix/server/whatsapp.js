'use strict';
// WhatsApp helpers: click-to-chat links (always available) and the optional WhatsApp Cloud API.

function waLink(number, text) {
  return `https://wa.me/${number}?text=${encodeURIComponent(text)}`;
}

function createWhatsApp(config) {
  const { token, phoneNumberId, apiVersion } = config.wa;
  const enabled = Boolean(token && phoneNumberId);

  async function sendText(to, body) {
    if (!enabled) return { skipped: true };
    try {
      const res = await fetch(`https://graph.facebook.com/${apiVersion}/${phoneNumberId}/messages`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ messaging_product: 'whatsapp', to, type: 'text', text: { body, preview_url: true } }),
      });
      if (!res.ok) {
        console.error('[whatsapp] send failed', res.status, await res.text());
        return { ok: false };
      }
      return { ok: true };
    } catch (err) {
      console.error('[whatsapp] send error', err.message);
      return { ok: false };
    }
  }

  return { enabled, sendText, link: waLink };
}

module.exports = { createWhatsApp, waLink };
