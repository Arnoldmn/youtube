import { Router } from "express";
import multer from "multer";
import path from "node:path";
import fs from "node:fs";
import crypto from "node:crypto";
import { db, now, tx } from "../db.js";
import { config } from "../config.js";
import { requireAdmin } from "../auth.js";
import { badRequest, forbidden, int, notFound, str } from "../http.js";
import { DEFAULT_RATES, LANGS, OPEN_STATUSES, PRIORITIES, SERVICES } from "../constants.js";
import { code, serializeJob } from "../jobs-model.js";
import { jobChanged, notify, notifyAdmins } from "../notify.js";

const router = Router();

/* ---------- uploads ---------- */
export const upload = multer({
  storage: multer.diskStorage({
    destination: config.uploadDir,
    filename: (_req, file, cb) => cb(null, `${crypto.randomUUID()}${path.extname(file.originalname).slice(0, 12).replace(/[^.\w]/g, "")}`),
  }),
  limits: { fileSize: config.maxUploadBytes, files: 20 },
});

const insertFile = db.prepare(`INSERT INTO job_files (job_id, kind, original_name, stored_name, size, mime, uploaded_by, created_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?)`);
function saveFiles(jobId, files, kind, userId) {
  for (const f of files || []) {
    // multer decodes multipart filenames as latin1; restore UTF-8 names like “Übersetzung.docx”.
    const name = Buffer.from(f.originalname, "latin1").toString("utf8");
    insertFile.run(jobId, kind, name, f.filename, f.size, f.mimetype || "application/octet-stream", userId, now());
  }
}
export function discardUploads(files) {
  for (const f of files || []) fs.rm(f.path, { force: true }, () => {});
}

/* ---------- helpers ---------- */
const getJob = db.prepare("SELECT * FROM jobs WHERE id = ?");
const getUser = db.prepare("SELECT * FROM users WHERE id = ?");
const insertEvent = db.prepare("INSERT INTO job_events (job_id, user_id, text, created_at) VALUES (?, ?, ?, ?)");
const log = (jobId, userId, text) => insertEvent.run(jobId, userId, text, now());

function update(id, fields) {
  const sets = [...Object.keys(fields).map((k) => `${k} = @${k}`), "updated_at = @updated_at"];
  db.prepare(`UPDATE jobs SET ${sets.join(", ")} WHERE id = @id`).run({ ...fields, updated_at: now(), id });
  return getJob.get(id);
}

function load(req) {
  const job = getJob.get(Number(req.params.id));
  if (!job) throw notFound("Job not found");
  if (req.user.role !== "admin" && job.assignee_id !== req.user.id) throw notFound("Job not found");
  return job;
}

function mustBeAssignee(req, job, statuses) {
  if (job.assignee_id !== req.user.id) throw forbidden("This job isn't assigned to you");
  if (statuses && !statuses.includes(job.status)) throw badRequest(`This job is ${job.status.replace("_", " ")} — that action isn't available`);
}

function parseJobInput(b, { partial = false } = {}) {
  const out = {};
  const req = !partial;
  if (!partial || b.title !== undefined) out.title = str(b.title, "Title", { required: true, max: 200 });
  if (!partial || b.client !== undefined) out.client = str(b.client, "Client", { required: true, max: 120 });
  if (!partial || b.source !== undefined) {
    out.source = str(b.source, "Source language", { required: req }).toUpperCase();
    if (!LANGS[out.source]) throw badRequest("Unknown source language");
  }
  if (!partial || b.target !== undefined) {
    out.target = str(b.target, "Target language", { required: req }).toUpperCase();
    if (!LANGS[out.target]) throw badRequest("Unknown target language");
  }
  if (out.source && out.target && out.source === out.target) throw badRequest("Source and target languages must differ");
  if (!partial || b.service !== undefined) {
    out.service = SERVICES.includes(b.service) ? b.service : "Translation";
  }
  if (!partial || b.words !== undefined) out.words = int(b.words, "Word count", { min: 1, max: 10_000_000, required: req });
  if (!partial || b.rate !== undefined) {
    const r = b.rate === undefined || b.rate === "" ? DEFAULT_RATES[out.service || "Translation"] : Number(b.rate);
    if (!Number.isFinite(r) || r < 0 || r > 100) throw badRequest("Rate must be a positive number");
    out.rate = r;
  }
  if (!partial || b.priority !== undefined) out.priority = PRIORITIES.includes(b.priority) ? b.priority : "normal";
  if (!partial || b.deadline !== undefined) {
    const d = typeof b.deadline === "number" || /^\d+$/.test(String(b.deadline)) ? Number(b.deadline) : Date.parse(b.deadline);
    if (!Number.isFinite(d)) throw badRequest("Deadline is not a valid date");
    out.deadline = d;
  }
  if (!partial || b.instructions !== undefined) out.instructions = str(b.instructions, "Instructions", { max: 5000 });
  return out;
}

