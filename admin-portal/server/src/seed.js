import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import { db, now, tx } from "./db.js";
import { config } from "./config.js";
import { DEFAULT_RATES } from "./constants.js";
import { VENDORS } from "./data/applications.js";

const HOUR = 36e5;
export const DEMO_PASSWORD = "password123";

const EMPLOYEES = [
  ["Lena Hoffmann", "lena", "In-house", ["EN>DE", "DE>EN"], ["Technical", "Legal"], 3000],
  ["Carlos Ruiz", "carlos", "In-house", ["EN>ES", "PT>ES"], ["Marketing", "Legal"], 3500],
  ["Samuel Adeyemi", "samuel", "In-house", ["EN>FR", "FR>EN"], ["Medical", "NGO"], 2800],
  ["Aiko Tanaka", "aiko", "Freelance", ["EN>JA", "JA>EN"], ["Gaming", "Technical"], 2500],
  ["Nadia Petrova", "nadia", "In-house", ["EN>RU", "RU>EN"], ["Financial", "Legal"], 3200],
  ["Fatima Zahra", "fatima", "Freelance", ["EN>AR", "FR>AR"], ["Legal", "Marketing"], 2400],
  ["Pieter de Vries", "pieter", "In-house", ["EN>NL", "DE>NL"], ["Financial", "Technical"], 3000],
];

// [title, client, src, tgt, service, words, dueInHours, priority, status, assignee key, progress]
const JOBS = [
  ["Employment contract – Berlin office", "Northwind Legal", "EN", "DE", "Translation", 4200, 30, "high", "in_progress", "lena", 55],
  ["Q3 investor presentation", "Fjord Capital", "EN", "NL", "Translation + Review", 2600, 20, "normal", "in_progress", "pieter", 30],
  ["Mobile game UI strings v2.4", "Pixel Harbor", "EN", "JA", "Localization", 7800, 72, "normal", "assigned", "aiko", 0],
  ["Clinical study informed consent", "Medivance Pharma", "EN", "FR", "Translation + Review", 3100, 6, "urgent", "in_progress", "samuel", 80],
  ["Spring campaign landing pages", "Oslo Outdoor", "EN", "ES", "Translation", 1800, 52, "high", "in_progress", "carlos", 70],
  ["Annual report 2025 – summary", "Volga Bank", "RU", "EN", "Translation", 5200, 96, "normal", "unassigned", null, 0],
  ["Product safety data sheets", "Nordic Energy AS", "NO", "EN", "Translation", 2300, 48, "normal", "unassigned", null, 0],
  ["Website legal notice & privacy", "Atlas Retail", "FR", "AR", "Translation", 1400, 52, "low", "unassigned", null, 0],
  ["Customer interview recordings", "Fjord Capital", "DE", "EN", "Transcription", 6000, 40, "normal", "delivered", "lena", 100],
  ["Terms of service update", "Pixel Harbor", "EN", "ES", "Translation", 2100, -50, "normal", "completed", "carlos", 100],
  ["Board minutes – October", "Volga Bank", "EN", "RU", "Translation", 1600, -26, "normal", "completed", "nadia", 100],
];

export async function ensureAdmin() {
  const hasAdmin = db.prepare("SELECT 1 FROM users WHERE role = 'admin' LIMIT 1").get();
  if (hasAdmin) return false;
  const { name, email, password } = config.admin;
  if (!password || (config.isProd && password.length < 10)) {
    console.error("\nNo admin account exists yet. Set ADMIN_EMAIL and ADMIN_PASSWORD (min. 10 characters) and start again.\n");
    process.exit(1);
  }
  db.prepare(`INSERT INTO users (name, email, password_hash, role, title, created_at) VALUES (?, ?, ?, 'admin', 'Project Manager', ?)`)
    .run(name, email, await bcrypt.hash(password, 12), now());
  console.log(`Created admin account ${email}`);
  return true;
}

function writeDemoFile(name, text) {
  const stored = `${crypto.randomUUID()}.txt`;
  fs.writeFileSync(path.join(config.uploadDir, stored), text);
  return { stored, size: Buffer.byteLength(text) };
}

