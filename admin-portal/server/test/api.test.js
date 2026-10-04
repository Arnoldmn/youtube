// End-to-end API tests against a throwaway database: node --test test/
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "linguaops-test-"));
process.env.DATABASE_PATH = path.join(tmp, "test.db");
process.env.UPLOAD_DIR = path.join(tmp, "uploads");
process.env.ADMIN_EMAIL = "admin@test.local";
process.env.ADMIN_PASSWORD = "admin-pass-123";
process.env.NODE_ENV = "test";

const { createApp } = await import("../src/app.js");
const { ensureAdmin, seedDemo, DEMO_PASSWORD } = await import("../src/seed.js");

let server, base;

before(async () => {
  await ensureAdmin();
  await seedDemo();
  server = createApp().listen(0);
  base = `http://127.0.0.1:${server.address().port}/api`;
});
after(() => {
  server.closeAllConnections?.();
  server.close();
  fs.rmSync(tmp, { recursive: true, force: true });
});

// Minimal cookie-keeping client
function client() {
  let cookie = "";
  const call = async (method, url, body, { form } = {}) => {
    const headers = { "x-requested-with": "linguaops" };
    if (cookie) headers.cookie = cookie;
    let payload;
    if (form) payload = form;
    else if (body !== undefined) { headers["content-type"] = "application/json"; payload = JSON.stringify(body); }
    const res = await fetch(base + url, { method, headers, body: payload });
    const set = res.headers.get("set-cookie");
    if (set) cookie = set.split(";")[0];
    const type = res.headers.get("content-type") || "";
    return { status: res.status, body: type.includes("json") ? await res.json() : await res.text() };
  };
  return {
    get: (u) => call("GET", u),
    post: (u, b, o) => call("POST", u, b, o),
    patch: (u, b) => call("PATCH", u, b),
    del: (u) => call("DELETE", u),
    login: (email, password) => call("POST", "/auth/login", { email, password }),
    get cookie() { return cookie; },
  };
}

test("rejects unauthenticated requests and bad credentials", async () => {
  const c = client();
  assert.equal((await c.get("/jobs")).status, 401);
  assert.equal((await c.login("admin@test.local", "wrong")).status, 401);
  assert.equal((await c.login("nobody@test.local", "whatever")).status, 401);
});

test("blocks state-changing requests without the app header", async () => {
  const res = await fetch(`${base}/auth/login`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email: "admin@test.local", password: "admin-pass-123" }) });
  assert.equal(res.status, 403);
});

test("admin can sign in, see all jobs and the team", async () => {
  const admin = client();
  const r = await admin.login("admin@test.local", "admin-pass-123");
  assert.equal(r.status, 200);
  assert.equal(r.body.user.role, "admin");
  assert.match(admin.cookie, /lo_session=/);
  const jobs = await admin.get("/jobs");
  assert.equal(jobs.status, 200);
  assert.ok(jobs.body.jobs.length >= 10);
  const users = await admin.get("/users");
  assert.ok(users.body.users.some((u) => u.email === "lena@linguaops.local" && typeof u.openJobs === "number"));
});

test("employees only see their own jobs and can't use admin endpoints", async () => {
  const emp = client();
  assert.equal((await emp.login("aiko@linguaops.local", DEMO_PASSWORD)).status, 200);
  const jobs = (await emp.get("/jobs")).body.jobs;
  assert.ok(jobs.length > 0);
  assert.ok(jobs.every((j) => j.assignee?.email === "aiko@linguaops.local"));
  assert.equal((await emp.get("/users")).status, 403);
  assert.equal((await emp.get("/applications")).status, 403);
  const admin = client();
  await admin.login("admin@test.local", "admin-pass-123");
  const other = (await admin.get("/jobs")).body.jobs.find((j) => j.assignee && j.assignee.email !== "aiko@linguaops.local");
  assert.equal((await emp.get(`/jobs/${other.id}`)).status, 404);
  assert.equal((await emp.get(`/files/${other.files[0].id}/download`)).status, 404);
});

