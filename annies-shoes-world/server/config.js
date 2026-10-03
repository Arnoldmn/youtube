// Runtime configuration from environment variables (optionally loaded from a .env file).
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");

function loadDotEnv(file = path.join(ROOT, ".env")) {
  let text;
  try {
    text = fs.readFileSync(file, "utf8");
  } catch {
    return;
  }
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
    if (!(key in process.env)) process.env[key] = value;
  }
}

function readConfig(env = process.env) {
  return {
    port: Number(env.PORT) || 3000,
    storeName: env.STORE_NAME || "Annie's Shoes World",
    // Shop's WhatsApp number in international format, digits only (e.g. 254712345678).
    whatsappNumber: (env.WHATSAPP_NUMBER || "").replace(/\D/g, ""),
    // Used to turn local numbers like 0712 345 678 into 254712345678.
    defaultCountryCode: (env.DEFAULT_COUNTRY_CODE || "").replace(/\D/g, ""),
    currency: env.CURRENCY || "USD",
    locale: env.LOCALE || "en-US",
    publicUrl: (env.PUBLIC_URL || "").replace(/\/+$/, ""),
    adminPassword: env.ADMIN_PASSWORD || "",
    dataDir: path.resolve(ROOT, env.DATA_DIR || "data"),
    publicDir: path.join(ROOT, "public"),
    cookieSecure: env.COOKIE_SECURE === "true",
    // Optional WhatsApp Business Cloud API (automatic replies + status notifications).
    cloud: {
      token: env.WHATSAPP_TOKEN || "",
      phoneNumberId: env.WHATSAPP_PHONE_NUMBER_ID || "",
      verifyToken: env.WHATSAPP_VERIFY_TOKEN || "",
      appSecret: env.WHATSAPP_APP_SECRET || "",
      graphVersion: env.WHATSAPP_GRAPH_VERSION || "v21.0",
    },
  };
}

module.exports = { loadDotEnv, readConfig, ROOT };
