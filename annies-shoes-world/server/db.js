// Tiny JSON-file database. Fine for a boutique shop; swap for Postgres/SQLite if you outgrow it.
const fs = require("node:fs");
const path = require("node:path");

class JsonDB {
  constructor(dir) {
    this.file = path.join(dir, "db.json");
    fs.mkdirSync(dir, { recursive: true });
    this.data = { users: [], sessions: [], orders: [] };
    try {
      Object.assign(this.data, JSON.parse(fs.readFileSync(this.file, "utf8")));
    } catch (err) {
      if (err.code !== "ENOENT") throw err;
    }
    this.writing = Promise.resolve();
  }

  /** Persist atomically (write temp file, then rename). Writes are serialized. */
  save() {
    const snapshot = JSON.stringify(this.data, null, 2);
    this.writing = this.writing.then(async () => {
      const tmp = `${this.file}.${process.pid}.tmp`;
      await fs.promises.writeFile(tmp, snapshot, { mode: 0o600 });
      await fs.promises.rename(tmp, this.file);
    });
    return this.writing;
  }

  get users() {
    return this.data.users;
  }
  get sessions() {
    return this.data.sessions;
  }
  get orders() {
    return this.data.orders;
  }
}

module.exports = { JsonDB };
