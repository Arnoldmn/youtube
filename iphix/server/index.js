'use strict';
const config = require('./config');
const { openDb } = require('./db');
const { seed } = require('./seed');
const { createApp } = require('./app');

async function main() {
  const db = await openDb(config.dbFile);
  seed(db, config);
  const app = createApp({ db, config });

  app.listen(config.port, () => {
    console.log(`${config.storeName} running on ${config.baseUrl} (port ${config.port}, database: ${db.driver})`);
    for (const line of require('./brand').describe()) console.log(line);
    if (!process.env.SESSION_SECRET) console.warn('SESSION_SECRET is not set — using a generated development secret.');
    if (config.mpesa.consumerKey && !config.baseUrl.startsWith('https://') && !config.mpesa.callbackUrl) {
      console.warn('M-Pesa: BASE_URL is not https — Safaricom cannot reach the payment callback. Status will rely on polling Daraja.');
    }
    if (!process.env.ADMIN_PASSWORD) console.warn(`Default admin login: ${config.admin.email} / ${config.admin.password} — change it!`);
  });
}

main().catch((err) => {
  console.error('Failed to start:', err);
  process.exit(1);
});
