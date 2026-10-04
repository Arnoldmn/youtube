import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { api } from "../api.js";
import { useLive } from "../context/Live.jsx";
import { useToast } from "../context/Toast.jsx";
import { Icon } from "../icons.jsx";
import { Avatar, Empty, Spinner } from "../components/ui.jsx";
import { Due, OPEN, PairTag, PrioBadge, ProgressBar, StatusPill, WhoChip } from "../components/jobParts.jsx";
import JobDrawer from "../components/JobDrawer.jsx";
import NewJobModal from "../components/NewJobModal.jsx";
import ImportCsvModal from "../components/ImportCsvModal.jsx";
import { HOUR, fmtNum, money, plural } from "../format.js";

const COLUMNS = [
  { id: "unassigned", label: "Unassigned", statuses: ["unassigned"], dot: "s-unassigned", empty: "Every job has an owner" },
  { id: "assigned", label: "Awaiting acceptance", statuses: ["assigned"], dot: "s-assigned", empty: "Nothing waiting on the team" },
  { id: "in_progress", label: "In progress", statuses: ["in_progress", "revision"], dot: "s-in_progress", empty: "No work in progress" },
  { id: "delivered", label: "Finished · review", statuses: ["delivered"], dot: "s-delivered", empty: "Finished jobs land here" },
  { id: "completed", label: "Completed", statuses: ["completed"], dot: "s-completed", empty: "No completed jobs yet" },
];

const VIEW_KEY = "lingua:jobs:view";

