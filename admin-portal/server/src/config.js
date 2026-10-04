import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

// The project root (admin-portal/) holds .env, data/ and the built client.
export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
dotenv.config({ path: path.join(ROOT, ".env"), quiet: true });

const env = process.env;
const isProd = env.NODE_ENV === "production";
const bool = (v, fallback) => (v === undefined || v === "" ? fallback : /^(1|true|yes|on)$/i.test(v));
const resolve = (p) => (path.isAbsolute(p) ? p : path.resolve(ROOT, p));

const DEV_SECRET = "dev-only-secret-change-me";

export const config = {
  isProd,
  port: Number(env.PORT) || 4000,
  jwtSecret: env.JWT_SECRET || DEV_SECRET,
  sessionDays: Number(env.SESSION_DAYS) || 7,
  dbPath: resolve(env.DATABASE_PATH || "./data/portal.db"),
  uploadDir: resolve(env.UPLOAD_DIR || "./data/uploads"),
  clientDist: path.join(ROOT, "client", "dist"),
  admin: {
    name: env.ADMIN_NAME || "Alex Rivera",
    email: (env.ADMIN_EMAIL || "admin@linguaops.local").toLowerCase(),
    password: env.ADMIN_PASSWORD || (isProd ? "" : "admin12345"),
  },
  seedDemo: bool(env.SEED_DEMO, !isProd),
  // "auto" marks the cookie Secure whenever the request came in over HTTPS (needs TRUST_PROXY behind a proxy).
  cookieSecure: !env.COOKIE_SECURE || env.COOKIE_SECURE === "auto" ? "auto" : bool(env.COOKIE_SECURE, false),
  trustProxy: env.TRUST_PROXY ? (Number.isNaN(Number(env.TRUST_PROXY)) ? env.TRUST_PROXY : Number(env.TRUST_PROXY)) : false,
  maxUploadBytes: (Number(env.MAX_UPLOAD_MB) || 25) * 1024 * 1024,
};

export function assertProductionConfig() {
  if (!config.isProd) return;
  const problems = [];
  if (config.jwtSecret === DEV_SECRET || config.jwtSecret.length < 32) problems.push("JWT_SECRET must be set to a random string of at least 32 characters");
  if (problems.length) {
    console.error(`\nRefusing to start in production:\n  - ${problems.join("\n  - ")}\n`);
    process.exit(1);
  }
}

fs.mkdirSync(path.dirname(config.dbPath), { recursive: true });
fs.mkdirSync(config.uploadDir, { recursive: true });
