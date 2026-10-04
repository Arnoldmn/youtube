// Shared job store used by the admin Jobs page and the Employee workspace.
// State lives in localStorage so every open tab sees the same jobs; a write in
// one tab fires a `storage` event in the others, which is how the admin gets
// notified the moment an employee marks a job as finished. Uploaded file
// contents are kept in IndexedDB (localStorage is too small for documents).
window.JobStore = (() => {
  "use strict";

  const KEY = "lingua:jobs:v1";
  const HOUR = 36e5;
  const ADMIN = { id: "admin", name: "Alex Rivera" };

  const LANGS = {
    AR: "Arabic", DE: "German", EN: "English", ES: "Spanish", FR: "French",
    IT: "Italian", JA: "Japanese", NL: "Dutch", NO: "Norwegian", PL: "Polish",
    PT: "Portuguese", RU: "Russian", SV: "Swedish", ZH: "Chinese",
  };
  const SERVICES = ["Translation", "Proofreading", "Translation + Review", "Localization", "Transcription", "Subtitling"];
  const PRIORITIES = [
    { id: "low", label: "Low" },
    { id: "normal", label: "Normal" },
    { id: "high", label: "High" },
    { id: "urgent", label: "Urgent" },
  ];
  const STATUSES = [
    { id: "unassigned", label: "Unassigned" },
    { id: "assigned", label: "Awaiting acceptance" },
    { id: "in_progress", label: "In progress" },
    { id: "revision", label: "Revision" },
    { id: "delivered", label: "Finished · needs review" },
    { id: "completed", label: "Completed" },
  ];
  const STATUS_LABEL = Object.fromEntries(STATUSES.map((s) => [s.id, s.label]));
  const OPEN = new Set(["unassigned", "assigned", "in_progress", "revision"]);

  /* ---------------------------------------------------------------------- */
  /* Seed data                                                              */
  /* ---------------------------------------------------------------------- */
  const EMPLOYEES = [
    { id: "emp-1", name: "Lena Hoffmann", role: "In-house", email: "lena@linguaops.eu", pairs: ["EN>DE", "DE>EN"], specs: ["Technical", "Legal"], capacity: 3000 },
    { id: "emp-2", name: "Carlos Ruiz", role: "In-house", email: "carlos@linguaops.eu", pairs: ["EN>ES", "PT>ES"], specs: ["Marketing", "Legal"], capacity: 3500 },
    { id: "emp-3", name: "Samuel Adeyemi", role: "In-house", email: "samuel@linguaops.eu", pairs: ["EN>FR", "FR>EN"], specs: ["Medical", "NGO"], capacity: 2800 },
    { id: "emp-4", name: "Aiko Tanaka", role: "Freelance", email: "aiko.tanaka@mail.jp", pairs: ["EN>JA", "JA>EN"], specs: ["Gaming", "Technical"], capacity: 2500 },
    { id: "emp-5", name: "Giulia Romano", role: "Freelance", email: "giulia.romano@libero.it", pairs: ["IT>EN", "EN>IT"], specs: ["Medical", "Life Sciences"], capacity: 3000 },
    { id: "emp-6", name: "Nadia Petrova", role: "In-house", email: "nadia@linguaops.eu", pairs: ["EN>RU", "RU>EN"], specs: ["Financial", "Legal"], capacity: 3200 },
    { id: "emp-7", name: "Ingrid Solberg", role: "Freelance", email: "ingrid.solberg@online.no", pairs: ["NO>EN", "SV>EN"], specs: ["Technical", "Energy"], capacity: 2600 },
    { id: "emp-8", name: "Fatima Zahra", role: "Freelance", email: "fatima.zahra@gmail.com", pairs: ["EN>AR", "FR>AR"], specs: ["Legal", "Marketing"], capacity: 2400 },
    { id: "emp-9", name: "Pieter de Vries", role: "In-house", email: "pieter@linguaops.eu", pairs: ["EN>NL", "DE>NL"], specs: ["Financial", "Technical"], capacity: 3000 },
  ];

  function seed() {
    const seedEmp = (id) => EMPLOYEES.find((e) => e.id === id);
    const now = Date.now();
    const raw = [
      ["Employment contract – Berlin office", "Northwind Legal", "EN", "DE", "Translation", 4200, 30, "high", "in_progress", "emp-1", 55],
      ["Q3 investor presentation", "Fjord Capital", "EN", "NL", "Translation + Review", 2600, 20, "normal", "in_progress", "emp-9", 30],
      ["Mobile game UI strings v2.4", "Pixel Harbor", "EN", "JA", "Localization", 7800, 72, "normal", "assigned", "emp-4", 0],
      ["Clinical study informed consent", "Medivance Pharma", "EN", "FR", "Translation + Review", 3100, 6, "urgent", "in_progress", "emp-3", 80],
      ["Spring campaign landing pages", "Oslo Outdoor", "EN", "ES", "Translation", 1800, -3, "high", "in_progress", "emp-2", 70],
      ["Annual report 2025 – summary", "Volga Bank", "RU", "EN", "Translation", 5200, 96, "normal", "unassigned", null, 0],
      ["Product safety data sheets", "Nordic Energy AS", "NO", "EN", "Translation", 2300, 48, "normal", "unassigned", null, 0],
      ["Website legal notice & privacy", "Atlas Retail", "FR", "AR", "Translation", 1400, 52, "low", "unassigned", null, 0],
      ["Device IFU – revision 3", "Medivance Pharma", "IT", "EN", "Proofreading", 3900, 26, "high", "delivered", "emp-5", 100],
      ["Customer interview recordings", "Fjord Capital", "DE", "EN", "Transcription", 6000, 40, "normal", "delivered", "emp-1", 100],
      ["Terms of service update", "Pixel Harbor", "EN", "ES", "Translation", 2100, -50, "normal", "completed", "emp-2", 100],
      ["Board minutes – October", "Volga Bank", "EN", "RU", "Translation", 1600, -26, "normal", "completed", "emp-6", 100],
    ];
    let seq = 1040;
    const jobs = raw.map(([title, client, src, tgt, service, words, dueH, priority, status, assigneeId, progress], i) => {
      const id = `JOB-${++seq}`;
      const createdAt = now - (60 + i * 7) * HOUR;
      const rate = { Translation: 0.11, "Translation + Review": 0.14, Proofreading: 0.05, Localization: 0.12, Transcription: 0.04, Subtitling: 0.09 }[service];
      const history = [{ at: createdAt, by: ADMIN.name, text: "Job created" }];
      if (assigneeId) history.push({ at: createdAt + HOUR, by: ADMIN.name, text: `Assigned to ${seedEmp(assigneeId).name}` });
      if (["in_progress", "delivered", "completed"].includes(status)) history.push({ at: createdAt + 3 * HOUR, by: seedEmp(assigneeId).name, text: "Accepted the job" });
      const files = [{ id: `${id}-src`, name: `${title.replace(/[^\w]+/g, "_")}_${src}.docx`, size: 18000 + words * 9, kind: "source", by: ADMIN.name, at: createdAt, stored: false }];
      let deliveredAt = null;
      if (status === "delivered" || status === "completed") {
        deliveredAt = Math.min(now + dueH * HOUR - 5 * HOUR, now - (2 + i) * HOUR);
        files.push({ id: `${id}-del`, name: `${title.replace(/[^\w]+/g, "_")}_${tgt}.docx`, size: 19000 + words * 10, kind: "deliverable", by: seedEmp(assigneeId).name, at: deliveredAt, stored: false });
        history.push({ at: deliveredAt, by: seedEmp(assigneeId).name, text: "Marked as finished and uploaded the deliverable" });
      }
      if (status === "completed") history.push({ at: deliveredAt + 2 * HOUR, by: ADMIN.name, text: "Approved and completed" });
      return {
        id, title, client, source: src, target: tgt, service, words, rate, priority, status, assigneeId,
        progress, deadline: now + dueH * HOUR, createdAt, updatedAt: now, deliveredAt,
        instructions: i % 3 === 0 ? "Use the client glossary attached to the project. Keep formatting identical to the source." : "",
        files, history, overdueNotified: false,
      };
    });
    const notifications = jobs
      .filter((j) => j.status === "delivered")
      .map((j, i) => ({ id: `n-seed-${i}`, at: j.deliveredAt, to: "admin", type: "delivered", jobId: j.id, title: `${seedEmp(j.assigneeId).name} finished ${j.id}`, body: j.title, read: false }));
    return { version: 1, seq, jobs, employees: EMPLOYEES, notifications, settings: { simulate: true } };
  }

  /* ---------------------------------------------------------------------- */
  /* Persistence + subscriptions                                            */
  /* ---------------------------------------------------------------------- */
  let memoryOnly = false;
  let state = read();
  const listeners = new Set();

  function read() {
    try {
      const s = JSON.parse(localStorage.getItem(KEY));
      if (s && s.version === 1) return s;
    } catch { /* fall through */ }
    const s = seed();
    write(s);
    return s;
  }
  function write(s) {
    try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { memoryOnly = true; }
  }
  function emit(info) { listeners.forEach((fn) => fn(info)); }

  // Re-read before every mutation so concurrent tabs don't clobber each other.
  function mutate(fn) {
    if (!memoryOnly) {
      try {
        const fresh = JSON.parse(localStorage.getItem(KEY));
        if (fresh && fresh.version === 1) state = fresh;
      } catch { /* keep in-memory state */ }
    }
    const before = new Set(state.notifications.map((n) => n.id));
    const result = fn(state);
    write(state);
    emit({ remote: false, added: state.notifications.filter((n) => !before.has(n.id)) });
    return result;
  }

  window.addEventListener("storage", (e) => {
    if (e.key !== KEY || !e.newValue) return;
    const before = new Set(state.notifications.map((n) => n.id));
    try { state = JSON.parse(e.newValue); } catch { return; }
    emit({ remote: true, added: state.notifications.filter((n) => !before.has(n.id)) });
  });

  /* ---------------------------------------------------------------------- */
  /* Helpers                                                                */
  /* ---------------------------------------------------------------------- */
  const emp = (id) => state.employees.find((e) => e.id === id);
  const job = (id) => state.jobs.find((j) => j.id === id);
  const uid = (p) => `${p}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  const pair = (j) => `${j.source}>${j.target}`;

  function notify(s, to, type, j, title, body = j.title) {
    s.notifications.unshift({ id: uid("n"), at: Date.now(), to, type, jobId: j.id, title, body, read: false });
    s.notifications = s.notifications.slice(0, 200);
  }
  function log(j, by, text) {
    j.history.push({ at: Date.now(), by, text });
    j.updatedAt = Date.now();
  }

  function workload(empId) {
    const open = state.jobs.filter((j) => j.assigneeId === empId && OPEN.has(j.status));
    return { jobs: open.length, words: open.reduce((s, j) => s + j.words * (1 - (j.progress || 0) / 100), 0) };
  }

  // Rank employees for a job: language pair match first, then lightest workload.
  function suggest(source, target) {
    const p = `${source}>${target}`;
    return state.employees
      .map((e) => {
        const w = workload(e.id);
        const match = e.pairs.includes(p) ? 2 : e.pairs.some((x) => x.endsWith(`>${target}`)) ? 1 : 0;
        return { ...e, match, load: w.jobs, loadWords: Math.round(w.words), days: w.words / e.capacity };
      })
      .sort((a, b) => b.match - a.match || a.days - b.days);
  }

  /* ---------------------------------------------------------------------- */
  /* Actions                                                                */
  /* ---------------------------------------------------------------------- */
  const actions = {
    createJob(input, files = []) {
      return mutate((s) => {
        const id = `JOB-${++s.seq}`;
        const j = {
          id, title: input.title.trim(), client: input.client.trim(), source: input.source, target: input.target,
          service: input.service, words: Number(input.words) || 0, rate: Number(input.rate) || 0,
          priority: input.priority || "normal", deadline: input.deadline, instructions: input.instructions || "",
          status: "unassigned", assigneeId: null, progress: 0, createdAt: Date.now(), updatedAt: Date.now(),
          deliveredAt: null, overdueNotified: false,
          files: files.map((f) => ({ ...f, kind: "source", by: ADMIN.name, at: Date.now() })),
          history: [{ at: Date.now(), by: ADMIN.name, text: files.length ? `Job created with ${files.length} source file${files.length > 1 ? "s" : ""}` : "Job created" }],
        };
        s.jobs.unshift(j);
        if (input.assigneeId) assignIn(s, j, input.assigneeId);
        return j;
      });
    },
    assign(jobId, empId) {
      return mutate((s) => assignIn(s, s.jobs.find((j) => j.id === jobId), empId));
    },
    unassign(jobId) {
      return mutate((s) => {
        const j = s.jobs.find((x) => x.id === jobId);
        const prev = s.employees.find((e) => e.id === j.assigneeId);
        if (prev) notify(s, prev.id, "unassigned", j, `${j.id} was unassigned from you`);
        j.assigneeId = null; j.status = "unassigned"; j.progress = 0;
        log(j, ADMIN.name, "Unassigned");
      });
    },
    accept(jobId, empId) {
      return mutate((s) => {
        const j = s.jobs.find((x) => x.id === jobId);
        if (j.assigneeId !== empId || j.status !== "assigned") return;
        const e = s.employees.find((x) => x.id === empId);
        j.status = "in_progress";
        log(j, e.name, "Accepted the job");
        notify(s, "admin", "accepted", j, `${e.name} accepted ${j.id}`);
      });
    },
    decline(jobId, empId, reason) {
      return mutate((s) => {
        const j = s.jobs.find((x) => x.id === jobId);
        if (j.assigneeId !== empId) return;
        const e = s.employees.find((x) => x.id === empId);
        j.status = "unassigned"; j.assigneeId = null; j.progress = 0;
        log(j, e.name, `Declined the job${reason ? `: ${reason}` : ""}`);
        notify(s, "admin", "declined", j, `${e.name} declined ${j.id}`, reason || j.title);
      });
    },
    setProgress(jobId, empId, pct) {
      return mutate((s) => {
        const j = s.jobs.find((x) => x.id === jobId);
        if (j.assigneeId !== empId || !["in_progress", "revision"].includes(j.status)) return;
        j.progress = Math.max(0, Math.min(99, Math.round(pct)));
        j.updatedAt = Date.now();
      });
    },
    finish(jobId, empId, files = [], note = "") {
      return mutate((s) => {
        const j = s.jobs.find((x) => x.id === jobId);
        if (j.assigneeId !== empId || !["in_progress", "revision"].includes(j.status)) return;
        const e = s.employees.find((x) => x.id === empId);
        j.files.push(...files.map((f) => ({ ...f, kind: "deliverable", by: e.name, at: Date.now() })));
        j.status = "delivered"; j.progress = 100; j.deliveredAt = Date.now();
        log(j, e.name, `Marked as finished${files.length ? ` and uploaded ${files.length} file${files.length > 1 ? "s" : ""}` : ""}${note ? ` — “${note}”` : ""}`);
        notify(s, "admin", "delivered", j, `${e.name} finished ${j.id}`, note ? `${j.title} — “${note}”` : j.title);
      });
    },
    approve(jobId) {
      return mutate((s) => {
        const j = s.jobs.find((x) => x.id === jobId);
        j.status = "completed";
        log(j, ADMIN.name, "Approved and completed");
        if (j.assigneeId) notify(s, j.assigneeId, "approved", j, `${j.id} was approved — great work!`);
      });
    },
    requestRevision(jobId, note) {
      return mutate((s) => {
        const j = s.jobs.find((x) => x.id === jobId);
        j.status = "revision"; j.progress = 60;
        log(j, ADMIN.name, `Requested a revision${note ? `: ${note}` : ""}`);
        if (j.assigneeId) notify(s, j.assigneeId, "revision", j, `Revision requested on ${j.id}`, note || j.title);
      });
    },
    addFiles(jobId, files, kind, byName) {
      return mutate((s) => {
        const j = s.jobs.find((x) => x.id === jobId);
        j.files.push(...files.map((f) => ({ ...f, kind, by: byName, at: Date.now() })));
        log(j, byName, `Uploaded ${files.length} ${kind} file${files.length > 1 ? "s" : ""}`);
        if (kind === "source" && j.assigneeId) notify(s, j.assigneeId, "files", j, `New files added to ${j.id}`);
      });
    },
    update(jobId, patch) {
      return mutate((s) => {
        const j = s.jobs.find((x) => x.id === jobId);
        Object.assign(j, patch);
        log(j, ADMIN.name, "Job details updated");
      });
    },
    remove(jobId) {
      return mutate((s) => {
        s.jobs = s.jobs.filter((j) => j.id !== jobId);
        s.notifications = s.notifications.filter((n) => n.jobId !== jobId);
      });
    },
    restore(jobSnapshot) {
      return mutate((s) => { s.jobs.unshift(jobSnapshot); });
    },
    checkOverdue() {
      const due = state.jobs.some((j) => OPEN.has(j.status) && j.deadline < Date.now() && !j.overdueNotified);
      if (!due) return;
      mutate((s) => {
        for (const j of s.jobs) {
          if (OPEN.has(j.status) && j.deadline < Date.now() && !j.overdueNotified) {
            j.overdueNotified = true;
            const who = s.employees.find((e) => e.id === j.assigneeId);
            notify(s, "admin", "overdue", j, `${j.id} is overdue`, who ? `${j.title} · ${who.name}` : `${j.title} · unassigned`);
          }
        }
      });
    },
    markRead(ids) {
      return mutate((s) => { s.notifications.forEach((n) => { if (ids.includes(n.id)) n.read = true; }); });
    },
    setSetting(k, v) {
      return mutate((s) => { s.settings[k] = v; });
    },
    reset() {
      state = seed();
      write(state);
      FileDB.clear();
      emit({ remote: false, added: [] });
    },
  };

  function assignIn(s, j, empId) {
    const e = s.employees.find((x) => x.id === empId);
    if (!e || !j) return j;
    const prev = j.assigneeId && j.assigneeId !== empId ? s.employees.find((x) => x.id === j.assigneeId) : null;
    if (prev) notify(s, prev.id, "unassigned", j, `${j.id} was reassigned`);
    j.assigneeId = empId; j.status = "assigned"; j.progress = 0;
    log(j, ADMIN.name, prev ? `Reassigned from ${prev.name} to ${e.name}` : `Assigned to ${e.name}`);
    notify(s, empId, "assigned", j, `New job assigned: ${j.id}`);
    return j;
  }

  /* ---------------------------------------------------------------------- */
  /* File contents (IndexedDB, with in-memory fallback)                     */
  /* ---------------------------------------------------------------------- */
  const FileDB = (() => {
    const mem = new Map();
    let dbp = null;
    function db() {
      if (dbp) return dbp;
      dbp = new Promise((res, rej) => {
        try {
          const r = indexedDB.open("lingua-files", 1);
          r.onupgradeneeded = () => r.result.createObjectStore("files");
          r.onsuccess = () => res(r.result);
          r.onerror = () => rej(r.error);
        } catch (e) { rej(e); }
      });
      return dbp;
    }
    async function tx(mode, fn) {
      const d = await db();
      return new Promise((res, rej) => {
        const t = d.transaction("files", mode);
        const req = fn(t.objectStore("files"));
        t.oncomplete = () => res(req && req.result);
        t.onerror = () => rej(t.error);
      });
    }
    return {
      async put(id, blob) {
        mem.set(id, blob);
        try { await tx("readwrite", (s) => s.put(blob, id)); return true; } catch { return false; }
      },
      async get(id) {
        if (mem.has(id)) return mem.get(id);
        try { return await tx("readonly", (s) => s.get(id)); } catch { return undefined; }
      },
      async clear() {
        mem.clear();
        try { await tx("readwrite", (s) => s.clear()); } catch { /* ignore */ }
      },
    };
  })();

  // Store real File objects and return the metadata to keep on the job.
  async function storeFiles(fileList) {
    const out = [];
    for (const f of fileList) {
      const id = uid("f");
      await FileDB.put(id, f);
      out.push({ id, name: f.name, size: f.size, type: f.type, stored: true });
    }
    return out;
  }

  async function getFileBlob(job, file) {
    if (file.stored) {
      const b = await FileDB.get(file.id);
      if (b) return b;
    }
    // Seeded demo files have no stored content: generate a readable placeholder.
    const text = [
      file.name, "",
      `${job.id} · ${job.title}`,
      `Client: ${job.client}`,
      `Language pair: ${LANGS[job.source]} → ${LANGS[job.target]}`,
      `Service: ${job.service} · ${job.words.toLocaleString()} words`,
      "", file.kind === "deliverable" ? "[Translated deliverable — demo placeholder]" : "[Source document — demo placeholder]",
    ].join("\n");
    return new Blob([text], { type: "text/plain" });
  }

  return {
    get state() { return state; },
    subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },
    actions, storeFiles, getFileBlob, suggest, workload, emp, job, pair,
    ADMIN, LANGS, SERVICES, PRIORITIES, STATUSES, STATUS_LABEL, OPEN, HOUR,
  };
})();