function assign(job, assigneeId, actor) {
  const emp = getUser.get(assigneeId);
  if (!emp || !emp.active) throw badRequest("That person can't be assigned (not found or deactivated)");
  if (["delivered", "completed"].includes(job.status)) throw badRequest("Finished jobs can't be reassigned");
  const prev = job.assignee_id && job.assignee_id !== emp.id ? getUser.get(job.assignee_id) : null;
  const updated = update(job.id, { assignee_id: emp.id, status: "assigned", progress: 0 });
  log(job.id, actor.id, prev ? `Reassigned from ${prev.name} to ${emp.name}` : `Assigned to ${emp.name}`);
  if (prev) notify([prev.id], { type: "unassigned", jobId: job.id, title: `${code(job.id)} was reassigned to someone else`, body: job.title });
  notify([emp.id], { type: "assigned", jobId: job.id, title: `New job assigned: ${code(job.id)}`, body: `${job.title} · due ${new Date(job.deadline).toUTCString().slice(0, 22)}` });
  jobChanged(updated, prev ? [prev.id] : []);
  return updated;
}

/* ---------- routes ---------- */
router.get("/", (req, res) => {
  const rows = req.user.role === "admin"
    ? db.prepare("SELECT * FROM jobs ORDER BY deadline").all()
    : db.prepare("SELECT * FROM jobs WHERE assignee_id = ? ORDER BY deadline").all(req.user.id);
  res.json({ jobs: rows.map((j) => serializeJob(j)) });
});

router.get("/:id", (req, res) => {
  res.json({ job: serializeJob(load(req), { withEvents: true }) });
});

router.post("/", requireAdmin, upload.array("files", 20), (req, res) => {
  try {
    const input = parseJobInput(req.body || {});
    if (input.deadline < now() - 60_000) throw badRequest("The deadline is in the past");
    const assigneeId = int(req.body.assigneeId, "Assignee");
    const job = tx(() => {
      const t = now();
      const { lastInsertRowid: id } = db.prepare(`INSERT INTO jobs (title, client, source, target, service, words, rate, priority, deadline, instructions, created_by, created_at, updated_at)
        VALUES (@title, @client, @source, @target, @service, @words, @rate, @priority, @deadline, @instructions, @created_by, @t, @t)`)
        .run({ ...input, created_by: req.user.id, t });
      saveFiles(id, req.files, "source", req.user.id);
      log(id, req.user.id, req.files?.length ? `Job created with ${req.files.length} source file${req.files.length > 1 ? "s" : ""}` : "Job created");
      return getJob.get(id);
    })();
    const final = assigneeId ? assign(job, assigneeId, req.user) : job;
    if (!assigneeId) jobChanged(job);
    res.status(201).json({ job: serializeJob(final) });
  } catch (e) {
    discardUploads(req.files);
    throw e;
  }
});

router.post("/import", requireAdmin, (req, res) => {
  const rows = Array.isArray(req.body?.rows) ? req.body.rows.slice(0, 500) : [];
  if (!rows.length) throw badRequest("No rows to import");
  const created = [];
  const errors = [];
  rows.forEach((r, i) => {
    try {
      const input = parseJobInput(r);
      const t = now();
      const { lastInsertRowid: id } = db.prepare(`INSERT INTO jobs (title, client, source, target, service, words, rate, priority, deadline, instructions, created_by, created_at, updated_at)
        VALUES (@title, @client, @source, @target, @service, @words, @rate, @priority, @deadline, @instructions, @created_by, @t, @t)`)
        .run({ ...input, created_by: req.user.id, t });
      log(id, req.user.id, "Job created from CSV import");
      let job = getJob.get(id);
      if (r.assigneeId) job = assign(job, Number(r.assigneeId), req.user);
      created.push(job);
    } catch (e) {
      errors.push({ row: i + 1, error: e.message });
    }
  });
  if (created.length) jobChanged(created[0]);
  res.status(created.length ? 201 : 400).json({ created: created.length, assigned: created.filter((j) => j.assignee_id).length, errors });
});

