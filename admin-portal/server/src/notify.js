import { db, now } from "./db.js";
import { sendTo, sendToMany } from "./events.js";

const insert = db.prepare("INSERT INTO notifications (user_id, type, job_id, title, body, created_at) VALUES (?, ?, ?, ?, ?, ?)");
const byId = db.prepare("SELECT * FROM notifications WHERE id = ?");
const adminIds = db.prepare("SELECT id FROM users WHERE role = 'admin' AND active = 1");

export const admins = () => adminIds.all().map((r) => r.id);

export function serializeNotification(n) {
  return { id: n.id, type: n.type, jobId: n.job_id, title: n.title, body: n.body, read: !!n.read, at: n.created_at };
}

export function notify(userIds, { type, jobId = null, title, body = "" }) {
  for (const uid of new Set(userIds.filter(Boolean))) {
    const { lastInsertRowid } = insert.run(uid, type, jobId, title, body, now());
    sendTo(uid, "notification", serializeNotification(byId.get(lastInsertRowid)));
  }
}

export const notifyAdmins = (n) => notify(admins(), n);

// Tell everyone who can see a job that it changed, so their views refresh.
export function jobChanged(job, extraUserIds = []) {
  sendToMany([...admins(), job?.assignee_id, ...extraUserIds].filter(Boolean), "jobs", { id: job?.id ?? null });
}
