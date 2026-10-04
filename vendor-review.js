(() => {
  "use strict";

  /* ------------------------------------------------------------------------
     Icons (inline SVG, stroke-based)
     ------------------------------------------------------------------------ */
  const ICONS = {
    check: '<path d="M20 6 9 17l-5-5"/>',
    x: '<path d="M18 6 6 18M6 6l12 12"/>',
    help: '<circle cx="12" cy="12" r="10"/><path d="M9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3M12 17h.01"/>',
    search: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
    "chevron-down": '<path d="m6 9 6 6 6-6"/>',
    "chevron-up": '<path d="m18 15-6-6-6 6"/>',
    "chevron-right": '<path d="m9 18 6-6-6-6"/>',
    "arrow-left": '<path d="m12 19-7-7 7-7M19 12H5"/>',
    shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/>',
    award: '<circle cx="12" cy="8" r="6"/><path d="M15.5 12.9 17 22l-5-3-5 3 1.5-9.1"/>',
    cap: '<path d="M22 10 12 5 2 10l10 5 10-5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/>',
    file: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M16 13H8M16 17H8M10 9H8"/>',
    download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>',
    clock: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
    mail: '<rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-10 6L2 7"/>',
    pin: '<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0z"/><circle cx="12" cy="10" r="3"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M6.3 17.7l-1.4 1.4M19.1 4.9l-1.4 1.4"/>',
    moon: '<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9z"/>',
    inbox: '<path d="M22 12h-6l-2 3h-4l-2-3H2"/><path d="M5.5 5.1 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.5-6.9A2 2 0 0 0 16.8 4H7.2a2 2 0 0 0-1.7 1.1z"/>',
    users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8"/>',
    folder: '<path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.7-.9l-.8-1.2A2 2 0 0 0 7.9 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2z"/>',
    chart: '<path d="M3 3v18h18M18 17V9M13 17V5M8 17v-3"/>',
    receipt: '<path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1z"/><path d="M16 8H8M16 12H8M13 16H8"/>',
    grid: '<rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/><rect x="14" y="12" width="7" height="9" rx="1"/><rect x="3" y="16" width="7" height="5" rx="1"/>',
    keyboard: '<rect x="2" y="4" width="20" height="16" rx="2"/><path d="M6 8h.01M10 8h.01M14 8h.01M18 8h.01M8 12h.01M12 12h.01M16 12h.01M7 16h10"/>',
    menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
    bell: '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9M10.3 21a1.9 1.9 0 0 0 3.4 0"/>',
    sort: '<path d="m21 16-4 4-4-4M17 20V4M3 8l4-4 4 4M7 4v16"/>',
    languages: '<path d="m5 8 6 6M4 14l6-6 2-3M2 5h12M7 2h1M22 22l-5-10-5 10M14 18h6"/>',
    briefcase: '<rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>',
    star: '<path d="m12 2 3.1 6.3 6.9 1-5 4.9 1.2 6.8-6.2-3.2-6.2 3.2L7 14.2 2 9.3l6.9-1z"/>',
    alert: '<path d="m21.7 18-8-14a2 2 0 0 0-3.5 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.7-3z"/><path d="M12 9v4M12 17h.01"/>',
    undo: '<path d="M3 12a9 9 0 1 0 9-9 9.8 9.8 0 0 0-6.7 2.7L3 8"/><path d="M3 3v5h5"/>',
    send: '<path d="m22 2-7 20-4-9-9-4z"/><path d="M22 2 11 13"/>',
    filter: '<path d="M22 3H2l8 9.5V19l4 2v-8.5z"/>',
    level: '<path d="M2 20h.01M7 20v-4M12 20v-8M17 20V8M22 4v16"/>',
    dot: '<circle cx="12" cy="12" r="1"/>',
  };
  const icon = (name, cls = "") =>
    `<svg class="ico ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name] || ""}</svg>`;

  const esc = (s) =>
    String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

  /* ------------------------------------------------------------------------
     Persistence (best-effort; the page works without it)
     ------------------------------------------------------------------------ */
  const STORE_KEY = "vendor-review:v1";
  const store = {
    load() {
      try { return JSON.parse(localStorage.getItem(STORE_KEY)) || {}; } catch { return {}; }
    },
    save(data) {
      try { localStorage.setItem(STORE_KEY, JSON.stringify(data)); } catch { /* ignore */ }
    },
  };
  const saved = store.load();

  /* ------------------------------------------------------------------------
     Reference data
     ------------------------------------------------------------------------ */
  const NOW = Date.now();
  const HOUR = 36e5;
  const ME = { name: "Alex Rivera", initials: "AR", hue: 250 };
  const COLLEAGUE = "Jordan Lee";

  const STATUSES = [
    { id: "pending", label: "Pending review" },
    { id: "info", label: "Info requested" },
    { id: "approved", label: "Approved" },
    { id: "rejected", label: "Rejected" },
    { id: "all", label: "All" },
  ];
  const STATUS_LABEL = Object.fromEntries(STATUSES.map((s) => [s.id, s.label]));

  const LEVELS = [
    { id: "entry", label: "Entry", hint: "0–2 years", min: 0, max: 2 },
    { id: "mid", label: "Mid-level", hint: "3–6 years", min: 3, max: 6 },
    { id: "senior", label: "Senior", hint: "7–11 years", min: 7, max: 11 },
    { id: "expert", label: "Expert", hint: "12+ years", min: 12, max: Infinity },
  ];
  const levelOf = (years) => LEVELS.find((l) => years >= l.min && years <= l.max);

  const CHECKS = [
    { key: "identity", label: "Identity", icon: "shield" },
    { key: "ata", label: "ATA certification", icon: "award" },
    { key: "degree", label: "Degree", icon: "cap" },
  ];
  const V_LABEL = { verified: "Verified", pending: "Pending", failed: "Failed", none: "Not provided" };

  const VERIFY_FILTERS = [
    { id: "full", label: "Fully verified", hint: "All three checks passed", test: (v) => verifiedCount(v) === 3 },
    { id: "ata", label: "ATA certified", hint: "Verified ATA credential", test: (v) => v.verification.ata === "verified" },
    { id: "attention", label: "Needs attention", hint: "Pending or failed checks", test: (v) => CHECKS.some((c) => ["pending", "failed"].includes(v.verification[c.key])) },
  ];

  const REJECT_REASONS = [
    "Assessment below threshold",
    "Insufficient experience",
    "Unverifiable credentials",
    "Language pair not currently needed",
    "Rates outside budget",
    "Other",
  ];

  const INFO_ITEMS = [
    { id: "identity", label: "Clear identity document", hint: "Passport or national ID, all corners visible" },
    { id: "ata", label: "ATA certification details", hint: "Member number and certified pair" },
    { id: "degree", label: "Degree certificate or transcript", hint: "Official scan or verification link" },
    { id: "samples", label: "Additional translation samples", hint: "2 samples in their main specialization" },
    { id: "rates", label: "Updated rate card", hint: "Per-word, hourly and minimum fee" },
    { id: "references", label: "Professional references", hint: "Two clients from the past 24 months" },
  ];

  const SAMPLE_TEXT = {
    Legal: "This Agreement shall be governed by and construed in accordance with the laws of the State of New York, without regard to its conflict of laws principles. Any dispute arising hereunder shall be submitted to binding arbitration.",
    Financial: "Revenue for the fiscal year increased 12% to $4.2 billion, driven by strong performance in the payments segment. Operating margin expanded 180 basis points as a result of disciplined cost management.",
    Medical: "You are being asked to take part in a research study. Before you decide, it is important that you understand why the research is being done and what it will involve. Please take time to read the following information carefully.",
    Technical: "Before servicing the unit, disconnect the main power supply and wait at least five minutes for the capacitors to discharge. Failure to observe this warning may result in serious injury or equipment damage.",
    Marketing: "Meet the jacket that goes wherever you do. Featherlight, fully waterproof and made from 100% recycled fibres — because the best adventures shouldn't cost the earth.",
    Gaming: "The ancient gate trembles as you approach. Gather three sigil fragments from the Shattered Peaks to restore its power — but beware, the Warden does not take kindly to intruders.",
  };

  /* ------------------------------------------------------------------------
     Model
     ------------------------------------------------------------------------ */
  const hueOf = (s) => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 360, 7);
  const initialsOf = (name) => name.split(/\s+/).map((p) => p[0]).slice(0, 2).join("").toUpperCase();
  const splitPair = (p) => p.split(">");
  const pairLabel = (p) => splitPair(p).join(" → ");
  const pairNames = (p) => splitPair(p).map((c) => LANGUAGES[c] || c).join(" → ");
  const verifiedCount = (v) => CHECKS.filter((c) => v.verification[c.key] === "verified").length;

  let uid = 0;
  const entry = (props) => ({ id: `e${Date.now().toString(36)}${(uid++).toString(36)}`, ...props });

  function seedActivity(v) {
    const t0 = v.appliedAt;
    const list = [
      { type: "submitted", at: t0, by: v.name, title: "Application submitted", text: `Applied for ${v.pairs.map(pairLabel).join(", ")}` },
      { type: "assessment", at: t0 + HOUR * 0.8, by: "Assessment bot", title: `Translation test scored ${v.score}/100`, text: `${v.specs[0]} domain · reviewed by ${COLLEAGUE}`, color: v.score >= 85 ? "green" : v.score >= 75 ? "amber" : "red" },
      { type: "verify", at: t0 + HOUR * 1.5, by: "Veriff", title: `Identity check ${V_LABEL[v.verification.identity].toLowerCase()}`, color: { verified: "green", failed: "red", pending: "amber" }[v.verification.identity] },
    ];
    if (v.status === "info") list.push({ type: "info", at: t0 + HOUR * 20, by: COLLEAGUE, title: "Requested more information", note: v.infoRequest, color: "blue" });
    if (v.status === "approved") list.push({ type: "approved", at: t0 + HOUR * 30, by: COLLEAGUE, title: "Approved · Standard tier", text: "Welcome email and onboarding checklist sent", color: "green" });
    if (v.status === "rejected") list.push({ type: "rejected", at: t0 + HOUR * 26, by: COLLEAGUE, title: `Rejected · ${v.rejectReason}`, color: "red" });
    return list.filter((e) => e.at <= NOW).map((e, i) => ({ id: `seed-${v.id}-${i}`, ...e }));
  }

  function seedDocs(v) {
    const slug = v.name.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, "-");
    const docs = [{ id: "cv", kind: "cv", name: `CV_${slug}.pdf`, type: "pdf", size: "184 KB" }];
    docs.push({ id: "id", kind: "id", name: "Identity_document.jpg", type: "img", size: "1.2 MB" });
    if (v.ataNumber) docs.push({ id: "ata", kind: "ata", name: `ATA_certificate_${v.ataNumber}.pdf`, type: "pdf", size: "96 KB" });
    docs.push({ id: "degree", kind: "degree", name: `Degree_${v.education.school.split(" ")[0]}.pdf`, type: "pdf", size: "412 KB" });
    docs.push({ id: "sample", kind: "sample", name: `Sample_${v.pairs[0].replace(">", "-")}_${v.specs[0]}.docx`, type: "doc", size: "38 KB" });
    return docs;
  }

  const overrides = saved.overrides || {};
  const vendors = VENDORS.map((raw) => {
    const v = {
      ...raw,
      verification: { ...raw.verification },
      appliedAt: NOW - raw.appliedHoursAgo * HOUR,
      initials: initialsOf(raw.name),
      hue: hueOf(raw.name),
      level: levelOf(raw.years),
    };
    v.activity = seedActivity(v);
    v.docs = seedDocs(v);
    const o = overrides[v.id];
    if (o) {
      Object.assign(v, o.fields || {});
      Object.assign(v.verification, o.verification || {});
      v.activity.push(...(o.log || []));
    }
    return v;
  });
  const byId = new Map(vendors.map((v) => [v.id, v]));

  function persist() {
    const out = {};
    for (const v of vendors) {
      const seedIds = new Set(seedActivity(v).map((e) => e.id));
      const log = v.activity.filter((e) => !seedIds.has(e.id));
      const raw = VENDORS.find((r) => r.id === v.id);
      const fields = {};
      for (const k of ["status", "infoRequest", "rejectReason", "tier"]) if (v[k] !== raw[k]) fields[k] = v[k];
      const verification = {};
      for (const c of CHECKS) if (v.verification[c.key] !== raw.verification[c.key]) verification[c.key] = v.verification[c.key];
      if (log.length || Object.keys(fields).length || Object.keys(verification).length) out[v.id] = { fields, verification, log };
    }
    store.save({ overrides: out, seen: [...state.seen], theme: state.theme });
  }

  /* ------------------------------------------------------------------------
     State
     ------------------------------------------------------------------------ */
  const state = {
    status: "pending",
    query: "",
    sort: "newest",
    filters: { pairs: new Set(), specs: new Set(), levels: new Set(), verify: new Set() },
    selectedId: null,
    checked: new Set(),
    tab: "overview",
    docId: "cv",
    openFilter: null,
    seen: new Set(saved.seen || []),
    theme: saved.theme || (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"),
  };

  const FILTER_DEFS = {
    pairs: {
      label: "Language pair", icon: "languages", searchable: true,
      options: () => [...new Set(vendors.flatMap((v) => v.pairs))].sort().map((p) => ({ id: p, label: pairLabel(p), hint: pairNames(p) })),
      test: (v, set) => v.pairs.some((p) => set.has(p)),
    },
    specs: {
      label: "Specialization", icon: "briefcase", searchable: true,
      options: () => [...new Set(vendors.flatMap((v) => v.specs))].sort().map((s) => ({ id: s, label: s })),
      test: (v, set) => v.specs.some((s) => set.has(s)),
    },
    levels: {
      label: "Experience", icon: "level",
      options: () => LEVELS.map((l) => ({ id: l.id, label: l.label, hint: l.hint })),
      test: (v, set) => set.has(v.level.id),
    },
    verify: {
      label: "Verification", icon: "shield",
      options: () => VERIFY_FILTERS.map((f) => ({ id: f.id, label: f.label, hint: f.hint })),
      test: (v, set) => VERIFY_FILTERS.some((f) => set.has(f.id) && f.test(v)),
    },
  };

  function matchesQuery(v, q) {
    if (!q) return true;
    const hay = [v.name, v.id, v.email, v.location, ...v.specs, ...v.tools, ...v.pairs, ...v.pairs.map(pairNames)].join(" ").toLowerCase();
    return q.toLowerCase().split(/\s+/).every((t) => hay.includes(t));
  }

  function matchesFilters(v, skip) {
    return Object.entries(state.filters).every(([key, set]) => key === skip || !set.size || FILTER_DEFS[key].test(v, set));
  }

  const SORTS = {
    newest: (a, b) => b.appliedAt - a.appliedAt,
    oldest: (a, b) => a.appliedAt - b.appliedAt,
    score: (a, b) => b.score - a.score,
    exp: (a, b) => b.years - a.years,
    verified: (a, b) => verifiedCount(b) - verifiedCount(a) || b.score - a.score,
  };

  const filtered = () => vendors.filter((v) => matchesQuery(v, state.query) && matchesFilters(v));
  function visible() {
    return filtered()
      .filter((v) => state.status === "all" || v.status === state.status)
      .sort(SORTS[state.sort]);
  }

  /* ------------------------------------------------------------------------
     Formatting helpers
     ------------------------------------------------------------------------ */
  function ago(t) {
    const m = Math.round((Date.now() - t) / 6e4);
    if (m < 1) return "just now";
    if (m < 60) return `${m}m ago`;
    const h = Math.round(m / 60);
    if (h < 24) return `${h}h ago`;
    const d = Math.round(h / 24);
    return `${d}d ago`;
  }
  const fmtDate = (t) => new Date(t).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  const fmtDateTime = (t) => new Date(t).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
  const scoreClass = (s) => (s >= 85 ? "hi" : s >= 75 ? "mid" : "lo");
  const plural = (n, word) => `${n} ${word}${n === 1 ? "" : "s"}`;
  const money = (n) => `$${n.toFixed(2)}`;

  /* ------------------------------------------------------------------------
     Rendering
     ------------------------------------------------------------------------ */
  const el = {
    app: $(".app"),
    kpis: $("#kpis"),
    tabs: $("#statusTabs"),
    filters: $("#filters"),
    clear: $("#clearFilters"),
    list: $("#list"),
    listCount: $("#listCount"),
    checkAll: $("#checkAll"),
    bulk: $("#bulkBar"),
    bulkCount: $("#bulkCount"),
    detail: $("#detail"),
    search: $("#searchInput"),
    sort: $("#sortSelect"),
    navBadge: $("#navBadge"),
    modal: $("#modal"),
    modalForm: $("#modalForm"),
    shortcuts: $("#shortcuts"),
    toasts: $("#toasts"),
    theme: $("#themeBtn"),
  };

  const isMobile = () => matchMedia("(max-width: 900px)").matches;

  function render() {
    const list = visible();
    if (!list.some((v) => v.id === state.selectedId)) {
      state.selectedId = list[0]?.id ?? null;
      if (!state.selectedId) el.app.classList.remove("detail-open");
    }
    // Drop checked rows that are no longer visible
    for (const id of state.checked) if (!list.some((v) => v.id === id)) state.checked.delete(id);

    renderKpis();
    renderTabs();
    renderFilters();
    renderList(list);
    renderDetail(list);
    el.navBadge.textContent = vendors.filter((v) => v.status === "pending").length;
  }

  function renderKpis() {
    const pending = vendors.filter((v) => v.status === "pending");
    const info = vendors.filter((v) => v.status === "info").length;
    const approved = vendors.filter((v) => v.status === "approved").length;
    const avgWait = pending.length ? pending.reduce((s, v) => s + (NOW - v.appliedAt), 0) / pending.length / HOUR : 0;
    const newToday = pending.filter((v) => NOW - v.appliedAt < 24 * HOUR).length;
    const wait = avgWait >= 24 ? `${(avgWait / 24).toFixed(1)}d` : `${Math.round(avgWait)}h`;
    el.kpis.innerHTML = `
      <div class="kpi"><span>Pending review</span><strong>${pending.length}</strong><em class="up">+${newToday} today</em></div>
      <div class="kpi"><span>Awaiting info</span><strong>${info}</strong></div>
      <div class="kpi"><span>Approved</span><strong>${approved}</strong></div>
      <div class="kpi"><span>Avg. wait time</span><strong>${wait}</strong></div>`;
  }

  function renderTabs() {
    const base = filtered();
    el.tabs.innerHTML = STATUSES.map((s) => {
      const n = s.id === "all" ? base.length : base.filter((v) => v.status === s.id).length;
      return `<button class="tab" role="tab" type="button" data-status="${s.id}" aria-selected="${state.status === s.id}">${s.label}<span class="count">${n}</span></button>`;
    }).join("");
  }

  function renderFilters() {
    let any = false;
    for (const box of $$(".filter", el.filters)) {
      const key = box.dataset.filter;
      const def = FILTER_DEFS[key];
      const set = state.filters[key];
      if (set.size) any = true;
      const open = state.openFilter === key;
      let label = def.label;
      if (set.size === 1) {
        const opt = def.options().find((o) => set.has(o.id));
        label = `${def.label}: ${opt ? opt.label : ""}`;
      }
      box.innerHTML = `
        <button class="chip ${set.size ? "active" : ""}" type="button" data-open-filter="${key}" aria-expanded="${open}">
          ${icon(def.icon)}<span>${esc(label)}</span>${set.size > 1 ? `<b>${set.size}</b>` : ""}${icon("chevron-down")}
        </button>
        ${open ? `<div class="popover" data-popover="${key}">
          ${def.searchable ? `<input type="search" placeholder="Filter ${def.label.toLowerCase()}…" data-popover-search="${key}" autocomplete="off">` : ""}
          <div class="popover-options" data-options="${key}">${renderOptions(key, "")}</div>
          <div class="popover-foot">
            <button class="link-btn" type="button" data-clear-filter="${key}">Clear</button>
            <button class="btn sm primary" type="button" data-close-popover>Done</button>
          </div>
        </div>` : ""}`;
    }
    el.clear.hidden = !any;
  }

  function renderOptions(key, q) {
    const def = FILTER_DEFS[key];
    const set = state.filters[key];
    const pool = vendors.filter((v) => (state.status === "all" || v.status === state.status) && matchesQuery(v, state.query) && matchesFilters(v, key));
    const opts = def.options().filter((o) => !q || `${o.label} ${o.hint || ""}`.toLowerCase().includes(q.toLowerCase()));
    if (!opts.length) return `<div class="option" style="cursor:default;color:var(--text-3)">No matches</div>`;
    return opts.map((o) => {
      const n = pool.filter((v) => def.test(v, new Set([o.id]))).length;
      return `<label class="option">
        <span class="check"><input type="checkbox" data-filter-key="${key}" value="${esc(o.id)}" ${set.has(o.id) ? "checked" : ""}><span></span></span>
        <span class="label">${esc(o.label)}${o.hint ? `<small>${esc(o.hint)}</small>` : ""}</span>
        <span class="n">${n}</span>
      </label>`;
    }).join("");
  }

  function vdots(v) {
    return `<div class="vdots">${CHECKS.map((c) => {
      const s = v.verification[c.key];
      return `<span class="vdot ${s}" title="${c.label}: ${V_LABEL[s]}">${icon(c.icon)}</span>`;
    }).join("")}</div>`;
  }

  function renderList(list) {
    el.listCount.textContent = plural(list.length, "applicant");
    const nChecked = state.checked.size;
    el.checkAll.checked = nChecked > 0 && nChecked === list.length;
    el.checkAll.indeterminate = nChecked > 0 && nChecked < list.length;
    el.bulk.hidden = nChecked === 0;
    el.bulkCount.textContent = `${nChecked} selected`;
    const canDecide = [...state.checked].every((id) => ["pending", "info"].includes(byId.get(id)?.status));
    $$("[data-bulk]", el.bulk).forEach((b) => (b.disabled = !canDecide));

    if (!list.length) {
      const hasFilters = state.query || Object.values(state.filters).some((s) => s.size);
      el.list.innerHTML = `<li class="empty">
        <div class="empty-ico">${icon(hasFilters ? "filter" : "inbox", "lg")}</div>
        <strong>${hasFilters ? "No applicants match" : "You're all caught up"}</strong>
        <span>${hasFilters ? "Try removing a filter or changing your search." : `Nothing in “${STATUS_LABEL[state.status]}” right now.`}</span>
        ${hasFilters ? `<button class="btn sm" type="button" data-action="clear-all" style="margin-top:8px">Clear filters</button>` : ""}
      </li>`;
      return;
    }

    el.list.innerHTML = list.map((v) => {
      const sel = v.id === state.selectedId;
      const unread = v.status === "pending" && !state.seen.has(v.id);
      return `<li class="row ${sel ? "selected" : ""} ${unread ? "unread" : ""}" role="option" aria-selected="${sel}" data-id="${v.id}">
        <label class="check" data-stop><input type="checkbox" data-check="${v.id}" ${state.checked.has(v.id) ? "checked" : ""} aria-label="Select ${esc(v.name)}"><span></span></label>
        <div class="avatar" style="--h:${v.hue}">${v.initials}</div>
        <div class="row-main">
          <div class="row-title"><strong>${esc(v.name)}</strong></div>
          <div class="row-sub">${esc(v.level.label)} · ${v.years} yrs · ${esc(v.specs.join(", "))}</div>
          <div class="row-tags">${v.pairs.map((p) => `<span class="tag pair">${splitPair(p)[0]} <i>→</i> ${splitPair(p)[1]}</span>`).join("")}</div>
        </div>
        <div class="row-side">
          ${state.status === "all" ? `<span class="pill ${v.status}">${STATUS_LABEL[v.status]}</span>` : `<span class="row-time">${ago(v.appliedAt)}</span>`}
          <div style="display:flex;gap:6px;align-items:center">${vdots(v)}<span class="score ${scoreClass(v.score)}" title="Assessment score">${v.score}</span></div>
        </div>
      </li>`;
    }).join("");

    const selRow = $(".row.selected", el.list);
    if (selRow) selRow.scrollIntoView({ block: "nearest" });
  }

  /* ---------- Detail ---------- */
  function renderDetail(list) {
    const v = byId.get(state.selectedId);
    if (!v) {
      el.detail.innerHTML = `<div class="empty">
        <div class="empty-ico">${icon("users", "lg")}</div>
        <strong>No applicant selected</strong>
        <span>Choose someone from the queue to review their profile.</span>
      </div>`;
      return;
    }
    const idx = list.findIndex((x) => x.id === v.id);
    const decided = v.status === "approved" || v.status === "rejected";

    el.detail.innerHTML = `
      <div class="detail-scroll" id="detailScroll">
        <div class="d-head">
          <div class="d-top">
            <button class="icon-btn back" type="button" data-action="back" aria-label="Back to list">${icon("arrow-left")}</button>
            <span class="d-id">${v.id}</span>
            <span>Applied ${fmtDate(v.appliedAt)} · ${ago(v.appliedAt)}</span>
            <div class="nav-pn">
              <span>${idx + 1} of ${list.length}</span>
              <button class="icon-btn" type="button" data-action="prev" aria-label="Previous applicant (K)" ${idx <= 0 ? "disabled" : ""}>${icon("chevron-up")}</button>
              <button class="icon-btn" type="button" data-action="next" aria-label="Next applicant (J)" ${idx >= list.length - 1 ? "disabled" : ""}>${icon("chevron-down")}</button>
            </div>
          </div>
          <div class="d-identity">
            <div class="avatar xl" style="--h:${v.hue}">${v.initials}</div>
            <div>
              <h2>${esc(v.name)} <span class="pill ${v.status}">${STATUS_LABEL[v.status]}</span></h2>
              <div class="d-meta">
                <span>${icon("pin")}${esc(v.location)}</span>
                <span>${icon("clock")}${esc(v.timezone)}</span>
                <span>${icon("mail")}<a href="mailto:${esc(v.email)}">${esc(v.email)}</a></span>
              </div>
            </div>
          </div>
          ${statusCallout(v)}
        </div>

        <div class="d-tabs" role="tablist">
          ${[["overview", "Overview"], ["documents", "Documents", v.docs.length], ["activity", "Activity", v.activity.length]]
            .map(([id, label, n]) => `<button class="d-tab" role="tab" type="button" data-tab="${id}" aria-selected="${state.tab === id}">${label}${n ? `<span class="count">${n}</span>` : ""}</button>`).join("")}
        </div>
        <div class="d-body">${{ overview: overviewTab, documents: documentsTab, activity: activityTab }[state.tab](v)}</div>
      </div>
      <div class="d-actions">
        ${decided
          ? `<span class="hint">${icon(v.status === "approved" ? "check" : "x")}Decision recorded. Reopen to change it.</span>
             <button class="btn" type="button" data-action="reopen">${icon("undo")}Reopen review</button>`
          : `<span class="hint"><kbd>J</kbd><kbd>K</kbd> navigate · <kbd>?</kbd> shortcuts</span>
             <button class="btn outline-info" type="button" data-decide="info">${icon("help")}Request info<kbd>I</kbd></button>
             <button class="btn outline-danger" type="button" data-decide="reject">${icon("x")}Reject<kbd>R</kbd></button>
             <button class="btn success" type="button" data-decide="approve">${icon("check")}Approve<kbd>A</kbd></button>`}
      </div>`;
  }

  function statusCallout(v) {
    if (v.status === "info" && v.infoRequest) {
      return `<div class="d-callout info">${icon("help")}<div><b>Waiting on applicant</b><p>${esc(v.infoRequest)}</p></div></div>`;
    }
    if (v.status === "rejected") {
      return `<div class="d-callout rejected">${icon("x")}<div><b>Rejected</b><p>${esc(v.rejectReason || "No reason recorded")}</p></div></div>`;
    }
    if (v.status === "approved") {
      return `<div class="d-callout approved">${icon("check")}<div><b>Approved${v.tier ? ` · ${esc(v.tier)} tier` : ""}</b><p>Added to the vendor pool and eligible for project assignment.</p></div></div>`;
    }
    return "";
  }

  function ring(score) {
    const C = 2 * Math.PI * 16;
    const color = { hi: "var(--green)", mid: "var(--amber)", lo: "var(--red)" }[scoreClass(score)];
    return `<svg viewBox="0 0 40 40"><circle class="bg" cx="20" cy="20" r="16"/><circle cx="20" cy="20" r="16" stroke="${color}" stroke-linecap="round" stroke-dasharray="${(score / 100) * C} ${C}"/></svg>`;
  }

  function checkDetail(v, key) {
    if (key === "identity") return "Government ID + liveness check";
    if (key === "ata") return v.ataNumber ? `Member ${v.ataNumber}` : "No credential submitted";
    return `${v.education.degree}, ${v.education.year}`;
  }

  function checkActions(v, key) {
    const s = v.verification[key];
    if (s === "pending") {
      return `<div style="display:flex;gap:6px">
        <button class="btn sm success-soft" type="button" data-verify="${key}" data-to="verified">${icon("check")}Verify</button>
        <button class="btn sm danger-soft" type="button" data-verify="${key}" data-to="failed">${icon("x")}Fail</button>
      </div>`;
    }
    if (s === "failed") return `<button class="btn sm" type="button" data-verify="${key}" data-to="pending">${icon("undo")}Re-check</button>`;
    return "";
  }

  function overviewTab(v) {
    const vc = verifiedCount(v);
    return `
      <section class="section">
        <h3>Verification <small>${vc} of 3 verified</small></h3>
        <div class="verify-grid">
          ${CHECKS.map((c) => {
            const s = v.verification[c.key];
            return `<div class="vcard ${s}">
              <div class="vcard-top"><div class="vcard-ico">${icon(c.icon)}</div><span class="vstatus ${s}">${V_LABEL[s]}</span></div>
              <div><strong>${c.label}</strong><p>${esc(checkDetail(v, c.key))}</p></div>
              ${checkActions(v, c.key)}
            </div>`;
          }).join("")}
        </div>
        <div class="confidence">
          <span>Confidence</span>
          <div class="meter">${CHECKS.map((c) => `<i class="${v.verification[c.key]}"></i>`).join("")}</div>
          <strong>${["Low", "Fair", "Good", "High"][vc]}</strong>
        </div>
      </section>

      <section class="section">
        <div class="stats">
          <div class="stat ring">${ring(v.score)}<div><span>Assessment</span><strong>${v.score}<small>/100</small></strong></div></div>
          <div class="stat"><span>Experience</span><strong>${v.years}<small> yrs · ${esc(v.level.label)}</small></strong></div>
          <div class="stat"><span>Rate</span><strong>${money(v.rate)}<small>/word</small></strong></div>
          <div class="stat"><span>Capacity</span><strong>${(v.capacity / 1000).toFixed(0)}k<small> words/wk</small></strong></div>
        </div>
      </section>

      <section class="section">
        <h3>Professional summary</h3>
        <p class="summary">${esc(v.summary)}</p>
      </section>

      <div class="two-col">
        <section class="section">
          <h3>Language pairs</h3>
          <div class="pairs">
            ${v.pairs.map((p) => {
              const [a, b] = splitPair(p);
              return `<div class="pair-row"><span class="code">${a}</span>${icon("chevron-right")}<span class="code">${b}</span><span class="names">${esc(pairNames(p))}</span><span class="rate">${money(v.rate)}<small>/w</small></span></div>`;
            }).join("")}
          </div>
        </section>
        <section class="section">
          <h3>Specializations</h3>
          <div class="kv">${v.specs.map((s) => `<span class="tag accent">${esc(s)}</span>`).join("")}</div>
          <h3 style="margin-top:16px">CAT tools</h3>
          <div class="kv">${v.tools.map((t) => `<span class="tag">${esc(t)}</span>`).join("")}</div>
        </section>
      </div>

      <section class="section">
        <h3>Experience & education</h3>
        <div class="timeline">
          ${v.history.map((h, i) => `<div class="t-item ${i === 0 && !h.to ? "current" : ""}"><strong>${esc(h.role)}</strong><span>${esc(h.org)} · ${h.from}–${h.to || "Present"}</span></div>`).join("")}
          <div class="t-item"><strong>${esc(v.education.degree)}</strong><span>${esc(v.education.school)} · ${v.education.year}</span></div>
        </div>
      </section>`;
  }

  function documentsTab(v) {
    const doc = v.docs.find((d) => d.id === state.docId) || v.docs[0];
    const label = { pdf: "PDF", img: "IMG", doc: "DOC" };
    return `
      <div class="docs">
        <div class="doc-list">
          ${v.docs.map((d) => `<button class="doc ${d.id === doc.id ? "active" : ""}" type="button" data-doc="${d.id}">
            <span class="doc-ico ${d.type}">${label[d.type]}</span>
            <div><strong>${esc(d.name)}</strong><span>${d.size} · ${docStatus(v, d)}</span></div>
          </button>`).join("")}
        </div>
        <div class="viewer">
          <div class="viewer-bar">
            <strong>${esc(doc.name)}</strong>
            <button class="btn sm" type="button" data-download="${doc.id}">${icon("download")}Download</button>
          </div>
          <div class="viewer-body">${docPreview(v, doc)}</div>
        </div>
      </div>`;
  }

  function docStatus(v, d) {
    const key = { id: "identity", ata: "ata", degree: "degree" }[d.kind];
    return key ? V_LABEL[v.verification[key]] : "Uploaded";
  }

  function docPreview(v, d) {
    if (d.kind === "cv") {
      return `<div class="paper">
        <h4>${esc(v.name)}</h4>
        <div class="muted">${esc(v.location)} · ${esc(v.email)}</div>
        <h5>Profile</h5><p>${esc(v.summary)}</p>
        <h5>Experience</h5>
        <ul>${v.history.map((h) => `<li><b>${esc(h.role)}</b>, ${esc(h.org)} (${h.from}–${h.to || "present"})</li>`).join("")}</ul>
        <h5>Education</h5><p>${esc(v.education.degree)} — ${esc(v.education.school)}, ${v.education.year}</p>
        <h5>Languages</h5><p>${v.pairs.map(pairNames).map(esc).join("; ")}</p>
        <h5>Tools</h5><p>${esc(v.tools.join(", "))}</p>
      </div>`;
    }
    if (d.kind === "ata") {
      return `<div class="paper cert">
        <div class="muted" style="letter-spacing:.2em;font-size:10px">AMERICAN TRANSLATORS ASSOCIATION</div>
        <h4 style="margin-top:12px">Certified Translator</h4>
        <p style="margin-top:10px">This certifies that</p>
        <p style="font-size:18px;font-weight:700;margin:6px 0">${esc(v.name)}</p>
        <p>has passed the ATA certification exam for</p>
        <p style="font-weight:600;margin-top:4px">${esc(pairNames(v.pairs[0]))}</p>
        <p class="muted" style="margin-top:12px">Credential No. ${esc(v.ataNumber)}</p>
        <div class="seal">ATA</div>
      </div>`;
    }
    if (d.kind === "degree") {
      return `<div class="paper cert">
        <div class="muted" style="letter-spacing:.2em;font-size:10px">${esc(v.education.school.toUpperCase())}</div>
        <p style="margin-top:16px">confers upon</p>
        <p style="font-size:18px;font-weight:700;margin:6px 0">${esc(v.name)}</p>
        <p>the degree of</p>
        <h4 style="margin-top:6px;font-size:16px">${esc(v.education.degree)}</h4>
        <p class="muted" style="margin-top:12px">Awarded ${v.education.year}</p>
        <div class="seal">${esc(v.education.school.split(" ").map((w) => w[0]).join("").slice(0, 3))}</div>
      </div>`;
    }
    if (d.kind === "id") {
      const failed = v.verification.identity === "failed";
      return `<div style="display:flex;flex-direction:column;gap:12px;align-items:center;width:100%">
        <div class="paper id ${failed ? "blurred" : ""}">
          <div class="id-row">
            <div class="photo">${v.initials}</div>
            <div style="font-size:11px;line-height:1.5">
              <div class="muted">SURNAME / GIVEN NAMES</div>
              <b style="font-size:13px">${esc(v.name.toUpperCase())}</b>
              <div class="muted" style="margin-top:6px">NATIONALITY</div>
              <b>${esc(v.location.split(", ").pop().toUpperCase())}</b>
              <div class="muted" style="margin-top:6px">DOCUMENT NO.</div>
              <b>••••••${v.id.slice(-4)}</b>
            </div>
          </div>
        </div>
        ${failed ? `<div class="d-callout rejected" style="max-width:380px">${icon("alert")}<div><b>Automated check failed</b><p>Image too blurry to read MRZ. Ask the applicant to re-upload.</p></div></div>` : ""}
      </div>`;
    }
    const text = SAMPLE_TEXT[v.specs[0]] || SAMPLE_TEXT.Technical;
    const sub = (n) => Math.max(60, Math.min(100, v.score + n));
    return `<div class="paper">
      <h4 style="font-size:16px">Translation sample · ${esc(pairLabel(v.pairs[0]))}</h4>
      <div class="muted">${esc(v.specs[0])} domain · 1,250 words · submitted ${fmtDate(v.appliedAt)}</div>
      <h5>Source excerpt</h5><p>${esc(text)}</p>
      <h5>Reviewer QA (LISA model)</h5>
      <ul>
        <li>Accuracy: <b>${sub(2)}/100</b></li>
        <li>Terminology: <b>${sub(-1)}/100</b></li>
        <li>Fluency & style: <b>${sub(1)}/100</b></li>
        <li>Formatting: <b>${sub(4)}/100</b></li>
      </ul>
      <p class="muted" style="margin-top:10px">Reviewed by ${COLLEAGUE}</p>
    </div>`;
  }

  function activityTab(v) {
    const items = [...v.activity].sort((a, b) => b.at - a.at);
    return `
      <form class="composer" data-note-form>
        <textarea name="note" placeholder="Add an internal note for the review team… (not visible to the applicant)" aria-label="Internal note"></textarea>
        <div class="composer-foot"><span>Notes are visible to admins only</span><button class="btn sm primary" type="submit">${icon("send")}Add note</button></div>
      </form>
      <div class="timeline">
        ${items.map((e) => `<div class="t-item ${e.color || ""}">
          <strong>${esc(e.title)}</strong>
          <span>${esc(e.by)} · ${fmtDateTime(e.at)}</span>
          ${e.text ? `<p>${esc(e.text)}</p>` : ""}
          ${e.note ? `<div class="note">${esc(e.note)}</div>` : ""}
        </div>`).join("")}
      </div>`;
  }

  /* ------------------------------------------------------------------------
     Selection & navigation
     ------------------------------------------------------------------------ */
  function select(id, { open = false, keepTab = false } = {}) {
    if (!byId.has(id)) return;
    if (state.selectedId !== id) {
      state.selectedId = id;
      state.docId = "cv";
      if (!keepTab) state.tab = "overview";
    }
    state.seen.add(id);
    if (open && isMobile()) el.app.classList.add("detail-open");
    persist();
    render();
    const scroller = $("#detailScroll");
    if (scroller) scroller.scrollTop = 0;
  }

  function step(delta) {
    const list = visible();
    if (!list.length) return;
    const i = list.findIndex((v) => v.id === state.selectedId);
    const next = list[Math.max(0, Math.min(list.length - 1, i + delta))];
    if (next) select(next.id, { keepTab: true });
  }

  /* ------------------------------------------------------------------------
     Decisions
     ------------------------------------------------------------------------ */
  let modalCtx = null;
  let lastFocus = null;

  function openModal(node) {
    lastFocus = document.activeElement;
    node.hidden = false;
    // Focus an unanswered required field first, otherwise the confirm button so "A" then Enter approves
    const first = node.querySelector("select:invalid") || node.querySelector("[type=submit]") || node.querySelector("[data-close]");
    setTimeout(() => first && first.focus(), 30);
  }
  function closeModal(node) {
    node.hidden = true;
    modalCtx = null;
    if (lastFocus && document.contains(lastFocus)) lastFocus.focus();
  }

  function openDecision(type, ids) {
    ids = ids.filter((id) => ["pending", "info"].includes(byId.get(id)?.status));
    if (!ids.length) return;
    const people = ids.map((id) => byId.get(id));
    const one = people.length === 1 ? people[0] : null;
    const who = one ? one.name : `${people.length} applicants`;
    modalCtx = { type, ids };

    const recipients = `<div class="who">${people.slice(0, 6).map((p) => `<span class="tag"><span class="avatar" style="--h:${p.hue}">${p.initials}</span>${esc(p.name)}</span>`).join("")}${people.length > 6 ? `<span class="tag">+${people.length - 6} more</span>` : ""}</div>`;
    const first = one ? one.name.split(" ")[0] : "{first_name}";

    let head, body, submit;
    if (type === "approve") {
      const unverified = people.filter((p) => verifiedCount(p) < 3).length;
      const trialDefault = one && one.score < 85;
      head = { ico: "check", cls: "approve", title: `Approve ${who}`, sub: "They'll be added to the vendor pool and can be assigned to projects." };
      body = `
        ${people.length > 1 ? recipients : ""}
        ${unverified ? `<div class="d-callout info" style="margin:0">${icon("alert")}<div><b>${unverified === 1 && one ? "Not fully verified" : `${unverified} not fully verified`}</b><p>Some credential checks are still pending or failed. You can approve now and finish verification during onboarding.</p></div></div>` : ""}
        <div class="field"><span>Onboarding tier</span>
          <div class="choice-list">
            ${[["Trial", "First 3 projects reviewed by a senior linguist"], ["Standard", "Eligible for all matching projects"], ["Preferred", "Priority routing for matching projects"]]
              .map(([t, h]) => `<label class="choice"><input type="radio" name="tier" value="${t}" ${(trialDefault ? t === "Trial" : t === "Standard") ? "checked" : ""}><div><strong>${t}</strong><small>${h}</small></div></label>`).join("")}
          </div>
        </div>
        <label class="choice"><span class="check"><input type="checkbox" name="welcome" checked><span></span></span><div><strong>Send welcome email</strong><small>Includes NDA, payment setup and onboarding checklist</small></div></label>
        <label class="field"><span>Internal note <small>(optional)</small></span><textarea name="note" placeholder="Anything the project managers should know?"></textarea></label>`;
      submit = `<button class="btn success" type="submit">${icon("check")}Approve${people.length > 1 ? ` ${people.length}` : ""}</button>`;
    } else if (type === "info") {
      const need = new Set();
      for (const p of people) {
        if (p.verification.identity !== "verified") need.add("identity");
        if (p.verification.ata === "pending") need.add("ata");
        if (p.verification.degree !== "verified") need.add("degree");
      }
      if (!need.size) need.add("samples");
      head = { ico: "help", cls: "info", title: `Request more info from ${who}`, sub: "The application stays open until they respond." };
      body = `
        ${people.length > 1 ? recipients : ""}
        <div class="field"><span>What do you need?</span>
          <div class="choice-list">
            ${INFO_ITEMS.map((it) => `<label class="choice"><span class="check"><input type="checkbox" name="items" value="${it.id}" ${need.has(it.id) ? "checked" : ""}><span></span></span><div><strong>${it.label}</strong><small>${it.hint}</small></div></label>`).join("")}
          </div>
        </div>
        <label class="field"><span>Message to applicant</span><textarea name="message">Hi ${esc(first)},\n\nThanks for applying to join our vendor network. Before we can finish reviewing your application, could you please send us the items listed below?\n\nBest,\n${ME.name}</textarea></label>`;
      submit = `<button class="btn primary" type="submit">${icon("send")}Send request</button>`;
    } else {
      head = { ico: "x", cls: "reject", title: `Reject ${who}`, sub: "The applicant will be notified by email." };
      body = `
        ${people.length > 1 ? recipients : ""}
        <label class="field"><span>Reason <small>(internal)</small></span>
          <select name="reason" required>
            <option value="" disabled ${one && one.score >= 75 ? "selected" : ""}>Select a reason…</option>
            ${REJECT_REASONS.map((r) => `<option ${one && one.score < 75 && r === REJECT_REASONS[0] ? "selected" : ""}>${r}</option>`).join("")}
          </select>
        </label>
        <label class="field"><span>Message to applicant</span><textarea name="message">Hi ${esc(first)},\n\nThank you for your interest in working with us. After careful review, we're unable to move forward with your application at this time.\n\nWe appreciate the time you invested and wish you the best.\n\n${ME.name}</textarea></label>
        <label class="choice"><span class="check"><input type="checkbox" name="reapply" checked><span></span></span><div><strong>Allow re-application after 6 months</strong><small>Their profile is kept on file</small></div></label>`;
      submit = `<button class="btn danger" type="submit">${icon("x")}Reject${people.length > 1 ? ` ${people.length}` : ""}</button>`;
    }

    el.modalForm.innerHTML = `
      <div class="modal-head">
        <div class="modal-ico ${head.cls}">${icon(head.ico, "lg")}</div>
        <div><h2 id="modalTitle">${esc(head.title)}</h2><p>${head.sub}</p></div>
        <button class="icon-btn" type="button" data-close aria-label="Close">${icon("x")}</button>
      </div>
      <div class="modal-body">${body}</div>
      <div class="modal-foot"><button class="btn ghost" type="button" data-close>Cancel</button>${submit}</div>`;
    openModal(el.modal);
  }

  function applyDecision(type, ids, form) {
    const before = visible();
    const idx = before.findIndex((v) => v.id === state.selectedId);
    const undo = [];

    for (const id of ids) {
      const v = byId.get(id);
      const snapshot = { status: v.status, infoRequest: v.infoRequest, rejectReason: v.rejectReason, tier: v.tier };
      const added = [];
      if (type === "approve") {
        v.status = "approved";
        v.tier = form.get("tier");
        added.push(entry({ at: Date.now(), by: ME.name, title: `Approved · ${v.tier} tier`, text: form.get("welcome") ? "Welcome email and onboarding checklist sent" : "No welcome email sent", color: "green" }));
        const note = (form.get("note") || "").trim();
        if (note) added.push(entry({ at: Date.now(), by: ME.name, title: "Internal note", note }));
      } else if (type === "info") {
        const items = form.getAll("items").map((i) => INFO_ITEMS.find((x) => x.id === i).label);
        v.status = "info";
        v.infoRequest = items.length ? `Requested: ${items.join(", ")}.` : "Additional information requested.";
        added.push(entry({ at: Date.now(), by: ME.name, title: "Requested more information", note: v.infoRequest, color: "blue" }));
      } else {
        v.status = "rejected";
        v.rejectReason = form.get("reason");
        added.push(entry({ at: Date.now(), by: ME.name, title: `Rejected · ${v.rejectReason}`, text: form.get("reapply") ? "May re-apply after 6 months" : "Re-application blocked", color: "red" }));
      }
      v.activity.push(...added);
      undo.push({ v, snapshot, added });
    }

    state.checked.clear();
    // Auto-advance to the next applicant still in this view
    const after = visible();
    if (!after.some((v) => v.id === state.selectedId) && after.length) {
      state.selectedId = after[Math.min(Math.max(idx, 0), after.length - 1)].id;
      state.tab = "overview";
      state.docId = "cv";
    }
    persist();
    render();

    const verb = { approve: "approved", info: "asked for more info", reject: "rejected" }[type];
    const subject = ids.length === 1 ? byId.get(ids[0]).name : `${ids.length} applicants`;
    toast(type === "info" ? `Asked ${subject} for more info` : `${subject} ${verb}`, type, () => {
      for (const { v, snapshot, added } of undo) {
        Object.assign(v, snapshot);
        const drop = new Set(added.map((e) => e.id));
        v.activity = v.activity.filter((e) => !drop.has(e.id));
      }
      state.selectedId = ids[0];
      persist();
      render();
      toast("Decision undone", "neutral");
    });
  }

  function reopen(v) {
    const prev = v.status;
    v.status = "pending";
    const e = entry({ at: Date.now(), by: ME.name, title: `Review reopened (was ${STATUS_LABEL[prev].toLowerCase()})`, color: "amber" });
    v.activity.push(e);
    persist();
    render();
    toast(`${v.name} moved back to pending`, "neutral");
  }

  function setVerification(v, key, to) {
    v.verification[key] = to;
    const label = CHECKS.find((c) => c.key === key).label;
    v.activity.push(entry({ at: Date.now(), by: ME.name, title: `${label} marked ${V_LABEL[to].toLowerCase()}`, color: { verified: "green", failed: "red", pending: "amber" }[to] }));
    persist();
    render();
  }

  function download(v, docId) {
    const d = v.docs.find((x) => x.id === docId);
    const lines = [
      `${d.name}`, "",
      `${v.name} — ${v.id}`, `${v.email} · ${v.location}`, "",
      v.summary, "",
      "Experience:", ...v.history.map((h) => `- ${h.role}, ${h.org} (${h.from}–${h.to || "present"})`), "",
      `Education: ${v.education.degree}, ${v.education.school} (${v.education.year})`,
      `Language pairs: ${v.pairs.map(pairNames).join("; ")}`,
      `Specializations: ${v.specs.join(", ")}`,
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/plain" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = d.name.replace(/\.\w+$/, ".txt");
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

  /* ------------------------------------------------------------------------
     Toasts
     ------------------------------------------------------------------------ */
  function toast(msg, kind = "neutral", onUndo) {
    const ico = { approve: "check", info: "help", reject: "x", neutral: "undo" }[kind];
    const node = document.createElement("div");
    node.className = "toast";
    node.innerHTML = `<span class="t-ico ${kind}">${icon(ico)}</span><span>${esc(msg)}</span>${onUndo ? `<button type="button">${icon("undo")}Undo</button>` : ""}`;
    el.toasts.appendChild(node);
    const remove = () => {
      if (!node.isConnected) return;
      node.classList.add("out");
      setTimeout(() => node.remove(), 200);
    };
    if (onUndo) node.querySelector("button").addEventListener("click", () => { remove(); onUndo(); });
    setTimeout(remove, onUndo ? 6000 : 3000);
    while (el.toasts.children.length > 3) el.toasts.firstElementChild.remove();
  }

  /* ------------------------------------------------------------------------
     Theme
     ------------------------------------------------------------------------ */
  function applyTheme() {
    document.documentElement.dataset.theme = state.theme;
    el.theme.innerHTML = icon(state.theme === "dark" ? "sun" : "moon");
    el.theme.setAttribute("aria-label", state.theme === "dark" ? "Switch to light theme" : "Switch to dark theme");
  }

  /* ------------------------------------------------------------------------
     Events
     ------------------------------------------------------------------------ */
  // Status tabs
  el.tabs.addEventListener("click", (e) => {
    const b = e.target.closest("[data-status]");
    if (!b) return;
    state.status = b.dataset.status;
    state.checked.clear();
    render();
  });

  // Filters
  el.filters.addEventListener("click", (e) => {
    const openBtn = e.target.closest("[data-open-filter]");
    if (openBtn) {
      const key = openBtn.dataset.openFilter;
      state.openFilter = state.openFilter === key ? null : key;
      renderFilters();
      const s = $(`[data-popover-search="${key}"]`);
      if (s) s.focus();
      return;
    }
    const clr = e.target.closest("[data-clear-filter]");
    if (clr) {
      state.filters[clr.dataset.clearFilter].clear();
      render();
      return;
    }
    if (e.target.closest("[data-close-popover]")) {
      state.openFilter = null;
      renderFilters();
    }
  });
  el.filters.addEventListener("change", (e) => {
    const cb = e.target.closest("[data-filter-key]");
    if (!cb) return;
    const set = state.filters[cb.dataset.filterKey];
    cb.checked ? set.add(cb.value) : set.delete(cb.value);
    // Re-render everything except the open popover, so focus and search text survive
    const pop = $(".popover", el.filters);
    const q = pop?.querySelector("input[type=search]")?.value || "";
    render();
    const s = $(`[data-popover-search="${cb.dataset.filterKey}"]`);
    if (s && q) { s.value = q; $(`[data-options="${cb.dataset.filterKey}"]`).innerHTML = renderOptions(cb.dataset.filterKey, q); }
  });
  el.filters.addEventListener("input", (e) => {
    const s = e.target.closest("[data-popover-search]");
    if (!s) return;
    $(`[data-options="${s.dataset.popoverSearch}"]`).innerHTML = renderOptions(s.dataset.popoverSearch, s.value);
  });
  el.clear.addEventListener("click", clearAll);
  function clearAll() {
    Object.values(state.filters).forEach((s) => s.clear());
    state.query = "";
    el.search.value = "";
    state.openFilter = null;
    render();
  }
  document.addEventListener("click", (e) => {
    // composedPath() is captured at dispatch, so it still works after a re-render detached the target
    if (state.openFilter && !e.composedPath().some((n) => n.classList?.contains("filter"))) {
      state.openFilter = null;
      renderFilters();
    }
  });

  el.sort.addEventListener("change", () => { state.sort = el.sort.value; render(); });

  let searchTimer;
  el.search.addEventListener("input", () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => { state.query = el.search.value.trim(); render(); }, 120);
  });

  // List
  el.list.addEventListener("click", (e) => {
    if (e.target.closest("[data-action='clear-all']")) return clearAll();
    if (e.target.closest("[data-stop]")) return;
    const row = e.target.closest(".row");
    if (row) select(row.dataset.id, { open: true });
  });
  el.list.addEventListener("change", (e) => {
    const cb = e.target.closest("[data-check]");
    if (!cb) return;
    cb.checked ? state.checked.add(cb.dataset.check) : state.checked.delete(cb.dataset.check);
    renderList(visible());
  });
  el.checkAll.addEventListener("change", () => {
    const list = visible();
    if (el.checkAll.checked) list.forEach((v) => state.checked.add(v.id));
    else state.checked.clear();
    renderList(list);
  });
  el.bulk.addEventListener("click", (e) => {
    const b = e.target.closest("[data-bulk]");
    if (b) openDecision(b.dataset.bulk, [...state.checked]);
  });

  // Detail
  el.detail.addEventListener("click", (e) => {
    const v = byId.get(state.selectedId);
    if (!v) return;
    const t = e.target;
    const decide = t.closest("[data-decide]");
    if (decide) return openDecision(decide.dataset.decide, [v.id]);
    const tab = t.closest("[data-tab]");
    if (tab) { state.tab = tab.dataset.tab; return renderDetail(visible()); }
    const doc = t.closest("[data-doc]");
    if (doc) { state.docId = doc.dataset.doc; return renderDetail(visible()); }
    const dl = t.closest("[data-download]");
    if (dl) return download(v, dl.dataset.download);
    const ver = t.closest("[data-verify]");
    if (ver) return setVerification(v, ver.dataset.verify, ver.dataset.to);
    const act = t.closest("[data-action]")?.dataset.action;
    if (act === "back") el.app.classList.remove("detail-open");
    if (act === "prev") step(-1);
    if (act === "next") step(1);
    if (act === "reopen") reopen(v);
  });
  el.detail.addEventListener("submit", (e) => {
    const form = e.target.closest("[data-note-form]");
    if (!form) return;
    e.preventDefault();
    const note = form.note.value.trim();
    if (!note) return form.note.focus();
    const v = byId.get(state.selectedId);
    v.activity.push(entry({ at: Date.now(), by: ME.name, title: "Internal note", note }));
    persist();
    renderDetail(visible());
    toast("Note added", "neutral");
  });

  // Modals
  el.modalForm.addEventListener("submit", (e) => {
    e.preventDefault();
    if (!modalCtx) return;
    const fd = new FormData(el.modalForm);
    if (modalCtx.type === "info" && !fd.getAll("items").length) {
      toast("Pick at least one item to request", "neutral");
      return;
    }
    const { type, ids } = modalCtx;
    closeModal(el.modal);
    applyDecision(type, ids, fd);
  });
  for (const m of [el.modal, el.shortcuts]) {
    m.addEventListener("click", (e) => {
      if (e.target === m || e.target.closest("[data-close]")) closeModal(m);
    });
  }

  // Shell
  $("#menuBtn").addEventListener("click", () => el.app.classList.add("nav-open"));
  $("#scrim").addEventListener("click", () => el.app.classList.remove("nav-open"));
  $("#shortcutsBtn").addEventListener("click", () => openModal(el.shortcuts));
  el.theme.addEventListener("click", () => {
    state.theme = state.theme === "dark" ? "light" : "dark";
    applyTheme();
    persist();
  });

  // Keyboard
  document.addEventListener("keydown", (e) => {
    const modalOpen = !el.modal.hidden || !el.shortcuts.hidden;
    if (e.key === "Escape") {
      if (!el.modal.hidden) return closeModal(el.modal);
      if (!el.shortcuts.hidden) return closeModal(el.shortcuts);
      if (state.openFilter) { state.openFilter = null; return renderFilters(); }
      if (document.activeElement === el.search) return el.search.blur();
      if (el.app.classList.contains("detail-open")) return el.app.classList.remove("detail-open");
      el.app.classList.remove("nav-open");
      return;
    }
    if (modalOpen || e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.target.closest("input, textarea, select, [contenteditable]")) return;

    const v = byId.get(state.selectedId);
    const open = v && ["pending", "info"].includes(v.status);
    const k = e.key.toLowerCase();
    const actions = {
      j: () => step(1), arrowdown: () => step(1),
      k: () => step(-1), arrowup: () => step(-1),
      a: () => open && openDecision("approve", [v.id]),
      i: () => open && openDecision("info", [v.id]),
      r: () => open && openDecision("reject", [v.id]),
      x: () => { if (!v) return; state.checked.has(v.id) ? state.checked.delete(v.id) : state.checked.add(v.id); renderList(visible()); },
      "/": () => el.search.focus(),
      "?": () => openModal(el.shortcuts),
      1: () => { state.tab = "overview"; renderDetail(visible()); },
      2: () => { state.tab = "documents"; renderDetail(visible()); },
      3: () => { state.tab = "activity"; renderDetail(visible()); },
    };
    const fn = actions[k] || actions[e.key];
    if (fn) { e.preventDefault(); fn(); }
  });

  // Keep the mobile detail sheet consistent when resizing
  matchMedia("(max-width: 900px)").addEventListener("change", (m) => { if (!m.matches) el.app.classList.remove("detail-open"); });

  /* ------------------------------------------------------------------------
     Init
     ------------------------------------------------------------------------ */
  $$("[data-icon]").forEach((n) => { n.outerHTML = icon(n.dataset.icon); });
  el.theme = $("#themeBtn");
  applyTheme();
  render();
  if (state.selectedId) state.seen.add(state.selectedId);
})();
