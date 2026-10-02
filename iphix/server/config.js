'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const root = path.join(__dirname, '..');
const envFile = path.join(root, '.env');
if (fs.existsSync(envFile) && typeof process.loadEnvFile === 'function') process.loadEnvFile(envFile);

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
  whatsappNumber: digits(env.WHATSAPP_NUMBER) || '254700000000',
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
  wa: {
    token: env.WA_TOKEN || '',
    phoneNumberId: env.WA_PHONE_NUMBER_ID || '',
    verifyToken: env.WA_VERIFY_TOKEN || '',
    appSecret: env.WA_APP_SECRET || '',
    apiVersion: env.WA_API_VERSION || 'v21.0',
  },
};
