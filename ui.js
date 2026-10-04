// Shared UI helpers for the Admin Portal pages (icons, formatting, toasts, modals, theme).
window.UI = (() => {
  "use strict";

  const ICONS = {
    check: '<path d="M20 6 9 17l-5-5"/>',
    x: '<path d="M18 6 6 18M6 6l12 12"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    help: '<circle cx="12" cy="12" r="10"/><path d="M9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3M12 17h.01"/>',
    search: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
    "chevron-down": '<path d="m6 9 6 6 6-6"/>',
    "chevron-up": '<path d="m18 15-6-6-6 6"/>',
    "chevron-right": '<path d="m9 18 6-6-6-6"/>',
    "arrow-left": '<path d="m12 19-7-7 7-7M19 12H5"/>',
    "arrow-right": '<path d="M5 12h14M12 5l7 7-7 7"/>',
    file: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M16 13H8M16 17H8M10 9H8"/>',
    download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>',
    upload: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/>',
    paperclip: '<path d="m21.4 11.1-9.2 9.2a6 6 0 0 1-8.5-8.5l9.2-9.2a4 4 0 0 1 5.7 5.7l-9.2 9.2a2 2 0 0 1-2.8-2.8l8.5-8.5"/>',
    trash: '<path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>',
    clock: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
    calendar: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
    mail: '<rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-10 6L2 7"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M6.3 17.7l-1.4 1.4M19.1 4.9l-1.4 1.4"/>',
    moon: '<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9z"/>',
    inbox: '<path d="M22 12h-6l-2 3h-4l-2-3H2"/><path d="M5.5 5.1 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.5-6.9A2 2 0 0 0 16.8 4H7.2a2 2 0 0 0-1.7 1.1z"/>',
    users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8"/>',
    "user-plus": '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M19 8v6M22 11h-6"/>',
    folder: '<path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.7-.9l-.8-1.2A2 2 0 0 0 7.9 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2z"/>',
    chart: '<path d="M3 3v18h18M18 17V9M13 17V5M8 17v-3"/>',
    receipt: '<path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1z"/><path d="M16 8H8M16 12H8M13 16H8"/>',
    grid: '<rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/><rect x="14" y="12" width="7" height="9" rx="1"/><rect x="3" y="16" width="7" height="5" rx="1"/>',
    columns: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 3v18M15 3v18"/>',
    list: '<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>',
    menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
    bell: '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9M10.3 21a1.9 1.9 0 0 0 3.4 0"/>',
    languages: '<path d="m5 8 6 6M4 14l6-6 2-3M2 5h12M7 2h1M22 22l-5-10-5 10M14 18h6"/>',
    briefcase: '<rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>',
    building: '<rect x="4" y="2" width="16" height="20" rx="2"/><path d="M9 22v-4h6v4M8 6h.01M12 6h.01M16 6h.01M8 10h.01M12 10h.01M16 10h.01M8 14h.01M12 14h.01M16 14h.01"/>',
    alert: '<path d="m21.7 18-8-14a2 2 0 0 0-3.5 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.7-3z"/><path d="M12 9v4M12 17h.01"/>',
    undo: '<path d="M3 12a9 9 0 1 0 9-9 9.8 9.8 0 0 0-6.7 2.7L3 8"/><path d="M3 3v5h5"/>',
    refresh: '<path d="M3 12a9 9 0 0 1 9-9 9.8 9.8 0 0 1 6.7 2.7L21 8M21 3v5h-5M21 12a9 9 0 0 1-9 9 9.8 9.8 0 0 1-6.7-2.7L3 16M8 16H3v5"/>',
    send: '<path d="m22 2-7 20-4-9-9-4z"/><path d="M22 2 11 13"/>',
    flag: '<path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1zM4 22v-7"/>',
    zap: '<path d="M13 2 3 14h9l-1 8 10-12h-9z"/>',
    play: '<path d="m6 3 14 9-14 9z"/>',
    type: '<path d="M4 7V4h16v3M9 20h6M12 4v16"/>',
    dollar: '<path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>',
    message: '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>',
    "check-circle": '<path d="M22 11.1V12a10 10 0 1 1-5.9-9.1"/><path d="m9 11 3 3L22 4"/>',
    "x-circle": '<circle cx="12" cy="12" r="10"/><path d="m15 9-6 6M9 9l6 6"/>',
    eye: '<path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/>',
    keyboard: '<rect x="2" y="4" width="20" height="16" rx="2"/><path d="M6 8h.01M10 8h.01M14 8h.01M18 8h.01M8 12h.01M12 12h.01M16 12h.01M7 16h10"/>',
    filter: '<path d="M22 3H2l8 9.5V19l4 2v-8.5z"/>',
  };

  const icon = (name, cls = "") =>
    `<svg class="ico ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name] || ""}</svg>`;

  const esc = (s) =>
    String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

  /* ---------- Formatting ---------- */
  function ago(t) {
    const diff = Date.now() - t;
    const future = diff < 0;
    const m = Math.round(Math.abs(diff) / 6e4);
    let s;
    if (m < 1) return "just now";
    if (m < 60) s = `${m}m`;
    else if (m < 60 * 24) s = `${Math.round(m / 60)}h`;
    else s = `${Math.round(m / 1440)}d`;
    return future ? `in ${s}` : `${s} ago`;
  }
  const fmtDate = (t) => new Date(t).toLocaleDateString(undefined, { month: "short", day: "numeric" });
  const fmtDateTime = (t) => new Date(t).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
  function fmtSize(b) {
    if (b < 1024) return `${b} B`;
    if (b < 1024 ** 2) return `${Math.round(b / 1024)} KB`;
    return `${(b / 1024 ** 2).toFixed(1)} MB`;
  }
  const fmtNum = (n) => Number(n || 0).toLocaleString();
  const money = (n) => `€${Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const plural = (n, w) => `${n} ${w}${n === 1 ? "" : "s"}`;
  const hueOf = (s) => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 360, 7);
  const initialsOf = (name) => name.split(/\s+/).map((p) => p[0]).slice(0, 2).join("").toUpperCase();
  const avatar = (p, cls = "") => `<span class="avatar ${cls}" style="--h:${hueOf(p.name)}" title="${esc(p.name)}">${initialsOf(p.name)}</span>`;

  /* ---------- Toasts ---------- */
  function toast(msg, kind = "neutral", action) {
    const host = $("#toasts");
    if (!host) return;
    const ico = { approve: "check", info: "bell", reject: "x", neutral: "check" }[kind] || "check";
    const node = document.createElement("div");
    node.className = "toast";
    node.innerHTML = `<span class="t-ico ${kind}">${icon(ico)}</span><span>${esc(msg)}</span>${action ? `<button type="button">${esc(action.label)}</button>` : ""}`;
    host.appendChild(node);
    const remove = () => {
      if (!node.isConnected) return;
      node.classList.add("out");
      setTimeout(() => node.remove(), 200);
    };
    if (action) node.querySelector("button").addEventListener("click", () => { remove(); action.fn(); });
    setTimeout(remove, action ? 7000 : 3500);
    while (host.children.length > 4) host.firstElementChild.remove();
  }

  /* ---------- Modals ---------- */
  let lastFocus = null;
  function openModal(node, focusSel) {
    lastFocus = document.activeElement;
    node.hidden = false;
    setTimeout(() => {
      const f = (focusSel && node.querySelector(focusSel)) || node.querySelector("input:not([type=hidden]):not([type=file]), select, textarea, [type=submit]");
      if (f) f.focus();
    }, 30);
  }
  function closeModal(node) {
    node.hidden = true;
    if (lastFocus && document.contains(lastFocus)) lastFocus.focus();
  }

  /* ---------- Theme (shared across portal pages) ---------- */
  const THEME_KEY = "lingua:theme";
  function initTheme(btn) {
    let theme;
    try { theme = localStorage.getItem(THEME_KEY); } catch { /* ignore */ }
    if (!theme) theme = matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    const apply = () => {
      document.documentElement.dataset.theme = theme;
      if (btn) {
        btn.innerHTML = icon(theme === "dark" ? "sun" : "moon");
        btn.setAttribute("aria-label", theme === "dark" ? "Switch to light theme" : "Switch to dark theme");
      }
    };
    apply();
    if (btn) btn.addEventListener("click", () => {
      theme = theme === "dark" ? "light" : "dark";
      try { localStorage.setItem(THEME_KEY, theme); } catch { /* ignore */ }
      apply();
    });
  }

  /* ---------- Sound + desktop notifications ---------- */
  let audioCtx;
  function chime() {
    try {
      audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
      const t = audioCtx.currentTime;
      [880, 1320].forEach((f, i) => {
        const o = audioCtx.createOscillator();
        const g = audioCtx.createGain();
        o.frequency.value = f;
        o.type = "sine";
        g.gain.setValueAtTime(0.0001, t + i * 0.12);
        g.gain.exponentialRampToValueAtTime(0.12, t + i * 0.12 + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, t + i * 0.12 + 0.35);
        o.connect(g).connect(audioCtx.destination);
        o.start(t + i * 0.12);
        o.stop(t + i * 0.12 + 0.4);
      });
    } catch { /* audio unavailable */ }
  }
  function desktopNotify(title, body) {
    try {
      if ("Notification" in window && Notification.permission === "granted" && document.hidden) {
        new Notification(title, { body });
      }
    } catch { /* ignore */ }
  }

  function hydrateIcons(root = document) {
    $$("[data-icon]", root).forEach((n) => { n.outerHTML = icon(n.dataset.icon); });
  }

  function downloadBlob(blob, name) {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1500);
  }

  return {
    icon, esc, $, $$, ago, fmtDate, fmtDateTime, fmtSize, fmtNum, money, plural,
    hueOf, initialsOf, avatar, toast, openModal, closeModal, initTheme, chime,
    desktopNotify, hydrateIcons, downloadBlob,
  };
})();
