import { useEffect, useState } from "react";
import { api } from "../api.js";
import { useMeta } from "../context/Meta.jsx";
import { useToast } from "../context/Toast.jsx";
import { Icon } from "../icons.jsx";
import { Dropzone, Modal, ModalHead } from "./ui.jsx";
import { fmtDateTime, fmtNum, plural, toLocalInput } from "../format.js";

export function parseCsv(text) {
  const rows = [];
  let row = [], cell = "", q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"' && text[i + 1] === '"') { cell += '"'; i++; } else if (c === '"') q = false; else cell += c;
    } else if (c === '"') q = true;
    else if (c === "," || c === ";") { row.push(cell); cell = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(cell); rows.push(row); row = []; cell = "";
    } else cell += c;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  return rows.filter((r) => r.some((c) => c.trim()));
}

export default function ImportCsvModal({ open, onClose, users, onImported }) {
  const meta = useMeta();
  const toast = useToast();
  const [rows, setRows] = useState([]);
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (open) setRows([]); }, [open]);

  const langCode = (v) => {
    const s = String(v || "").trim();
    if (!s || !meta) return null;
    if (meta.langs[s.toUpperCase()]) return s.toUpperCase();
    return Object.entries(meta.langs).find(([, n]) => n.toLowerCase() === s.toLowerCase())?.[0] || null;
  };

  const validate = (table) => {
    const [head, ...data] = table;
    const idx = Object.fromEntries(head.map((h, i) => [h.trim().toLowerCase(), i]));
    const get = (r, k) => (idx[k] !== undefined ? String(r[idx[k]] ?? "").trim() : "");
    return data.map((r, n) => {
      const errs = [];
      const dl = get(r, "deadline");
      const deadline = dl ? new Date(dl.includes("T") || dl.includes(" ") ? dl.replace(" ", "T") : `${dl}T17:00`).getTime() : NaN;
      const source = langCode(get(r, "source"));
      const target = langCode(get(r, "target"));
      const words = Number(get(r, "words").replace(/[^\d.]/g, ""));
      const who = get(r, "assignee").toLowerCase();
      const person = who ? users.find((u) => u.role === "employee" && u.active && (u.email.toLowerCase() === who || u.name.toLowerCase() === who)) : null;
      const service = meta.services.find((s) => s.toLowerCase() === get(r, "service").toLowerCase()) || "Translation";
      const priority = ["low", "normal", "high", "urgent"].includes(get(r, "priority").toLowerCase()) ? get(r, "priority").toLowerCase() : "normal";
      const row = { n: n + 2, title: get(r, "title"), client: get(r, "client"), source, target, words, deadline, service, priority, instructions: get(r, "instructions"), person };
      if (!row.title) errs.push("missing title");
      if (!row.client) errs.push("missing client");
      if (!source || !target) errs.push("unknown language");
      else if (source === target) errs.push("same languages");
      if (!(words > 0)) errs.push("invalid words");
      if (!deadline) errs.push("invalid deadline");
      return { ...row, errs, warn: who && !person ? `“${get(r, "assignee")}” not found — will be unassigned` : "" };
    });
  };

  const load = async (files) => {
    try {
      const table = parseCsv(await files[0].text());
      if (table.length < 2) throw new Error("empty");
      setRows(validate(table));
    } catch {
      setRows([]);
      toast("Couldn't read that CSV — check it has a header row", "reject");
    }
  };

  const template = () => {
    const d = (h) => toLocalInput(Date.now() + h * 36e5).replace("T", " ");
    const emp = users.find((u) => u.role === "employee");
    const csv = [
      "title,client,source,target,service,words,deadline,priority,assignee",
      `Website homepage,Atlas Retail,EN,FR,Translation,1200,${d(48)},normal,${emp?.email || ""}`,
      `"User manual, chapter 4",Nordic Energy AS,NO,EN,Translation + Review,3400,${d(96)},high,`,
      `Press release,Fjord Capital,EN,DE,Proofreading,600,${d(24)},urgent,`,
    ].join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = "jobs-import-template.csv";
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };

  const ok = rows.filter((r) => !r.errs.length);
  const importRows = async () => {
    setBusy(true);
    try {
      const res = await api.post("/jobs/import", {
        rows: ok.map((r) => ({ title: r.title, client: r.client, source: r.source, target: r.target, service: r.service, words: r.words, deadline: r.deadline, priority: r.priority, instructions: r.instructions, assigneeId: r.person?.id })),
      });
      toast(`Imported ${plural(res.created, "job")}${res.assigned ? ` · ${res.assigned} assigned` : ""}${res.errors.length ? ` · ${res.errors.length} failed` : ""}`, res.errors.length ? "info" : "approve");
      onImported();
      onClose();
    } catch (e) {
      toast(e.message, "reject");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} wide labelledBy="importTitle">
      <ModalHead id="importTitle" icon="upload" title="Import jobs from CSV" sub="Create many jobs at once. Rows with an assignee are assigned straight away." onClose={onClose} />
      <div className="modal-body">
        <Dropzone title="Drop a .csv file" multiple={false} accept=".csv,text/csv" hint="Columns: title, client, source, target, service, words, deadline, priority, assignee (email or name)" onFiles={load} />
        <button className="link-btn" type="button" style={{ alignSelf: "flex-start" }} onClick={template}><Icon name="download" /> Download template</button>
        {rows.length > 0 && (
          <div>
            <p className="csv-summary"><b>{ok.length}</b> ready to import{rows.length - ok.length > 0 && <span style={{ color: "var(--red)" }}> · {rows.length - ok.length} with errors (skipped)</span>}</p>
            <div className="csv-scroll">
              <table className="csv-table">
                <thead><tr><th>Row</th><th>Title</th><th>Client</th><th>Pair</th><th>Words</th><th>Deadline</th><th>Assignee</th><th>Check</th></tr></thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.n} className={r.errs.length ? "bad" : ""}>
                      <td>{r.n}</td><td>{r.title}</td><td>{r.client}</td><td>{r.source || "?"} → {r.target || "?"}</td>
                      <td>{r.words ? fmtNum(r.words) : "?"}</td><td>{r.deadline ? fmtDateTime(r.deadline) : "?"}</td>
                      <td>{r.person?.name || "—"}</td>
                      <td>{r.errs.length ? r.errs.join(", ") : r.warn ? <span style={{ color: "var(--amber)" }}>{r.warn}</span> : <span style={{ color: "var(--green)" }}>OK</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
      <div className="modal-foot">
        <button className="btn ghost" type="button" onClick={onClose}>Cancel</button>
        <button className="btn primary" type="button" disabled={!ok.length || busy} onClick={importRows}>{ok.length ? `Import ${plural(ok.length, "job")}` : "Import"}</button>
      </div>
    </Modal>
  );
}
