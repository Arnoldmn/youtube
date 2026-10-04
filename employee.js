(() => {
  "use strict";

  const { icon, esc, $, $$, ago, fmtDate, fmtDateTime, fmtSize, fmtNum, money, plural, avatar, toast } = UI;
  const S = JobStore;
  const A = S.actions;
  const HOUR = S.HOUR;

  const TABS = [
    { id: "todo", label: "To accept", statuses: ["assigned"] },
    { id: "active", label: "In progress", statuses: ["in_progress", "revision"] },
    { id: "finished", label: "Finished", statuses: ["delivered"] },
    { id: "done", label: "Completed", statuses: ["completed"] },
  ];
  const NOTIF_ICON = { assigned: "user-plus", revision: "refresh", approved: "check", files: "paperclip", unassigned: "x" };
  const WHO_KEY = "lingua:employee";

  const ui = {
    me: initialWho(),
    tab: null,
    finishing: new Map(), // jobId -> { files: File[], note: string }
    declining: new Set(),
    panelOpen: false,
    deferred: false,
  };

  function initialWho() {
    const fromUrl = new URLSearchParams(location.search).get("emp");
    let saved = null;
    try { saved = localStorage.getItem(WHO_KEY); } catch { /* ignore */ }
    const ids = S.state.employees.map((e) => e.id);
    return [fromUrl, saved].find((x) => ids.includes(x)) || ids[0];
  }

  const el = {
    who: $("#whoSelect"),
    hero: $("#hero"),
    tabs: $("#taskTabs"),
    tasks: $("#tasks"),
    bell: $("#bellBtn"),
    bellWrap: $(".bell-wrap"),
    bellCount: $("#bellCount"),
    panel: $("#notifPanel"),
  };

  const me = () => S.emp(ui.me);
  const myJobs = () => S.state.jobs.filter((j) => j.assigneeId === ui.me);
  const myNotifs = () => S.state.notifications.filter((n) => n.to === ui.me);
  const extOf = (name) => (name.split(".").pop() || "").toLowerCase().slice(0, 4);

  /* ------------------------------------------------------------------------
     Render
     ------------------------------------------------------------------------ */
  function render() {
    // Don't yank a text field out from under someone who's typing; render once they leave it.
    if (el.tasks.contains(document.activeElement) && document.activeElement.matches("textarea, input[type=text]")) {
      ui.deferred = true;
      renderBell();
      return;
    }
    ui.deferred = false;
    const e = me();
    const jobs = myJobs();
    if (!ui.tab) ui.tab = jobs.some((j) => j.status === "assigned") ? "todo" : "active";

    el.who.innerHTML = S.state.employees.map((x) => `<option value="${x.id}">${esc(x.name)}</option>`).join("");
    el.who.value = ui.me;

    const open = jobs.filter((j) => ["in_progress", "revision", "assigned"].includes(j.status));
    const dueSoon = open.filter((j) => j.deadline - Date.now() < 24 * HOUR).length;
    const earned = jobs.filter((j) => j.status === "completed").reduce((s, j) => s + j.words * j.rate, 0);
    el.hero.innerHTML = `
      ${avatar(e)}
      <div><h1>Hi ${esc(e.name.split(" ")[0])} 👋</h1><p>${esc(e.role)} · ${esc(e.pairs.join(", "))}</p></div>
      <div class="job-kpis" style="padding:0;margin-left:auto;grid-template-columns:repeat(3,auto)">
        <div class="kpi"><span class="kpi-ico blue">${icon("briefcase")}</span><div><span>Open jobs</span><strong>${open.length}</strong></div></div>
        <div class="kpi"><span class="kpi-ico amber">${icon("clock")}</span><div><span>Due in 24h</span><strong>${dueSoon}</strong></div></div>
        <div class="kpi"><span class="kpi-ico green">${icon("dollar")}</span><div><span>Approved work</span><strong>${money(earned)}</strong></div></div>
      </div>`;

    el.tabs.innerHTML = TABS.map((t) => {
      const n = jobs.filter((j) => t.statuses.includes(j.status)).length;
      return `<button class="tab" role="tab" type="button" data-tab="${t.id}" aria-selected="${ui.tab === t.id}">${t.label}<span class="count">${n}</span></button>`;
    }).join("");

    const tab = TABS.find((t) => t.id === ui.tab);
    const list = jobs.filter((j) => tab.statuses.includes(j.status)).sort((a, b) => a.deadline - b.deadline);
    el.tasks.innerHTML = list.length ? list.map(task).join("") : `
      <div class="empty" style="background:var(--surface);border:1px solid var(--border);border-radius:var(--radius)">
        <div class="empty-ico">${icon("inbox", "lg")}</div>
        <strong>${{ todo: "No new jobs waiting", active: "Nothing in progress", finished: "Nothing waiting for review", done: "No completed jobs yet" }[ui.tab]}</strong>
        <span>${ui.tab === "todo" ? "New assignments from your project manager show up here instantly." : "Jobs move here as you work on them."}</span>
      </div>`;
    renderBell();
    if (ui.panelOpen) renderPanel();
  }

  function due(j) {
    const diff = j.deadline - Date.now();
    if (j.status === "delivered" || j.status === "completed") return `<span>${icon("calendar")}Due ${fmtDateTime(j.deadline)}</span>`;
    const cls = diff < 0 ? "late" : diff < 24 * HOUR ? "soon" : "";
    return `<span class="due ${cls}" style="margin:0">${icon(diff < 0 ? "alert" : "clock")}${diff < 0 ? `Overdue · was due ${fmtDateTime(j.deadline)}` : `Due ${fmtDateTime(j.deadline)} (${ago(j.deadline)})`}</span>`;
  }

  function fileRow(j, f) {
    return `<div class="file ${f.kind}">
      <span class="ext ${extOf(f.name)}">${esc(extOf(f.name))}</span>
      <div><strong>${esc(f.name)}</strong><small>${fmtSize(f.size)} · ${ago(f.at)}</small></div>
      <button class="icon-btn" type="button" data-dl="${j.id}|${f.id}" aria-label="Download ${esc(f.name)}">${icon("download")}</button>
    </div>`;
  }

  function task(j) {
    const src = j.files.filter((f) => f.kind === "source");
    const del = j.files.filter((f) => f.kind === "deliverable");
    const revisionNote = j.status === "revision" ? [...j.history].reverse().find((h) => h.text.startsWith("Requested a revision")) : null;
    const fin = ui.finishing.get(j.id);
    return `<article class="task" data-task="${j.id}">
      <div class="task-top">
        <div>
          <div class="jcard-top" style="margin-bottom:4px"><span class="jid">${j.id}</span>${j.priority === "urgent" ? `<span class="prio urgent">${icon("zap")}Urgent</span>` : j.priority === "high" ? `<span class="prio high">${icon("flag")}High</span>` : ""}</div>
          <h3>${esc(j.title)}</h3>
        </div>
        <div class="right"><span class="pill s-${j.status}">${S.STATUS_LABEL[j.status]}</span></div>
      </div>
      <div class="task-meta">
        <span>${icon("building")}${esc(j.client)}</span>
        <span>${icon("languages")}${esc(S.LANGS[j.source])} → ${esc(S.LANGS[j.target])}</span>
        <span>${icon("briefcase")}${esc(j.service)}</span>
        <span>${icon("type")}${fmtNum(j.words)} words · ${money(j.words * j.rate)}</span>
        ${due(j)}
      </div>
      ${revisionNote ? `<div class="d-callout info" style="margin:0">${icon("refresh")}<div><b>Revision requested by ${esc(revisionNote.by)}</b><p>${esc(revisionNote.text.replace(/^Requested a revision:?\s*/, "") || "See the PM's notes.")}</p></div></div>` : ""}
      ${j.instructions ? `<div><h5>Instructions</h5><div class="instructions">${esc(j.instructions)}</div></div>` : ""}
      <div class="task-cols">
        <div><h5>Source files</h5><div class="files">${src.length ? src.map((f) => fileRow(j, f)).join("") : `<small style="color:var(--text-3)">No files attached</small>`}</div></div>
        <div><h5>Your deliverables</h5><div class="files">${del.length ? del.map((f) => fileRow(j, f)).join("") : `<small style="color:var(--text-3)">Nothing uploaded yet</small>`}</div></div>
      </div>
      ${fin ? finishBox(j, fin) : ""}
      ${ui.declining.has(j.id) ? declineBox(j) : ""}
      <div class="task-actions">${actions(j, fin)}</div>
    </article>`;
  }

  function actions(j, fin) {
    if (j.status === "assigned") {
      if (ui.declining.has(j.id)) return "";
      return `<span style="color:var(--text-3);font-size:13px">Assigned ${ago([...j.history].reverse().find((h) => /Assigned|Reassigned/.test(h.text))?.at || j.updatedAt)}</span><span class="spacer"></span>
        <button class="btn outline-danger" type="button" data-act="decline">${icon("x")}Decline</button>
        <button class="btn primary" type="button" data-act="accept">${icon("check")}Accept job</button>`;
    }
    if (j.status === "in_progress" || j.status === "revision") {
      if (fin) return "";
      return `<label class="range">Progress <input type="range" min="0" max="99" step="1" value="${j.progress}" data-progress aria-label="Progress"><output>${j.progress}%</output></label>
        <button class="btn success" type="button" data-act="finish">${icon("check-circle")}Mark as finished</button>`;
    }
    if (j.status === "delivered") return `<span style="color:var(--violet);font-size:13px;font-weight:600;display:flex;gap:6px;align-items:center">${icon("clock")}Submitted ${ago(j.deliveredAt)} — waiting for your PM to review</span>`;
    return `<span style="color:var(--green);font-size:13px;font-weight:600;display:flex;gap:6px;align-items:center">${icon("check")}Approved — nice work!</span>`;
  }

  function finishBox(j, fin) {
    return `<div class="finish-box">
      <strong>Submit your work</strong>
      <div class="dropzone compact" data-fin-drop="${j.id}" tabindex="0" role="button" aria-label="Upload deliverable files">
        <span class="dz-ico">${icon("upload")}</span><div><strong>Upload deliverable files</strong> — drop here or <u>browse</u><small>Your PM is notified as soon as you submit</small></div>
      </div>
      ${fin.files.length ? `<div class="files">${fin.files.map((f, i) => `<div class="file"><span class="ext ${extOf(f.name)}">${esc(extOf(f.name))}</span><div><strong>${esc(f.name)}</strong><small>${fmtSize(f.size)}</small></div><button class="icon-btn" type="button" data-fin-remove="${i}" aria-label="Remove">${icon("x")}</button></div>`).join("")}</div>` : ""}
      <textarea data-fin-note placeholder="Note for your PM (optional) — e.g. queries, assumptions, terms to double-check">${esc(fin.note)}</textarea>
      <div class="task-actions" style="border:0;padding:0">
        <span class="spacer"></span>
        <button class="btn ghost" type="button" data-act="cancel-finish">Cancel</button>
        <button class="btn success" type="button" data-act="submit" ${fin.files.length ? "" : "disabled"}>${icon("send")}Submit &amp; notify PM</button>
      </div>
    </div>`;
  }

  function declineBox(j) {
    return `<div class="finish-box" style="background:var(--red-soft);border-color:color-mix(in srgb,var(--red) 25%,transparent)">
      <strong>Decline ${j.id}?</strong>
      <select data-decline-reason style="height:36px;border:1px solid var(--border);border-radius:8px;padding:0 10px;background:var(--surface)">
        <option>Not available before the deadline</option>
        <option>Outside my specialization</option>
        <option>Word count too large for my capacity</option>
        <option>Other</option>
      </select>
      <div class="task-actions" style="border:0;padding:0"><span class="spacer"></span>
        <button class="btn ghost" type="button" data-act="cancel-decline">Keep it</button>
        <button class="btn danger" type="button" data-act="confirm-decline">Decline job</button>
      </div>
    </div>`;
  }

  /* ---------- Notifications ---------- */
  function renderBell() {
    const unread = myNotifs().filter((n) => !n.read).length;
    el.bellCount.hidden = !unread;
    el.bellCount.textContent = unread;
  }
  function renderPanel() {
    const list = myNotifs();
    el.panel.innerHTML = `
      <div class="np-head"><h3>Notifications</h3><button class="link-btn" type="button" data-np="read-all">Mark all read</button></div>
      <div class="np-list">${list.length ? list.slice(0, 40).map((n) => `
        <button class="notif ${n.read ? "" : "unread"}" type="button" data-notif="${n.id}">
          <span class="n-ico ${n.type}">${icon(NOTIF_ICON[n.type] || "bell")}</span>
          <div><strong>${esc(n.title)}</strong><p>${esc(n.body)}</p></div>
          <div><time>${ago(n.at)}</time>${n.read ? "" : `<span class="udot"></span>`}</div>
        </button>`).join("") : `<div class="np-empty">No notifications yet.</div>`}</div>`;
  }
  function togglePanel(open = !ui.panelOpen) {
    ui.panelOpen = open;
    el.panel.hidden = !open;
    el.bell.setAttribute("aria-expanded", open);
    if (open) renderPanel();
  }

  function goToJob(jobId) {
    const j = S.job(jobId);
    if (!j || j.assigneeId !== ui.me) return;
    ui.tab = TABS.find((t) => t.statuses.includes(j.status)).id;
    render();
    requestAnimationFrame(() => {
      const c = $(`[data-task="${jobId}"]`);
      if (c) { c.scrollIntoView({ behavior: "smooth", block: "center" }); c.classList.add("flash"); setTimeout(() => c.classList.remove("flash"), 1700); }
    });
  }

  /* ------------------------------------------------------------------------
     Events
     ------------------------------------------------------------------------ */
  el.who.addEventListener("change", () => {
    ui.me = el.who.value;
    ui.tab = null;
    ui.finishing.clear();
    ui.declining.clear();
    try { localStorage.setItem(WHO_KEY, ui.me); } catch { /* ignore */ }
    render();
  });
  el.tabs.addEventListener("click", (e) => {
    const b = e.target.closest("[data-tab]");
    if (b) { ui.tab = b.dataset.tab; render(); }
  });

  const finInput = Object.assign(document.createElement("input"), { type: "file", multiple: true, hidden: true });
  document.body.appendChild(finInput);
  let finTarget = null;
  finInput.addEventListener("change", () => {
    if (finTarget && finInput.files.length) addFinishFiles(finTarget, finInput.files);
    finInput.value = "";
  });
  function addFinishFiles(jobId, files) {
    const fin = ui.finishing.get(jobId);
    if (!fin) return;
    fin.files.push(...files);
    render();
  }

  el.tasks.addEventListener("click", async (e) => {
    const dl = e.target.closest("[data-dl]");
    if (dl) {
      const [jid, fid] = dl.dataset.dl.split("|");
      const j = S.job(jid);
      const f = j.files.find((x) => x.id === fid);
      const blob = await S.getFileBlob(j, f);
      return UI.downloadBlob(blob, f.stored ? f.name : f.name.replace(/\.\w+$/, ".txt"));
    }
    const card = e.target.closest("[data-task]");
    if (!card) return;
    const id = card.dataset.task;
    const drop = e.target.closest("[data-fin-drop]");
    if (drop) { finTarget = id; return finInput.click(); }
    const rm = e.target.closest("[data-fin-remove]");
    if (rm) { ui.finishing.get(id).files.splice(Number(rm.dataset.finRemove), 1); return render(); }
    const act = e.target.closest("[data-act]")?.dataset.act;
    if (act === "accept") {
      ui.tab = "active";
      A.accept(id, ui.me);
      toast(`You accepted ${id} — your PM has been notified`, "approve");
    }
    if (act === "decline") { ui.declining.add(id); render(); }
    if (act === "cancel-decline") { ui.declining.delete(id); render(); }
    if (act === "confirm-decline") {
      const reason = $("[data-decline-reason]", card).value;
      ui.declining.delete(id);
      A.decline(id, ui.me, reason);
      toast(`${id} declined`, "neutral");
    }
    if (act === "finish") { ui.finishing.set(id, { files: [], note: "" }); render(); }
    if (act === "cancel-finish") { ui.finishing.delete(id); render(); }
    if (act === "submit") {
      const fin = ui.finishing.get(id);
      const btn = e.target.closest("[data-act]");
      btn.disabled = true;
      const metas = await S.storeFiles(fin.files);
      ui.finishing.delete(id);
      ui.tab = "finished";
      A.finish(id, ui.me, metas, fin.note.trim());
      toast(`${id} submitted — your PM has been notified`, "approve");
    }
  });
  el.tasks.addEventListener("input", (e) => {
    const card = e.target.closest("[data-task]");
    if (!card) return;
    if (e.target.matches("[data-fin-note]")) ui.finishing.get(card.dataset.task).note = e.target.value;
    if (e.target.matches("[data-progress]")) e.target.nextElementSibling.textContent = `${e.target.value}%`;
  });
  el.tasks.addEventListener("change", (e) => {
    if (!e.target.matches("[data-progress]")) return;
    A.setProgress(e.target.closest("[data-task]").dataset.task, ui.me, Number(e.target.value));
  });
  el.tasks.addEventListener("focusout", () => { setTimeout(() => { if (ui.deferred) render(); }, 0); });
  el.tasks.addEventListener("dragover", (e) => {
    const z = e.target.closest("[data-fin-drop]");
    if (z && e.dataTransfer.types.includes("Files")) { e.preventDefault(); z.classList.add("over"); }
  });
  el.tasks.addEventListener("dragleave", (e) => { const z = e.target.closest("[data-fin-drop]"); if (z) z.classList.remove("over"); });
  el.tasks.addEventListener("drop", (e) => {
    const z = e.target.closest("[data-fin-drop]");
    if (!z || !e.dataTransfer.files.length) return;
    e.preventDefault();
    addFinishFiles(z.dataset.finDrop, e.dataTransfer.files);
  });

  el.bell.addEventListener("click", (e) => { e.stopPropagation(); togglePanel(); });
  el.panel.addEventListener("click", (e) => {
    e.stopPropagation();
    if (e.target.closest("[data-np=read-all]")) return A.markRead(myNotifs().map((n) => n.id));
    const n = e.target.closest("[data-notif]");
    if (!n) return;
    const item = myNotifs().find((x) => x.id === n.dataset.notif);
    A.markRead([item.id]);
    togglePanel(false);
    goToJob(item.jobId);
  });
  document.addEventListener("click", () => { if (ui.panelOpen) togglePanel(false); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && ui.panelOpen) togglePanel(false); });

  /* ------------------------------------------------------------------------
     Init
     ------------------------------------------------------------------------ */
  S.subscribe(({ added }) => {
    for (const n of added.filter((x) => x.to === ui.me)) {
      const kind = { assigned: "info", revision: "reject", approved: "approve" }[n.type] || "info";
      toast(n.title, kind, S.job(n.jobId) ? { label: "View", fn: () => { A.markRead([n.id]); goToJob(n.jobId); } } : null);
      if (n.type === "assigned" || n.type === "revision") UI.chime();
      UI.desktopNotify(n.title, n.body);
      el.bellWrap.classList.remove("ringing");
      void el.bellWrap.offsetWidth;
      el.bellWrap.classList.add("ringing");
    }
    render();
  });

  UI.hydrateIcons();
  UI.initTheme($("#themeBtn"));
  render();
  setInterval(() => { if (!document.hidden) render(); }, 60000);
})();
