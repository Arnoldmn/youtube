'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const root = path.join(__dirname, '..');
const envFile = path.join(root, '.env');
// Load .env without overriding variables already set (e.g. in cPanel's Node.js App screen).
// Parsed by hand so it also works on Node versions without process.loadEnvFile.
if (fs.existsSync(envFile)) {
  for (const line of fs.readFileSync(envFile, 'utf8').split(/\r?\n/)) {
    const m = /^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/.exec(line);
    if (!m || line.trim().startsWith('#') || process.env[m[1]] !== undefined) continue;
    let value = m[2];
    if (/^(['"]).*\1$/.test(value)) value = value.slice(1, -1);
    else value = value.replace(/\s+#.*$/, '');
    process.env[m[1]] = value;
  }
}

const env = process.env;
const num = (v, d) => (v === undefined || v === '' ? d : Number(v));
const digits = (v) => String(v || '').replace(/\D/g, '');

const port = num(env.PORT, 3000);
const dbFile = env.DB_FILE
  ? (env.DB_FILE === ':memory:' ? ':memory:' : path.resolve(root, env.DB_FILE))
  : path.join(root, 'data', 'iphix.db');

function sessionSecret() {
  if (env.SESSION_SECRET) return env.SESSION_SECRET;
  // Development fallback: persist a generated secret next to the database so sessions survive restarts.
  if (dbFile === ':memory:') return crypto.randomBytes(32).toString('hex');
  const file = path.join(path.dirname(dbFile), '.session-secret');
  fs.mkdirSync(path.dirname(file), { recursive: true });
  if (!fs.existsSync(file)) fs.writeFileSync(file, crypto.randomBytes(32).toString('hex'), { mode: 0o600 });
  return fs.readFileSync(file, 'utf8').trim();
}

const baseUrl = (env.BASE_URL || `http://localhost:${port}`).replace(/\/+$/, '');

module.exports = {
  port,
  baseUrl,
  secureCookies: baseUrl.startsWith('https://'),
  storeName: env.STORE_NAME || 'IPHIX COMMUNICATIONS',
  storeAddress: env.STORE_ADDRESS || '',
  // IPHIX business WhatsApp: 0702 222272
  whatsappNumber: digits(env.WHATSAPP_NUMBER) || '254702222272',
  countryCode: digits(env.DEFAULT_COUNTRY_CODE) || '254',
  currency: env.CURRENCY || 'KES',
  deliveryFee: num(env.DELIVERY_FEE, 300),
  freeDeliveryOver: num(env.FREE_DELIVERY_OVER, 5000),
  wholesaleMinQty: num(env.WHOLESALE_MIN_QTY, 10),
  commissionPct: num(env.COMMISSION_PCT, 5),
  referralDiscountPct: num(env.REFERRAL_DISCOUNT_PCT, 3),
  minPayout: num(env.MIN_PAYOUT, 500),
  sessionSecret: sessionSecret(),
  dbFile,
  admin: {
    email: (env.ADMIN_EMAIL || 'admin@iphix.local').toLowerCase(),
    password: env.ADMIN_PASSWORD || 'ChangeMe123!',
  },
  mpesa: {
    // Daraja (Safaricom) credentials for STK push prompts.
    env: env.MPESA_ENV === 'production' ? 'production' : 'sandbox',
    consumerKey: env.MPESA_CONSUMER_KEY || '',
    consumerSecret: env.MPESA_CONSUMER_SECRET || '',
    shortcode: digits(env.MPESA_SHORTCODE),
    passkey: env.MPESA_PASSKEY || '',
    // CustomerPayBillOnline for a Paybill, CustomerBuyGoodsOnline for a Till (then MPESA_PARTY_B = till number).
    transactionType: env.MPESA_TRANSACTION_TYPE === 'CustomerBuyGoodsOnline' ? 'CustomerBuyGoodsOnline' : 'CustomerPayBillOnline',
    partyB: digits(env.MPESA_PARTY_B),
    // Fixed account reference (e.g. a bank collection account). Empty = use the order number.
    accountReference: (env.MPESA_ACCOUNT_REFERENCE || '').trim(),
    callbackUrl: env.MPESA_CALLBACK_URL || '',
    // IPHIX's Lipa na M-Pesa Paybill (Kingdom Bank KB M-Collection), shown to customers.
    // Set MPESA_PAYBILL= (empty) in .env to hide it.
    paybill: digits(env.MPESA_PAYBILL ?? '529914'),
    paybillAccount: (env.MPESA_PAYBILL_ACCOUNT ?? '638804').trim(),
    paybillName: env.MPESA_PAYBILL_NAME ?? 'KB M-Collection General Merchants (Kingdom Bank)',
  },
  wa: {
    token: env.WA_TOKEN || '',
    phoneNumberId: env.WA_PHONE_NUMBER_ID || '',
    verifyToken: env.WA_VERIFY_TOKEN || '',
    appSecret: env.WA_APP_SECRET || '',
    apiVersion: env.WA_API_VERSION || 'v21.0',
  },
};
