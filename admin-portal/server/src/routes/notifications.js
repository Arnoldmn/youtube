import { Router } from "express";
import { db } from "../db.js";
import { serializeNotification } from "../notify.js";

const router = Router();

router.get("/", (req, res) => {
  const rows = db.prepare("SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC, id DESC LIMIT 100").all(req.user.id);
  res.json({ notifications: rows.map(serializeNotification) });
});

router.post("/read", (req, res) => {
  const ids = Array.isArray(req.body?.ids) ? req.body.ids.map(Number).filter(Number.isFinite) : null;
  if (ids && ids.length) {
    db.prepare(`UPDATE notifications SET read = 1 WHERE user_id = ? AND id IN (${ids.map(() => "?").join(",")})`).run(req.user.id, ...ids);
  } else {
    db.prepare("UPDATE notifications SET read = 1 WHERE user_id = ?").run(req.user.id);
  }
  res.json({ ok: true });
});

export default router;
