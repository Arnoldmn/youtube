import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { api } from "../api.js";
import { useMeta } from "../context/Meta.jsx";
import { useToast } from "../context/Toast.jsx";
import { Icon } from "../icons.jsx";
import { Avatar, Empty, Modal, ModalHead, Spinner } from "../components/ui.jsx";
import CredentialsModal from "../components/CredentialsModal.jsx";
import { HOUR, ago, fmtDateFull, fmtDateTime, plural } from "../format.js";

const STATUSES = [["pending", "Pending review"], ["info", "Info requested"], ["approved", "Approved"], ["rejected", "Rejected"], ["all", "All"]];
const STATUS_LABEL = Object.fromEntries(STATUSES);
const LEVELS = [
  { id: "entry", label: "Entry", hint: "0–2 years", min: 0, max: 2 },
  { id: "mid", label: "Mid-level", hint: "3–6 years", min: 3, max: 6 },
  { id: "senior", label: "Senior", hint: "7–11 years", min: 7, max: 11 },
  { id: "expert", label: "Expert", hint: "12+ years", min: 12, max: Infinity },
];
const levelOf = (y) => LEVELS.find((l) => y >= l.min && y <= l.max);
const CHECKS = [{ key: "identity", label: "Identity", icon: "shield" }, { key: "ata", label: "ATA certification", icon: "award" }, { key: "degree", label: "Degree", icon: "cap" }];
const V_LABEL = { verified: "Verified", pending: "Pending", failed: "Failed", none: "Not provided" };
const verifiedCount = (v) => CHECKS.filter((c) => v.verification[c.key] === "verified").length;
const VERIFY_FILTERS = [
  { id: "full", label: "Fully verified", hint: "All three checks passed", test: (v) => verifiedCount(v) === 3 },
  { id: "ata", label: "ATA certified", hint: "Verified ATA credential", test: (v) => v.verification.ata === "verified" },
  { id: "attention", label: "Needs attention", hint: "Pending or failed checks", test: (v) => CHECKS.some((c) => ["pending", "failed"].includes(v.verification[c.key])) },
];
const REJECT_REASONS = ["Assessment below threshold", "Insufficient experience", "Unverifiable credentials", "Language pair not currently needed", "Rates outside budget", "Other"];
const INFO_ITEMS = [
  ["identity", "Clear identity document", "Passport or national ID, all corners visible"],
  ["ata", "ATA certification details", "Member number and certified pair"],
  ["degree", "Degree certificate or transcript", "Official scan or verification link"],
  ["samples", "Additional translation samples", "2 samples in their main specialization"],
  ["rates", "Updated rate card", "Per-word, hourly and minimum fee"],
  ["references", "Professional references", "Two clients from the past 24 months"],
];
const SORTS = {
  newest: (a, b) => b.appliedAt - a.appliedAt,
  oldest: (a, b) => a.appliedAt - b.appliedAt,
  score: (a, b) => b.score - a.score,
  exp: (a, b) => b.years - a.years,
  verified: (a, b) => verifiedCount(b) - verifiedCount(a) || b.score - a.score,
};
const scoreClass = (s) => (s >= 85 ? "hi" : s >= 75 ? "mid" : "lo");
const usd = (n) => `$${n.toFixed(2)}`;
const SEEN_KEY = "lingua:apps:seen";

function FilterChip({ label, icon, options, selected, onChange, searchable, open, setOpen }) {
  const [q, setQ] = useState("");
  const count = selected.size;
  const single = count === 1 ? options.find((o) => selected.has(o.id)) : null;
  const shown = options.filter((o) => !q || `${o.label} ${o.hint || ""}`.toLowerCase().includes(q.toLowerCase()));
  return (
    <div className="filter">
      <button className={`chip ${count ? "active" : ""}`} type="button" aria-expanded={open} onClick={() => setOpen(open ? null : label)}>
        <Icon name={icon} /><span>{single ? `${label}: ${single.label}` : label}</span>{count > 1 && <b>{count}</b>}<Icon name="chevron-down" />
      </button>
      {open && (
        <div className="popover">
          {searchable && <input type="search" placeholder={`Filter ${label.toLowerCase()}…`} value={q} onChange={(e) => setQ(e.target.value)} autoFocus />}
          <div className="popover-options">
            {shown.length ? shown.map((o) => (
              <label key={o.id} className="option">
                <span className="check"><input type="checkbox" checked={selected.has(o.id)} onChange={(e) => {
                  const next = new Set(selected);
                  if (e.target.checked) next.add(o.id); else next.delete(o.id);
                  onChange(next);
                }} /><span /></span>
                <span className="label">{o.label}{o.hint && <small>{o.hint}</small>}</span>
                <span className="n">{o.n}</span>
              </label>
            )) : <div className="option" style={{ cursor: "default", color: "var(--text-3)" }}>No matches</div>}
          </div>
          <div className="popover-foot">
            <button className="link-btn" type="button" onClick={() => onChange(new Set())}>Clear</button>
            <button className="btn sm primary" type="button" onClick={() => setOpen(null)}>Done</button>
          </div>
        </div>
      )}
    </div>
  );
}