test("full job lifecycle with uploads and live notifications", async () => {
  const admin = client();
  await admin.login("admin@test.local", "admin-pass-123");
  const emp = client();
  const me = (await emp.login("lena@linguaops.local", DEMO_PASSWORD)).body.user;

  // Admin listens for live events
  const ac = new AbortController();
  const events = [];
  const stream = await fetch(`${base}/events`, { headers: { cookie: admin.cookie }, signal: ac.signal });
  assert.equal(stream.status, 200);
  (async () => {
    const reader = stream.body.getReader();
    const dec = new TextDecoder();
    try {
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        events.push(dec.decode(value));
      }
    } catch { /* aborted */ }
  })();

  // Create with a source file, assigned to Lena
  const form = new FormData();
  form.append("title", "Website footer copy");
  form.append("client", "Atlas Retail");
  form.append("source", "EN");
  form.append("target", "DE");
  form.append("service", "Translation");
  form.append("words", "450");
  form.append("deadline", String(Date.now() + 2 * 864e5));
  form.append("assigneeId", String(me.id));
  form.append("files", new Blob(["Hello world"], { type: "text/plain" }), "footer_EN.txt");
  const created = await admin.post("/jobs", undefined, { form });
  assert.equal(created.status, 201, JSON.stringify(created.body));
  const job = created.body.job;
  assert.equal(job.status, "assigned");
  assert.equal(job.files.length, 1);

  // Employee was notified and can download the source
  const notes = (await emp.get("/notifications")).body.notifications;
  assert.ok(notes.some((n) => n.type === "assigned" && n.jobId === job.id));
  const dl = await emp.get(`/files/${job.files[0].id}/download`);
  assert.equal(dl.status, 200);
  assert.equal(dl.body, "Hello world");

  // Can't finish before accepting; accept, progress, finish with a deliverable
  assert.equal((await emp.post(`/jobs/${job.id}/progress`, { progress: 40 })).status, 400);
  assert.equal((await emp.post(`/jobs/${job.id}/accept`)).status, 200);
  assert.equal((await emp.post(`/jobs/${job.id}/progress`, { progress: 40 })).body.job.progress, 40);
  const empty = new FormData();
  empty.append("note", "nothing attached");
  assert.equal((await emp.post(`/jobs/${job.id}/finish`, undefined, { form: empty })).status, 400);
  const fin = new FormData();
  fin.append("note", "Ready for review");
  fin.append("files", new Blob(["Hallo Welt"], { type: "text/plain" }), "footer_DE.txt");
  const finished = await emp.post(`/jobs/${job.id}/finish`, undefined, { form: fin });
  assert.equal(finished.status, 200, JSON.stringify(finished.body));
  assert.equal(finished.body.job.status, "delivered");

  // Admin got a "finished" notification, both stored and pushed live
  const adminNotes = (await admin.get("/notifications")).body.notifications;
  const done = adminNotes.find((n) => n.type === "delivered" && n.jobId === job.id);
  assert.ok(done);
  assert.match(done.title, /Lena Hoffmann finished JOB-/);
  await new Promise((r) => setTimeout(r, 100));
  assert.ok(events.join("").includes("event: notification") && events.join("").includes("finished JOB-"), "live notification pushed over SSE");
  ac.abort();

  // Admin downloads the deliverable, asks for a revision, then approves the resubmission
  const deliverable = finished.body.job.files.find((f) => f.kind === "deliverable");
  assert.equal((await admin.get(`/files/${deliverable.id}/download`)).body, "Hallo Welt");
  assert.equal((await admin.post(`/jobs/${job.id}/revision`, { note: "Fix the tagline" })).body.job.status, "revision");
  const fin2 = new FormData();
  fin2.append("files", new Blob(["Hallo Welt v2"]), "footer_DE_v2.txt");
  assert.equal((await emp.post(`/jobs/${job.id}/finish`, undefined, { form: fin2 })).status, 200);
  const approved = await admin.post(`/jobs/${job.id}/approve`);
  assert.equal(approved.body.job.status, "completed");
  assert.ok((await emp.get("/notifications")).body.notifications.some((n) => n.type === "approved" && n.jobId === job.id));

  const detail = (await admin.get(`/jobs/${job.id}`)).body.job;
  assert.ok(detail.history.length >= 6);
});

