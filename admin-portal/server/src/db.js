import Database from "better-sqlite3";
import { config } from "./config.js";

export const db = new Database(config.dbPath);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  name          TEXT    NOT NULL,
  email         TEXT    NOT NULL UNIQUE COLLATE NOCASE,
  password_hash TEXT    NOT NULL,
  role          TEXT    NOT NULL CHECK (role IN ('admin', 'employee')),
  title         TEXT    NOT NULL DEFAULT '',
  pairs         TEXT    NOT NULL DEFAULT '[]',
  specs         TEXT    NOT NULL DEFAULT '[]',
  capacity      INTEGER NOT NULL DEFAULT 3000,
  active        INTEGER NOT NULL DEFAULT 1,
  must_change_password INTEGER NOT NULL DEFAULT 0,
  created_at    INTEGER NOT NULL,
  last_login_at INTEGER
);

CREATE TABLE IF NOT EXISTS jobs (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  title         TEXT    NOT NULL,
  client        TEXT    NOT NULL,
  source        TEXT    NOT NULL,
  target        TEXT    NOT NULL,
  service       TEXT    NOT NULL,
  words         INTEGER NOT NULL DEFAULT 0,
  rate          REAL    NOT NULL DEFAULT 0,
  priority      TEXT    NOT NULL DEFAULT 'normal',
  status        TEXT    NOT NULL DEFAULT 'unassigned',
  assignee_id   INTEGER REFERENCES users(id) ON DELETE SET NULL,
  progress      INTEGER NOT NULL DEFAULT 0,
  deadline      INTEGER NOT NULL,
  instructions  TEXT    NOT NULL DEFAULT '',
  created_by    INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at    INTEGER NOT NULL,
  updated_at    INTEGER NOT NULL,
  delivered_at  INTEGER,
  overdue_notified INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS jobs_assignee ON jobs(assignee_id);
CREATE INDEX IF NOT EXISTS jobs_status ON jobs(status);

CREATE TABLE IF NOT EXISTS job_files (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  job_id        INTEGER NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  kind          TEXT    NOT NULL CHECK (kind IN ('source', 'deliverable')),
  original_name TEXT    NOT NULL,
  stored_name   TEXT    NOT NULL,
  size          INTEGER NOT NULL,
  mime          TEXT    NOT NULL DEFAULT 'application/octet-stream',
  uploaded_by   INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at    INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS job_files_job ON job_files(job_id);

CREATE TABLE IF NOT EXISTS job_events (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  job_id     INTEGER NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  user_id    INTEGER REFERENCES users(id) ON DELETE SET NULL,
  text       TEXT    NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS job_events_job ON job_events(job_id);

CREATE TABLE IF NOT EXISTS notifications (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type       TEXT    NOT NULL,
  job_id     INTEGER,
  title      TEXT    NOT NULL,
  body       TEXT    NOT NULL DEFAULT '',
  read       INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS notifications_user ON notifications(user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS applications (
  id            TEXT    PRIMARY KEY,
  profile       TEXT    NOT NULL,
  status        TEXT    NOT NULL DEFAULT 'pending',
  verification  TEXT    NOT NULL,
  info_request  TEXT,
  reject_reason TEXT,
  tier          TEXT,
  user_id       INTEGER REFERENCES users(id) ON DELETE SET NULL,
  applied_at    INTEGER NOT NULL,
  updated_at    INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS application_events (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  application_id TEXT    NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  by_name        TEXT    NOT NULL,
  title          TEXT    NOT NULL,
  text           TEXT,
  note           TEXT,
  color          TEXT,
  created_at     INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS application_events_app ON application_events(application_id);
`);

export const now = () => Date.now();
export const tx = (fn) => db.transaction(fn);