function DecisionModal({ decision, apps, onClose, onDone }) {
  const toast = useToast();
  const [form, setForm] = useState({});
  const [busy, setBusy] = useState(false);
  const people = decision ? apps.filter((a) => decision.ids.includes(a.id)) : [];
  const one = people.length === 1 ? people[0] : null;

  useEffect(() => {
    if (!decision) return;
    const first = one ? one.name.split(" ")[0] : "{first_name}";
    if (decision.type === "approve") setForm({ tier: one && one.score < 85 ? "Trial" : "Standard", welcome: true, createAccount: true, note: "" });
    if (decision.type === "info") {
      const need = new Set();
      people.forEach((p) => {
        if (p.verification.identity !== "verified") need.add("identity");
        if (p.verification.ata === "pending") need.add("ata");
        if (p.verification.degree !== "verified") need.add("degree");
      });
      if (!need.size) need.add("samples");
      setForm({ items: need, message: `Hi ${first},\n\nThanks for applying to join our vendor network. Before we can finish reviewing your application, could you please send us the items listed below?\n\nBest regards` });
    }
    if (decision.type === "reject") setForm({ reason: one && one.score < 75 ? REJECT_REASONS[0] : "", reapply: true, message: `Hi ${first},\n\nThank you for your interest in working with us. After careful review, we're unable to move forward with your application at this time.\n\nWe appreciate the time you invested and wish you the best.` });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [decision]);

  if (!decision) return null;
  const who = one ? one.name : `${people.length} applicants`;
  const head = {
    approve: { icon: "check", tone: "approve", title: `Approve ${who}`, sub: "They'll be added to the vendor pool and can be assigned to jobs." },
    info: { icon: "help", tone: "info", title: `Request more info from ${who}`, sub: "The application stays open until they respond." },
    reject: { icon: "x", tone: "reject", title: `Reject ${who}`, sub: "The applicant will be notified by email." },
  }[decision.type];
  const unverified = people.filter((p) => verifiedCount(p) < 3).length;

  const submit = async (e) => {
    e.preventDefault();
    if (decision.type === "info" && !form.items?.size) return toast("Pick at least one item to request", "neutral");
    if (decision.type === "reject" && !form.reason) return;
    setBusy(true);
    const accounts = [];
    try {
      for (const p of people) {
        const body = { type: decision.type, ...form, items: form.items ? [...form.items] : undefined };
        const res = await api.post(`/applications/${p.id}/decision`, body);
        if (res.account) accounts.push(res.account);
      }
      onDone(decision, accounts);
      onClose();
    } catch (err) {
      toast(err.message, "reject");
    } finally {
      setBusy(false);
    }
  };
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <Modal open onClose={onClose} labelledBy="decisionTitle">
      <form onSubmit={submit}>
        <ModalHead id="decisionTitle" icon={head.icon} tone={head.tone} title={head.title} sub={head.sub} onClose={onClose} />
        <div className="modal-body">
          {people.length > 1 && <div className="who">{people.slice(0, 6).map((p) => <span key={p.id} className="tag"><Avatar name={p.name} />{p.name}</span>)}{people.length > 6 && <span className="tag">+{people.length - 6} more</span>}</div>}
          {decision.type === "approve" && <>
            {unverified > 0 && <div className="d-callout info" style={{ margin: 0 }}><Icon name="alert" /><div><b>{one ? "Not fully verified" : `${unverified} not fully verified`}</b><p>Some credential checks are still pending or failed. You can approve now and finish verification during onboarding.</p></div></div>}
            <div className="field"><span>Onboarding tier</span>
              <div className="choice-list">
                {[["Trial", "First 3 jobs reviewed by a senior linguist"], ["Standard", "Eligible for all matching jobs"], ["Preferred", "Priority routing for matching jobs"]].map(([t, h]) => (
                  <label key={t} className="choice"><input type="radio" name="tier" checked={form.tier === t} onChange={() => set("tier", t)} /><div><strong>{t}</strong><small>{h}</small></div></label>
                ))}
              </div>
            </div>
            <label className="choice"><span className="check"><input type="checkbox" checked={!!form.createAccount} onChange={(e) => set("createAccount", e.target.checked)} /><span /></span><div><strong>Create their employee login</strong><small>They can be assigned jobs right away; you'll get a temporary password to share</small></div></label>
            <label className="choice"><span className="check"><input type="checkbox" checked={!!form.welcome} onChange={(e) => set("welcome", e.target.checked)} /><span /></span><div><strong>Send welcome email</strong><small>Includes NDA, payment setup and onboarding checklist</small></div></label>
            <label className="field"><span>Internal note <small>(optional)</small></span><textarea value={form.note || ""} onChange={(e) => set("note", e.target.value)} placeholder="Anything the project managers should know?" /></label>
          </>}
          {decision.type === "info" && <>
            <div className="field"><span>What do you need?</span>
              <div className="choice-list">
                {INFO_ITEMS.map(([id, label, hint]) => (
                  <label key={id} className="choice"><span className="check"><input type="checkbox" checked={!!form.items?.has(id)} onChange={(e) => {
                    const next = new Set(form.items);
                    if (e.target.checked) next.add(id); else next.delete(id);
                    set("items", next);
                  }} /><span /></span><div><strong>{label}</strong><small>{hint}</small></div></label>
                ))}
              </div>
            </div>
            <label className="field"><span>Message to applicant</span><textarea value={form.message || ""} onChange={(e) => set("message", e.target.value)} /></label>
          </>}
          {decision.type === "reject" && <>
            <label className="field"><span>Reason <small>(internal)</small></span>
              <select value={form.reason || ""} onChange={(e) => set("reason", e.target.value)} required>
                <option value="" disabled>Select a reason…</option>{REJECT_REASONS.map((r) => <option key={r}>{r}</option>)}
              </select></label>
            <label className="field"><span>Message to applicant</span><textarea value={form.message || ""} onChange={(e) => set("message", e.target.value)} /></label>
            <label className="choice"><span className="check"><input type="checkbox" checked={!!form.reapply} onChange={(e) => set("reapply", e.target.checked)} /><span /></span><div><strong>Allow re-application after 6 months</strong><small>Their profile is kept on file</small></div></label>
          </>}
        </div>
        <div className="modal-foot">
          <button className="btn ghost" type="button" onClick={onClose}>Cancel</button>
          {decision.type === "approve" && <button className="btn success" type="submit" data-autofocus disabled={busy}><Icon name="check" />Approve{people.length > 1 ? ` ${people.length}` : ""}</button>}
          {decision.type === "info" && <button className="btn primary" type="submit" data-autofocus disabled={busy}><Icon name="send" />Send request</button>}
          {decision.type === "reject" && <button className="btn danger" type="submit" data-autofocus={form.reason ? true : undefined} disabled={busy || !form.reason}><Icon name="x" />Reject{people.length > 1 ? ` ${people.length}` : ""}</button>}
        </div>
      </form>
    </Modal>
  );
}

