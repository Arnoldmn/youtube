import { useEffect, useMemo, useState } from "react";
import { api } from "../api.js";
import { useMeta } from "../context/Meta.jsx";
import { Icon } from "../icons.jsx";
import { Avatar, Dropzone, FileRow, Modal, ModalHead } from "./ui.jsx";
import { rankPeople } from "./jobParts.jsx";
import { money, plural, toLocalInput } from "../format.js";

const blank = () => {
  const d = new Date(Date.now() + 3 * 864e5);
  d.setHours(17, 0, 0, 0);
  return { title: "", client: "", source: "EN", target: "DE", service: "Translation", words: "", rate: "", deadline: toLocalInput(d), priority: "normal", instructions: "", assigneeId: "" };
};

export default function NewJobModal({ open, onClose, users, clients, onCreated }) {
  const meta = useMeta();
  const [f, setF] = useState(blank);
  const [files, setFiles] = useState([]);
  const [rateTouched, setRateTouched] = useState(false);
  const [wordsAuto, setWordsAuto] = useState(true);
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setF({ ...blank(), rate: meta?.rates?.Translation ?? 0.11 });
    setFiles([]); setRateTouched(false); setWordsAuto(true); setErrors({});
  }, [open, meta]);

  const set = (k) => (e) => {
    const v = e.target.value;
    setF((x) => {
      const next = { ...x, [k]: v };
      if (k === "service" && !rateTouched && meta?.rates) next.rate = meta.rates[v];
      return next;
    });
    if (k === "rate") setRateTouched(true);
    if (k === "words") setWordsAuto(false);
    setErrors((er) => ({ ...er, [k]: undefined }));
  };

  const langs = useMemo(() => Object.entries(meta?.langs || {}).sort((a, b) => a[1].localeCompare(b[1])), [meta]);
  const ranked = useMemo(() => rankPeople(users, f.source, f.target), [users, f.source, f.target]);

  const addFiles = async (list) => {
    const all = [...files, ...list];
    setFiles(all);
    if (!f.title && list[0]) setF((x) => ({ ...x, title: list[0].name.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ") }));
    const textual = all.filter((x) => /^text\//.test(x.type) || /\.(txt|md|csv|srt|vtt|html?)$/i.test(x.name));
    if (textual.length && (wordsAuto || !f.words)) {
      let total = 0;
      for (const t of textual) { try { total += (await t.text()).split(/\s+/).filter(Boolean).length; } catch { /* unreadable */ } }
      if (total) { setF((x) => ({ ...x, words: String(total) })); setWordsAuto(true); }
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    const er = {};
    if (!f.title.trim()) er.title = "Add a job title";
    if (!f.client.trim()) er.client = "Add the client";
    if (f.source === f.target) er.target = "Source and target languages must differ";
    if (!(Number(f.words) > 0)) er.words = "Enter the word count";
    const deadline = new Date(f.deadline).getTime();
    if (!deadline) er.deadline = "Pick a deadline";
    else if (deadline < Date.now()) er.deadline = "The deadline is in the past";
    setErrors(er);
    if (Object.keys(er).length) return;
    setBusy(true);
    try {
      const fd = new FormData();
      Object.entries({ ...f, deadline }).forEach(([k, v]) => { if (v !== "" && v !== undefined) fd.append(k, v); });
      files.forEach((file) => fd.append("files", file));
      const { job } = await api.post("/jobs", fd);
      onClose();
      onCreated(job);
    } catch (err) {
      setErrors({ form: err.message });
    } finally {
      setBusy(false);
    }
  };

  const value = (Number(f.words) || 0) * (Number(f.rate) || 0);
  const field = (k) => `field ${errors[k] ? "invalid" : ""}`;
  const errList = Object.values(errors).filter(Boolean);

  return (
    <Modal open={open} onClose={onClose} wide labelledBy="newJobTitle">
      <form onSubmit={submit} noValidate>
        <ModalHead id="newJobTitle" icon="briefcase" title="New job" sub="Upload the source files, set the brief and pick who should do it." onClose={onClose} />
        <div className="modal-body">
          <Dropzone title="Drop source files here" hint="DOCX, PDF, XLSX, TXT, IDML… up to 25 MB each. Word count is detected from .txt files." onFiles={addFiles} />
          {files.length > 0 && <ul className="file-list">{files.map((file, i) => <li key={`${file.name}-${i}`}><FileRow file={file} onRemove={() => setFiles(files.filter((_, j) => j !== i))} /></li>)}</ul>}

          <div className="form-grid">
            <label className={`${field("title")} span-2`}><span>Job title</span><input value={f.title} onChange={set("title")} placeholder="e.g. Employment contract – Berlin office" /></label>
            <label className={field("client")}><span>Client</span><input value={f.client} onChange={set("client")} list="clientList" placeholder="Client name" /></label>
            <datalist id="clientList">{clients.map((c) => <option key={c} value={c} />)}</datalist>
            <label className="field"><span>Service</span><select value={f.service} onChange={set("service")}>{(meta?.services || []).map((s) => <option key={s}>{s}</option>)}</select></label>
            <label className="field"><span>Source language</span><select value={f.source} onChange={set("source")}>{langs.map(([c, n]) => <option key={c} value={c}>{n} ({c})</option>)}</select></label>
            <label className={field("target")}><span>Target language</span><select value={f.target} onChange={set("target")}>{langs.map(([c, n]) => <option key={c} value={c}>{n} ({c})</option>)}</select></label>
            <label className={field("words")}><span>Word count</span><input type="number" min="1" value={f.words} onChange={set("words")} placeholder="0" /></label>
            <label className="field"><span>Rate <small>(€ / word)</small></span><input type="number" min="0" step="0.01" value={f.rate} onChange={set("rate")} /></label>
            <label className={field("deadline")}><span>Deadline</span><input type="datetime-local" value={f.deadline} onChange={set("deadline")} /></label>
            <div className="field"><span>Priority</span>
              <div className="seg">
                {["low", "normal", "high", "urgent"].map((p) => (
                  <label key={p}><input type="radio" name="priority" value={p} checked={f.priority === p} onChange={set("priority")} /><span>{p[0].toUpperCase() + p.slice(1)}</span></label>
                ))}
              </div>
            </div>
            <label className="field span-2"><span>Instructions <small>(optional)</small></span><textarea value={f.instructions} onChange={set("instructions")} placeholder="Glossary, tone of voice, formatting, reference material…" /></label>
          </div>

          <div className="field">
            <span>Assign to <small>— best matches for the language pair first</small></span>
            <div className="assign-grid">
              <label className="assign-opt"><input type="radio" name="assigneeId" value="" checked={!f.assigneeId} onChange={set("assigneeId")} />
                <span className="none-ico"><Icon name="user-plus" /></span><div><strong>Leave unassigned</strong><small>Assign later from the board</small></div></label>
              {ranked.map((u) => (
                <label key={u.id} className="assign-opt"><input type="radio" name="assigneeId" value={u.id} checked={String(f.assigneeId) === String(u.id)} onChange={set("assigneeId")} />
                  <Avatar name={u.name} /><div><strong>{u.name}</strong><small>{u.pairs.join(", ") || "no pairs"} · {plural(u.openJobs, "job")}</small></div>
                  {u.match ? <span className={`match m${u.match}`}>{u.match === 2 ? "Match" : `→ ${f.target}`}</span> : <span />}
                </label>
              ))}
            </div>
          </div>
          {errList.length > 0 && <p className="form-error" role="alert">{errList.join(" · ")}</p>}
        </div>
        <div className="modal-foot">
          <span className="foot-note">{value > 0 && <>Job value <b>{money(value)}</b></>}</span>
          <button className="btn ghost" type="button" onClick={onClose}>Cancel</button>
          <button className="btn primary" type="submit" disabled={busy}>{busy ? <span className="spinner sm" /> : <Icon name="plus" />}Create job</button>
        </div>
      </form>
    </Modal>
  );
}
