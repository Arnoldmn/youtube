// Password hashing (scrypt) and opaque session tokens. Only token hashes are stored.
const crypto = require("node:crypto");

const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
const ADMIN_TTL_MS = 12 * 60 * 60 * 1000; // 12 hours

function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  const hash = crypto.scryptSync(password, salt, 64);
  return `scrypt$${salt.toString("hex")}$${hash.toString("hex")}`;
}

function verifyPassword(password, stored) {
  const [scheme, saltHex, hashHex] = String(stored).split("$");
  if (scheme !== "scrypt" || !saltHex || !hashHex) return false;
  const expected = Buffer.from(hashHex, "hex");
  const actual = crypto.scryptSync(password, Buffer.from(saltHex, "hex"), expected.length);
  return crypto.timingSafeEqual(expected, actual);
}

const sha256 = (s) => crypto.createHash("sha256").update(s).digest("hex");

function safeEqual(a, b) {
  const ha = Buffer.from(sha256(String(a)), "hex");
  const hb = Buffer.from(sha256(String(b)), "hex");
  return crypto.timingSafeEqual(ha, hb);
}

function createSession(db, { userId = null, admin = false }) {
  const token = crypto.randomBytes(32).toString("base64url");
  const now = Date.now();
  db.sessions.push({
    tokenHash: sha256(token),
    userId,
    admin,
    createdAt: now,
    expiresAt: now + (admin ? ADMIN_TTL_MS : SESSION_TTL_MS),
  });
  // Drop expired sessions while we're here.
  db.data.sessions = db.sessions.filter((s) => s.expiresAt > now);
  return token;
}

function findSession(db, token) {
  if (!token) return null;
  const hash = sha256(token);
  const s = db.sessions.find((x) => x.tokenHash === hash);
  return s && s.expiresAt > Date.now() ? s : null;
}

function destroySession(db, token) {
  if (!token) return;
  const hash = sha256(token);
  db.data.sessions = db.sessions.filter((s) => s.tokenHash !== hash);
}

module.exports = { hashPassword, verifyPassword, safeEqual, createSession, findSession, destroySession, SESSION_TTL_MS, ADMIN_TTL_MS };
