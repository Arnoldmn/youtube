import { useCallback, useEffect, useState } from "react";
import { api } from "../api.js";
import { useLive } from "../context/Live.jsx";
import { useMeta } from "../context/Meta.jsx";
import { useToast } from "../context/Toast.jsx";
import { Icon } from "../icons.jsx";
import { Avatar, Dropzone, FileRow, Spinner } from "./ui.jsx";
import Ask from "./Ask.jsx";
import { OPEN, PrioBadge, ProgressBar, StatusPill, rankPeople } from "./jobParts.jsx";
import { ago, fmtDateTime, fmtNum, money, plural, toLocalInput } from "../format.js";

const MATCH_LABEL = (target) => ({ 2: "Pair match", 1: `Into ${target}`, 0: "No match" });

export default function JobDrawer({ jobId, users, onClose, onChanged }) {
  const toast = useToast();
  const meta = useMeta();
  const { onJobsChanged } = useLive();
  const [job, setJob] = useState(null);
  const [picking, setPicking] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [editing, setEditing] = useState(null);
  const [ask, setAsk] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      setJob((await api.get(`/jobs/${jobId}`)).job);
    } catch (e) {
      if (e.status !== 404) toast(e.message, "reject");
      else toast("That job no longer exists", "neutral");
      onClose();
    }
  }, [jobId, toast, onClose]);

  useEffect(() => { setJob(null); setPicking(false); setShowAll(false); setEditing(null); load(); }, [load]);
  useEffect(() => onJobsChanged((d) => { if (!d.id || d.id === jobId) load(); }), [onJobsChanged, jobId, load]);
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape" && !document.querySelector(".modal")) onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const run = async (fn, msg, kind = "approve") => {
    setBusy(true);
    try {
      const res = await fn();
      if (res?.job) setJob(res.job);
      if (msg) toast(msg, kind);
      onChanged();
      return res;
    } catch (e) {
      toast(e.message, "reject");
      return null;
    } finally {
      setBusy(false);
    }
  };

  if (!job) {
    return (
      <>
        <div className="drawer-scrim" onClick={onClose} />
        <aside className="drawer" aria-label="Job details"><Spinner /></aside>
      </>
    );
  }

  const person = job.assignee;
  const src = job.files.filter((f) => f.kind === "source");
  const del = job.files.filter((f) => f.kind === "deliverable");
  const canReassign = OPEN.has(job.status);
  const showPicker = job.status === "unassigned" || picking;
  const ranked = rankPeople(users, job.source, job.target);
  const lastEvent = (prefix) => [...(job.history || [])].reverse().find((h) => h.text.startsWith(prefix))?.at;
  const langs = meta?.langs || {};

  const assign = (u) => {
    if (u.id === person?.id) return setPicking(false);
    run(() => api.post(`/jobs/${job.id}/assign`, { assigneeId: u.id }), `Assigned to ${u.name} — they've been notified`).then(() => setPicking(false));
  };

  const statusCard = () => {
    switch (job.status) {
      case "unassigned":
        return <div className="status-card amber"><div className="sc-row"><Icon name="user-plus" /><div><b>Not assigned yet</b><p>Pick someone below — people who work in {job.source} → {job.target} are listed first.</p></div></div></div>;
      case "assigned":
        return <div className="status-card"><div className="sc-row"><Icon name="clock" /><div><b>Waiting for {person.name} to accept</b><p>Assigned {ago(lastEvent("Assigned") || lastEvent("Reassigned") || job.updatedAt)}. You'll be notified when they accept or decline.</p></div></div></div>;
      case "in_progress":
      case "revision":
        return <div className="status-card"><div className="sc-row"><Icon name={job.status === "revision" ? "refresh" : "play"} /><div><b>{person.name} is {job.status === "revision" ? "revising" : "working on"} this job</b><p>You'll be notified as soon as it's finished.</p></div></div><ProgressBar job={job} /></div>;
      case "delivered":
        return (
          <div className="status-card violet">
            <div className="sc-row"><Icon name="check-circle" /><div><b>Finished by {person?.name || "assignee"} · {ago(job.deliveredAt)}</b><p>Check the deliverable{del.length > 1 ? "s" : ""}, then approve or send it back for revision.</p></div></div>
            <div className="actions">
              <button className="btn success" type="button" disabled={busy} onClick={() => run(() => api.post(`/jobs/${job.id}/approve`), `${job.code} approved and completed`)}><Icon name="check" />Approve &amp; complete</button>
              <button className="btn" type="button" disabled={busy} onClick={() => setAsk({
                title: "Request a revision", sub: `${person?.name} will be notified and the job moves back to In progress.`, icon: "refresh",
                field: { label: "What needs to change?", placeholder: "e.g. Please align terminology with the client glossary in section 3.", required: true },
                confirm: "Send back", onConfirm: (note) => run(() => api.post(`/jobs/${job.id}/revision`, { note }), `Revision requested on ${job.code}`, "info"),
              })}><Icon name="refresh" />Request revision</button>
            </div>
          </div>
        );
      case "completed":
        return <div className="status-card green"><div className="sc-row"><Icon name="check" /><div><b>Completed</b><p>Approved {ago(lastEvent("Approved") || job.updatedAt)}{person ? ` · delivered by ${person.name}` : ""}.</p></div></div></div>;
      default:
        return null;
    }
  };

  const saveEdit = async (e) => {
    e.preventDefault();
    const res = await run(() => api.patch(`/jobs/${job.id}`, {
      deadline: new Date(editing.deadline).getTime(), priority: editing.priority, instructions: editing.instructions,
    }), "Job updated");
    if (res) setEditing(null);
  };

  return (
    <>
      <div className="drawer-scrim" onClick={onClose} />
      <aside className="drawer" aria-label="Job details">
        <div className="dr-head">
          <div className="dr-top">
            <span className="d-id">{job.code}</span><StatusPill status={job.status} /><PrioBadge priority={job.priority} always />
            <button className="icon-btn" type="button" onClick={onClose} aria-label="Close"><Icon name="x" /></button>
          </div>
          <h2>{job.title}</h2>
          <div className="jclient"><Icon name="building" />{job.client} · {job.service}</div>
        </div>

        <div className="dr-body">
          {statusCard()}

          <section className="section">
            <h3>Details {!editing && OPEN.has(job.status) && <button className="link-btn" type="button" onClick={() => setEditing({ deadline: toLocalInput(job.deadline), priority: job.priority, instructions: job.instructions })}>Edit</button>}</h3>
            {editing ? (
              <form className="edit-grid" onSubmit={saveEdit}>
                <label className="field"><span>Deadline</span><input type="datetime-local" value={editing.deadline} onChange={(e) => setEditing({ ...editing, deadline: e.target.value })} required /></label>
                <label className="field"><span>Priority</span>
                  <select value={editing.priority} onChange={(e) => setEditing({ ...editing, priority: e.target.value })}>
                    {["low", "normal", "high", "urgent"].map((p) => <option key={p} value={p}>{p[0].toUpperCase() + p.slice(1)}</option>)}
                  </select></label>
                <label className="field span-2"><span>Instructions</span><textarea value={editing.instructions} onChange={(e) => setEditing({ ...editing, instructions: e.target.value })} /></label>
                <div className="span-2 card-actions"><button className="btn ghost" type="button" onClick={() => setEditing(null)}>Cancel</button><button className="btn primary" type="submit" disabled={busy}>Save</button></div>
              </form>
            ) : (
              <div className="details">
                <div><span>Language pair</span><strong>{langs[job.source] || job.source} → {langs[job.target] || job.target}</strong></div>
                <div><span>Deadline</span><strong>{fmtDateTime(job.deadline)}<small>{OPEN.has(job.status) ? ago(job.deadline) : ""}</small></strong></div>
                <div><span>Words</span><strong>{fmtNum(job.words)}</strong></div>
                <div><span>Value</span><strong>{money(job.words * job.rate)}<small>@ €{job.rate}/w</small></strong></div>
              </div>
            )}
          </section>

          <section className="section">
            <h3>Assignee
              {canReassign && job.status !== "unassigned" && (
                <span>{picking
                  ? <button className="link-btn" type="button" onClick={() => setPicking(false)}>Cancel</button>
                  : <>
                    <button className="link-btn" type="button" onClick={() => setPicking(true)}>Reassign</button>
                    <button className="link-btn" type="button" onClick={() => run(() => api.post(`/jobs/${job.id}/assign`, { assigneeId: null }), `${job.code} unassigned`, "neutral")}>Unassign</button>
                  </>}</span>
              )}
            </h3>
            {showPicker ? (
              <div className="picker">
                {(showAll ? ranked : ranked.slice(0, 4)).map((u) => (
                  <button key={u.id} className={`pick ${u.id === person?.id ? "current" : ""}`} type="button" disabled={busy} onClick={() => assign(u)}>
                    <Avatar name={u.name} size="sm" />
                    <div><strong>{u.name}</strong><small>{u.title || "Employee"} · {u.pairs.join(", ") || "no pairs"} · {plural(u.openJobs, "open job")}</small></div>
                    <span className={`match m${u.match}`}>{MATCH_LABEL(job.target)[u.match]}</span>
                  </button>
                ))}
                {ranked.length > 4 && <button className="link-btn picker-more" type="button" onClick={() => setShowAll((s) => !s)}>{showAll ? "Show fewer" : `Show all ${ranked.length} people`}</button>}
                {!ranked.length && <p className="muted small">No active employees. Add people on the Team page first.</p>}
              </div>
            ) : person && (
              <div className="pick current" style={{ cursor: "default" }}>
                <Avatar name={person.name} size="sm" />
                <div><strong>{person.name}</strong><small>{person.title || "Employee"} · {person.email}</small></div>
                <span className="match m2">{person.pairs.includes(`${job.source}>${job.target}`) ? "Pair match" : "Assigned"}</span>
              </div>
            )}
          </section>

          {del.length > 0 && (
            <section className="section"><h3>Deliverables <small>{del.length}</small></h3><div className="files">{del.map((f) => <FileRow key={f.id} file={f} />)}</div></section>
          )}

          <section className="section">
            <h3>Source files <small>{src.length}</small></h3>
            <div className="files">
              {src.map((f) => <FileRow key={f.id} file={f} />)}
              <Dropzone compact title="Add files" hint={person ? `${person.name} will be notified` : undefined}
                onFiles={(files) => {
                  const fd = new FormData();
                  files.forEach((f) => fd.append("files", f));
                  run(() => api.post(`/jobs/${job.id}/files`, fd), `${plural(files.length, "file")} added to ${job.code}`);
                }} />
            </div>
          </section>

          {job.instructions && !editing && <section className="section"><h3>Instructions</h3><div className="instructions">{job.instructions}</div></section>}

          <section className="section">
            <h3>Activity</h3>
            <div className="timeline">
              {[...(job.history || [])].reverse().map((h, i) => (
                <div key={h.id} className={`t-item ${i === 0 ? "current" : ""}`}><strong>{h.text}</strong><span>{h.by} · {fmtDateTime(h.at)}</span></div>
              ))}
            </div>
          </section>
        </div>

        <div className="dr-foot">
          <button className="btn outline-danger" type="button" onClick={() => setAsk({
            title: `Delete ${job.code}?`, sub: "The job, its files and notifications are removed for everyone. This can't be undone.",
            icon: "trash", tone: "reject", confirm: "Delete job", confirmCls: "danger",
            onConfirm: async () => { onClose(); await run(() => api.del(`/jobs/${job.id}`), `${job.code} deleted`, "reject"); },
          })}><Icon name="trash" />Delete</button>
          <span className="spacer" />
          <button className="btn" type="button" onClick={onClose}>Close</button>
        </div>
      </aside>
      <Ask ask={ask} onClose={() => setAsk(null)} />
    </>
  );
}
