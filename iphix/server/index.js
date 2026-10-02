'use strict';
const config = require('./config');
const { openDb } = require('./db');
const { seed } = require('./seed');
const { createApp } = require('./app');

const db = openDb(config.dbFile);
seed(db, config);
const app = createApp({ db, config });

app.listen(config.port, () => {
  console.log(`${config.storeName} running on ${config.baseUrl} (port ${config.port})`);
  if (!process.env.SESSION_SECRET) console.warn('SESSION_SECRET is not set — using a generated development secret.');
  if (!process.env.ADMIN_PASSWORD) console.warn(`Default admin login: ${config.admin.email} / ${config.admin.password} — change it!`);
});
