import { db } from "./db.js";

export const code = (id) => `JOB-${1000 + Number(id)}`;
export const parseCode = (v) => {
  const m = String(v).match(/^(?:JOB-)?(\d+)$/i);
  if (!m) return null;
  const n = Number(m[1]);
  return String(v).toUpperCase().startsWith("JOB-") ? n - 1000 : n;
};

const filesFor = db.prepare(`
  SELECT f.*, u.name AS uploader FROM job_files f LEFT JOIN users u ON u.id = f.uploaded_by
  WHERE f.job_id = ? ORDER BY f.created_at`);
const eventsFor = db.prepare(`
  SELECT e.*, u.name AS by_name FROM job_events e LEFT JOIN users u ON u.id = e.user_id
  WHERE e.job_id = ? ORDER BY e.created_at, e.id`);
const userBrief = db.prepare("SELECT id, name, email, title, pairs FROM users WHERE id = ?");

export function serializeFile(f) {
  return { id: f.id, kind: f.kind, name: f.original_name, size: f.size, mime: f.mime, by: f.uploader || "Former user", at: f.created_at };
}

export function serializeJob(j, { withEvents = false } = {}) {
  const a = j.assignee_id ? userBrief.get(j.assignee_id) : null;
  const out = {
    id: j.id, code: code(j.id), title: j.title, client: j.client, source: j.source, target: j.target,
    service: j.service, words: j.words, rate: j.rate, priority: j.priority, status: j.status,
    progress: j.progress, deadline: j.deadline, instructions: j.instructions,
    createdAt: j.created_at, updatedAt: j.updated_at, deliveredAt: j.delivered_at,
    assignee: a ? { id: a.id, name: a.name, email: a.email, title: a.title, pairs: JSON.parse(a.pairs) } : null,
    files: filesFor.all(j.id).map(serializeFile),
  };
  if (withEvents) out.history = eventsFor.all(j.id).map((e) => ({ id: e.id, by: e.by_name || "System", text: e.text, at: e.created_at }));
  return out;
}
