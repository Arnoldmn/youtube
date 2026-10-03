/* global ShoeStore */
(function () {
  const $ = (sel, el = document) => el.querySelector(sel);
  const $$ = (sel, el = document) => [...el.querySelectorAll(sel)];
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  const app = $("#app");

  let data = null;
  let filter = "active";
  let query = "";
  let fmt = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
  const money = (n) => fmt.format(n);
  const when = (ms) => new Date(ms).toLocaleString(undefined, { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });

  async function api(path, { method = "GET", body } = {}) {
    const res = await fetch(path, {
      method,
      credentials: "same-origin",
      headers: body ? { "Content-Type": "application/json" } : {},
      body: body ? JSON.stringify(body) : undefined,
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw Object.assign(new Error(json.error || `Request failed (${res.status})`), { status: res.status });
    return json;
  }

  function toast(msg, icon = "fa-circle-check") {
    const el = document.createElement("div");
    el.className = "toast";
    el.innerHTML = `<i class="fa-solid ${icon}"></i><span>${esc(msg)}</span>`;
    $("#toasts").appendChild(el);
    setTimeout(() => {
      el.classList.add("out");
      setTimeout(() => el.remove(), 350);
    }, 3200);
  }

  function renderLogin(error = "") {
    $("#refresh").hidden = $("#logout").hidden = true;
    app.innerHTML = `
      <form class="admin-login form" id="loginForm">
        <h2 class="modal-title">Order desk</h2>
        <p class="muted">Sign in to manage orders and send WhatsApp updates.</p>
        <p class="form-error">${esc(error)}</p>
        <label class="field">Admin password<input type="password" name="password" autocomplete="current-password" required></label>
        <button class="btn btn-primary btn-block" type="submit">Sign in</button>
      </form>`;
    $("#loginForm input").focus();
  }

  app.addEventListener("submit", async (e) => {
    if (e.target.id === "loginForm") {
      e.preventDefault();
      try {
        await api("/api/admin/login", { method: "POST", body: { password: e.target.password.value } });
        load();
      } catch (err) {
        renderLogin(err.message);
      }
    }
    if (e.target.matches("[data-update]")) {
      e.preventDefault();
      updateOrder(e.target);
    }
  });

  async function load() {
    try {
      data = await api("/api/admin/orders");
      try {
        fmt = new Intl.NumberFormat(data.locale, { style: "currency", currency: data.currency });
      } catch {
        /* default */
      }
      $("#refresh").hidden = $("#logout").hidden = false;
      render();
    } catch (err) {
      if (err.status === 401 || err.status === 503) renderLogin(err.status === 503 ? err.message : "");
      else toast(err.message, "fa-circle-xmark");
    }
  }

  const ACTIVE = ["pending", "confirmed", "packed", "shipped"];

  function render() {
    const orders = data.orders;
    const visible = orders.filter((o) => {
      if (filter === "active" && !ACTIVE.includes(o.status)) return false;
      if (filter !== "active" && filter !== "all" && o.status !== filter) return false;
      if (query) {
        const hay = `${o.id} ${o.customer.name} ${o.customer.phone} ${o.customer.email}`.toLowerCase();
        if (!hay.includes(query.toLowerCase())) return false;
      }
      return true;
    });
    const count = (s) => orders.filter((o) => o.status === s).length;
    const revenue = orders.filter((o) => o.status !== "cancelled" && o.status !== "pending").reduce((n, o) => n + o.totals.total, 0);
    const chips = [["active", "Active"], ["all", "All"], ...data.statuses.map((s) => [s.key, s.label])];

    app.innerHTML = `
      <div class="admin-top">
        <div><p class="kicker">Dashboard</p><h2 class="modal-title">Orders</h2></div>
      </div>
      <div class="banner ${data.autoTracking ? "ok" : ""}">
        ${
          data.autoTracking
            ? '<i class="fa-brands fa-whatsapp"></i> WhatsApp Cloud API is connected: customers get status updates automatically and can message an order number for instant tracking.'
            : '<i class="fa-brands fa-whatsapp"></i> Click-to-chat mode: after you update a status, WhatsApp opens with the update ready to send to the customer.'
        }
      </div>
      <div class="stats">
        <div class="stat"><b>${count("pending")}</b><span>Awaiting confirmation</span></div>
        <div class="stat"><b>${count("confirmed") + count("packed")}</b><span>To pack</span></div>
        <div class="stat"><b>${count("shipped")}</b><span>Out for delivery</span></div>
        <div class="stat"><b>${money(revenue)}</b><span>Confirmed sales</span></div>
      </div>
      <div class="admin-filters">
        ${chips.map(([k, l]) => `<button class="chip ${filter === k ? "active" : ""}" data-filter="${k}">${esc(l)}</button>`).join("")}
        <input type="search" id="q" placeholder="Search order, name, phone…" value="${esc(query)}">
      </div>
      ${visible.length ? visible.map(orderCard).join("") : `<div class="empty"><i class="fa-solid fa-inbox"></i><p>No orders here yet.</p></div>`}`;
  }

  function orderCard(o) {
    const t = o.totals;
    const chat = `https://wa.me/${o.customer.phone}?text=${encodeURIComponent(`Hi ${o.customer.name.split(" ")[0]}! This is Annie's Shoes World about your order ${o.id}.`)}`;
    return `<article class="order-card" data-id="${esc(o.id)}">
      <div>
        <h3>${esc(o.id)} <span class="status-pill status-${o.status}">${esc(ShoeStore.statusInfo(o.status)?.label || o.status)}</span></h3>
        <p class="muted">${when(o.createdAt)}</p>
        <ul>${o.items
          .map((l) => `<li>${l.qty}× ${esc(l.name)} <span class="muted">(${esc([l.colorName, l.size != null ? `Size ${l.size}` : ""].filter(Boolean).join(", "))})</span> — ${money(l.lineTotal)}</li>`)
          .join("")}</ul>
        <p style="margin-top:8px"><b>${money(t.total)}</b> <span class="muted">${t.discount ? `incl. ${esc(t.promoCode)} −${money(t.discount)} · ` : ""}delivery ${t.delivery ? money(t.delivery) : "free"}</span></p>
        <p class="muted">Payment: ${esc(o.payment)}</p>
      </div>
      <div>
        <p><b>${esc(o.customer.name)}</b></p>
        <p><a href="${esc(chat)}" target="_blank" rel="noopener" style="color:var(--wa-dark)"><i class="fa-brands fa-whatsapp"></i> +${esc(o.customer.phone)}</a></p>
        <p class="muted">${esc(o.customer.email)}</p>
        <p style="margin-top:8px">${esc(o.delivery.address)}, ${esc(o.delivery.city)}</p>
        ${o.delivery.notes ? `<p class="muted">“${esc(o.delivery.notes)}”</p>` : ""}
        <div class="history">${o.history.map((h) => `<span>${when(h.at)} · ${esc(ShoeStore.statusInfo(h.status)?.label)}${h.note ? ` — ${esc(h.note)}` : ""}</span>`).join("")}</div>
      </div>
      <form class="form" data-update>
        <label class="field">Update status
          <select name="status">${data.statuses.map((s) => `<option value="${s.key}" ${s.key === o.status ? "selected" : ""}>${esc(s.label)}</option>`).join("")}</select>
        </label>
        <label class="field">Note to customer (optional)
          <input name="note" maxlength="300" placeholder="e.g. Rider arrives 2–4pm">
        </label>
        <label class="check"><input type="checkbox" name="notify" checked> Notify customer on WhatsApp</label>
        <button class="btn btn-primary btn-sm" type="submit"><i class="fa-solid fa-paper-plane"></i> Save update</button>
      </form>
    </article>`;
  }

  async function updateOrder(form) {
    const id = form.closest(".order-card").dataset.id;
    const notify = form.notify.checked;
    // Open the WhatsApp tab synchronously so popup blockers allow it; filled in after the save.
    const tab = notify && !data.autoTracking ? window.open("", "_blank") : null;
    try {
      const res = await api(`/api/admin/orders/${encodeURIComponent(id)}`, {
        method: "PATCH",
        body: { status: form.status.value, note: form.note.value, notify },
      });
      const idx = data.orders.findIndex((o) => o.id === id);
      data.orders[idx] = res.order;
      if (notify && res.notified?.ok) toast(`Saved and sent to the customer on WhatsApp`);
      else if (notify) {
        if (res.notified?.error) toast(`Auto-send failed, opening WhatsApp instead`, "fa-triangle-exclamation");
        if (tab) tab.location.href = res.whatsappUrl;
        else window.open(res.whatsappUrl, "_blank", "noopener");
        toast(`Saved: send the update in WhatsApp`);
      } else toast("Status saved");
      render();
    } catch (err) {
      if (tab) tab.close();
      if (err.status === 401) return renderLogin("Session expired, please sign in again.");
      toast(err.message, "fa-circle-xmark");
    }
  }

  app.addEventListener("click", (e) => {
    const chip = e.target.closest("[data-filter]");
    if (chip) {
      filter = chip.dataset.filter;
      render();
    }
  });
  app.addEventListener("input", (e) => {
    if (e.target.id !== "q") return;
    query = e.target.value;
    const pos = e.target.selectionStart;
    render();
    const q = $("#q");
    q.focus();
    q.setSelectionRange(pos, pos);
  });
  $("#refresh").addEventListener("click", load);
  $("#logout").addEventListener("click", async () => {
    await api("/api/admin/logout", { method: "POST", body: {} }).catch(() => {});
    renderLogin();
  });

  load();
})();