function DocPreview({ v, doc, langs }) {
  const pairNames = (p) => p.split(">").map((c) => langs[c] || c).join(" → ");
  if (doc.kind === "cv") return (
    <div className="paper">
      <h4>{v.name}</h4><div className="muted">{v.location} · {v.email}</div>
      <h5>Profile</h5><p>{v.summary}</p>
      <h5>Experience</h5><ul>{v.history.map((h) => <li key={h.role + h.org}><b>{h.role}</b>, {h.org} ({h.from}–{h.to || "present"})</li>)}</ul>
      <h5>Education</h5><p>{v.education.degree} — {v.education.school}, {v.education.year}</p>
      <h5>Languages</h5><p>{v.pairs.map(pairNames).join("; ")}</p>
      <h5>Tools</h5><p>{v.tools.join(", ")}</p>
    </div>
  );
  if (doc.kind === "ata") return (
    <div className="paper cert">
      <div className="muted" style={{ letterSpacing: ".2em", fontSize: 10 }}>AMERICAN TRANSLATORS ASSOCIATION</div>
      <h4 style={{ marginTop: 12 }}>Certified Translator</h4>
      <p style={{ marginTop: 10 }}>This certifies that</p>
      <p style={{ fontSize: 18, fontWeight: 700, margin: "6px 0" }}>{v.name}</p>
      <p>has passed the ATA certification exam for</p>
      <p style={{ fontWeight: 600, marginTop: 4 }}>{pairNames(v.pairs[0])}</p>
      <p className="muted" style={{ marginTop: 12 }}>Credential No. {v.ataNumber}</p>
      <div className="seal">ATA</div>
    </div>
  );
  if (doc.kind === "degree") return (
    <div className="paper cert">
      <div className="muted" style={{ letterSpacing: ".2em", fontSize: 10 }}>{v.education.school.toUpperCase()}</div>
      <p style={{ marginTop: 16 }}>confers upon</p>
      <p style={{ fontSize: 18, fontWeight: 700, margin: "6px 0" }}>{v.name}</p>
      <p>the degree of</p>
      <h4 style={{ marginTop: 6, fontSize: 16 }}>{v.education.degree}</h4>
      <p className="muted" style={{ marginTop: 12 }}>Awarded {v.education.year}</p>
      <div className="seal">{v.education.school.split(" ").map((w) => w[0]).join("").slice(0, 3)}</div>
    </div>
  );
  if (doc.kind === "id") {
    const failed = v.verification.identity === "failed";
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 12, alignItems: "center", width: "100%" }}>
        <div className={`paper id ${failed ? "blurred" : ""}`}>
          <div className="id-row">
            <div className="photo">{v.name.split(" ").map((p) => p[0]).join("").slice(0, 2)}</div>
            <div style={{ fontSize: 11, lineHeight: 1.5 }}>
              <div className="muted">SURNAME / GIVEN NAMES</div><b style={{ fontSize: 13 }}>{v.name.toUpperCase()}</b>
              <div className="muted" style={{ marginTop: 6 }}>NATIONALITY</div><b>{v.location.split(", ").pop().toUpperCase()}</b>
              <div className="muted" style={{ marginTop: 6 }}>DOCUMENT NO.</div><b>••••••{v.id.slice(-4)}</b>
            </div>
          </div>
        </div>
        {failed && <div className="d-callout rejected" style={{ maxWidth: 380 }}><Icon name="alert" /><div><b>Automated check failed</b><p>Image too blurry to read. Ask the applicant to re-upload.</p></div></div>}
      </div>
    );
  }
  return (
    <div className="paper">
      <h4 style={{ fontSize: 16 }}>Translation sample · {v.pairs[0].replace(">", " → ")}</h4>
      <div className="muted">{v.specs[0]} domain · submitted {fmtDateFull(v.appliedAt)}</div>
      <h5>Reviewer QA</h5>
      <ul>{[["Accuracy", 2], ["Terminology", -1], ["Fluency & style", 1], ["Formatting", 4]].map(([k, d]) => <li key={k}>{k}: <b>{Math.max(60, Math.min(100, v.score + d))}/100</b></li>)}</ul>
    </div>
  );
}