test("declining returns the job to the unassigned queue and alerts admins", async () => {
  const admin = client();
  await admin.login("admin@test.local", "admin-pass-123");
  const emp = client();
  const me = (await emp.login("aiko@linguaops.local", DEMO_PASSWORD)).body.user;
  const job = (await emp.get("/jobs")).body.jobs.find((j) => j.status === "assigned");
  assert.ok(job);
  assert.equal((await emp.post(`/jobs/${job.id}/decline`, { reason: "No capacity" })).status, 200);
  const after = (await admin.get(`/jobs/${job.id}`)).body.job;
  assert.equal(after.status, "unassigned");
  assert.equal(after.assignee, null);
  assert.ok((await admin.get("/notifications")).body.notifications.some((n) => n.type === "declined" && n.jobId === job.id));
  assert.equal((await emp.get(`/jobs/${job.id}`)).status, 404);
  assert.ok(me);
});

test("CSV import validates rows and assigns where asked", async () => {
  const admin = client();
  await admin.login("admin@test.local", "admin-pass-123");
  const lena = (await admin.get("/users")).body.users.find((u) => u.email === "lena@linguaops.local");
  const r = await admin.post("/jobs/import", {
    rows: [
      { title: "Homepage", client: "Atlas", source: "EN", target: "DE", words: 1200, deadline: Date.now() + 864e5, assigneeId: lena.id },
      { title: "Bad", client: "Atlas", source: "EN", target: "EN", words: 10, deadline: Date.now() + 864e5 },
    ],
  });
  assert.equal(r.status, 201);
  assert.equal(r.body.created, 1);
  assert.equal(r.body.assigned, 1);
  assert.equal(r.body.errors.length, 1);
});

test("admin manages users; new users must use their temporary password", async () => {
  const admin = client();
  await admin.login("admin@test.local", "admin-pass-123");
  const r = await admin.post("/users", { name: "New Linguist", email: "new@test.local", pairs: ["EN>FR"], specs: ["Legal"] });
  assert.equal(r.status, 201, JSON.stringify(r.body));
  assert.ok(r.body.tempPassword);
  const u = client();
  const login = await u.login("new@test.local", r.body.tempPassword);
  assert.equal(login.body.user.mustChangePassword, true);
  assert.equal((await u.post("/auth/password", { current: r.body.tempPassword, next: "brand-new-pass" })).status, 200);
  assert.equal((await u.get("/auth/me")).body.user.mustChangePassword, false);
  // Deactivation ends access immediately
  await admin.patch(`/users/${r.body.user.id}`, { active: false });
  assert.equal((await u.get("/jobs")).status, 401);
  assert.equal((await admin.patch(`/users/${login.body.user.id}`, { pairs: ["EN>EN"] })).status, 400);
});

test("approving a vendor application can create their employee login", async () => {
  const admin = client();
  await admin.login("admin@test.local", "admin-pass-123");
  const apps = (await admin.get("/applications")).body.applications;
  const pending = apps.find((a) => a.status === "pending");
  const r = await admin.post(`/applications/${pending.id}/decision`, { type: "approve", tier: "Trial", createAccount: true, welcome: true });
  assert.equal(r.status, 200, JSON.stringify(r.body));
  assert.equal(r.body.application.status, "approved");
  assert.ok(r.body.account.tempPassword);
  const v = client();
  assert.equal((await v.login(pending.email, r.body.account.tempPassword)).status, 200);
  assert.equal((await admin.post(`/applications/${pending.id}/decision`, { type: "reject", reason: "x" })).status, 400);
  assert.equal((await admin.post(`/applications/${pending.id}/reopen`)).body.application.status, "pending");
});
