(() => {
  "use strict";

  const { icon, esc, $, $$, ago, fmtDate, fmtDateTime, fmtSize, fmtNum, money, plural, avatar, toast, openModal, closeModal } = UI;
  const S = JobStore;
  const A = S.actions;
  const HOUR = S.HOUR;

  const COLUMNS = [
    { id: "unassigned", label: "Unassigned", statuses: ["unassigned"], dot: "s-unassigned", empty: "Every job has an owner" },
    { id: "assigned", label: "Awaiting acceptance", statuses: ["assigned"], dot: "s-assigned", empty: "Nothing waiting on the team" },
    { id: "in_progress", label: "In progress", statuses: ["in_progress", "revision"], dot: "s-in_progress", empty: "No work in progress" },
    { id: "delivered", label: "Finished · review", statuses: ["delivered"], dot: "s-delivered", empty: "Finished jobs land here" },
    { id: "completed", label: "Completed", statuses: ["completed"], dot: "s-completed", empty: "No completed jobs yet" },
  ];
  const DEFAULT_RATES = { Translation: 0.11, "Translation + Review": 0.14, Proofreading: 0.05, Localization: 0.12, Transcription: 0.04, Subtitling: 0.09 };
  const NOTIF_ICON = { delivered: "check-circle", accepted: "play", declined: "x-circle", overdue: "alert", assigned: "user-plus", revision: "refresh", approved: "check", files: "paperclip", unassigned: "x" };

  const VIEW_KEY = "lingua:jobs:view";
  const view = {
    mode: (() => { try { return localStorage.getItem(VIEW_KEY) || "board"; } catch { return "board"; } })(),
    query: "",
    assignee: "all",
    priority: "all",
    openJob: null,
    picking: false,
    showAllPicks: false,
    sort: { key: "deadline", dir: 1 },
    notifTab: "all",
    panelOpen: false,
  };

  const el = {
    app: $(".app"),
    main: $("#jobsMain"),
    kpis: $("#kpis"),
    team: $("#team"),
    tabs: $("#viewTabs"),
    assignee: $("#assigneeFilter"),
    priority: $("#priorityFilter"),
    clear: $("#clearFilters"),
    search: $("#searchInput"),
    sim: $("#simToggle"),
    bellWrap: $(".bell-wrap"),
    bell: $("#bellBtn"),
    bellCount: $("#bellCount"),
    panel: $("#notifPanel"),
    drawer: $("#drawer"),
    drawerScrim: $("#drawerScrim"),
    navBadge: $("#navBadge"),
    jobModal: $("#jobModal"),
    jobForm: $("#jobForm"),
    importModal: $("#importModal"),
    promptModal: $("#promptModal"),
    promptForm: $("#promptForm"),
  };

  // One file input for drawer uploads, kept outside the drawer so live re-renders can't orphan it.
  const drawerInput = Object.assign(document.createElement("input"), { type: "file", multiple: true, hidden: true });
  document.body.appendChild(drawerInput);

  /* ------------------------------------------------------------------------
     Helpers
     ------------------------------------------------------------------------ */
  const pairLabel = (j) => `${j.source} → ${j.target}`;
  const pairTag = (j) => `<span class="tag pair">${j.source} <i>→</i> ${j.target}</span>`;
  const isOpen = (j) => S.OPEN.has(j.status);
  const statusPill = (j) => `<span class="pill s-${j.status}">${S.STATUS_LABEL[j.status]}</span>`;
  const prioBadge = (p, always = false) =>
    p === "urgent" ? `<span class="prio urgent">${icon("zap")}Urgent</span>` :
    p === "high" ? `<span class="prio high">${icon("flag")}High</span>` :
    always ? `<span class="prio ${p}">${p}</span>` : "";
  const extOf = (name) => (name.split(".").pop() || "").toLowerCase().slice(0, 4);
  const slug = (s) => s.replace(/[^\w]+/g, "_").replace(/^_|_$/g, "");

  function short(ms) {
    const m = Math.round(Math.abs(ms) / 6e4);
    if (m < 60) return `${m}m`;
    if (m < 1440) return `${Math.round(m / 60)}h`;
    return `${Math.round(m / 1440)}d`;
  }
  function due(j) {
    if (j.status === "completed") return `<span class="due">${icon("check")}Done ${fmtDate(j.deliveredAt || j.updatedAt)}</span>`;
    if (j.status === "delivered") return `<span class="due">${icon("check")}Finished ${ago(j.deliveredAt)}</span>`;
    const diff = j.deadline - Date.now();
    if (diff < 0) return `<span class="due late" title="${fmtDateTime(j.deadline)}">${icon("alert")}${short(diff)} late</span>`;
    if (diff < 24 * HOUR) return `<span class="due soon" title="${fmtDateTime(j.deadline)}">${icon("clock")}Due in ${short(diff)}</span>`;
    return `<span class="due" title="${fmtDateTime(j.deadline)}">${icon("calendar")}${fmtDate(j.deadline)}</span>`;
  }
  function progressBar(j) {
    const cls = j.status === "revision" ? "revision" : j.progress >= 100 ? "done" : "";
    return `<div class="progress"><div class="bar ${cls}"><i style="width:${j.progress}%"></i></div><span>${j.status === "revision" ? "Revision · " : ""}${j.progress}%</span></div>`;
  }
  function whoChip(j) {
    const e = j.assigneeId && S.emp(j.assigneeId);
    return e ? `<span class="who-chip">${avatar(e)}<span>${esc(e.name)}</span></span>` : `<span class="who-chip none">${icon("user-plus")}<span>Unassigned</span></span>`;
  }

  function filteredJobs() {
    const q = view.query.toLowerCase();
    return S.state.jobs.filter((j) => {
      if (view.assignee === "none" ? j.assigneeId : view.assignee !== "all" && j.assigneeId !== view.assignee) return false;
      if (view.priority !== "all" && j.priority !== view.priority) return false;
      if (!q) return true;
      const e = j.assigneeId ? S.emp(j.assigneeId) : null;
      const hay = [j.id, j.title, j.client, j.service, S.pair(j), S.LANGS[j.source], S.LANGS[j.target], e && e.name].join(" ").toLowerCase();
      return q.split(/\s+/).every((t) => hay.includes(t));
    });
  }

  /* ------------------------------------------------------------------------
     Render
     ------------------------------------------------------------------------ */
  function render() {
    renderKpis();
    renderFilters();
    view.mode === "list" ? renderList() : renderBoard();
    renderTeam();
    renderBell();
    if (view.panelOpen) renderPanel();
    renderDrawer();
    el.sim.checked = !!S.state.settings.simulate;
    el.navBadge.textContent = S.state.jobs.filter((j) => j.status === "delivered").length || S.state.jobs.filter(isOpen).length;
  }

  function renderKpis() {
    const jobs = S.state.jobs;
    const now = Date.now();
    const open = jobs.filter(isOpen);
    const unassigned = jobs.filter((j) => j.status === "unassigned").length;
    const soon = open.filter((j) => j.deadline > now && j.deadline - now < 24 * HOUR).length;
    const late = open.filter((j) => j.deadline < now).length;
    const review = jobs.filter((j) => j.status === "delivered").length;
    const k = (cls, ic, label, value, attrs = "") =>
      `<${attrs ? "button type=\"button\"" : "div"} class="kpi" ${attrs}><span class="kpi-ico ${cls}">${icon(ic)}</span><div><span>${label}</span><strong>${value}</strong></div></${attrs ? "button" : "div"}>`;
    el.kpis.innerHTML =
      k("blue", "briefcase", "Open jobs", open.length) +
      k("amber", "user-plus", "Unassigned", unassigned, `data-kpi="unassigned"`) +
      k("amber", "clock", "Due in 24h", soon) +
      k("red", "alert", "Overdue", late) +
      k("violet", "check-circle", "Finished · needs review", review, `data-kpi="review"`);
  }

  function renderFilters() {
    const cur = view.assignee;
    el.assignee.innerHTML =
      `<option value="all">Everyone</option><option value="none">Unassigned</option>` +
      S.state.employees.map((e) => `<option value="${e.id}">${esc(e.name)}</option>`).join("");
    el.assignee.value = cur;
    el.priority.value = view.priority;
    el.clear.hidden = view.assignee === "all" && view.priority === "all" && !view.query;
    $$("[data-view]", el.tabs).forEach((b) => b.setAttribute("aria-selected", b.dataset.view === view.mode));
  }

  function card(j) {
    const files = j.files.length;
    const draggable = j.status !== "completed";
    return `<article class="jcard ${view.openJob === j.id ? "active" : ""}" data-job="${j.id}" tabindex="0" ${draggable ? 'draggable="true"' : ""} aria-label="${esc(j.title)}">
      <div class="jcard-top"><span class="jid">${j.id}</span>${prioBadge(j.priority)}${due(j)}</div>
      <h4>${esc(j.title)}</h4>
      <div class="jclient">${icon("building")}${esc(j.client)}</div>
      <div class="jmeta">${pairTag(j)}<span class="tag">${fmtNum(j.words)} w</span>${files ? `<span class="att">${icon("paperclip")}${files}</span>` : ""}</div>
      ${["in_progress", "revision"].includes(j.status) ? progressBar(j) : ""}
      <div class="jfoot">${whoChip(j)}
        ${j.status === "unassigned" ? `<button class="btn sm primary" type="button" data-quick="assign">${icon("user-plus")}Assign</button>` : ""}
        ${j.status === "delivered" ? `<button class="btn sm" type="button" data-quick="review" style="color:var(--violet)">${icon("eye")}Review</button>` : ""}
      </div>
    </article>`;
  }

  function renderBoard() {
    const jobs = filteredJobs();
    el.main.innerHTML = `<div class="board">${COLUMNS.map((c) => {
      const list = jobs.filter((j) => c.statuses.includes(j.status)).sort((a, b) =>
        c.id === "completed" ? (b.deliveredAt || 0) - (a.deliveredAt || 0) :
        c.id === "delivered" ? (a.deliveredAt || 0) - (b.deliveredAt || 0) : a.deadline - b.deadline);
      return `<section class="column" data-col="${c.id}" aria-label="${c.label}">
        <header class="col-head"><span class="dot ${c.dot}"></span>${c.label}<span class="n">${list.length}</span></header>
        <div class="col-body">${list.length ? list.map(card).join("") : `<div class="col-empty">${c.empty}</div>`}</div>
      </section>`;
    }).join("")}</div>`;
  }

  function renderList() {
    const jobs = filteredJobs();
    const { key, dir } = view.sort;
    const val = {
      deadline: (j) => j.deadline,
      title: (j) => j.title.toLowerCase(),
      client: (j) => j.client.toLowerCase(),
      words: (j) => j.words,
      assignee: (j) => (j.assigneeId ? S.emp(j.assigneeId).name : "~"),
      status: (j) => S.STATUSES.findIndex((s) => s.id === j.status),
      value: (j) => j.words * j.rate,
    }[key];
    jobs.sort((a, b) => (val(a) > val(b) ? 1 : val(a) < val(b) ? -1 : 0) * dir);
    const th = (k, label, cls = "") => `<th class="${cls}"><button type="button" data-sort="${k}">${label}${view.sort.key === k ? icon(dir > 0 ? "chevron-down" : "chevron-up") : ""}</button></th>`;
    if (!jobs.length) {
      el.main.innerHTML = `<div class="table-wrap"><div class="empty"><div class="empty-ico">${icon("filter", "lg")}</div><strong>No jobs match</strong><span>Try clearing the filters.</span></div></div>`;
      return;
    }
    el.main.innerHTML = `<div class="table-wrap"><table class="jobs">
      <thead><tr>${th("title", "Job")}${th("client", "Client")}<th>Pair</th>${th("words", "Words", "num")}${th("value", "Value", "num")}${th("deadline", "Deadline")}${th("assignee", "Assignee")}${th("status", "Status")}<th>Progress</th></tr></thead>
      <tbody>${jobs.map((j) => `<tr data-job="${j.id}" class="${view.openJob === j.id ? "active" : ""}">
        <td class="t-title"><strong>${esc(j.title)}</strong><span>${j.id} · ${esc(j.service)} ${prioBadge(j.priority)}</span></td>
        <td>${esc(j.client)}</td>
        <td>${pairTag(j)}</td>
        <td class="num">${fmtNum(j.words)}</td>
        <td class="num">${money(j.words * j.rate)}</td>
        <td>${due(j)}</td>
        <td>${whoChip(j)}</td>
        <td>${statusPill(j)}</td>
        <td>${j.status === "unassigned" ? "" : progressBar(j)}</td>
      </tr>`).join("")}</tbody>
    </table></div>`;
  }

  function renderTeam() {
    el.team.innerHTML = `
      <h3>Team workload <a class="link-btn" href="employee.html" target="_blank" rel="noopener">Open workspace</a></h3>
      <p>Drag a job card onto someone to assign it.</p>
      <div class="team-list">${S.state.employees.map((e) => {
        const w = S.workload(e.id);
        const days = w.words / e.capacity;
        const pct = Math.min(100, (days / 5) * 100);
        const cls = days > 4 ? "hi" : days > 2 ? "mid" : "";
        return `<button class="member ${view.assignee === e.id ? "active" : ""}" type="button" data-member="${e.id}" title="Show ${esc(e.name)}'s jobs">
          ${avatar(e, "sm")}
          <div>
            <strong>${esc(e.name)}<small>${plural(w.jobs, "job")}</small></strong>
            <div class="load"><i class="${cls}" style="width:${Math.max(pct, 3)}%"></i></div>
            <div class="sub">${esc(e.pairs.join(" · "))} · ~${days.toFixed(1)}d queued</div>
          </div>
        </button>`;
      }).join("")}</div>`;
  }

  /* ---------- Notifications ---------- */
  const adminNotifs = () => S.state.notifications.filter((n) => n.to === "admin");

  function renderBell() {
    const unread = adminNotifs().filter((n) => !n.read).length;
    el.bellCount.hidden = !unread;
    el.bellCount.textContent = unread > 99 ? "99+" : unread;
    el.bell.setAttribute("aria-label", `Notifications${unread ? ` (${unread} unread)` : ""}`);
  }

  function renderPanel() {
    const all = adminNotifs();
    const list = view.notifTab === "unread" ? all.filter((n) => !n.read) : view.notifTab === "finished" ? all.filter((n) => n.type === "delivered") : all;
    const canAsk = "Notification" in window && Notification.permission === "default";
    const granted = "Notification" in window && Notification.permission === "granted";
    el.panel.innerHTML = `
      <div class="np-head"><h3>Notifications</h3><button class="link-btn" type="button" data-np="read-all">Mark all read</button></div>
      <div class="np-tabs" role="tablist">
        ${[["all", "All"], ["unread", "Unread"], ["finished", "Finished jobs"]].map(([id, l]) => `<button type="button" role="tab" data-np-tab="${id}" aria-selected="${view.notifTab === id}">${l}</button>`).join("")}
      </div>
      <div class="np-list">${list.length ? list.slice(0, 50).map((n) => `
        <button class="notif ${n.read ? "" : "unread"}" type="button" data-notif="${n.id}">
          <span class="n-ico ${n.type}">${icon(NOTIF_ICON[n.type] || "bell")}</span>
          <div><strong>${esc(n.title)}</strong><p>${esc(n.body)}</p></div>
          <div><time>${ago(n.at)}</time>${n.read ? "" : `<span class="udot"></span>`}</div>
        </button>`).join("") : `<div class="np-empty">${view.notifTab === "all" ? "No notifications yet." : "You're all caught up."}</div>`}
      </div>
      <div class="np-foot">${icon("bell")}
        ${granted ? "Desktop alerts are on" : canAsk ? `<span>Get alerts when this tab is in the background</span><button class="btn sm" type="button" data-np="desktop" style="margin-left:auto">Enable</button>` : "Desktop alerts unavailable in this browser"}
      </div>`;
  }

  function togglePanel(open = !view.panelOpen) {
    view.panelOpen = open;
    el.panel.hidden = !open;
    el.bell.setAttribute("aria-expanded", open);
    if (open) renderPanel();
  }

  function announce(n) {
    const kind = { delivered: "approve", accepted: "info", declined: "reject", overdue: "reject" }[n.type] || "info";
    const action = S.job(n.jobId) ? { label: n.type === "delivered" ? "Review" : "Open", fn: () => { A.markRead([n.id]); openJob(n.jobId); } } : null;
    toast(n.title, kind, action);
    if (n.type === "delivered" || n.type === "declined") UI.chime();
    UI.desktopNotify(n.title, n.body);
    el.bellWrap.classList.remove("ringing");
    void el.bellWrap.offsetWidth;
    el.bellWrap.classList.add("ringing");
    if (n.type === "delivered") {
      requestAnimationFrame(() => {
        const c = $(`.jcard[data-job="${n.jobId}"]`);
        if (c) { c.classList.add("flash"); setTimeout(() => c.classList.remove("flash"), 1700); }
      });
    }
  }

  /* ---------- Drawer ---------- */
  function openJob(id) {
    view.openJob = id;
    view.picking = false;
    view.showAllPicks = false;
    togglePanel(false);
    render();
  }
  function closeJob() {
    view.openJob = null;
    render();
  }

  function statusCard(j) {
    const e = j.assigneeId && S.emp(j.assigneeId);
    switch (j.status) {
      case "unassigned":
        return `<div class="status-card amber"><div class="sc-row">${icon("user-plus")}<div><b>Not assigned yet</b><p>Pick someone below — people who work in ${esc(pairLabel(j))} are listed first.</p></div></div></div>`;
      case "assigned":
        return `<div class="status-card"><div class="sc-row">${icon("clock")}<div><b>Waiting for ${esc(e.name)} to accept</b><p>Assigned ${ago(lastEvent(j, "Assigned") || j.updatedAt)}. You'll be notified when they accept or decline.</p></div></div></div>`;
      case "in_progress":
      case "revision":
        return `<div class="status-card"><div class="sc-row">${icon(j.status === "revision" ? "refresh" : "play")}<div><b>${esc(e.name)} is ${j.status === "revision" ? "revising" : "working on"} this job</b><p>You'll be notified as soon as it's finished.</p></div></div>${progressBar(j)}</div>`;
      case "delivered": {
        const del = j.files.filter((f) => f.kind === "deliverable");
        return `<div class="status-card violet"><div class="sc-row">${icon("check-circle")}<div><b>Finished by ${esc(e ? e.name : "assignee")} · ${ago(j.deliveredAt)}</b><p>Check the deliverable${del.length > 1 ? "s" : ""}, then approve or send it back for revision.</p></div></div>
          <div class="actions">
            <button class="btn success" type="button" data-act="approve">${icon("check")}Approve &amp; complete</button>
            <button class="btn" type="button" data-act="revision">${icon("refresh")}Request revision</button>
            ${del.length ? `<button class="btn ghost" type="button" data-dl="${del[del.length - 1].id}">${icon("download")}Download</button>` : ""}
          </div></div>`;
      }
      case "completed":
        return `<div class="status-card green"><div class="sc-row">${icon("check")}<div><b>Completed</b><p>Approved ${ago(lastEvent(j, "Approved") || j.updatedAt)}${e ? ` · delivered by ${esc(e.name)}` : ""}.</p></div></div></div>`;
      default:
        return "";
    }
  }
  function lastEvent(j, prefix) {
    const h = [...j.history].reverse().find((x) => x.text.startsWith(prefix));
    return h && h.at;
  }

  function pickerHtml(j) {
    const ranked = S.suggest(j.source, j.target);
    const shown = view.showAllPicks ? ranked : ranked.slice(0, 4);
    const label = { 2: "Pair match", 1: `Into ${j.target}`, 0: "No match" };
    return `<div class="picker">${shown.map((e) => `
      <button class="pick ${e.id === j.assigneeId ? "current" : ""}" type="button" data-assign="${e.id}">
        ${avatar(e, "sm")}
        <div><strong>${esc(e.name)}</strong><small>${esc(e.role)} · ${esc(e.pairs.join(", "))} · ${plural(e.load, "open job")}</small></div>
        <span class="match m${e.match}">${label[e.match]}</span>
      </button>`).join("")}
      ${ranked.length > 4 ? `<button class="link-btn picker-more" type="button" data-act="more-picks">${view.showAllPicks ? "Show fewer" : `Show all ${ranked.length} people`}</button>` : ""}
    </div>`;
  }

  function fileRow(f) {
    return `<div class="file ${f.kind}">
      <span class="ext ${extOf(f.name)}">${esc(extOf(f.name))}</span>
      <div><strong>${esc(f.name)}</strong><small>${fmtSize(f.size)} · ${esc(f.by)} · ${ago(f.at)}</small></div>
      <button class="icon-btn" type="button" data-dl="${f.id}" aria-label="Download ${esc(f.name)}">${icon("download")}</button>
    </div>`;
  }

  function renderDrawer() {
    const j = view.openJob && S.job(view.openJob);
    if (!j) {
      if (!el.drawer.hidden) { el.drawer.hidden = true; el.drawerScrim.hidden = true; }
      view.openJob = null;
      return;
    }
    const body = $(".dr-body", el.drawer);
    const scroll = body ? body.scrollTop : 0;
    const e = j.assigneeId && S.emp(j.assigneeId);
    const src = j.files.filter((f) => f.kind === "source");
    const del = j.files.filter((f) => f.kind === "deliverable");
    const canReassign = ["unassigned", "assigned", "in_progress", "revision"].includes(j.status);
    const showPicker = j.status === "unassigned" || view.picking;

    el.drawer.innerHTML = `
      <div class="dr-head">
        <div class="dr-top"><span class="d-id">${j.id}</span>${statusPill(j)}${prioBadge(j.priority, true)}
          <button class="icon-btn" type="button" data-act="close" aria-label="Close">${icon("x")}</button></div>
        <h2>${esc(j.title)}</h2>
        <div class="jclient">${icon("building")}${esc(j.client)} · ${esc(j.service)}</div>
      </div>
      <div class="dr-body">
        ${statusCard(j)}
        <section class="section">
          <h3>Details</h3>
          <div class="details">
            <div><span>Language pair</span><strong>${esc(S.LANGS[j.source])} → ${esc(S.LANGS[j.target])}</strong></div>
            <div><span>Deadline</span><strong>${fmtDateTime(j.deadline)}<small>${isOpen(j) ? ago(j.deadline) : ""}</small></strong></div>
            <div><span>Words</span><strong>${fmtNum(j.words)}</strong></div>
            <div><span>Value</span><strong>${money(j.words * j.rate)}<small>@ ${money(j.rate).replace(/0$/, "")}/w</small></strong></div>
          </div>
        </section>
        <section class="section">
          <h3>Assignee ${canReassign && j.status !== "unassigned" ? `<span>${view.picking ? `<button class="link-btn" type="button" data-act="cancel-pick">Cancel</button>` : `<button class="link-btn" type="button" data-act="pick">Reassign</button><button class="link-btn" type="button" data-act="unassign">Unassign</button>`}</span>` : ""}</h3>
          ${showPicker ? pickerHtml(j) : e ? `<div class="pick current" style="cursor:default">${avatar(e, "sm")}<div><strong>${esc(e.name)}</strong><small>${esc(e.role)} · ${esc(e.email)}</small></div><span class="match m2">${esc(e.pairs.includes(S.pair(j)) ? "Pair match" : e.role)}</span></div>` : ""}
        </section>
        ${del.length ? `<section class="section"><h3>Deliverables <small>${del.length}</small></h3><div class="files">${del.map(fileRow).join("")}</div></section>` : ""}
        <section class="section">
          <h3>Source files <small>${src.length}</small></h3>
          <div class="files">${src.map(fileRow).join("")}
            <div class="dropzone compact" data-drop="drawer" tabindex="0" role="button" aria-label="Upload more source files">
              <span class="dz-ico">${icon("upload")}</span><div><strong>Add files</strong> — drop here or <u>browse</u>${j.assigneeId ? `<small>${esc(e.name)} will be notified</small>` : ""}</div>
            </div>
          </div>
        </section>
        ${j.instructions ? `<section class="section"><h3>Instructions</h3><div class="instructions">${esc(j.instructions)}</div></section>` : ""}
        <section class="section">
          <h3>Activity</h3>
          <div class="timeline">${[...j.history].reverse().map((h, i) => `<div class="t-item ${i === 0 ? "current" : ""}"><strong>${esc(h.text)}</strong><span>${esc(h.by)} · ${fmtDateTime(h.at)}</span></div>`).join("")}</div>
        </section>
      </div>
      <div class="dr-foot">
        <button class="btn outline-danger" type="button" data-act="delete">${icon("trash")}Delete</button>
        <span class="spacer"></span>
        <button class="btn" type="button" data-act="close">Close</button>
      </div>`;
    if (el.drawer.hidden) {
      el.drawer.hidden = false;
      el.drawerScrim.hidden = false;
    }
    const nb = $(".dr-body", el.drawer);
    if (nb) nb.scrollTop = scroll;
  }

  async function downloadFile(jobId, fileId) {
    const j = S.job(jobId);
    const f = j && j.files.find((x) => x.id === fileId);
    if (!f) return;
    const blob = await S.getFileBlob(j, f);
    UI.downloadBlob(blob, f.stored ? f.name : f.name.replace(/\.\w+$/, ".txt"));
  }

  /* ------------------------------------------------------------------------
     Prompt modal (revision note, confirmations)
     ------------------------------------------------------------------------ */
  function ask({ title, sub, ico = "help", cls = "info", field, confirm = "Confirm", confirmCls = "primary" }) {
    return new Promise((resolve) => {
      el.promptForm.innerHTML = `
        <div class="modal-head">
          <div class="modal-ico ${cls}">${icon(ico, "lg")}</div>
          <div><h2 id="promptTitle">${esc(title)}</h2>${sub ? `<p>${esc(sub)}</p>` : ""}</div>
          <button class="icon-btn" type="button" data-close aria-label="Close">${icon("x")}</button>
        </div>
        ${field ? `<div class="modal-body"><label class="field"><span>${esc(field.label)}</span><textarea name="answer" placeholder="${esc(field.placeholder || "")}" ${field.required ? "required" : ""}></textarea></label></div>` : `<div style="height:18px"></div>`}
        <div class="modal-foot"><button class="btn ghost" type="button" data-close>Cancel</button><button class="btn ${confirmCls}" type="submit">${esc(confirm)}</button></div>`;
      const done = (v) => {
        el.promptForm.onsubmit = null;
        el.promptModal.onclick = null;
        closeModal(el.promptModal);
        resolve(v);
      };
      el.promptForm.onsubmit = (e) => {
        e.preventDefault();
        const input = el.promptForm.elements.answer;
        const v = field ? input.value.trim() : "";
        if (field && field.required && !v) return input.focus();
        done(v);
      };
      el.promptModal.onclick = (e) => { if (e.target === el.promptModal || e.target.closest("[data-close]")) done(null); };
      el.promptModal._cancel = () => done(null);
      openModal(el.promptModal, field ? "textarea" : "[type=submit]");
    });
  }

  /* ------------------------------------------------------------------------
     New job modal
     ------------------------------------------------------------------------ */
  let pendingFiles = [];
  let rateTouched = false;
  let wordsAuto = true;
  const langOptions = Object.entries(S.LANGS).sort((a, b) => a[1].localeCompare(b[1]))
    .map(([c, n]) => `<option value="${c}">${n} (${c})</option>`).join("");

  function toLocalInput(t) {
    const d = new Date(t);
    const pad = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  function openNewJob() {
    const f = el.jobForm;
    f.reset();
    pendingFiles = [];
    rateTouched = false;
    wordsAuto = true;
    $("#sourceSelect").innerHTML = langOptions;
    $("#targetSelect").innerHTML = langOptions;
    f.source.value = "EN";
    f.target.value = "DE";
    $("#serviceSelect").innerHTML = S.SERVICES.map((s) => `<option>${s}</option>`).join("");
    f.rate.value = DEFAULT_RATES.Translation;
    const d = new Date(Date.now() + 3 * 24 * HOUR);
    d.setHours(17, 0, 0, 0);
    f.deadline.value = toLocalInput(d);
    $("#clientList").innerHTML = [...new Set(S.state.jobs.map((j) => j.client))].sort().map((c) => `<option value="${esc(c)}">`).join("");
    $("#jobError").hidden = true;
    $$(".field.invalid", f).forEach((x) => x.classList.remove("invalid"));
    renderPendingFiles();
    renderAssignGrid();
    updateValue();
    openModal(el.jobModal, "input[name=title]");
  }

  function renderPendingFiles() {
    $("#jobFileList").innerHTML = pendingFiles.map((f, i) => `<li class="file">
      <span class="ext ${extOf(f.name)}">${esc(extOf(f.name))}</span>
      <div><strong>${esc(f.name)}</strong><small>${fmtSize(f.size)}</small></div>
      <button class="icon-btn" type="button" data-remove-file="${i}" aria-label="Remove ${esc(f.name)}">${icon("x")}</button>
    </li>`).join("");
  }

  function renderAssignGrid() {
    const f = el.jobForm;
    const cur = (f.querySelector("input[name=assigneeId]:checked") || {}).value || "";
    const ranked = S.suggest(f.source.value, f.target.value);
    const label = { 2: "Match", 1: `→ ${f.target.value}`, 0: "" };
    $("#assignGrid").innerHTML =
      `<label class="assign-opt"><input type="radio" name="assigneeId" value="" ${cur === "" ? "checked" : ""}><span class="none-ico">${icon("user-plus")}</span><div><strong>Leave unassigned</strong><small>Assign later from the board</small></div></label>` +
      ranked.map((e) => `<label class="assign-opt"><input type="radio" name="assigneeId" value="${e.id}" ${cur === e.id ? "checked" : ""}>
        ${avatar(e)}<div><strong>${esc(e.name)}</strong><small>${esc(e.pairs.join(", "))} · ${plural(e.load, "job")}</small></div>
        ${e.match ? `<span class="match m${e.match}">${label[e.match]}</span>` : "<span></span>"}</label>`).join("");
  }

  function updateValue() {
    const f = el.jobForm;
    const v = (Number(f.words.value) || 0) * (Number(f.rate.value) || 0);
    $("#jobValue").innerHTML = v ? `Job value <b>${money(v)}</b>` : "";
  }

  async function addPendingFiles(list) {
    const files = [...list].filter((f) => f.size <= 25 * 1024 * 1024);
    if (files.length < list.length) toast("Some files were over 25 MB and were skipped", "reject");
    pendingFiles.push(...files);
    renderPendingFiles();
    const f = el.jobForm;
    if (!f.title.value && files[0]) f.title.value = files[0].name.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ");
    // Count words in plain-text files to pre-fill the word count.
    const textual = pendingFiles.filter((x) => /^text\//.test(x.type) || /\.(txt|md|csv|srt|vtt|html?)$/i.test(x.name));
    if (textual.length && (wordsAuto || !f.words.value)) {
      let total = 0;
      for (const t of textual) {
        try { total += (await t.text()).split(/\s+/).filter(Boolean).length; } catch { /* unreadable */ }
      }
      if (total) {
        f.words.value = total;
        wordsAuto = true;
        updateValue();
      }
    }
  }

  function bindDropzone(zone, input, onFiles) {
    zone.addEventListener("click", () => input.click());
    zone.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); input.click(); } });
    zone.addEventListener("dragover", (e) => { e.preventDefault(); zone.classList.add("over"); });
    zone.addEventListener("dragleave", () => zone.classList.remove("over"));
    zone.addEventListener("drop", (e) => {
      e.preventDefault();
      zone.classList.remove("over");
      if (e.dataTransfer.files.length) onFiles(e.dataTransfer.files);
    });
    input.addEventListener("change", () => { if (input.files.length) onFiles(input.files); input.value = ""; });
  }

  bindDropzone($("#jobDrop"), $("#jobFiles"), addPendingFiles);

  el.jobForm.addEventListener("click", (e) => {
    const rm = e.target.closest("[data-remove-file]");
    if (rm) { pendingFiles.splice(Number(rm.dataset.removeFile), 1); renderPendingFiles(); }
  });
  el.jobForm.addEventListener("change", (e) => {
    const f = el.jobForm;
    if (e.target === f.source || e.target === f.target) renderAssignGrid();
    if (e.target === f.service && !rateTouched) { f.rate.value = DEFAULT_RATES[f.service.value]; updateValue(); }
  });
  el.jobForm.addEventListener("input", (e) => {
    const f = el.jobForm;
    if (e.target === f.rate) rateTouched = true;
    if (e.target === f.words) wordsAuto = false;
    if (e.target === f.rate || e.target === f.words) updateValue();
    const field = e.target.closest(".field");
    if (field) field.classList.remove("invalid");
  });

  el.jobForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const f = el.jobForm;
    const errors = [];
    const mark = (name, msg) => { f[name].closest(".field").classList.add("invalid"); errors.push(msg); };
    if (!f.title.value.trim()) mark("title", "Add a job title");
    if (!f.client.value.trim()) mark("client", "Add the client");
    if (f.source.value === f.target.value) mark("target", "Source and target languages must differ");
    if (!(Number(f.words.value) > 0)) mark("words", "Enter the word count");
    const deadline = new Date(f.deadline.value).getTime();
    if (!deadline) mark("deadline", "Pick a deadline");
    else if (deadline < Date.now()) mark("deadline", "The deadline is in the past");
    const err = $("#jobError");
    if (errors.length) {
      err.textContent = errors.join(" · ");
      err.hidden = false;
      return;
    }
    const submit = f.querySelector("[type=submit]");
    submit.disabled = true;
    try {
      const metas = await S.storeFiles(pendingFiles);
      const fd = new FormData(f);
      const job = A.createJob({
        title: fd.get("title"), client: fd.get("client"), source: fd.get("source"), target: fd.get("target"),
        service: fd.get("service"), words: fd.get("words"), rate: fd.get("rate"), priority: fd.get("priority"),
        deadline, instructions: fd.get("instructions"), assigneeId: fd.get("assigneeId") || null,
      }, metas);
      closeModal(el.jobModal);
      const who = job.assigneeId && S.emp(job.assigneeId);
      toast(who ? `${job.id} created and sent to ${who.name}` : `${job.id} created`, "approve", { label: "Open", fn: () => openJob(job.id) });
      flashCard(job.id);
    } finally {
      submit.disabled = false;
    }
  });

  function flashCard(id) {
    requestAnimationFrame(() => {
      const c = $(`[data-job="${id}"]`, el.main);
      if (c) { c.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "smooth" }); c.classList.add("flash"); setTimeout(() => c.classList.remove("flash"), 1700); }
    });
  }

  /* ------------------------------------------------------------------------
     CSV import
     ------------------------------------------------------------------------ */
  let csvRows = [];

  function parseCsv(text) {
    const rows = [];
    let row = [], cell = "", q = false;
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (q) {
        if (c === '"' && text[i + 1] === '"') { cell += '"'; i++; }
        else if (c === '"') q = false;
        else cell += c;
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

  function langCode(v) {
    const s = String(v || "").trim();
    if (!s) return null;
    const up = s.toUpperCase();
    if (S.LANGS[up]) return up;
    const hit = Object.entries(S.LANGS).find(([, n]) => n.toLowerCase() === s.toLowerCase());
    return hit ? hit[0] : null;
  }

  function validateRows(rows) {
    const [head, ...data] = rows;
    const idx = Object.fromEntries(head.map((h, i) => [h.trim().toLowerCase(), i]));
    const get = (r, k) => (idx[k] !== undefined ? String(r[idx[k]] ?? "").trim() : "");
    return data.map((r, n) => {
      const errs = [];
      const title = get(r, "title");
      const client = get(r, "client");
      const source = langCode(get(r, "source"));
      const target = langCode(get(r, "target"));
      const words = Number(get(r, "words").replace(/[^\d.]/g, ""));
      const dl = get(r, "deadline");
      const deadline = dl ? new Date(dl.includes("T") || dl.includes(" ") ? dl.replace(" ", "T") : `${dl}T17:00`).getTime() : NaN;
      const service = S.SERVICES.find((s) => s.toLowerCase() === get(r, "service").toLowerCase()) || "Translation";
      const priority = ["low", "normal", "high", "urgent"].includes(get(r, "priority").toLowerCase()) ? get(r, "priority").toLowerCase() : "normal";
      const who = get(r, "assignee").toLowerCase();
      const assignee = who ? S.state.employees.find((e) => e.email.toLowerCase() === who || e.name.toLowerCase() === who) : null;
      if (!title) errs.push("missing title");
      if (!client) errs.push("missing client");
      if (!source || !target) errs.push("unknown language");
      else if (source === target) errs.push("same languages");
      if (!(words > 0)) errs.push("invalid words");
      if (!deadline) errs.push("invalid deadline");
      const warn = who && !assignee ? `“${get(r, "assignee")}” not found — will be unassigned` : "";
      return { n: n + 2, title, client, source, target, words, deadline, service, priority, assignee, errs, warn };
    });
  }

  function renderCsvPreview() {
    const ok = csvRows.filter((r) => !r.errs.length);
    const bad = csvRows.length - ok.length;
    $("#csvPreview").innerHTML = csvRows.length ? `
      <p class="csv-summary"><b>${ok.length}</b> ready to import${bad ? ` · <span style="color:var(--red)">${bad} with errors (skipped)</span>` : ""}</p>
      <div class="csv-scroll"><table class="csv-table">
        <thead><tr><th>Row</th><th>Title</th><th>Client</th><th>Pair</th><th>Words</th><th>Deadline</th><th>Assignee</th><th>Check</th></tr></thead>
        <tbody>${csvRows.map((r) => `<tr class="${r.errs.length ? "bad" : ""}">
          <td>${r.n}</td><td>${esc(r.title)}</td><td>${esc(r.client)}</td><td>${r.source || "?"} → ${r.target || "?"}</td>
          <td>${r.words ? fmtNum(r.words) : "?"}</td><td>${r.deadline ? fmtDateTime(r.deadline) : "?"}</td>
          <td>${r.assignee ? esc(r.assignee.name) : "—"}</td>
          <td>${r.errs.length ? esc(r.errs.join(", ")) : r.warn ? `<span style="color:var(--amber)">${esc(r.warn)}</span>` : `<span style="color:var(--green)">OK</span>`}</td>
        </tr>`).join("")}</tbody>
      </table></div>` : "";
    const btn = $("#csvImport");
    btn.disabled = !ok.length;
    btn.textContent = ok.length ? `Import ${plural(ok.length, "job")}` : "Import";
  }

  async function loadCsv(files) {
    const file = files[0];
    if (!file) return;
    try {
      const rows = parseCsv(await file.text());
      if (rows.length < 2) throw new Error("empty");
      csvRows = validateRows(rows);
    } catch {
      csvRows = [];
      toast("Couldn't read that CSV — check it has a header row", "reject");
    }
    renderCsvPreview();
  }

  bindDropzone($("#csvDrop"), $("#csvFile"), loadCsv);

  $("#csvTemplate").addEventListener("click", () => {
    const d = (h) => toLocalInput(Date.now() + h * HOUR).replace("T", " ");
    const csv = [
      "title,client,source,target,service,words,deadline,priority,assignee",
      `Website homepage,Atlas Retail,EN,FR,Translation,1200,${d(48)},normal,samuel@linguaops.eu`,
      `"User manual, chapter 4",Nordic Energy AS,NO,EN,Translation + Review,3400,${d(96)},high,Ingrid Solberg`,
      `Press release,Fjord Capital,EN,DE,Proofreading,600,${d(24)},urgent,`,
    ].join("\n");
    UI.downloadBlob(new Blob([csv], { type: "text/csv" }), "jobs-import-template.csv");
  });

  $("#csvImport").addEventListener("click", () => {
    const ok = csvRows.filter((r) => !r.errs.length);
    let assigned = 0;
    for (const r of ok) {
      A.createJob({
        title: r.title, client: r.client, source: r.source, target: r.target, service: r.service,
        words: r.words, rate: DEFAULT_RATES[r.service], priority: r.priority, deadline: r.deadline,
        assigneeId: r.assignee ? r.assignee.id : null,
      });
      if (r.assignee) assigned++;
    }
    closeModal(el.importModal);
    toast(`Imported ${plural(ok.length, "job")}${assigned ? ` · ${assigned} assigned` : ""}`, "approve");
  });

  /* ------------------------------------------------------------------------
     Events
     ------------------------------------------------------------------------ */
  $("#newJobBtn").addEventListener("click", openNewJob);
  $("#importBtn").addEventListener("click", () => {
    csvRows = [];
    renderCsvPreview();
    openModal(el.importModal, "#csvDrop");
  });
  for (const m of [el.jobModal, el.importModal]) {
    m.addEventListener("click", (e) => { if (e.target === m || e.target.closest("[data-close]")) closeModal(m); });
  }

  el.tabs.addEventListener("click", (e) => {
    const b = e.target.closest("[data-view]");
    if (!b) return;
    view.mode = b.dataset.view;
    try { localStorage.setItem(VIEW_KEY, view.mode); } catch { /* ignore */ }
    render();
  });
  el.assignee.addEventListener("change", () => { view.assignee = el.assignee.value; render(); });
  el.priority.addEventListener("change", () => { view.priority = el.priority.value; render(); });
  el.clear.addEventListener("click", () => {
    view.assignee = "all"; view.priority = "all"; view.query = ""; el.search.value = "";
    render();
  });
  let searchTimer;
  el.search.addEventListener("input", () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => { view.query = el.search.value.trim(); render(); }, 120);
  });

  el.kpis.addEventListener("click", (e) => {
    const k = e.target.closest("[data-kpi]");
    if (!k) return;
    if (k.dataset.kpi === "unassigned") { view.assignee = "none"; render(); }
    if (k.dataset.kpi === "review") {
      const j = S.state.jobs.filter((x) => x.status === "delivered").sort((a, b) => a.deliveredAt - b.deliveredAt)[0];
      if (j) openJob(j.id); else toast("Nothing waiting for review", "neutral");
    }
  });

  el.main.addEventListener("click", (e) => {
    const sort = e.target.closest("[data-sort]");
    if (sort) {
      const k = sort.dataset.sort;
      view.sort = { key: k, dir: view.sort.key === k ? -view.sort.dir : 1 };
      return renderList();
    }
    const c = e.target.closest("[data-job]");
    if (!c) return;
    openJob(c.dataset.job);
  });
  el.main.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && e.target.matches(".jcard")) openJob(e.target.dataset.job);
  });

  el.team.addEventListener("click", (e) => {
    const m = e.target.closest("[data-member]");
    if (!m) return;
    view.assignee = view.assignee === m.dataset.member ? "all" : m.dataset.member;
    render();
  });

  // Drag a card onto a team member to assign, onto "Unassigned" to unassign, or onto "Completed" to approve.
  let dragging = null;
  const canDrop = (target, j) => {
    if (!j) return false;
    if (target.dataset.member) return ["unassigned", "assigned", "in_progress", "revision"].includes(j.status) && j.assigneeId !== target.dataset.member;
    if (target.dataset.col === "unassigned") return j.status === "assigned" || j.status === "in_progress";
    if (target.dataset.col === "completed") return j.status === "delivered";
    return false;
  };
  document.addEventListener("dragstart", (e) => {
    const c = e.target.closest && e.target.closest(".jcard");
    if (!c) return;
    dragging = c.dataset.job;
    c.classList.add("dragging");
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", dragging);
  });
  document.addEventListener("dragend", () => {
    dragging = null;
    $$(".dragging, .drop-ok").forEach((n) => n.classList.remove("dragging", "drop-ok", "active"));
    renderTeam();
  });
  document.addEventListener("dragover", (e) => {
    if (!dragging) return;
    const t = e.target.closest && e.target.closest("[data-member], .column");
    $$(".drop-ok").forEach((n) => n !== t && n.classList.remove("drop-ok", "active"));
    if (t && canDrop(t, S.job(dragging))) {
      e.preventDefault();
      t.classList.add("drop-ok");
      if (t.dataset.member) t.classList.add("active");
    }
  });
  document.addEventListener("drop", async (e) => {
    if (!dragging) return;
    const t = e.target.closest && e.target.closest("[data-member], .column");
    const j = S.job(dragging);
    if (!t || !canDrop(t, j)) return;
    e.preventDefault();
    if (t.dataset.member) {
      A.assign(j.id, t.dataset.member);
      toast(`${j.id} assigned to ${S.emp(t.dataset.member).name}`, "approve");
    } else if (t.dataset.col === "unassigned") {
      A.unassign(j.id);
      toast(`${j.id} unassigned`, "neutral");
    } else if (t.dataset.col === "completed") {
      A.approve(j.id);
      toast(`${j.id} approved`, "approve");
    }
  });

  // Drawer actions
  el.drawerScrim.addEventListener("click", closeJob);
  el.drawer.addEventListener("click", async (e) => {
    const j = S.job(view.openJob);
    if (!j) return;
    const dl = e.target.closest("[data-dl]");
    if (dl) return downloadFile(j.id, dl.dataset.dl);
    const as = e.target.closest("[data-assign]");
    if (as) {
      if (as.dataset.assign === j.assigneeId) { view.picking = false; return render(); }
      A.assign(j.id, as.dataset.assign);
      view.picking = false;
      return toast(`Assigned to ${S.emp(as.dataset.assign).name} — they've been notified`, "approve");
    }
    if (e.target.closest("[data-drop=drawer]")) return drawerInput.click();
    const act = e.target.closest("[data-act]")?.dataset.act;
    if (!act) return;
    if (act === "close") closeJob();
    if (act === "pick") { view.picking = true; render(); }
    if (act === "cancel-pick") { view.picking = false; render(); }
    if (act === "more-picks") { view.showAllPicks = !view.showAllPicks; render(); }
    if (act === "unassign") { A.unassign(j.id); toast(`${j.id} unassigned`, "neutral"); }
    if (act === "approve") {
      A.approve(j.id);
      toast(`${j.id} approved and completed`, "approve");
    }
    if (act === "revision") {
      const note = await ask({ title: "Request a revision", sub: `${S.emp(j.assigneeId).name} will be notified and the job moves back to In progress.`, ico: "refresh", cls: "info", field: { label: "What needs to change?", placeholder: "e.g. Please align terminology with the client glossary in section 3.", required: true }, confirm: "Send back" });
      if (note) { A.requestRevision(j.id, note); toast(`Revision requested on ${j.id}`, "info"); }
    }
    if (act === "delete") {
      const ok = await ask({ title: `Delete ${j.id}?`, sub: "The job and its notifications are removed for everyone.", ico: "trash", cls: "reject", confirm: "Delete job", confirmCls: "danger" });
      if (ok === null) return;
      const snapshot = JSON.parse(JSON.stringify(j));
      A.remove(j.id);
      view.openJob = null;
      render();
      toast(`${j.id} deleted`, "reject", { label: "Undo", fn: () => A.restore(snapshot) });
    }
  });
  el.drawer.addEventListener("dragover", (e) => {
    const z = e.target.closest("[data-drop=drawer]");
    if (z && e.dataTransfer.types.includes("Files")) { e.preventDefault(); z.classList.add("over"); }
  });
  el.drawer.addEventListener("dragleave", (e) => { const z = e.target.closest("[data-drop=drawer]"); if (z) z.classList.remove("over"); });
  el.drawer.addEventListener("drop", (e) => {
    const z = e.target.closest("[data-drop=drawer]");
    if (!z || !e.dataTransfer.files.length) return;
    e.preventDefault();
    uploadToJob(e.dataTransfer.files);
  });
  drawerInput.addEventListener("change", () => { if (drawerInput.files.length) uploadToJob(drawerInput.files); drawerInput.value = ""; });
  async function uploadToJob(files) {
    const j = S.job(view.openJob);
    if (!j) return;
    const metas = await S.storeFiles([...files]);
    A.addFiles(j.id, metas, "source", S.ADMIN.name);
    toast(`${plural(metas.length, "file")} added to ${j.id}`, "approve");
  }

  // Notifications
  el.bell.addEventListener("click", (e) => { e.stopPropagation(); togglePanel(); });
  el.panel.addEventListener("click", async (e) => {
    e.stopPropagation();
    const tab = e.target.closest("[data-np-tab]");
    if (tab) { view.notifTab = tab.dataset.npTab; return renderPanel(); }
    const act = e.target.closest("[data-np]")?.dataset.np;
    if (act === "read-all") return A.markRead(adminNotifs().map((n) => n.id));
    if (act === "desktop") {
      try { await Notification.requestPermission(); } catch { /* ignore */ }
      return renderPanel();
    }
    const n = e.target.closest("[data-notif]");
    if (n) {
      const item = adminNotifs().find((x) => x.id === n.dataset.notif);
      A.markRead([item.id]);
      if (S.job(item.jobId)) openJob(item.jobId);
      else toast("That job no longer exists", "neutral");
    }
  });
  document.addEventListener("click", (e) => {
    if (view.panelOpen && !e.composedPath().includes(el.panel)) togglePanel(false);
  });

  // Simulation of team activity
  let simTimer = null;
  const NOTES = ["Ready for review.", "All done — client glossary applied.", "Finished, QA checks passed.", "Done. Left two comments on ambiguous terms.", ""];
  async function simStep() {
    const jobs = S.state.jobs;
    const assigned = jobs.filter((j) => j.status === "assigned");
    const working = jobs.filter((j) => ["in_progress", "revision"].includes(j.status));
    if (assigned.length && Math.random() < 0.35) {
      const j = assigned.sort((a, b) => a.updatedAt - b.updatedAt)[0];
      return A.accept(j.id, j.assigneeId);
    }
    if (!working.length) return;
    // Favour the most advanced job so finished-job notifications arrive quickly in the demo.
    working.sort((a, b) => b.progress - a.progress);
    const j = Math.random() < 0.6 ? working[0] : working[Math.floor(Math.random() * working.length)];
    const next = j.progress + 12 + Math.floor(Math.random() * 22);
    if (next >= 100) {
      const text = `${j.id} — ${j.title}\n${S.LANGS[j.source]} → ${S.LANGS[j.target]}\n\n[Translated deliverable produced in live demo mode]`;
      const file = new File([text], `${slug(j.title)}_${j.target}_final.txt`, { type: "text/plain" });
      const metas = await S.storeFiles([file]);
      A.finish(j.id, j.assigneeId, metas, NOTES[Math.floor(Math.random() * NOTES.length)]);
    } else {
      A.setProgress(j.id, j.assigneeId, next);
    }
  }
  function syncSim() {
    const on = !!S.state.settings.simulate;
    if (on && !simTimer) simTimer = setInterval(simStep, 4000);
    if (!on && simTimer) { clearInterval(simTimer); simTimer = null; }
  }
  el.sim.addEventListener("change", () => {
    A.setSetting("simulate", el.sim.checked);
    toast(el.sim.checked ? "Live demo on — the team will start finishing jobs" : "Live demo paused", "neutral");
  });

  // Shell
  $("#menuBtn").addEventListener("click", () => el.app.classList.add("nav-open"));
  $("#scrim").addEventListener("click", () => el.app.classList.remove("nav-open"));
  $("[data-action=focus-team]").addEventListener("click", (e) => {
    e.preventDefault();
    el.app.classList.remove("nav-open");
    el.team.scrollIntoView({ behavior: "smooth", block: "start" });
  });
  $("#resetBtn").addEventListener("click", async () => {
    const ok = await ask({ title: "Reset demo data?", sub: "All jobs, uploads and notifications go back to the sample data.", ico: "refresh", cls: "reject", confirm: "Reset", confirmCls: "danger" });
    if (ok === null) return;
    view.openJob = null;
    A.reset();
    toast("Demo data reset", "neutral");
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      if (!el.promptModal.hidden) return el.promptModal._cancel && el.promptModal._cancel();
      if (!el.jobModal.hidden) return closeModal(el.jobModal);
      if (!el.importModal.hidden) return closeModal(el.importModal);
      if (view.panelOpen) return togglePanel(false);
      if (view.openJob) return closeJob();
      el.app.classList.remove("nav-open");
      return;
    }
    const modalOpen = !el.promptModal.hidden || !el.jobModal.hidden || !el.importModal.hidden;
    if (modalOpen || e.metaKey || e.ctrlKey || e.altKey || e.target.closest("input:not([type=checkbox]):not([type=radio]), textarea, select")) return;
    if (e.key === "n" || e.key === "N") { e.preventDefault(); openNewJob(); }
    if (e.key === "/") { e.preventDefault(); el.search.focus(); }
  });

  /* ------------------------------------------------------------------------
     Init
     ------------------------------------------------------------------------ */
  S.subscribe(({ added }) => {
    added.filter((n) => n.to === "admin").forEach(announce);
    syncSim();
    render();
  });

  UI.hydrateIcons();
  UI.initTheme($("#themeBtn"));
  render();
  syncSim();
  A.checkOverdue();
  setInterval(() => { A.checkOverdue(); }, 30000);
  // Keep relative times ("due in 3h") fresh without a store change.
  setInterval(() => { if (!document.hidden) render(); }, 60000);
})();