export default function Applications() {
  const toast = useToast();
  const meta = useMeta();
  const langs = meta?.langs || {};
  const [apps, setApps] = useState(null);
  const [status, setStatus] = useState("pending");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("newest");
  const [filters, setFilters] = useState({ pairs: new Set(), specs: new Set(), levels: new Set(), verify: new Set() });
  const [openFilter, setOpenFilter] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [checked, setChecked] = useState(new Set());
  const [tab, setTab] = useState("overview");
  const [docId, setDocId] = useState("cv");
  const [decision, setDecision] = useState(null);
  const [creds, setCreds] = useState([]);
  const [detailOpen, setDetailOpen] = useState(false);
  const [note, setNote] = useState("");
  const [seen, setSeen] = useState(() => { try { return new Set(JSON.parse(localStorage.getItem(SEEN_KEY)) || []); } catch { return new Set(); } });
  const listRef = useRef(null);

  const load = useCallback(() => api.get("/applications").then((d) => setApps(d.applications)).catch((e) => toast(e.message, "reject")), [toast]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    if (!openFilter) return undefined;
    const close = (e) => { if (!e.target.closest(".filter")) setOpenFilter(null); };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [openFilter]);

  const replace = (a) => setApps((list) => list.map((x) => (x.id === a.id ? a : x)));

  const FILTER_DEFS = useMemo(() => ({
    pairs: { label: "Language pair", icon: "languages", searchable: true, options: [...new Set((apps || []).flatMap((v) => v.pairs))].sort().map((p) => ({ id: p, label: p.replace(">", " → "), hint: p.split(">").map((c) => langs[c] || c).join(" → ") })), test: (v, s) => v.pairs.some((p) => s.has(p)) },
    specs: { label: "Specialization", icon: "briefcase", searchable: true, options: [...new Set((apps || []).flatMap((v) => v.specs))].sort().map((s) => ({ id: s, label: s })), test: (v, s) => v.specs.some((x) => s.has(x)) },
    levels: { label: "Experience", icon: "level", options: LEVELS.map((l) => ({ id: l.id, label: l.label, hint: l.hint })), test: (v, s) => s.has(levelOf(v.years).id) },
    verify: { label: "Verification", icon: "shield", options: VERIFY_FILTERS.map((f) => ({ id: f.id, label: f.label, hint: f.hint })), test: (v, s) => VERIFY_FILTERS.some((f) => s.has(f.id) && f.test(v)) },
  }), [apps, langs]);

  const matchesQuery = useCallback((v) => {
    if (!query) return true;
    const hay = [v.name, v.id, v.email, v.location, ...v.specs, ...v.tools, ...v.pairs].join(" ").toLowerCase();
    return query.toLowerCase().split(/\s+/).every((t) => hay.includes(t));
  }, [query]);
  const matchesFilters = useCallback((v, skip) => Object.entries(filters).every(([k, s]) => k === skip || !s.size || FILTER_DEFS[k].test(v, s)), [filters, FILTER_DEFS]);

  const base = useMemo(() => (apps || []).filter((v) => matchesQuery(v) && matchesFilters(v)), [apps, matchesQuery, matchesFilters]);
  const visible = useMemo(() => base.filter((v) => status === "all" || v.status === status).sort(SORTS[sort]), [base, status, sort]);

  useEffect(() => {
    if (!apps) return;
    if (!visible.some((v) => v.id === selectedId)) setSelectedId(visible[0]?.id ?? null);
    setChecked((c) => new Set([...c].filter((id) => visible.some((v) => v.id === id))));
  }, [visible, apps, selectedId]);

  useEffect(() => {
    if (!selectedId) return;
    setSeen((s) => {
      if (s.has(selectedId)) return s;
      const next = new Set(s).add(selectedId);
      try { localStorage.setItem(SEEN_KEY, JSON.stringify([...next])); } catch { /* ignore */ }
      return next;
    });
    listRef.current?.querySelector(".row.selected")?.scrollIntoView({ block: "nearest" });
  }, [selectedId]);

  const v = apps?.find((a) => a.id === selectedId);
  const idx = visible.findIndex((x) => x.id === selectedId);
  const select = (id, open = false) => { setSelectedId(id); setTab((t) => t); setDocId("cv"); if (open) setDetailOpen(true); };
  const step = (d) => { const n = visible[Math.max(0, Math.min(visible.length - 1, idx + d))]; if (n) select(n.id); };
  const canDecide = (a) => a && ["pending", "info"].includes(a.status);

  // Keyboard shortcuts: J/K move, A/I/R decide, X select, 1/2/3 tabs, / search
  useEffect(() => {
    const onKey = (e) => {
      if (decision || document.querySelector(".modal") || e.metaKey || e.ctrlKey || e.altKey || e.target.closest("input, textarea, select")) return;
      const k = e.key.toLowerCase();
      const map = {
        j: () => step(1), arrowdown: () => step(1), k: () => step(-1), arrowup: () => step(-1),
        a: () => canDecide(v) && setDecision({ type: "approve", ids: [v.id] }),
        i: () => canDecide(v) && setDecision({ type: "info", ids: [v.id] }),
        r: () => canDecide(v) && setDecision({ type: "reject", ids: [v.id] }),
        x: () => v && setChecked((c) => { const n = new Set(c); if (n.has(v.id)) n.delete(v.id); else n.add(v.id); return n; }),
        1: () => setTab("overview"), 2: () => setTab("documents"), 3: () => setTab("activity"),
        "/": () => document.getElementById("appSearch")?.focus(),
      };
      if (map[k]) { e.preventDefault(); map[k](); }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  });

  if (!apps) return <div className="page-scroll"><Spinner label="Loading applications…" /></div>;

  const pending = apps.filter((a) => a.status === "pending");
  const avgWait = pending.length ? pending.reduce((s, a) => s + (Date.now() - a.appliedAt), 0) / pending.length / HOUR : 0;
  const filtersOn = Object.values(filters).some((s) => s.size) || query;
  const docs = v ? [
    { id: "cv", kind: "cv", name: `CV_${v.name.replace(/\s+/g, "_")}.pdf`, ext: "pdf" },
    { id: "id", kind: "id", name: "Identity_document.jpg", ext: "img" },
    ...(v.ataNumber ? [{ id: "ata", kind: "ata", name: `ATA_certificate_${v.ataNumber}.pdf`, ext: "pdf" }] : []),
    { id: "degree", kind: "degree", name: `Degree_${v.education.school.split(" ")[0]}.pdf`, ext: "pdf" },
    { id: "sample", kind: "sample", name: `Sample_${v.pairs[0].replace(">", "-")}_${v.specs[0]}.docx`, ext: "doc" },
  ] : [];
  const doc = docs.find((d) => d.id === docId) || docs[0];

  const verify = async (key, to) => {
    try { replace((await api.post(`/applications/${v.id}/verify`, { key, to })).application); } catch (e) { toast(e.message, "reject"); }
  };

  return (
    <div className="page-scroll apps-page">
      <section className="page-head">
        <div><h1>Vendor application review</h1><p>Screen incoming linguists, verify credentials and make onboarding decisions.</p></div>
        <div className="kpis">
          <div className="kpi"><span>Pending review</span><strong>{pending.length}</strong><em className="up">+{pending.filter((a) => Date.now() - a.appliedAt < 24 * HOUR).length} today</em></div>
          <div className="kpi"><span>Awaiting info</span><strong>{apps.filter((a) => a.status === "info").length}</strong></div>
          <div className="kpi"><span>Approved</span><strong>{apps.filter((a) => a.status === "approved").length}</strong></div>
          <div className="kpi"><span>Avg. wait time</span><strong>{avgWait >= 24 ? `${(avgWait / 24).toFixed(1)}d` : `${Math.round(avgWait)}h`}</strong></div>
        </div>
      </section>

      <section className="toolbar">
        <div className="tabs" role="tablist">
          {STATUSES.map(([id, label]) => (
            <button key={id} className="tab" role="tab" type="button" aria-selected={status === id} onClick={() => { setStatus(id); setChecked(new Set()); }}>
              {label}<span className="count">{id === "all" ? base.length : base.filter((a) => a.status === id).length}</span>
            </button>
          ))}
        </div>
        <div className="filters">
          <label className="search toolbar-search"><Icon name="search" /><input id="appSearch" type="search" placeholder="Search name, language, city…" value={query} onChange={(e) => setQuery(e.target.value)} /><kbd>/</kbd></label>
          {Object.entries(FILTER_DEFS).map(([key, def]) => {
            const pool = apps.filter((a) => (status === "all" || a.status === status) && matchesQuery(a) && matchesFilters(a, key));
            return <FilterChip key={key} {...def} options={def.options.map((o) => ({ ...o, n: pool.filter((a) => def.test(a, new Set([o.id]))).length }))}
              selected={filters[key]} onChange={(s) => setFilters((f) => ({ ...f, [key]: s }))} open={openFilter === def.label} setOpen={setOpenFilter} />;
          })}
          {filtersOn && <button className="link-btn" type="button" onClick={() => { setFilters({ pairs: new Set(), specs: new Set(), levels: new Set(), verify: new Set() }); setQuery(""); }}>Clear all</button>}
          <div className="spacer" />
          <label className="select"><Icon name="sort" />
            <select aria-label="Sort" value={sort} onChange={(e) => setSort(e.target.value)}>
              <option value="newest">Newest first</option><option value="oldest">Oldest first</option><option value="score">Highest assessment</option><option value="exp">Most experience</option><option value="verified">Most verified</option>
            </select>
          </label>
        </div>
      </section>

      <section className={`workspace ${detailOpen ? "detail-open" : ""}`}>
        <div className="pane list-pane">
          <div className="list-head">
            <label className="check"><input type="checkbox" aria-label="Select all" checked={checked.size > 0 && checked.size === visible.length}
              ref={(el) => { if (el) el.indeterminate = checked.size > 0 && checked.size < visible.length; }}
              onChange={(e) => setChecked(e.target.checked ? new Set(visible.map((a) => a.id)) : new Set())} /><span /></label>
            <span>{plural(visible.length, "applicant")}</span>
          </div>
          {checked.size > 0 && (
            <div className="bulk">
              <span>{checked.size} selected</span>
              <div className="bulk-actions">
                {[["approve", "success-soft", "check", "Approve"], ["info", "info-soft", "help", "Info"], ["reject", "danger-soft", "x", "Reject"]].map(([t, cls, ic, l]) => (
                  <button key={t} className={`btn sm ${cls}`} type="button" disabled={![...checked].every((id) => canDecide(apps.find((a) => a.id === id)))}
                    onClick={() => setDecision({ type: t, ids: [...checked] })}><Icon name={ic} />{l}</button>
                ))}
              </div>
            </div>
          )}
          <ul className="list" role="listbox" aria-label="Applicants" ref={listRef}>
            {visible.length ? visible.map((a) => {
              const sel = a.id === selectedId;
              return (
                <li key={a.id} className={`row ${sel ? "selected" : ""} ${a.status === "pending" && !seen.has(a.id) ? "unread" : ""}`} role="option" aria-selected={sel} onClick={() => select(a.id, true)}>
                  <label className="check" onClick={(e) => e.stopPropagation()}><input type="checkbox" aria-label={`Select ${a.name}`} checked={checked.has(a.id)}
                    onChange={(e) => setChecked((c) => { const n = new Set(c); if (e.target.checked) n.add(a.id); else n.delete(a.id); return n; })} /><span /></label>
                  <Avatar name={a.name} />
                  <div className="row-main">
                    <div className="row-title"><strong>{a.name}</strong></div>
                    <div className="row-sub">{levelOf(a.years).label} · {a.years} yrs · {a.specs.join(", ")}</div>
                    <div className="row-tags">{a.pairs.map((p) => <span key={p} className="tag pair">{p.split(">")[0]} <i>→</i> {p.split(">")[1]}</span>)}</div>
                  </div>
                  <div className="row-side">
                    {status === "all" ? <span className={`pill ${a.status}`}>{STATUS_LABEL[a.status]}</span> : <span className="row-time">{ago(a.appliedAt)}</span>}
                    <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                      <div className="vdots">{CHECKS.map((c) => <span key={c.key} className={`vdot ${a.verification[c.key]}`} title={`${c.label}: ${V_LABEL[a.verification[c.key]]}`}><Icon name={c.icon} /></span>)}</div>
                      <span className={`score ${scoreClass(a.score)}`} title="Assessment score">{a.score}</span>
                    </div>
                  </div>
                </li>
              );
            }) : <li><Empty icon={filtersOn ? "filter" : "inbox"} title={filtersOn ? "No applicants match" : "You're all caught up"}>{filtersOn ? "Try removing a filter or changing your search." : `Nothing in “${STATUS_LABEL[status]}” right now.`}</Empty></li>}
          </ul>
        </div>

        <div className="pane detail-pane">
          {!v ? <Empty icon="users" title="No applicant selected">Choose someone from the queue to review their profile.</Empty> : <>
            <div className="detail-scroll">
              <div className="d-head">
                <div className="d-top">
                  <button className="icon-btn back" type="button" onClick={() => setDetailOpen(false)} aria-label="Back to list"><Icon name="arrow-left" /></button>
                  <span className="d-id">{v.id}</span>
                  <span>Applied {fmtDateFull(v.appliedAt)} · {ago(v.appliedAt)}</span>
                  <div className="nav-pn">
                    <span>{idx + 1} of {visible.length}</span>
                    <button className="icon-btn" type="button" onClick={() => step(-1)} disabled={idx <= 0} aria-label="Previous applicant (K)"><Icon name="chevron-up" /></button>
                    <button className="icon-btn" type="button" onClick={() => step(1)} disabled={idx >= visible.length - 1} aria-label="Next applicant (J)"><Icon name="chevron-down" /></button>
                  </div>
                </div>
                <div className="d-identity">
                  <Avatar name={v.name} size="xl" />
                  <div>
                    <h2>{v.name} <span className={`pill ${v.status}`}>{STATUS_LABEL[v.status]}</span></h2>
                    <div className="d-meta">
                      <span><Icon name="pin" />{v.location}</span><span><Icon name="clock" />{v.timezone}</span>
                      <span><Icon name="mail" /><a href={`mailto:${v.email}`}>{v.email}</a></span>
                    </div>
                  </div>
                </div>
                {v.status === "info" && v.infoRequest && <div className="d-callout info"><Icon name="help" /><div><b>Waiting on applicant</b><p>{v.infoRequest}</p></div></div>}
                {v.status === "rejected" && <div className="d-callout rejected"><Icon name="x" /><div><b>Rejected</b><p>{v.rejectReason}</p></div></div>}
                {v.status === "approved" && <div className="d-callout approved"><Icon name="check" /><div><b>Approved{v.tier ? ` · ${v.tier} tier` : ""}</b><p>{v.userId ? "Has an employee login and can be assigned jobs." : "Added to the vendor pool."}</p></div></div>}
              </div>

              <div className="d-tabs" role="tablist">
                {[["overview", "Overview"], ["documents", "Documents", docs.length], ["activity", "Activity", v.activity.length]].map(([id, label, n]) => (
                  <button key={id} className="d-tab" role="tab" type="button" aria-selected={tab === id} onClick={() => setTab(id)}>{label}{n ? <span className="count">{n}</span> : null}</button>
                ))}
              </div>

              <div className="d-body" key={`${v.id}-${tab}`}>
                {tab === "overview" && <>
                  <section className="section">
                    <h3>Verification <small>{verifiedCount(v)} of 3 verified</small></h3>
                    <div className="verify-grid">
                      {CHECKS.map((c) => {
                        const s = v.verification[c.key];
                        const detail = c.key === "identity" ? "Government ID + liveness check" : c.key === "ata" ? (v.ataNumber ? `Member ${v.ataNumber}` : "No credential submitted") : `${v.education.degree}, ${v.education.year}`;
                        return (
                          <div key={c.key} className={`vcard ${s}`}>
                            <div className="vcard-top"><div className="vcard-ico"><Icon name={c.icon} /></div><span className={`vstatus ${s}`}>{V_LABEL[s]}</span></div>
                            <div><strong>{c.label}</strong><p>{detail}</p></div>
                            {s === "pending" && <div style={{ display: "flex", gap: 6 }}>
                              <button className="btn sm success-soft" type="button" onClick={() => verify(c.key, "verified")}><Icon name="check" />Verify</button>
                              <button className="btn sm danger-soft" type="button" onClick={() => verify(c.key, "failed")}><Icon name="x" />Fail</button>
                            </div>}
                            {s === "failed" && <button className="btn sm" type="button" onClick={() => verify(c.key, "pending")}><Icon name="undo" />Re-check</button>}
                          </div>
                        );
                      })}
                    </div>
                    <div className="confidence"><span>Confidence</span><div className="meter">{CHECKS.map((c) => <i key={c.key} className={v.verification[c.key]} />)}</div><strong>{["Low", "Fair", "Good", "High"][verifiedCount(v)]}</strong></div>
                  </section>
                  <section className="section">
                    <div className="stats">
                      <div className="stat ring">
                        <svg viewBox="0 0 40 40"><circle className="bg" cx="20" cy="20" r="16" /><circle cx="20" cy="20" r="16" strokeLinecap="round" stroke={{ hi: "var(--green)", mid: "var(--amber)", lo: "var(--red)" }[scoreClass(v.score)]} strokeDasharray={`${(v.score / 100) * 100.53} 100.53`} /></svg>
                        <div><span>Assessment</span><strong>{v.score}<small>/100</small></strong></div>
                      </div>
                      <div className="stat"><span>Experience</span><strong>{v.years}<small> yrs · {levelOf(v.years).label}</small></strong></div>
                      <div className="stat"><span>Rate</span><strong>{usd(v.rate)}<small>/word</small></strong></div>
                      <div className="stat"><span>Capacity</span><strong>{Math.round(v.capacity / 1000)}k<small> words/wk</small></strong></div>
                    </div>
                  </section>
                  <section className="section"><h3>Professional summary</h3><p className="summary">{v.summary}</p></section>
                  <div className="two-col">
                    <section className="section"><h3>Language pairs</h3>
                      <div className="pairs">{v.pairs.map((p) => { const [a, b] = p.split(">"); return (
                        <div key={p} className="pair-row"><span className="code">{a}</span><Icon name="chevron-right" /><span className="code">{b}</span><span className="names">{langs[a] || a} → {langs[b] || b}</span><span className="rate">{usd(v.rate)}<small>/w</small></span></div>
                      ); })}</div>
                    </section>
                    <section className="section"><h3>Specializations</h3><div className="kv">{v.specs.map((s) => <span key={s} className="tag accent">{s}</span>)}</div>
                      <h3 style={{ marginTop: 16 }}>CAT tools</h3><div className="kv">{v.tools.map((t) => <span key={t} className="tag">{t}</span>)}</div>
                    </section>
                  </div>
                  <section className="section"><h3>Experience &amp; education</h3>
                    <div className="timeline">
                      {v.history.map((h, i) => <div key={h.role + h.org} className={`t-item ${i === 0 && !h.to ? "current" : ""}`}><strong>{h.role}</strong><span>{h.org} · {h.from}–{h.to || "Present"}</span></div>)}
                      <div className="t-item"><strong>{v.education.degree}</strong><span>{v.education.school} · {v.education.year}</span></div>
                    </div>
                  </section>
                </>}

                {tab === "documents" && (
                  <div className="docs">
                    <div className="doc-list">
                      {docs.map((d) => (
                        <button key={d.id} className={`doc ${d.id === doc.id ? "active" : ""}`} type="button" onClick={() => setDocId(d.id)}>
                          <span className={`doc-ico ${d.ext}`}>{{ pdf: "PDF", img: "IMG", doc: "DOC" }[d.ext]}</span>
                          <div><strong>{d.name}</strong><span>{{ id: V_LABEL[v.verification.identity], ata: V_LABEL[v.verification.ata], degree: V_LABEL[v.verification.degree] }[d.kind] || "Uploaded"}</span></div>
                        </button>
                      ))}
                    </div>
                    <div className="viewer">
                      <div className="viewer-bar"><strong>{doc.name}</strong></div>
                      <div className="viewer-body"><DocPreview v={v} doc={doc} langs={langs} /></div>
                    </div>
                  </div>
                )}

                {tab === "activity" && <>
                  <form className="composer" onSubmit={async (e) => {
                    e.preventDefault();
                    if (!note.trim()) return;
                    try { replace((await api.post(`/applications/${v.id}/notes`, { note })).application); setNote(""); toast("Note added", "neutral"); } catch (err) { toast(err.message, "reject"); }
                  }}>
                    <textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Add an internal note for the review team… (not visible to the applicant)" aria-label="Internal note" />
                    <div className="composer-foot"><span>Notes are visible to admins only</span><button className="btn sm primary" type="submit" disabled={!note.trim()}><Icon name="send" />Add note</button></div>
                  </form>
                  <div className="timeline">
                    {[...v.activity].reverse().map((e) => (
                      <div key={e.id} className={`t-item ${e.color || ""}`}><strong>{e.title}</strong><span>{e.by} · {fmtDateTime(e.at)}</span>{e.text && <p>{e.text}</p>}{e.note && <div className="note">{e.note}</div>}</div>
                    ))}
                  </div>
                </>}
              </div>
            </div>
            <div className="d-actions">
              {canDecide(v) ? <>
                <span className="hint"><kbd>J</kbd><kbd>K</kbd> navigate · <kbd>A</kbd> <kbd>I</kbd> <kbd>R</kbd> decide</span>
                <button className="btn outline-info" type="button" onClick={() => setDecision({ type: "info", ids: [v.id] })}><Icon name="help" />Request info<kbd>I</kbd></button>
                <button className="btn outline-danger" type="button" onClick={() => setDecision({ type: "reject", ids: [v.id] })}><Icon name="x" />Reject<kbd>R</kbd></button>
                <button className="btn success" type="button" onClick={() => setDecision({ type: "approve", ids: [v.id] })}><Icon name="check" />Approve<kbd>A</kbd></button>
              </> : <>
                <span className="hint"><Icon name={v.status === "approved" ? "check" : "x"} />Decision recorded. Reopen to change it.</span>
                <button className="btn" type="button" onClick={async () => {
                  try { replace((await api.post(`/applications/${v.id}/reopen`)).application); toast(`${v.name} moved back to pending`, "neutral"); } catch (e) { toast(e.message, "reject"); }
                }}><Icon name="undo" />Reopen review</button>
              </>}
            </div>
          </>}
        </div>
      </section>

      <DecisionModal decision={decision} apps={apps} onClose={() => setDecision(null)} onDone={(d, accounts) => {
        const n = d.ids.length;
        const subject = n === 1 ? apps.find((a) => a.id === d.ids[0]).name : `${n} applicants`;
        toast(d.type === "info" ? `Asked ${subject} for more info` : `${subject} ${d.type === "approve" ? "approved" : "rejected"}`, { approve: "approve", info: "info", reject: "reject" }[d.type]);
        setChecked(new Set());
        // Auto-advance to the next applicant still in this view
        const next = visible.filter((a) => !d.ids.includes(a.id));
        if (next.length && d.ids.includes(selectedId)) setSelectedId(next[Math.min(Math.max(idx, 0), next.length - 1)].id);
        load();
        if (accounts.length) setCreds(accounts);
      }} />
      <CredentialsModal creds={creds[0] ? { email: creds[0].email, password: creds[0].tempPassword } : null} onClose={() => setCreds((c) => c.slice(1))} />
    </div>
  );
}
