import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { api } from "../api.js";
import { useAuth } from "../context/Auth.jsx";
import { useLive } from "../context/Live.jsx";
import { useMeta } from "../context/Meta.jsx";
import { useToast } from "../context/Toast.jsx";
import { Icon } from "../icons.jsx";
import { Avatar, Dropzone, Empty, FileRow, Spinner } from "../components/ui.jsx";
import { StatusPill } from "../components/jobParts.jsx";
import { HOUR, ago, fmtDateTime, fmtNum, money } from "../format.js";

const TABS = [
  { id: "todo", label: "To accept", statuses: ["assigned"] },
  { id: "active", label: "In progress", statuses: ["in_progress", "revision"] },
  { id: "finished", label: "Finished", statuses: ["delivered"] },
  { id: "done", label: "Completed", statuses: ["completed"] },
];
const EMPTY = { todo: "No new jobs waiting", active: "Nothing in progress", finished: "Nothing waiting for review", done: "No completed jobs yet" };

function Task({ job, flash, onChanged, onTab }) {
  const toast = useToast();
  const meta = useMeta();
  const [finishing, setFinishing] = useState(null);
  const [declining, setDeclining] = useState(false);
  const [reason, setReason] = useState("Not available before the deadline");
  const [progress, setProgress] = useState(job.progress);
  const [busy, setBusy] = useState(false);
  useEffect(() => setProgress(job.progress), [job.progress]);

  const run = async (fn, msg, kind = "approve") => {
    setBusy(true);
    try { await fn(); if (msg) toast(msg, kind); onChanged(); } catch (e) { toast(e.message, "reject"); } finally { setBusy(false); }
  };

  const src = job.files.filter((f) => f.kind === "source");
  const del = job.files.filter((f) => f.kind === "deliverable");
  const diff = job.deadline - Date.now();
  const open = ["assigned", "in_progress", "revision"].includes(job.status);
  const langs = meta?.langs || {};

  return (
    <article className={`task ${flash ? "flash" : ""}`} id={`job-${job.id}`}>
      <div className="task-top">
        <div>
          <div className="jcard-top" style={{ marginBottom: 4 }}><span className="jid">{job.code}</span>
            {job.priority === "urgent" && <span className="prio urgent"><Icon name="zap" />Urgent</span>}
            {job.priority === "high" && <span className="prio high"><Icon name="flag" />High</span>}
          </div>
          <h3>{job.title}</h3>
        </div>
        <div className="right"><StatusPill status={job.status} /></div>
      </div>
      <div className="task-meta">
        <span><Icon name="building" />{job.client}</span>
        <span><Icon name="languages" />{langs[job.source] || job.source} → {langs[job.target] || job.target}</span>
        <span><Icon name="briefcase" />{job.service}</span>
        <span><Icon name="type" />{fmtNum(job.words)} words · {money(job.words * job.rate)}</span>
        {open
          ? <span className={`due ${diff < 0 ? "late" : diff < 24 * HOUR ? "soon" : ""}`} style={{ margin: 0 }}><Icon name={diff < 0 ? "alert" : "clock"} />{diff < 0 ? `Overdue · was due ${fmtDateTime(job.deadline)}` : `Due ${fmtDateTime(job.deadline)} (${ago(job.deadline)})`}</span>
          : <span><Icon name="calendar" />Due {fmtDateTime(job.deadline)}</span>}
      </div>
      {job.status === "revision" && job.revisionNote && (
        <div className="d-callout info" style={{ margin: 0 }}><Icon name="refresh" /><div><b>Revision requested</b><p>{job.revisionNote}</p></div></div>
      )}
      {job.instructions && <div><h5>Instructions</h5><div className="instructions">{job.instructions}</div></div>}
      <div className="task-cols">
        <div><h5>Source files</h5><div className="files">{src.length ? src.map((f) => <FileRow key={f.id} file={f} />) : <small className="muted">No files attached</small>}</div></div>
        <div><h5>Your deliverables</h5><div className="files">{del.length ? del.map((f) => <FileRow key={f.id} file={f} />) : <small className="muted">Nothing uploaded yet</small>}</div></div>
      </div>

      {finishing && (
        <div className="finish-box">
          <strong>Submit your work</strong>
          <Dropzone compact title="Upload deliverable files" hint="Your project manager is notified as soon as you submit" onFiles={(files) => setFinishing((f) => ({ ...f, files: [...f.files, ...files] }))} />
          {finishing.files.length > 0 && <div className="files">{finishing.files.map((file, i) => <FileRow key={i} file={file} onRemove={() => setFinishing((f) => ({ ...f, files: f.files.filter((_, j) => j !== i) }))} />)}</div>}
          <textarea placeholder="Note for your PM (optional) — e.g. queries, assumptions, terms to double-check" value={finishing.note} onChange={(e) => setFinishing((f) => ({ ...f, note: e.target.value }))} />
          <div className="task-actions" style={{ border: 0, padding: 0 }}>
            <span className="spacer" />
            <button className="btn ghost" type="button" onClick={() => setFinishing(null)}>Cancel</button>
            <button className="btn success" type="button" disabled={!finishing.files.length || busy} onClick={() => run(async () => {
              const fd = new FormData();
              finishing.files.forEach((file) => fd.append("files", file));
              fd.append("note", finishing.note.trim());
              await api.post(`/jobs/${job.id}/finish`, fd);
              setFinishing(null);
              onTab("finished");
            }, `${job.code} submitted — your PM has been notified`)}>{busy ? <span className="spinner sm" /> : <Icon name="send" />}Submit &amp; notify PM</button>
          </div>
        </div>
      )}

      {declining && (
        <div className="finish-box decline-box">
          <strong>Decline {job.code}?</strong>
          <select value={reason} onChange={(e) => setReason(e.target.value)}>
            <option>Not available before the deadline</option><option>Outside my specialization</option><option>Word count too large for my capacity</option><option>Other</option>
          </select>
          <div className="task-actions" style={{ border: 0, padding: 0 }}><span className="spacer" />
            <button className="btn ghost" type="button" onClick={() => setDeclining(false)}>Keep it</button>
            <button className="btn danger" type="button" disabled={busy} onClick={() => run(() => api.post(`/jobs/${job.id}/decline`, { reason }), `${job.code} declined`, "neutral")}>Decline job</button>
          </div>
        </div>
      )}

      {!finishing && !declining && (
        <div className="task-actions">
          {job.status === "assigned" && <>
            <span className="muted small">Assigned {ago(job.updatedAt)}</span><span className="spacer" />
            <button className="btn outline-danger" type="button" onClick={() => setDeclining(true)}><Icon name="x" />Decline</button>
            <button className="btn primary" type="button" disabled={busy} onClick={() => run(async () => { await api.post(`/jobs/${job.id}/accept`); onTab("active"); }, `You accepted ${job.code} — your PM has been notified`)}><Icon name="check" />Accept job</button>
          </>}
          {["in_progress", "revision"].includes(job.status) && <>
            <label className="range">Progress
              <input type="range" min="0" max="99" value={progress} aria-label="Progress"
                onChange={(e) => setProgress(Number(e.target.value))}
                onPointerUp={() => progress !== job.progress && run(() => api.post(`/jobs/${job.id}/progress`, { progress }))}
                onKeyUp={() => progress !== job.progress && run(() => api.post(`/jobs/${job.id}/progress`, { progress }))} />
              <output>{progress}%</output>
            </label>
            <button className="btn success" type="button" onClick={() => setFinishing({ files: [], note: "" })}><Icon name="check-circle" />Mark as finished</button>
          </>}
          {job.status === "delivered" && <span className="state-note violet"><Icon name="clock" />Submitted {ago(job.deliveredAt)} — waiting for your PM to review</span>}
          {job.status === "completed" && <span className="state-note green"><Icon name="check" />Approved — nice work!</span>}
        </div>
      )}
    </article>
  );
}

