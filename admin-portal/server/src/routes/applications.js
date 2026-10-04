import { Router } from "express";
import { db, now, tx } from "../db.js";
import { hashPassword, requireAdmin, tempPassword } from "../auth.js";
import { badRequest, list, notFound, str } from "../http.js";

const router = Router();
router.use(requireAdmin);

const CHECKS = { identity: "Identity", ata: "ATA certification", degree: "Degree" };
const V_LABEL = { verified: "verified", pending: "pending", failed: "failed", none: "not provided" };
const INFO_ITEMS = {
  identity: "Clear identity document",
  ata: "ATA certification details",
  degree: "Degree certificate or transcript",
  samples: "Additional translation samples",
  rates: "Updated rate card",
  references: "Professional references",
};

const getApp = db.prepare("SELECT * FROM applications WHERE id = ?");
const eventsFor = db.prepare("SELECT * FROM application_events WHERE application_id = ? ORDER BY created_at, id");
const addEvent = db.prepare("INSERT INTO application_events (application_id, by_name, title, text, note, color, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)");

export function serializeApplication(a) {
  return {
    ...JSON.parse(a.profile),
    id: a.id,
    status: a.status,
    verification: JSON.parse(a.verification),
    infoRequest: a.info_request,
    rejectReason: a.reject_reason,
    tier: a.tier,
    userId: a.user_id,
    appliedAt: a.applied_at,
    activity: eventsFor.all(a.id).map((e) => ({ id: e.id, by: e.by_name, title: e.title, text: e.text, note: e.note, color: e.color, at: e.created_at })),
  };
}

function load(id) {
  const a = getApp.get(id);
  if (!a) throw notFound("Application not found");
  return a;
}

router.get("/", (_req, res) => {
  res.json({ applications: db.prepare("SELECT * FROM applications ORDER BY applied_at DESC").all().map(serializeApplication) });
});

router.post("/:id/decision", async (req, res) => {
  const a = load(req.params.id);
  if (!["pending", "info"].includes(a.status)) throw badRequest("A decision was already made — reopen the review first");
  const b = req.body || {};
  const profile = JSON.parse(a.profile);
  const by = req.user.name;
  let account = null;

  if (b.type === "approve") {
    const tier = ["Trial", "Standard", "Preferred"].includes(b.tier) ? b.tier : "Standard";
    let userId = null;
    if (b.createAccount) {
      const email = String(profile.email).toLowerCase();
      const existing = db.prepare("SELECT id FROM users WHERE email = ?").get(email);
      if (existing) userId = existing.id;
      else {
        const password = tempPassword();
        const { lastInsertRowid } = db.prepare(`INSERT INTO users (name, email, password_hash, role, title, pairs, specs, capacity, must_change_password, created_at)
          VALUES (?, ?, ?, 'employee', 'Freelance', ?, ?, ?, 1, ?)`)
          .run(profile.name, email, await hashPassword(password), JSON.stringify(profile.pairs), JSON.stringify(profile.specs), Math.max(500, Math.round((profile.capacity || 10000) / 5)), now());
        userId = Number(lastInsertRowid);
        account = { email, tempPassword: password };
      }
    }
    tx(() => {
      db.prepare("UPDATE applications SET status = 'approved', tier = ?, user_id = ?, updated_at = ? WHERE id = ?").run(tier, userId, now(), a.id);
      addEvent.run(a.id, by, `Approved · ${tier} tier`, [b.welcome ? "Welcome email and onboarding checklist sent" : "No welcome email sent", account ? "Employee login created" : null].filter(Boolean).join(" · "), null, "green", now());
      const note = str(b.note, "Note", { max: 2000 });
      if (note) addEvent.run(a.id, by, "Internal note", null, note, null, now());
    })();
  } else if (b.type === "info") {
    const items = list(b.items).filter((i) => INFO_ITEMS[i]).map((i) => INFO_ITEMS[i]);
    const message = str(b.message, "Message", { max: 4000 });
    if (!items.length && !message) throw badRequest("Say what you need from the applicant");
    const request = items.length ? `Requested: ${items.join(", ")}.` : message.slice(0, 300);
    db.prepare("UPDATE applications SET status = 'info', info_request = ?, updated_at = ? WHERE id = ?").run(request, now(), a.id);
    addEvent.run(a.id, by, "Requested more information", null, request, "blue", now());
  } else if (b.type === "reject") {
    const reason = str(b.reason, "Reason", { required: true, max: 200 });
    db.prepare("UPDATE applications SET status = 'rejected', reject_reason = ?, updated_at = ? WHERE id = ?").run(reason, now(), a.id);
    addEvent.run(a.id, by, `Rejected · ${reason}`, b.reapply ? "May re-apply after 6 months" : "Re-application blocked", null, "red", now());
  } else {
    throw badRequest("Unknown decision");
  }
  res.json({ application: serializeApplication(getApp.get(a.id)), account });
});

router.post("/:id/reopen", (req, res) => {
  const a = load(req.params.id);
  if (a.status === "pending") throw badRequest("Already pending review");
  db.prepare("UPDATE applications SET status = 'pending', updated_at = ? WHERE id = ?").run(now(), a.id);
  addEvent.run(a.id, req.user.name, `Review reopened (was ${a.status})`, null, null, "amber", now());
  res.json({ application: serializeApplication(getApp.get(a.id)) });
});

router.post("/:id/verify", (req, res) => {
  const a = load(req.params.id);
  const key = req.body?.key;
  const to = req.body?.to;
  if (!CHECKS[key] || !["verified", "failed", "pending"].includes(to)) throw badRequest("Invalid verification change");
  const v = JSON.parse(a.verification);
  v[key] = to;
  db.prepare("UPDATE applications SET verification = ?, updated_at = ? WHERE id = ?").run(JSON.stringify(v), now(), a.id);
  addEvent.run(a.id, req.user.name, `${CHECKS[key]} marked ${V_LABEL[to]}`, null, null, { verified: "green", failed: "red", pending: "amber" }[to], now());
  res.json({ application: serializeApplication(getApp.get(a.id)) });
});

router.post("/:id/notes", (req, res) => {
  const a = load(req.params.id);
  const note = str(req.body?.note, "Note", { required: true, max: 2000 });
  addEvent.run(a.id, req.user.name, "Internal note", null, note, null, now());
  res.json({ application: serializeApplication(getApp.get(a.id)) });
});

export default router;