export async function seedDemo({ force = false } = {}) {
  const hasJobs = db.prepare("SELECT 1 FROM jobs LIMIT 1").get();
  const hasApps = db.prepare("SELECT 1 FROM applications LIMIT 1").get();
  if (!force && (hasJobs || hasApps)) return false;
  const admin = db.prepare("SELECT * FROM users WHERE role = 'admin' ORDER BY id LIMIT 1").get();
  const hash = await bcrypt.hash(DEMO_PASSWORD, 10);
  const t0 = now();

  tx(() => {
    const ids = {};
    const insUser = db.prepare(`INSERT OR IGNORE INTO users (name, email, password_hash, role, title, pairs, specs, capacity, created_at)
      VALUES (?, ?, ?, 'employee', ?, ?, ?, ?, ?)`);
    for (const [name, key, title, pairs, specs, cap] of EMPLOYEES) {
      const email = `${key}@linguaops.local`;
      insUser.run(name, email, hash, title, JSON.stringify(pairs), JSON.stringify(specs), cap, t0);
      ids[key] = db.prepare("SELECT id FROM users WHERE email = ?").get(email).id;
    }

    const insJob = db.prepare(`INSERT INTO jobs (title, client, source, target, service, words, rate, priority, status, assignee_id, progress, deadline, instructions, created_by, created_at, updated_at, delivered_at)
      VALUES (@title, @client, @source, @target, @service, @words, @rate, @priority, @status, @assignee_id, @progress, @deadline, @instructions, @created_by, @created_at, @updated_at, @delivered_at)`);
    const insFile = db.prepare("INSERT INTO job_files (job_id, kind, original_name, stored_name, size, mime, uploaded_by, created_at) VALUES (?, ?, ?, ?, ?, 'text/plain', ?, ?)");
    const insEvent = db.prepare("INSERT INTO job_events (job_id, user_id, text, created_at) VALUES (?, ?, ?, ?)");
    const insNotif = db.prepare("INSERT INTO notifications (user_id, type, job_id, title, body, created_at) VALUES (?, ?, ?, ?, ?, ?)");

    JOBS.forEach(([title, client, source, target, service, words, dueH, priority, status, who, progress], i) => {
      const created = t0 - (60 + i * 7) * HOUR;
      const assignee = who ? ids[who] : null;
      const done = status === "delivered" || status === "completed";
      const deliveredAt = done ? Math.min(t0 + dueH * HOUR - 5 * HOUR, t0 - (2 + i) * HOUR) : null;
      const { lastInsertRowid: id } = insJob.run({
        title, client, source, target, service, words, rate: DEFAULT_RATES[service], priority, status,
        assignee_id: assignee, progress, deadline: t0 + dueH * HOUR,
        instructions: i % 3 === 0 ? "Use the client glossary attached to the project. Keep formatting identical to the source." : "",
        created_by: admin.id, created_at: created, updated_at: t0, delivered_at: deliveredAt,
      });
      const base = title.replace(/[^\w]+/g, "_").replace(/_$/, "");
      const src = writeDemoFile(`${base}_${source}.txt`, `${title}\nClient: ${client}\n\n[Demo source document — ${words} words]\n`);
      insFile.run(id, "source", `${base}_${source}.txt`, src.stored, src.size, admin.id, created);
      insEvent.run(id, admin.id, "Job created with 1 source file", created);
      if (assignee) insEvent.run(id, admin.id, `Assigned to ${EMPLOYEES.find((e) => e[1] === who)[0]}`, created + HOUR);
      if (["in_progress", "delivered", "completed"].includes(status)) insEvent.run(id, assignee, "Accepted the job", created + 3 * HOUR);
      if (status === "assigned") insNotif.run(assignee, "assigned", id, `New job assigned: JOB-${1000 + Number(id)}`, title, created + HOUR);
      if (done) {
        const del = writeDemoFile(`${base}_${target}_final.txt`, `${title}\n\n[Demo deliverable — ${source} → ${target}]\n`);
        insFile.run(id, "deliverable", `${base}_${target}_final.txt`, del.stored, del.size, assignee, deliveredAt);
        insEvent.run(id, assignee, "Marked as finished and uploaded 1 file", deliveredAt);
      }
      if (status === "completed") insEvent.run(id, admin.id, "Approved and completed", deliveredAt + 2 * HOUR);
      if (status === "delivered") {
        const name = EMPLOYEES.find((e) => e[1] === who)[0];
        insNotif.run(admin.id, "delivered", id, `${name} finished JOB-${1000 + Number(id)}`, title, deliveredAt);
      }
    });

    const insApp = db.prepare(`INSERT OR REPLACE INTO applications (id, profile, status, verification, info_request, reject_reason, tier, applied_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`);
    const insAppEvent = db.prepare("INSERT INTO application_events (application_id, by_name, title, text, note, color, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)");
    const vcolor = { verified: "green", failed: "red", pending: "amber" };
    for (const v of VENDORS) {
      const { status, verification, infoRequest, rejectReason, appliedHoursAgo, ...profile } = v;
      const at = t0 - appliedHoursAgo * HOUR;
      insApp.run(v.id, JSON.stringify(profile), status, JSON.stringify(verification), infoRequest || null, rejectReason || null, status === "approved" ? "Standard" : null, at, t0);
      insAppEvent.run(v.id, v.name, "Application submitted", `Applied for ${v.pairs.map((p) => p.replace(">", " → ")).join(", ")}`, null, null, at);
      insAppEvent.run(v.id, "Assessment bot", `Translation test scored ${v.score}/100`, `${v.specs[0]} domain`, null, v.score >= 85 ? "green" : v.score >= 75 ? "amber" : "red", at + 0.8 * HOUR);
      if (verification.identity !== "none") insAppEvent.run(v.id, "Identity check", `Identity check ${verification.identity}`, null, null, vcolor[verification.identity], at + 1.5 * HOUR);
      if (status === "info") insAppEvent.run(v.id, admin.name, "Requested more information", null, infoRequest, "blue", at + 20 * HOUR);
      if (status === "approved") insAppEvent.run(v.id, admin.name, "Approved · Standard tier", "Welcome email and onboarding checklist sent", null, "green", at + 30 * HOUR);
      if (status === "rejected") insAppEvent.run(v.id, admin.name, `Rejected · ${rejectReason}`, null, null, "red", at + 26 * HOUR);
    }
  })();
  console.log(`Loaded demo data: ${EMPLOYEES.length} employees (password “${DEMO_PASSWORD}”), ${JOBS.length} jobs, ${VENDORS.length} vendor applications`);
  return true;
}

export function wipe() {
  tx(() => {
    for (const t of ["notifications", "job_events", "job_files", "jobs", "application_events", "applications", "users"]) db.prepare(`DELETE FROM ${t}`).run();
    db.prepare("DELETE FROM sqlite_sequence").run();
  })();
  for (const f of fs.readdirSync(config.uploadDir)) fs.rmSync(path.join(config.uploadDir, f), { force: true });
}
