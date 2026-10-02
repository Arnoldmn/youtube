'use strict';
const crypto = require('crypto');

const COOKIE = 'ipx_session';
const SESSION_DAYS = 30;

function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  const hash = crypto.scryptSync(password, salt, 64);
  return `scrypt$${salt.toString('hex')}$${hash.toString('hex')}`;
}

function verifyPassword(password, stored) {
  const [scheme, saltHex, hashHex] = String(stored).split('$');
  if (scheme !== 'scrypt' || !saltHex || !hashHex) return false;
  const expected = Buffer.from(hashHex, 'hex');
  const actual = crypto.scryptSync(password, Buffer.from(saltHex, 'hex'), expected.length);
  return crypto.timingSafeEqual(actual, expected);
}

function hmac(secret, data) {
  return crypto.createHmac('sha256', secret).update(data).digest('base64url');
}

function safeEqual(a, b) {
  const x = Buffer.from(String(a || ''));
  const y = Buffer.from(String(b || ''));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}

function createSessionToken(secret, user) {
  const exp = Date.now() + SESSION_DAYS * 864e5;
  const payload = `${user.id}.${user.token_version}.${exp}`;
  return `${payload}.${hmac(secret, payload)}`;
}

function readSessionToken(secret, token) {
  const parts = String(token || '').split('.');
  if (parts.length !== 4) return null;
  const [id, version, exp, sig] = parts;
  if (!safeEqual(sig, hmac(secret, `${id}.${version}.${exp}`))) return null;
  if (Number(exp) < Date.now()) return null;
  return { id: Number(id), version: Number(version) };
}

function parseCookies(header) {
  const out = {};
  for (const part of String(header || '').split(';')) {
    const i = part.indexOf('=');
    if (i > 0) out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
  }
  return out;
}

function sessionCookie(token, secure) {
  const attrs = [`${COOKIE}=${token}`, 'Path=/', 'HttpOnly', 'SameSite=Lax', `Max-Age=${token ? SESSION_DAYS * 86400 : 0}`];
  if (secure) attrs.push('Secure');
  return attrs.join('; ');
}

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
function randomCode(len) {
  const bytes = crypto.randomBytes(len);
  return Array.from(bytes, (b) => CODE_ALPHABET[b % CODE_ALPHABET.length]).join('');
}

function newReferralCode(db, name) {
  const prefix = (String(name).toUpperCase().replace(/[^A-Z]/g, '') || 'IPX').slice(0, 5);
  for (;;) {
    const code = `${prefix}${randomCode(4)}`;
    if (!db.get('SELECT 1 FROM users WHERE referral_code = ?', code)) return code;
  }
}

/** Tiny fixed-window rate limiter (per key). */
function rateLimiter({ windowMs, max }) {
  const hits = new Map();
  return (key) => {
    const now = Date.now();
    const entry = hits.get(key);
    if (!entry || entry.reset < now) {
      hits.set(key, { count: 1, reset: now + windowMs });
      if (hits.size > 10000) for (const [k, v] of hits) if (v.reset < now) hits.delete(k);
      return true;
    }
    entry.count += 1;
    return entry.count <= max;
  };
}

module.exports = {
  COOKIE, hashPassword, verifyPassword, hmac, safeEqual, createSessionToken, readSessionToken,
  parseCookies, sessionCookie, randomCode, newReferralCode, rateLimiter,
};