export default function MyJobs() {
  const { user } = useAuth();
  const toast = useToast();
  const { onJobsChanged } = useLive();
  const [params, setParams] = useSearchParams();
  const [jobs, setJobs] = useState(null);
  const [tab, setTab] = useState(null);
  const [flash, setFlash] = useState(null);
  const openId = params.get("open") ? Number(params.get("open")) : null;
  const handled = useRef(null);

  const load = useCallback(async () => {
    try {
      const { jobs } = await api.get("/jobs");
      // Pull the latest revision note into the card for jobs sent back.
      const withNotes = await Promise.all(jobs.map(async (j) => {
        if (j.status !== "revision") return j;
        const { job } = await api.get(`/jobs/${j.id}`);
        const h = [...job.history].reverse().find((x) => x.text.startsWith("Requested a revision"));
        return { ...j, revisionNote: h ? h.text.replace(/^Requested a revision:?\s*/, "") : "" };
      }));
      setJobs(withNotes);
    } catch (e) {
      toast(e.message, "reject");
    }
  }, [toast]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { let t; return onJobsChanged(() => { clearTimeout(t); t = setTimeout(load, 150); }); }, [onJobsChanged, load]);

  useEffect(() => {
    if (!jobs) return;
    if (!tab) setTab(jobs.some((j) => j.status === "assigned") ? "todo" : "active");
    if (openId && handled.current !== openId) {
      const j = jobs.find((x) => x.id === openId);
      handled.current = openId;
      setParams({}, { replace: true });
      if (!j) return;
      setTab(TABS.find((t) => t.statuses.includes(j.status)).id);
      setFlash(j.id);
      setTimeout(() => document.getElementById(`job-${j.id}`)?.scrollIntoView({ behavior: "smooth", block: "center" }), 80);
      setTimeout(() => setFlash(null), 1800);
    }
  }, [jobs, tab, openId, setParams]);

  if (!jobs || !tab) return <div className="page-scroll"><Spinner label="Loading your jobs…" /></div>;

  const open = jobs.filter((j) => ["in_progress", "revision", "assigned"].includes(j.status));
  const dueSoon = open.filter((j) => j.deadline - Date.now() < 24 * HOUR).length;
  const earned = jobs.filter((j) => j.status === "completed").reduce((s, j) => s + j.words * j.rate, 0);
  const current = TABS.find((t) => t.id === tab);
  const list = jobs.filter((j) => current.statuses.includes(j.status)).sort((a, b) => a.deadline - b.deadline);

  return (
    <div className="page-scroll">
      <div className="emp-shell">
        <section className="emp-hero">
          <Avatar name={user.name} />
          <div><h1>Hi {user.name.split(" ")[0]} 👋</h1><p>{user.title || "Linguist"}{user.pairs.length ? ` · ${user.pairs.join(", ")}` : ""}</p></div>
          <div className="job-kpis emp-kpis">
            <div className="kpi"><span className="kpi-ico blue"><Icon name="briefcase" /></span><div><span>Open jobs</span><strong>{open.length}</strong></div></div>
            <div className="kpi"><span className="kpi-ico amber"><Icon name="clock" /></span><div><span>Due in 24h</span><strong>{dueSoon}</strong></div></div>
            <div className="kpi"><span className="kpi-ico green"><Icon name="dollar" /></span><div><span>Approved work</span><strong>{money(earned)}</strong></div></div>
          </div>
        </section>
        <div className="tabs" role="tablist">
          {TABS.map((t) => (
            <button key={t.id} className="tab" role="tab" type="button" aria-selected={tab === t.id} onClick={() => setTab(t.id)}>
              {t.label}<span className="count">{jobs.filter((j) => t.statuses.includes(j.status)).length}</span>
            </button>
          ))}
        </div>
        <section className="emp-tasks">
          {list.length ? list.map((j) => <Task key={j.id} job={j} flash={flash === j.id} onChanged={load} onTab={setTab} />)
            : <Empty boxed title={EMPTY[tab]}>{tab === "todo" ? "New assignments from your project manager show up here instantly." : "Jobs move here as you work on them."}</Empty>}
        </section>
      </div>
    </div>
  );
}