router.patch("/:id", requireAdmin, (req, res) => {
  const job = load(req);
  const fields = parseJobInput(req.body || {}, { partial: true });
  if (!Object.keys(fields).length) throw badRequest("Nothing to update");
  if (fields.deadline && fields.deadline !== job.deadline) fields.overdue_notified = 0;
  const updated = update(job.id, fields);
  log(job.id, req.user.id, "Updated job details");
  if (job.assignee_id) notify([job.assignee_id], { type: "files", jobId: job.id, title: `${code(job.id)} details were updated`, body: job.title });
  jobChanged(updated);
  res.json({ job: serializeJob(updated, { withEvents: true }) });
});

router.delete("/:id", requireAdmin, (req, res) => {
  const job = load(req);
  const files = db.prepare("SELECT stored_name FROM job_files WHERE job_id = ?").all(job.id);
  db.prepare("DELETE FROM jobs WHERE id = ?").run(job.id);
  db.prepare("DELETE FROM notifications WHERE job_id = ?").run(job.id);
  for (const f of files) fs.rm(path.join(config.uploadDir, f.stored_name), { force: true }, () => {});
  if (job.assignee_id && OPEN_STATUSES.includes(job.status)) {
    notify([job.assignee_id], { type: "unassigned", title: `${code(job.id)} was cancelled`, body: job.title });
  }
  jobChanged(job);
  res.json({ ok: true });
});

router.post("/:id/assign", requireAdmin, (req, res) => {
  const job = load(req);
  const assigneeId = req.body?.assigneeId;
  if (assigneeId === null || assigneeId === "" || assigneeId === undefined) {
    if (!job.assignee_id) throw badRequest("This job isn't assigned");
    if (["delivered", "completed"].includes(job.status)) throw badRequest("Finished jobs can't be unassigned");
    const updated = update(job.id, { assignee_id: null, status: "unassigned", progress: 0 });
    log(job.id, req.user.id, "Unassigned");
    notify([job.assignee_id], { type: "unassigned", jobId: job.id, title: `${code(job.id)} was unassigned from you`, body: job.title });
    jobChanged(updated, [job.assignee_id]);
    return res.json({ job: serializeJob(updated, { withEvents: true }) });
  }
  const updated = assign(job, Number(assigneeId), req.user);
  res.json({ job: serializeJob(updated, { withEvents: true }) });
});

router.post("/:id/accept", (req, res) => {
  const job = load(req);
  mustBeAssignee(req, job, ["assigned"]);
  const updated = update(job.id, { status: "in_progress" });
  log(job.id, req.user.id, "Accepted the job");
  notifyAdmins({ type: "accepted", jobId: job.id, title: `${req.user.name} accepted ${code(job.id)}`, body: job.title });
  jobChanged(updated);
  res.json({ job: serializeJob(updated, { withEvents: true }) });
});

router.post("/:id/decline", (req, res) => {
  const job = load(req);
  mustBeAssignee(req, job, ["assigned"]);
  const reason = str(req.body?.reason, "Reason", { max: 300 });
  const updated = update(job.id, { status: "unassigned", assignee_id: null, progress: 0 });
  log(job.id, req.user.id, `Declined the job${reason ? `: ${reason}` : ""}`);
  notifyAdmins({ type: "declined", jobId: job.id, title: `${req.user.name} declined ${code(job.id)}`, body: reason || job.title });
  jobChanged(updated, [req.user.id]);
  res.json({ ok: true });
});

