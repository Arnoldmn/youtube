'use strict';
const fs = require('fs');
const path = require('path');

const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  phone TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'customer',
  referral_code TEXT NOT NULL UNIQUE,
  referred_by INTEGER REFERENCES users(id),
  token_version INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS categories (
  id INTEGER PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  section TEXT NOT NULL,
  icon TEXT NOT NULL DEFAULT '',
  sort INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS brands (
  id INTEGER PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  parts TEXT NOT NULL DEFAULT '[]',
  featured INTEGER NOT NULL DEFAULT 0,
  sort INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS products (
  id INTEGER PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  category_id INTEGER NOT NULL REFERENCES categories(id),
  brand_id INTEGER REFERENCES brands(id),
  model TEXT NOT NULL DEFAULT '',
  part TEXT NOT NULL DEFAULT '',
  price INTEGER NOT NULL,
  compare_price INTEGER,
  wholesale_price INTEGER,
  stock INTEGER NOT NULL DEFAULT 0,
  image TEXT NOT NULL DEFAULT '',
  is_new INTEGER NOT NULL DEFAULT 0,
  is_deal INTEGER NOT NULL DEFAULT 0,
  rating REAL NOT NULL DEFAULT 4.5,
  sold INTEGER NOT NULL DEFAULT 0,
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_brand ON products(brand_id, part);
CREATE TABLE IF NOT EXISTS orders (
  id INTEGER PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  user_id INTEGER NOT NULL REFERENCES users(id),
  customer_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT NOT NULL DEFAULT '',
  city TEXT NOT NULL DEFAULT '',
  address TEXT NOT NULL DEFAULT '',
  delivery_method TEXT NOT NULL,
  payment_method TEXT NOT NULL,
  notes TEXT NOT NULL DEFAULT '',
  subtotal INTEGER NOT NULL,
  discount INTEGER NOT NULL DEFAULT 0,
  delivery_fee INTEGER NOT NULL DEFAULT 0,
  total INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  referrer_id INTEGER REFERENCES users(id),
  commission_rate REAL NOT NULL DEFAULT 0,
  commission_amount INTEGER NOT NULL DEFAULT 0,
  commission_status TEXT NOT NULL DEFAULT 'none',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_referrer ON orders(referrer_id);
CREATE TABLE IF NOT EXISTS order_items (
  id INTEGER PRIMARY KEY,
  order_id INTEGER NOT NULL REFERENCES orders(id),
  product_id INTEGER NOT NULL REFERENCES products(id),
  name TEXT NOT NULL,
  unit_price INTEGER NOT NULL,
  qty INTEGER NOT NULL,
  line_total INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS order_events (
  id INTEGER PRIMARY KEY,
  order_id INTEGER NOT NULL REFERENCES orders(id),
  status TEXT NOT NULL,
  note TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS referral_clicks (
  id INTEGER PRIMARY KEY,
  referrer_id INTEGER NOT NULL REFERENCES users(id),
  visitor TEXT NOT NULL,
  day TEXT NOT NULL,
  UNIQUE (referrer_id, visitor, day)
);
CREATE TABLE IF NOT EXISTS payouts (
  id INTEGER PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  amount INTEGER NOT NULL,
  method TEXT NOT NULL,
  account TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS mpesa_payments (
  id INTEGER PRIMARY KEY,
  order_id INTEGER NOT NULL REFERENCES orders(id),
  checkout_request_id TEXT NOT NULL UNIQUE,
  merchant_request_id TEXT NOT NULL DEFAULT '',
  phone TEXT NOT NULL,
  amount INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  result_code INTEGER,
  result_desc TEXT NOT NULL DEFAULT '',
  receipt TEXT NOT NULL DEFAULT '',
  last_query_at INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_mpesa_order ON mpesa_payments(order_id);
CREATE TABLE IF NOT EXISTS slides (
  id INTEGER PRIMARY KEY,
  title TEXT NOT NULL,
  subtitle TEXT NOT NULL DEFAULT '',
  cta_label TEXT NOT NULL DEFAULT '',
  cta_link TEXT NOT NULL DEFAULT '',
  image TEXT NOT NULL,
  sort INTEGER NOT NULL DEFAULT 0,
  active INTEGER NOT NULL DEFAULT 1
);
`;

// Columns added after the first release; applied to existing databases on start-up.
const MIGRATIONS = [
  ['orders', 'payment_status', "TEXT NOT NULL DEFAULT 'unpaid'"],
  ['orders', 'amount_paid', 'INTEGER NOT NULL DEFAULT 0'],
  ['orders', 'mpesa_receipt', "TEXT NOT NULL DEFAULT ''"],
];

function migrate(db) {
  for (const [table, column, type] of MIGRATIONS) {
    const cols = db.prepare(`PRAGMA table_info(${table})`).all().map((c) => c.name);
    if (!cols.includes(column)) db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${type}`);
  }
}

/** Node's built-in SQLite (Node 22.13+). Returns null when this Node version doesn't have it. */
function openNative(file) {
  let DatabaseSync;
  try {
    ({ DatabaseSync } = require('node:sqlite'));
  } catch {
    return null;
  }
  const db = new DatabaseSync(file);
  db.driver = 'node:sqlite';
  if (file !== ':memory:') db.exec('PRAGMA journal_mode = WAL;');
  return db;
}

/**
 * Fallback for hosts with older Node (e.g. cPanel offering Node 18/20): sql.js is SQLite compiled to
 * WebAssembly, so it needs no native build. The database lives in memory and is saved to the same
 * file shortly after every change (and on shutdown).
 */
async function openSqlJs(file) {
  const SQL = await require('sql.js')();
  const persist = file !== ':memory:';
  const raw = new SQL.Database(persist && fs.existsSync(file) ? fs.readFileSync(file) : undefined);
  let timer = null;
  const flush = () => {
    clearTimeout(timer);
    timer = null;
    if (!persist) return;
    const data = raw.export(); // export() reopens the database, which resets pragmas
    raw.exec('PRAGMA foreign_keys = ON;');
    fs.writeFileSync(`${file}.tmp`, data);
    fs.renameSync(`${file}.tmp`, file);
  };
  const dirty = () => { if (persist && !timer) timer = setTimeout(flush, 100); };
  const bindable = (params) => params.map((v) => (v === undefined ? null : typeof v === 'boolean' ? Number(v) : v));
  const withStmt = (sql, params, fn) => {
    const st = raw.prepare(sql);
    try {
      st.bind(bindable(params));
      return fn(st);
    } finally {
      st.free();
    }
  };
  if (persist) {
    process.on('exit', flush);
    for (const sig of ['SIGINT', 'SIGTERM']) process.once(sig, () => { flush(); process.exit(0); });
  }
  return {
    driver: 'sql.js',
    flush,
    exec(sql) {
      raw.exec(sql);
      dirty();
    },
    prepare(sql) {
      return {
        get: (...params) => withStmt(sql, params, (st) => (st.step() ? st.getAsObject() : undefined)),
        all: (...params) => withStmt(sql, params, (st) => {
          const rows = [];
          while (st.step()) rows.push(st.getAsObject());
          return rows;
        }),
        run: (...params) => {
          withStmt(sql, params, (st) => st.step());
          const changes = raw.getRowsModified();
          const lastInsertRowid = raw.exec('SELECT last_insert_rowid()')[0].values[0][0];
          dirty();
          return { changes, lastInsertRowid };
        },
      };
    },
  };
}

/**
 * Opens the database with the best available SQLite driver.
 * Set IPHIX_DB_DRIVER=sqljs to force the fallback (used in tests).
 */
async function openDb(file) {
  if (file !== ':memory:') fs.mkdirSync(path.dirname(file), { recursive: true });
  const db = (process.env.IPHIX_DB_DRIVER !== 'sqljs' && openNative(file)) || await openSqlJs(file);
  db.exec('PRAGMA foreign_keys = ON;');
  db.exec(SCHEMA);
  migrate(db);

  db.tx = (fn) => {
    db.exec('BEGIN');
    try {
      const result = fn();
      db.exec('COMMIT');
      return result;
    } catch (err) {
      db.exec('ROLLBACK');
      throw err;
    }
  };
  db.get = (sql, ...params) => db.prepare(sql).get(...params);
  db.all = (sql, ...params) => db.prepare(sql).all(...params);
  db.run = (sql, ...params) => db.prepare(sql).run(...params);
  return db;
}

module.exports = { openDb };
