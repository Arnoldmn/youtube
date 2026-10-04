import { Router } from "express";
import { db, now } from "../db.js";
import { hashPassword, publicUser, requireAdmin, tempPassword } from "../auth.js";
import { badRequest, int, list, notFound, str } from "../http.js";
import { LANGS, OPEN_STATUSES } from "../constants.js";

const router = Router();
router.use(requireAdmin);

const openJobs = db.prepare(`SELECT assignee_id, COUNT(*) AS jobs, SUM(words * (100 - progress) / 100.0) AS words
  FROM jobs WHERE assignee_id IS NOT NULL AND status IN (${OPEN_STATUSES.map(() => "?").join(",")}) GROUP BY assignee_id`);

function withWorkload(users) {
  const load = new Map(openJobs.all(...OPEN_STATUSES).map((r) => [r.assignee_id, r]));
  return users.map((u) => {
    const l = load.get(u.id);
    return { ...publicUser(u), openJobs: l?.jobs || 0, queuedWords: Math.round(l?.words || 0) };
  });
}

function validPairs(pairs) {
  for (const p of pairs) {
    const [a, b] = p.split(">");
    if (!LANGS[a] || !LANGS[b] || a === b) throw badRequest(`Invalid language pair “${p}” — use the format EN>DE`);
  }
  return pairs;
}

router.get("/", (_req, res) => {
  res.json({ users: withWorkload(db.prepare("SELECT * FROM users ORDER BY role, name").all()) });
});

router.post("/", async (req, res) => {
  const b = req.body || {};
  const name = str(b.name, "Name", { required: true, max: 120 });
  const email = str(b.email, "Email", { required: true, max: 200 }).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw badRequest("Enter a valid email address");
  if (db.prepare("SELECT 1 FROM users WHERE email = ?").get(email)) throw badRequest("Someone already uses that email");
  const role = b.role === "admin" ? "admin" : "employee";
  const password = str(b.password, "Password", { max: 200 }) || tempPassword();
  if (password.length < 8) throw badRequest("Passwords need at least 8 characters");
  const pairs = validPairs(list(b.pairs).map((p) => p.toUpperCase().replace(/\s*(→|->|-)\s*/, ">")));
  const { lastInsertRowid } = db.prepare(`INSERT INTO users (name, email, password_hash, role, title, pairs, specs, capacity, must_change_password, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?)`).run(
    name, email, await hashPassword(password), role, str(b.title, "Title", { max: 80 }),
    JSON.stringify(pairs), JSON.stringify(list(b.specs)), int(b.capacity, "Capacity", { min: 100, max: 100000 }) ?? 3000, now());
  const user = db.prepare("SELECT * FROM users WHERE id = ?").get(lastInsertRowid);
  res.status(201).json({ user: withWorkload([user])[0], tempPassword: b.password ? undefined : password });
});

router.patch("/:id", (req, res) => {
  const user = db.prepare("SELECT * FROM users WHERE id = ?").get(req.params.id);
  if (!user) throw notFound("User not found");
  const b = req.body || {};
  const fields = {};
  if (b.name !== undefined) fields.name = str(b.name, "Name", { required: true, max: 120 });
  if (b.title !== undefined) fields.title = str(b.title, "Title", { max: 80 });
  if (b.pairs !== undefined) fields.pairs = JSON.stringify(validPairs(list(b.pairs)));
  if (b.specs !== undefined) fields.specs = JSON.stringify(list(b.specs));
  if (b.capacity !== undefined) fields.capacity = int(b.capacity, "Capacity", { min: 100, max: 100000 });
  if (b.active !== undefined) {
    if (user.id === req.user.id && !b.active) throw badRequest("You can't deactivate your own account");
    fields.active = b.active ? 1 : 0;
  }
  if (b.role !== undefined) {
    if (user.id === req.user.id && b.role !== "admin") throw badRequest("You can't remove your own admin role");
    fields.role = b.role === "admin" ? "admin" : "employee";
  }
  const keys = Object.keys(fields);
  if (keys.length) db.prepare(`UPDATE users SET ${keys.map((k) => `${k} = @${k}`).join(", ")} WHERE id = @id`).run({ ...fields, id: user.id });
  res.json({ user: withWorkload([db.prepare("SELECT * FROM users WHERE id = ?").get(user.id)])[0] });
});

router.post("/:id/reset-password", async (req, res) => {
  const user = db.prepare("SELECT * FROM users WHERE id = ?").get(req.params.id);
  if (!user) throw notFound("User not found");
  const password = tempPassword();
  db.prepare("UPDATE users SET password_hash = ?, must_change_password = 1 WHERE id = ?").run(await hashPassword(password), user.id);
  res.json({ tempPassword: password });
});

export default router;