router.post("/:id/progress", (req, res) => {
  const job = load(req);
  mustBeAssignee(req, job, ["in_progress", "revision"]);
  const progress = int(req.body?.progress, "Progress", { min: 0, max: 99, required: true });
  const updated = update(job.id, { progress });
  jobChanged(updated);
  res.json({ job: serializeJob(updated) });
});

router.post("/:id/finish", upload.array("files", 20), (req, res) => {
  try {
    const job = load(req);
    mustBeAssignee(req, job, ["in_progress", "revision"]);
    if (!req.files?.length) throw badRequest("Upload at least one deliverable file");
    const note = str(req.body?.note, "Note", { max: 1000 });
    const updated = tx(() => {
      saveFiles(job.id, req.files, "deliverable", req.user.id);
      log(job.id, req.user.id, `Marked as finished and uploaded ${req.files.length} file${req.files.length > 1 ? "s" : ""}${note ? ` — “${note}”` : ""}`);
      return update(job.id, { status: "delivered", progress: 100, delivered_at: now() });
    })();
    notifyAdmins({ type: "delivered", jobId: job.id, title: `${req.user.name} finished ${code(job.id)}`, body: note ? `${job.title} — “${note}”` : job.title });
    jobChanged(updated);
    res.json({ job: serializeJob(updated, { withEvents: true }) });
  } catch (e) {
    discardUploads(req.files);
    throw e;
  }
});

router.post("/:id/approve", requireAdmin, (req, res) => {
  const job = load(req);
  if (job.status !== "delivered") throw badRequest("Only finished jobs can be approved");
  const updated = update(job.id, { status: "completed" });
  log(job.id, req.user.id, "Approved and completed");
  notify([job.assignee_id], { type: "approved", jobId: job.id, title: `${code(job.id)} was approved — great work!`, body: job.title });
  jobChanged(updated);
  res.json({ job: serializeJob(updated, { withEvents: true }) });
});

router.post("/:id/revision", requireAdmin, (req, res) => {
  const job = load(req);
  if (job.status !== "delivered") throw badRequest("Only finished jobs can be sent back for revision");
  const note = str(req.body?.note, "Revision note", { required: true, max: 2000 });
  const updated = update(job.id, { status: "revision", progress: 60, delivered_at: null });
  log(job.id, req.user.id, `Requested a revision: ${note}`);
  notify([job.assignee_id], { type: "revision", jobId: job.id, title: `Revision requested on ${code(job.id)}`, body: note });
  jobChanged(updated);
  res.json({ job: serializeJob(updated, { withEvents: true }) });
});

router.post("/:id/files", requireAdmin, upload.array("files", 20), (req, res) => {
  try {
    const job = load(req);
    if (!req.files?.length) throw badRequest("Choose at least one file");
    saveFiles(job.id, req.files, "source", req.user.id);
    log(job.id, req.user.id, `Uploaded ${req.files.length} source file${req.files.length > 1 ? "s" : ""}`);
    if (job.assignee_id) notify([job.assignee_id], { type: "files", jobId: job.id, title: `New files added to ${code(job.id)}`, body: req.files.map((f) => Buffer.from(f.originalname, "latin1").toString("utf8")).join(", ") });
    const updated = update(job.id, {});
    jobChanged(updated);
    res.status(201).json({ job: serializeJob(updated, { withEvents: true }) });
  } catch (e) {
    discardUploads(req.files);
    throw e;
  }
});

/* ---------- overdue watcher ---------- */
export function checkOverdue() {
  const rows = db.prepare(`SELECT * FROM jobs WHERE overdue_notified = 0 AND deadline < ? AND status IN (${OPEN_STATUSES.map(() => "?").join(",")})`)
    .all(now(), ...OPEN_STATUSES);
  for (const j of rows) {
    db.prepare("UPDATE jobs SET overdue_notified = 1 WHERE id = ?").run(j.id);
    const who = j.assignee_id ? getUser.get(j.assignee_id) : null;
    notifyAdmins({ type: "overdue", jobId: j.id, title: `${code(j.id)} is overdue`, body: `${j.title} · ${who ? who.name : "unassigned"}` });
    if (who) notify([who.id], { type: "overdue", jobId: j.id, title: `${code(j.id)} is past its deadline`, body: j.title });
  }
}

export default router;
