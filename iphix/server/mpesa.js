'use strict';
// Safaricom Daraja client: Lipa na M-Pesa Online (STK push) and STK status query.

const BASE_URLS = {
  sandbox: 'https://sandbox.safaricom.co.ke',
  production: 'https://api.safaricom.co.ke',
};

/** Daraja wants the timestamp in Kenyan time as YYYYMMDDHHmmss. */
function darajaTimestamp(date = new Date()) {
  const eat = new Date(date.getTime() + 3 * 3600e3);
  const p = (n) => String(n).padStart(2, '0');
  return `${eat.getUTCFullYear()}${p(eat.getUTCMonth() + 1)}${p(eat.getUTCDate())}${p(eat.getUTCHours())}${p(eat.getUTCMinutes())}${p(eat.getUTCSeconds())}`;
}

/** Safaricom numbers only: 2547XXXXXXXX or 2541XXXXXXXX. */
function isSafaricomNumber(phone) {
  return /^254(7|1)\d{8}$/.test(String(phone || ''));
}

function createMpesa(config, fetchImpl = globalThis.fetch) {
  const m = config.mpesa;
  const enabled = Boolean(m.consumerKey && m.consumerSecret && m.shortcode && m.passkey);
  const base = BASE_URLS[m.env] || BASE_URLS.sandbox;
  let token = null;
  let tokenExpires = 0;

  async function request(path, { method = 'POST', body, auth } = {}) {
    const res = await fetchImpl(base + path, {
      method,
      headers: { Authorization: auth, ...(body ? { 'Content-Type': 'application/json' } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
    const text = await res.text();
    let data;
    try { data = JSON.parse(text); } catch { data = { errorMessage: text.slice(0, 200) }; }
    return { ok: res.ok, status: res.status, data };
  }

  async function accessToken() {
    if (token && Date.now() < tokenExpires) return token;
    const basic = Buffer.from(`${m.consumerKey}:${m.consumerSecret}`).toString('base64');
    const r = await request('/oauth/v1/generate?grant_type=client_credentials', { method: 'GET', auth: `Basic ${basic}` });
    if (!r.ok || !r.data.access_token) throw new Error(`M-Pesa authentication failed (${r.status}). Check MPESA_CONSUMER_KEY/SECRET.`);
    token = r.data.access_token;
    tokenExpires = Date.now() + (Number(r.data.expires_in || 3599) - 60) * 1000;
    return token;
  }

  function password(timestamp) {
    return Buffer.from(`${m.shortcode}${m.passkey}${timestamp}`).toString('base64');
  }

  /** Sends the "enter your M-Pesa PIN" prompt to the customer's phone. */
  async function stkPush({ phone, amount, accountReference, description, callbackUrl }) {
    const timestamp = darajaTimestamp();
    const r = await request('/mpesa/stkpush/v1/processrequest', {
      auth: `Bearer ${await accessToken()}`,
      body: {
        BusinessShortCode: m.shortcode,
        Password: password(timestamp),
        Timestamp: timestamp,
        TransactionType: m.transactionType,
        Amount: Math.ceil(amount),
        PartyA: phone,
        PartyB: m.partyB || m.shortcode,
        PhoneNumber: phone,
        CallBackURL: callbackUrl,
        AccountReference: String(accountReference).slice(0, 12),
        TransactionDesc: String(description).slice(0, 13),
      },
    });
    if (!r.ok || String(r.data.ResponseCode) !== '0') {
      throw new Error(r.data.errorMessage || r.data.ResponseDescription || `M-Pesa request failed (${r.status}).`);
    }
    return { merchantRequestId: r.data.MerchantRequestID, checkoutRequestId: r.data.CheckoutRequestID, customerMessage: r.data.CustomerMessage };
  }

  /**
   * Asks Safaricom for the result of an STK push (used when the callback is late or lost).
   * Returns null while the customer has not finished, otherwise { resultCode, resultDesc }.
   */
  async function stkQuery(checkoutRequestId) {
    const timestamp = darajaTimestamp();
    const r = await request('/mpesa/stkpushquery/v1/query', {
      auth: `Bearer ${await accessToken()}`,
      body: { BusinessShortCode: m.shortcode, Password: password(timestamp), Timestamp: timestamp, CheckoutRequestID: checkoutRequestId },
    });
    if (r.data.ResultCode === undefined) return null; // e.g. "The transaction is being processed"
    return { resultCode: Number(r.data.ResultCode), resultDesc: r.data.ResultDesc || '' };
  }

  return { enabled, env: m.env, stkPush, stkQuery };
}

module.exports = { createMpesa, darajaTimestamp, isSafaricomNumber };