export default function Jobs() {
  const toast = useToast();
  const { onJobsChanged } = useLive();
  const [params, setParams] = useSearchParams();
  const [jobs, setJobs] = useState(null);
  const [users, setUsers] = useState([]);
  const [view, setView] = useState(() => { try { return localStorage.getItem(VIEW_KEY) || "board"; } catch { return "board"; } });
  const [query, setQuery] = useState("");
  const [assignee, setAssignee] = useState("all");
  const [priority, setPriority] = useState("all");
  const [sort, setSort] = useState({ key: "deadline", dir: 1 });
  const [newOpen, setNewOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [flash, setFlash] = useState(null);
  const [, tick] = useState(0);
  const openId = params.get("open") ? Number(params.get("open")) : null;
  const dragging = useRef(null);

  const load = useCallback(async () => {
    try {
      const [j, u] = await Promise.all([api.get("/jobs"), api.get("/users")]);
      setJobs(j.jobs);
      setUsers(u.users);
    } catch (e) {
      toast(e.message, "reject");
    }
  }, [toast]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    let t;
    return onJobsChanged(() => { clearTimeout(t); t = setTimeout(load, 150); });
  }, [onJobsChanged, load]);
  useEffect(() => { const i = setInterval(() => tick((n) => n + 1), 60000); return () => clearInterval(i); }, []);
  useEffect(() => { try { localStorage.setItem(VIEW_KEY, view); } catch { /* ignore */ } }, [view]);

  // Keyboard: N = new job, / = search
  useEffect(() => {
    const onKey = (e) => {
      if (e.metaKey || e.ctrlKey || e.altKey || document.querySelector(".modal") || e.target.closest("input:not([type=checkbox]):not([type=radio]), textarea, select")) return;
      if (e.key === "n" || e.key === "N") { e.preventDefault(); setNewOpen(true); }
      if (e.key === "/") { e.preventDefault(); document.getElementById("jobSearch")?.focus(); }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const openJob = (id) => setParams(id ? { open: String(id) } : {});
  const employees = useMemo(() => users.filter((u) => u.role === "employee"), [users]);

  const filtered = useMemo(() => {
    if (!jobs) return [];
    const q = query.toLowerCase().split(/\s+/).filter(Boolean);
    return jobs.filter((j) => {
      if (assignee === "none" ? j.assignee : assignee !== "all" && String(j.assignee?.id) !== assignee) return false;
      if (priority !== "all" && j.priority !== priority) return false;
      if (!q.length) return true;
      const hay = [j.code, j.title, j.client, j.service, `${j.source}>${j.target}`, j.assignee?.name].join(" ").toLowerCase();
      return q.every((t) => hay.includes(t));
    });
  }, [jobs, query, assignee, priority]);

  if (!jobs) return <div className="page-scroll"><Spinner label="Loading jobs…" /></div>;

  const now = Date.now();
  const open = jobs.filter((j) => OPEN.has(j.status));
  const kpis = [
    ["blue", "briefcase", "Open jobs", open.length],
    ["amber", "user-plus", "Unassigned", jobs.filter((j) => j.status === "unassigned").length, () => setAssignee("none")],
    ["amber", "clock", "Due in 24h", open.filter((j) => j.deadline > now && j.deadline - now < 24 * HOUR).length],
    ["red", "alert", "Overdue", open.filter((j) => j.deadline < now).length],
    ["violet", "check-circle", "Finished · needs review", jobs.filter((j) => j.status === "delivered").length, () => {
      const next = jobs.filter((j) => j.status === "delivered").sort((a, b) => a.deliveredAt - b.deliveredAt)[0];
      if (next) openJob(next.id); else toast("Nothing waiting for review", "neutral");
    }],
  ];

  const filtersOn = assignee !== "all" || priority !== "all" || query;

  /* ---------- drag to assign ---------- */
  const canDrop = (target, job) => {
    if (!job) return false;
    if (target.member) return OPEN.has(job.status) && job.assignee?.id !== target.member;
    if (target.col === "unassigned") return ["assigned", "in_progress"].includes(job.status);
    if (target.col === "completed") return job.status === "delivered";
    return false;
  };
  const dropProps = (target) => ({
    onDragOver: (e) => {
      const job = jobs.find((j) => j.id === dragging.current);
      if (canDrop(target, job)) { e.preventDefault(); e.currentTarget.classList.add("drop-ok"); }
    },
    onDragLeave: (e) => e.currentTarget.classList.remove("drop-ok"),
    onDrop: async (e) => {
      e.currentTarget.classList.remove("drop-ok");
      const job = jobs.find((j) => j.id === dragging.current);
      if (!canDrop(target, job)) return;
      e.preventDefault();
      try {
        if (target.member) {
          await api.post(`/jobs/${job.id}/assign`, { assigneeId: target.member });
          toast(`${job.code} assigned to ${users.find((u) => u.id === target.member).name}`, "approve");
        } else if (target.col === "unassigned") {
          await api.post(`/jobs/${job.id}/assign`, { assigneeId: null });
          toast(`${job.code} unassigned`, "neutral");
        } else {
          await api.post(`/jobs/${job.id}/approve`);
          toast(`${job.code} approved`, "approve");
        }
        load();
      } catch (err) {
        toast(err.message, "reject");
      }
    },
  });

  const card = (j) => (
    <article key={j.id} className={`jcard ${openId === j.id ? "active" : ""} ${flash === j.id ? "flash" : ""}`} tabIndex={0}
      draggable={j.status !== "completed"}
      onDragStart={(e) => { dragging.current = j.id; e.currentTarget.classList.add("dragging"); e.dataTransfer.effectAllowed = "move"; e.dataTransfer.setData("text/plain", String(j.id)); }}
      onDragEnd={(e) => { dragging.current = null; e.currentTarget.classList.remove("dragging"); }}
      onClick={() => openJob(j.id)} onKeyDown={(e) => { if (e.key === "Enter") openJob(j.id); }}>
      <div className="jcard-top"><span className="jid">{j.code}</span><PrioBadge priority={j.priority} /><Due job={j} /></div>
      <h4>{j.title}</h4>
      <div className="jclient"><Icon name="building" />{j.client}</div>
      <div className="jmeta"><PairTag job={j} /><span className="tag">{fmtNum(j.words)} w</span>{j.files.length > 0 && <span className="att"><Icon name="paperclip" />{j.files.length}</span>}</div>
      {["in_progress", "revision"].includes(j.status) && <ProgressBar job={j} />}
      <div className="jfoot">
        <WhoChip person={j.assignee} />
        {j.status === "unassigned" && <button className="btn sm primary" type="button"><Icon name="user-plus" />Assign</button>}
        {j.status === "delivered" && <button className="btn sm" type="button" style={{ color: "var(--violet)" }}><Icon name="eye" />Review</button>}
      </div>
    </article>
  );

  const sortVal = { deadline: (j) => j.deadline, title: (j) => j.title.toLowerCase(), client: (j) => j.client.toLowerCase(), words: (j) => j.words, value: (j) => j.words * j.rate, assignee: (j) => j.assignee?.name || "~", status: (j) => Object.keys({ unassigned: 0, assigned: 1, in_progress: 2, revision: 3, delivered: 4, completed: 5 }).indexOf(j.status) }[sort.key];
  const th = (k, label, cls = "") => (
    <th className={cls}><button type="button" onClick={() => setSort((s) => ({ key: k, dir: s.key === k ? -s.dir : 1 }))}>
      {label}{sort.key === k && <Icon name={sort.dir > 0 ? "chevron-down" : "chevron-up"} />}</button></th>
  );

  return (
    <div className="page-scroll">
      <section className="page-head">
        <div><h1>Jobs</h1><p>Create and upload jobs, assign them to your team and review finished work.</p></div>
        <div className="head-actions">
          <button className="btn" type="button" onClick={() => setImportOpen(true)}><Icon name="upload" />Import CSV</button>
          <button className="btn primary" type="button" onClick={() => setNewOpen(true)}><Icon name="plus" />New job<kbd>N</kbd></button>
        </div>
      </section>

      <section className="job-kpis">
        {kpis.map(([cls, icon, label, value, onClick]) => {
          const Tag = onClick ? "button" : "div";
          return (
            <Tag key={label} className="kpi" type={onClick ? "button" : undefined} onClick={onClick}>
              <span className={`kpi-ico ${cls}`}><Icon name={icon} /></span><div><span>{label}</span><strong>{value}</strong></div>
            </Tag>
          );
        })}
      </section>

      <section className="toolbar jobs-toolbar">
        <div className="tabs" role="tablist">
          <button className="tab" role="tab" type="button" aria-selected={view === "board"} onClick={() => setView("board")}><Icon name="columns" />Board</button>
          <button className="tab" role="tab" type="button" aria-selected={view === "list"} onClick={() => setView("list")}><Icon name="list" />List</button>
        </div>
        <label className="search toolbar-search">
          <Icon name="search" />
          <input id="jobSearch" type="search" placeholder="Search jobs, clients, IDs…" value={query} onChange={(e) => setQuery(e.target.value)} autoComplete="off" />
          <kbd>/</kbd>
        </label>
        <label className="select"><Icon name="users" />
          <select aria-label="Filter by assignee" value={assignee} onChange={(e) => setAssignee(e.target.value)}>
            <option value="all">Everyone</option>
            <option value="none">Unassigned</option>
            {employees.map((u) => <option key={u.id} value={String(u.id)}>{u.name}</option>)}
          </select>
        </label>
        <label className="select"><Icon name="flag" />
          <select aria-label="Filter by priority" value={priority} onChange={(e) => setPriority(e.target.value)}>
            <option value="all">Any priority</option><option value="urgent">Urgent</option><option value="high">High</option><option value="normal">Normal</option><option value="low">Low</option>
          </select>
        </label>
        {filtersOn && <button className="link-btn" type="button" onClick={() => { setAssignee("all"); setPriority("all"); setQuery(""); }}>Clear</button>}
      </section>

      <section className="jobs-layout">
        <div className="jobs-main">
          {view === "board" ? (
            <div className="board">
              {COLUMNS.map((c) => {
                const list = filtered.filter((j) => c.statuses.includes(j.status)).sort((a, b) =>
                  c.id === "completed" ? (b.deliveredAt || 0) - (a.deliveredAt || 0) : c.id === "delivered" ? a.deliveredAt - b.deliveredAt : a.deadline - b.deadline);
                return (
                  <section key={c.id} className="column" aria-label={c.label} {...dropProps({ col: c.id })}>
                    <header className="col-head"><span className={`dot ${c.dot}`} />{c.label}<span className="n">{list.length}</span></header>
                    <div className="col-body">{list.length ? list.map(card) : <div className="col-empty">{c.empty}</div>}</div>
                  </section>
                );
              })}
            </div>
          ) : filtered.length ? (
            <div className="table-wrap">
              <table className="jobs">
                <thead><tr>{th("title", "Job")}{th("client", "Client")}<th>Pair</th>{th("words", "Words", "num")}{th("value", "Value", "num")}{th("deadline", "Deadline")}{th("assignee", "Assignee")}{th("status", "Status")}<th>Progress</th></tr></thead>
                <tbody>
                  {[...filtered].sort((a, b) => (sortVal(a) > sortVal(b) ? 1 : sortVal(a) < sortVal(b) ? -1 : 0) * sort.dir).map((j) => (
                    <tr key={j.id} className={openId === j.id ? "active" : ""} onClick={() => openJob(j.id)}>
                      <td className="t-title"><strong>{j.title}</strong><span>{j.code} · {j.service} <PrioBadge priority={j.priority} /></span></td>
                      <td>{j.client}</td>
                      <td><PairTag job={j} /></td>
                      <td className="num">{fmtNum(j.words)}</td>
                      <td className="num">{money(j.words * j.rate)}</td>
                      <td><Due job={j} /></td>
                      <td><WhoChip person={j.assignee} /></td>
                      <td><StatusPill status={j.status} /></td>
                      <td>{j.status !== "unassigned" && <ProgressBar job={j} />}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : <div className="table-wrap"><Empty icon="filter" title="No jobs match">Try clearing the filters.</Empty></div>}
        </div>

        <aside className="team-rail" aria-label="Team workload">
          <h3>Team workload</h3>
          <p>Drag a job card onto someone to assign it.</p>
          <div className="team-list">
            {employees.filter((u) => u.active).map((u) => {
              const days = u.queuedWords / u.capacity;
              const cls = days > 4 ? "hi" : days > 2 ? "mid" : "";
              return (
                <button key={u.id} type="button" className={`member ${assignee === String(u.id) ? "active" : ""}`} title={`Show ${u.name}'s jobs`}
                  onClick={() => setAssignee((a) => (a === String(u.id) ? "all" : String(u.id)))} {...dropProps({ member: u.id })}>
                  <Avatar name={u.name} size="sm" />
                  <div>
                    <strong>{u.name}<small>{plural(u.openJobs, "job")}</small></strong>
                    <div className="load"><i className={cls} style={{ width: `${Math.max(3, Math.min(100, (days / 5) * 100))}%` }} /></div>
                    <div className="sub">{u.pairs.join(" · ") || "No language pairs"} · ~{days.toFixed(1)}d queued</div>
                  </div>
                </button>
              );
            })}
            {!employees.length && <p className="muted small">No employees yet — add them on the Team page.</p>}
          </div>
        </aside>
      </section>

      {openId && <JobDrawer jobId={openId} users={users} onClose={() => openJob(null)} onChanged={load} />}
      <NewJobModal open={newOpen} onClose={() => setNewOpen(false)} users={users} clients={[...new Set(jobs.map((j) => j.client))].sort()}
        onCreated={(job) => {
          load();
          setFlash(job.id);
          setTimeout(() => setFlash(null), 1700);
          toast(job.assignee ? `${job.code} created and sent to ${job.assignee.name}` : `${job.code} created`, "approve", { label: "Open", fn: () => openJob(job.id) });
        }} />
      <ImportCsvModal open={importOpen} onClose={() => setImportOpen(false)} users={users} onImported={load} />
    </div>
  );
}
