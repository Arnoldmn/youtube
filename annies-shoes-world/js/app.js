/* global PRODUCTS, PROMO_CODES, ShoeStore, shoeSVG */
(function () {
  const S = ShoeStore;
  const $ = (sel, el = document) => el.querySelector(sel);
  const $$ = (sel, el = document) => [...el.querySelectorAll(sel)];
  const money = (n) => `$${n.toFixed(2).replace(/\.00$/, "")}`;
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  const byId = Object.fromEntries(PRODUCTS.map((p) => [p.id, p]));

  // ---------- Persistence (best effort; the store works without it) ----------
  const storage = {
    get(key, fallback) {
      try {
        const v = localStorage.getItem(key);
        return v ? JSON.parse(v) : fallback;
      } catch {
        return fallback;
      }
    },
    set(key, value) {
      try {
        localStorage.setItem(key, JSON.stringify(value));
      } catch {
        /* ignore */
      }
    },
  };

  // ---------- State ----------
  const ALL_SIZES = [...new Set(PRODUCTS.flatMap((p) => p.sizes))].sort((a, b) => a - b);
  const MAX_PRICE = Math.ceil(Math.max(...PRODUCTS.map(S.unitPrice)) / 5) * 5;
  const defaultFilters = () => ({ query: "", category: "All", brands: [], genders: [], size: null, maxPrice: MAX_PRICE, onSale: false });

  const state = {
    filters: defaultFilters(),
    sort: "featured",
    cart: storage.get("asw:cart", []).filter((l) => byId[l.id]),
    wishlist: storage.get("asw:wish", []).filter((id) => byId[id]),
    promo: storage.get("asw:promo", null),
    cardColor: {},
    modal: null,
  };

  const saveCart = () => {
    storage.set("asw:cart", state.cart);
    storage.set("asw:promo", state.promo);
  };
  const saveWish = () => storage.set("asw:wish", state.wishlist);

  // ---------- Small render helpers ----------
  const priceHTML = (p) =>
    p.salePrice != null
      ? `<span class="price"><span class="now">${money(p.salePrice)}</span><s>${money(p.price)}</s></span>`
      : `<span class="price">${money(p.price)}</span>`;

  const starsHTML = (p) => {
    const full = Math.round(p.rating);
    return `<span class="rating" aria-label="${p.rating} out of 5">${"★".repeat(full)}${"☆".repeat(5 - full)}<span>${p.rating} (${p.reviews})</span></span>`;
  };

  const swatchHTML = (c, i, active, extra = "") =>
    `<button class="swatch ${extra} ${active ? "active" : ""}" style="--c1:${c.upper};--c2:${c.accent}" data-color="${i}" aria-label="${esc(c.name)}" title="${esc(c.name)}"></button>`;

  const art = (p, idx = 0) => shoeSVG(p.colorways[idx], p.silhouette, { title: esc(`${p.name} in ${p.colorways[idx].name}`) });

  // ---------- Toasts ----------
  function toast(msg, icon = "fa-circle-check") {
    const el = document.createElement("div");
    el.className = "toast";
    el.innerHTML = `<i class="fa-solid ${icon}"></i><span>${msg}</span>`;
    $("#toasts").appendChild(el);
    setTimeout(() => {
      el.classList.add("out");
      el.addEventListener("animationend", () => el.remove(), { once: true });
      setTimeout(() => el.remove(), 400);
    }, 2400);
  }

  function bump(el) {
    el.classList.remove("bump");
    void el.offsetWidth;
    el.classList.add("bump");
  }

  // ---------- Overlays ----------
  const scrim = $("#scrim");
  let openEl = null;

  function openOverlay(el) {
    if (openEl && openEl !== el) closeOverlay(false);
    openEl = el;
    el.classList.add("open");
    el.setAttribute("aria-hidden", "false");
    scrim.hidden = false;
    document.body.classList.add("locked");
    const focusable = el.querySelector("button, input, select, a[href]");
    if (focusable) setTimeout(() => focusable.focus({ preventScroll: true }), 50);
  }

  function closeOverlay(hideScrim = true) {
    if (!openEl) return;
    openEl.classList.remove("open");
    openEl.setAttribute("aria-hidden", "true");
    if (openEl.id === "productModal") state.modal = null;
    openEl = null;
    if (hideScrim) {
      scrim.hidden = true;
      document.body.classList.remove("locked");
    }
  }

  scrim.addEventListener("click", () => closeOverlay());
  document.addEventListener("keydown", (e) => e.key === "Escape" && closeOverlay());
  document.addEventListener("click", (e) => {
    if (e.target.closest("[data-close]")) closeOverlay();
    // clicking the modal backdrop (outside the card) closes it
    if (e.target.classList && e.target.classList.contains("modal")) closeOverlay();
  });

  // ---------- Hero ----------
  function renderHero() {
    const hero = byId["w-orbit-1"];
    let idx = 0;
    const paint = () => {
      $("#heroShoe").innerHTML = art(hero, idx);
      $("#heroSwatches").innerHTML = hero.colorways.map((c, i) => swatchHTML(c, i, i === idx)).join("");
    };
    paint();
    $("#heroSwatches").addEventListener("click", (e) => {
      const b = e.target.closest("[data-color]");
      if (!b) return;
      idx = Number(b.dataset.color);
      paint();
    });
    $("#heroShop").addEventListener("click", () => openProduct(hero.id, idx));
  }

  function startCountdown() {
    // Drops land every Friday at 10:00 local time.
    const nextDrop = () => {
      const d = new Date();
      d.setHours(10, 0, 0, 0);
      const add = (5 - d.getDay() + 7) % 7;
      d.setDate(d.getDate() + add);
      if (d <= new Date()) d.setDate(d.getDate() + 7);
      return d;
    };
    let target = nextDrop();
    const cells = Object.fromEntries($$("[data-cd]").map((el) => [el.dataset.cd, el]));
    const tick = () => {
      let diff = target - new Date();
      if (diff <= 0) {
        target = nextDrop();
        diff = target - new Date();
      }
      const s = Math.floor(diff / 1000);
      const parts = { d: Math.floor(s / 86400), h: Math.floor((s % 86400) / 3600), m: Math.floor((s % 3600) / 60), s: s % 60 };
      for (const k in parts) cells[k].textContent = String(parts[k]).padStart(2, "0");
    };
    tick();
    setInterval(tick, 1000);
  }

  // ---------- Filters ----------
  function renderFilterControls() {
    const categories = ["All", ...new Set(PRODUCTS.map((p) => p.category))];
    $("#categoryChips").innerHTML = categories
      .map((c) => `<button class="chip ${state.filters.category === c ? "active" : ""}" data-category="${c}">${c}</button>`)
      .join("");

    const brands = [...new Set(PRODUCTS.map((p) => p.brand))];
    $("#brandFilters").innerHTML = brands
      .map(
        (b) => `<label class="check"><input type="checkbox" value="${esc(b)}" ${state.filters.brands.includes(b) ? "checked" : ""}>
        <span>${esc(b)}</span><span class="count">${PRODUCTS.filter((p) => p.brand === b).length}</span></label>`
      )
      .join("");

    $("#genderFilters").innerHTML = ["Men", "Women"]
      .map(
        (g) => `<label class="check"><input type="checkbox" value="${g}" ${state.filters.genders.includes(g) ? "checked" : ""}> <span>${g}</span></label>`
      )
      .join("");

    $("#sizeFilters").innerHTML = ALL_SIZES.map(
      (s) => `<button class="size-btn ${state.filters.size === s ? "active" : ""}" data-size="${s}">${s}</button>`
    ).join("");

    const range = $("#priceRange");
    range.max = MAX_PRICE;
    range.value = state.filters.maxPrice;
    $("#priceLabel").textContent = money(state.filters.maxPrice);
    $("#saleOnly").checked = state.filters.onSale;
    $("#sort").value = state.sort;
    $("#search").value = state.filters.query;
  }

  function setFilters(patch) {
    Object.assign(state.filters, patch);
    renderFilterControls();
    renderGrid();
  }

  $("#categoryChips").addEventListener("click", (e) => {
    const b = e.target.closest("[data-category]");
    if (b) setFilters({ category: b.dataset.category });
  });
  $("#brandFilters").addEventListener("change", () =>
    setFilters({ brands: $$("#brandFilters input:checked").map((i) => i.value) })
  );
  $("#genderFilters").addEventListener("change", () =>
    setFilters({ genders: $$("#genderFilters input:checked").map((i) => i.value) })
  );
  $("#sizeFilters").addEventListener("click", (e) => {
    const b = e.target.closest("[data-size]");
    if (!b) return;
    const size = Number(b.dataset.size);
    setFilters({ size: state.filters.size === size ? null : size });
  });
  $("#priceRange").addEventListener("input", (e) => {
    state.filters.maxPrice = Number(e.target.value);
    $("#priceLabel").textContent = money(state.filters.maxPrice);
    renderGrid();
  });
  $("#saleOnly").addEventListener("change", (e) => setFilters({ onSale: e.target.checked }));
  $("#sort").addEventListener("change", (e) => {
    state.sort = e.target.value;
    renderGrid();
  });

  let searchTimer;
  $("#search").addEventListener("input", (e) => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
      state.filters.query = e.target.value;
      renderGrid();
      if (e.target.value && window.scrollY < $("#shop").offsetTop - 200) {
        $("#shop").scrollIntoView({ behavior: "smooth" });
      }
    }, 180);
  });

  const resetFilters = () => {
    state.filters = defaultFilters();
    state.sort = "featured";
    renderFilterControls();
    renderGrid();
  };
  $("#clearFilters").addEventListener("click", resetFilters);
  $("#emptyReset").addEventListener("click", resetFilters);

  const filtersEl = $("#filters");
  $("#openFilters").addEventListener("click", () => openOverlay(filtersEl));
  $("#closeFilters").addEventListener("click", () => closeOverlay());

  // Header nav shortcuts
  function applyNav(el) {
    const patch = { ...defaultFilters() };
    if (el.dataset.navGender) patch.genders = [el.dataset.navGender];
    if (el.dataset.navSale) patch.onSale = true;
    state.filters = patch;
    renderFilterControls();
    renderGrid();
  }
  $$("#nav a").forEach((a) => a.addEventListener("click", () => applyNav(a)));

  $("#mobileLinks").innerHTML = $$("#nav a").map((a) => a.outerHTML).join("");
  $$("#mobileLinks a").forEach((a) =>
    a.addEventListener("click", () => {
      applyNav(a);
      closeOverlay();
    })
  );
  $("#burger").addEventListener("click", () => openOverlay($("#mobileMenu")));

  // ---------- Product grid ----------
  function cardHTML(p) {
    const idx = state.cardColor[p.id] ?? 0;
    const wished = state.wishlist.includes(p.id);
    const tags = p.tags.map((t) => `<span class="tag tag-${t}">${t}</span>`).join("");
    return `<article class="card" data-id="${p.id}">
      <button class="card-media" data-open aria-label="View ${esc(p.name)}" style="--glow:${p.colorways[idx].upper}33">
        ${art(p, idx)}
      </button>
      <div class="tags">${tags}</div>
      <button class="wish ${wished ? "on" : ""}" data-wish aria-label="${wished ? "Remove from" : "Add to"} wishlist" aria-pressed="${wished}">
        <i class="fa-${wished ? "solid" : "regular"} fa-heart"></i>
      </button>
      <div class="card-body">
        <div class="card-meta"><span>${esc(p.brand)}</span><span>${p.category}</span></div>
        <h3 class="card-title" data-open>${esc(p.name)}</h3>
        ${starsHTML(p)}
        <div class="card-swatches">${p.colorways.map((c, i) => swatchHTML(c, i, i === idx, "sm")).join("")}</div>
        <div class="card-foot">
          ${priceHTML(p)}
          <button class="quick-add" data-open aria-label="Choose size for ${esc(p.name)}"><i class="fa-solid fa-plus"></i></button>
        </div>
      </div>
    </article>`;
  }

  function renderGrid() {
    const list = S.sortProducts(S.filterProducts(PRODUCTS, state.filters), state.sort);
    $("#grid").innerHTML = list.map(cardHTML).join("");
    $("#empty").hidden = list.length > 0;
    $("#resultCount").textContent = `${list.length} ${list.length === 1 ? "style" : "styles"}`;
  }

  $("#grid").addEventListener("click", (e) => {
    const card = e.target.closest(".card");
    if (!card) return;
    const id = card.dataset.id;
    const sw = e.target.closest("[data-color]");
    if (sw) {
      state.cardColor[id] = Number(sw.dataset.color);
      card.outerHTML = cardHTML(byId[id]);
      return;
    }
    if (e.target.closest("[data-wish]")) return toggleWish(id);
    if (e.target.closest("[data-open]")) openProduct(id, state.cardColor[id] ?? 0);
  });

  // ---------- Wishlist ----------
  function toggleWish(id) {
    const on = state.wishlist.includes(id);
    state.wishlist = on ? state.wishlist.filter((x) => x !== id) : [...state.wishlist, id];
    saveWish();
    renderGrid();
    renderWishlist();
    if (state.modal && state.modal.id === id) renderProductModal();
    if (!on) {
      bump($("#wishCount"));
      toast(`${esc(byId[id].name)} saved to wishlist`, "fa-heart");
    }
  }

  function renderWishlist() {
    $("#wishCount").textContent = state.wishlist.length;
    $("#wishCount").hidden = state.wishlist.length === 0;
    $("#wishItems").innerHTML = state.wishlist.length
      ? state.wishlist
          .map((id) => {
            const p = byId[id];
            return `<div class="line-item" data-id="${id}">
              <div class="line-thumb">${art(p)}</div>
              <div class="line-info"><h4>${esc(p.name)}</h4><p>${esc(p.brand)} · ${p.category}</p>${priceHTML(p)}</div>
              <div class="line-price">
                <button class="btn btn-primary btn-sm" data-view>View</button>
                <button class="link-btn" data-unwish>Remove</button>
              </div>
            </div>`;
          })
          .join("")
      : `<div class="drawer-empty"><i class="fa-regular fa-heart"></i><p>Nothing saved yet. Tap the heart on any pair.</p></div>`;
  }

  $("#wishItems").addEventListener("click", (e) => {
    const row = e.target.closest(".line-item");
    if (!row) return;
    if (e.target.closest("[data-unwish]")) toggleWish(row.dataset.id);
    if (e.target.closest("[data-view]")) openProduct(row.dataset.id, 0);
  });
  $("#wishlistBtn").addEventListener("click", () => openOverlay($("#wishDrawer")));

  // ---------- Product modal ----------
  function openProduct(id, colorIdx = 0) {
    state.modal = { id, colorIdx, size: null, qty: 1, hint: "" };
    renderProductModal();
    openOverlay($("#productModal"));
  }

  function renderProductModal() {
    const m = state.modal;
    if (!m) return;
    const p = byId[m.id];
    const c = p.colorways[m.colorIdx];
    const wished = state.wishlist.includes(p.id);
    $("#productModalBody").innerHTML = `
      <button class="icon-btn modal-close" data-close aria-label="Close"><i class="fa-solid fa-xmark"></i></button>
      <div class="pm-media" style="--glow:${c.upper}44">${art(p, m.colorIdx)}</div>
      <div class="pm-info">
        <div class="card-meta"><span>${esc(p.brand)} · ${p.gender}</span><span>${p.category}</span></div>
        <h2>${esc(p.name)}</h2>
        ${starsHTML(p)}
        ${priceHTML(p)}
        <p>${esc(p.description)}</p>
        <div class="pm-label">Colorway <b>${esc(c.name)}</b></div>
        <div class="hero-swatches" data-pm-colors>${p.colorways.map((cw, i) => swatchHTML(cw, i, i === m.colorIdx)).join("")}</div>
        <div class="pm-label">Select size (US) <b>${m.size ?? ""}</b></div>
        <div class="size-grid pm-sizes" data-pm-sizes>
          ${p.sizes
            .map((s) => {
              const out = p.soldOut.includes(s);
              return `<button class="size-btn ${m.size === s ? "active" : ""}" data-size="${s}" ${out ? "disabled aria-label='Size " + s + " sold out'" : ""}>${s}</button>`;
            })
            .join("")}
        </div>
        <p class="size-hint">${m.hint}</p>
        <div class="pm-actions">
          <div class="qty" data-pm-qty>
            <button data-step="-1" aria-label="Decrease quantity"><i class="fa-solid fa-minus"></i></button>
            <span>${m.qty}</span>
            <button data-step="1" aria-label="Increase quantity"><i class="fa-solid fa-plus"></i></button>
          </div>
          <button class="btn btn-primary" data-add><i class="fa-solid fa-bag-shopping"></i> Add to bag · ${money(S.unitPrice(p) * m.qty)}</button>
          <button class="wish ${wished ? "on" : ""}" data-wish aria-label="Toggle wishlist"><i class="fa-${wished ? "solid" : "regular"} fa-heart"></i></button>
        </div>
        <p class="muted" style="font-size:13px"><i class="fa-solid fa-truck-fast"></i> Free shipping over ${money(S.FREE_SHIPPING_THRESHOLD)} · 30-day free returns</p>
      </div>`;
  }

  $("#productModalBody").addEventListener("click", (e) => {
    const m = state.modal;
    if (!m) return;
    const p = byId[m.id];
    const color = e.target.closest("[data-pm-colors] [data-color]");
    const size = e.target.closest("[data-pm-sizes] [data-size]");
    const step = e.target.closest("[data-step]");
    if (color) m.colorIdx = Number(color.dataset.color);
    else if (size) {
      m.size = Number(size.dataset.size);
      m.hint = "";
    } else if (step) m.qty = Math.max(1, Math.min(10, m.qty + Number(step.dataset.step)));
    else if (e.target.closest("[data-wish]")) return toggleWish(p.id);
    else if (e.target.closest("[data-add]")) {
      if (m.size == null) {
        m.hint = "Pick a size first 👟";
        renderProductModal();
        return;
      }
      addItem({ id: p.id, colorway: m.colorIdx, size: m.size, qty: m.qty });
      closeOverlay(false);
      openOverlay($("#cartDrawer"));
      return;
    } else return;
    renderProductModal();
  });

  // ---------- Cart ----------
  function addItem(item) {
    state.cart = S.addToCart(state.cart, item);
    saveCart();
    renderCart();
    bump($("#cartCount"));
    toast(`Added ${esc(byId[item.id].name)} (US ${item.size}) to bag`);
  }

  function renderCart() {
    const t = S.cartTotals(state.cart, PRODUCTS, state.promo, PROMO_CODES);
    if (state.promo && !t.promo) state.promo = null;
    $("#cartCount").textContent = t.count;
    $("#cartCount").hidden = t.count === 0;
    $("#cartHeadCount").textContent = t.count ? `(${t.count})` : "";

    const remaining = S.FREE_SHIPPING_THRESHOLD - (t.subtotal - t.discount);
    $("#shipMeter").innerHTML = t.count
      ? `${remaining > 0 ? `You're <b>${money(remaining)}</b> away from free shipping` : "🎉 You've unlocked <b>free shipping</b>"}
         <div class="meter"><i style="width:${Math.min(100, ((t.subtotal - t.discount) / S.FREE_SHIPPING_THRESHOLD) * 100)}%"></i></div>`
      : "";

    if (!state.cart.length) {
      $("#cartItems").innerHTML = `<div class="drawer-empty"><i class="fa-solid fa-bag-shopping"></i><p>Your bag is empty.<br>Let's fix that.</p>
        <button class="btn btn-primary btn-sm" data-close>Start shopping</button></div>`;
      $("#cartFoot").innerHTML = "";
      return;
    }

    $("#cartItems").innerHTML = state.cart
      .map((l) => {
        const p = byId[l.id];
        const key = S.lineKey(l);
        return `<div class="line-item" data-key="${esc(key)}">
          <div class="line-thumb">${art(p, l.colorway)}</div>
          <div class="line-info">
            <h4>${esc(p.name)}</h4>
            <p>${esc(p.colorways[l.colorway].name)} · US ${l.size}</p>
            <div class="qty">
              <button data-qty="-1" aria-label="Decrease"><i class="fa-solid fa-minus"></i></button>
              <span>${l.qty}</span>
              <button data-qty="1" aria-label="Increase"><i class="fa-solid fa-plus"></i></button>
            </div>
          </div>
          <div class="line-price">
            <span>${money(S.unitPrice(p) * l.qty)}</span>
            <button class="link-btn" data-remove>Remove</button>
          </div>
        </div>`;
      })
      .join("");

    $("#cartFoot").innerHTML = `
      <form class="promo" id="promoForm">
        <input id="promoInput" placeholder="Promo code" value="${state.promo ? esc(state.promo) : ""}" aria-label="Promo code" autocomplete="off">
        <button class="btn btn-ghost btn-sm" type="submit">${state.promo ? "Update" : "Apply"}</button>
      </form>
      ${totalsHTML(t)}
      <button class="btn btn-primary btn-block" id="checkoutBtn">Checkout · ${money(t.total)}</button>`;
  }

  function totalsHTML(t) {
    return `<div class="totals">
      <div><span>Subtotal</span><span>${money(t.subtotal)}</span></div>
      ${t.discount ? `<div class="disc"><span>Promo (${esc(state.promo)} · ${t.promo.label})</span><span>−${money(t.discount)}</span></div>` : ""}
      <div><span>Shipping</span><span>${t.shipping ? money(t.shipping) : "Free"}</span></div>
      <div><span>Est. tax</span><span>${money(t.tax)}</span></div>
      <div class="grand"><span>Total</span><span>${money(t.total)}</span></div>
    </div>`;
  }

  $("#cartItems").addEventListener("click", (e) => {
    const row = e.target.closest(".line-item");
    if (!row) return;
    const key = row.dataset.key;
    const line = state.cart.find((l) => S.lineKey(l) === key);
    if (!line) return;
    const q = e.target.closest("[data-qty]");
    if (q) state.cart = S.updateQty(state.cart, key, line.qty + Number(q.dataset.qty));
    else if (e.target.closest("[data-remove]")) state.cart = S.updateQty(state.cart, key, 0);
    else return;
    saveCart();
    renderCart();
  });

  $("#cartFoot").addEventListener("submit", (e) => {
    if (e.target.id !== "promoForm") return;
    e.preventDefault();
    const code = $("#promoInput").value.trim().toUpperCase();
    if (!code) {
      state.promo = null;
    } else if (PROMO_CODES[code]) {
      state.promo = code;
      toast(`Code ${esc(code)} applied — ${PROMO_CODES[code].label}`, "fa-tag");
    } else {
      toast("That code isn't valid", "fa-circle-xmark");
      return;
    }
    saveCart();
    renderCart();
  });

  $("#cartFoot").addEventListener("click", (e) => {
    if (e.target.closest("#checkoutBtn")) openCheckout();
  });
  $("#cartBtn").addEventListener("click", () => openOverlay($("#cartDrawer")));

  // ---------- Checkout (demo — nothing is sent anywhere) ----------
  const FIELDS = [
    { id: "name", label: "Full name", full: true, autocomplete: "name", validate: (v) => v.trim().length >= 2 || "Enter your name" },
    { id: "email", label: "Email", type: "email", autocomplete: "email", validate: (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) || "Enter a valid email" },
    { id: "phone", label: "Phone", type: "tel", autocomplete: "tel", validate: (v) => v.replace(/\D/g, "").length >= 7 || "Enter a valid phone" },
    { id: "address", label: "Street address", full: true, autocomplete: "street-address", validate: (v) => v.trim().length >= 5 || "Enter your address" },
    { id: "city", label: "City", autocomplete: "address-level2", validate: (v) => v.trim().length >= 2 || "Enter your city" },
    { id: "zip", label: "ZIP / Postal code", autocomplete: "postal-code", validate: (v) => /^[A-Za-z0-9 -]{3,10}$/.test(v.trim()) || "Enter a valid code" },
  ];

  function openCheckout() {
    const t = S.cartTotals(state.cart, PRODUCTS, state.promo, PROMO_CODES);
    if (!t.count) return;
    $("#checkoutBody").innerHTML = `
      <button class="icon-btn modal-close" data-close aria-label="Close"><i class="fa-solid fa-xmark"></i></button>
      <h2>Checkout</h2>
      <p class="muted">Almost there — where should we send your kicks?</p>
      <div class="co-grid">
        <form class="co-form" id="coForm" novalidate>
          ${FIELDS.map(
            (f) => `<label class="field ${f.full ? "full" : ""}" data-field="${f.id}">${f.label}
              <input name="${f.id}" type="${f.type || "text"}" autocomplete="${f.autocomplete}">
              <span class="err"></span></label>`
          ).join("")}
          <label class="field full">Country
            <select name="country">
              <option>United States</option><option>Canada</option><option>United Kingdom</option>
              <option>Kenya</option><option>Nigeria</option><option>South Africa</option><option>Australia</option>
            </select>
          </label>
          <div class="pay-opts" role="radiogroup" aria-label="Payment method">
            <label class="pay-opt"><input type="radio" name="pay" value="card" checked><i class="fa-regular fa-credit-card"></i> Card</label>
            <label class="pay-opt"><input type="radio" name="pay" value="mobile"><i class="fa-solid fa-mobile-screen"></i> Mobile money</label>
            <label class="pay-opt"><input type="radio" name="pay" value="cod"><i class="fa-solid fa-hand-holding-dollar"></i> On delivery</label>
          </div>
          <p class="demo-note"><i class="fa-solid fa-circle-info"></i> Demo store: no payment is taken and no details leave your browser.</p>
          <button class="btn btn-primary btn-block" style="grid-column:1/-1" type="submit">Place order · ${money(t.total)}</button>
        </form>
        <div class="co-summary">
          <h4>Order summary</h4>
          ${state.cart
            .map((l) => {
              const p = byId[l.id];
              return `<div class="co-line"><span>${l.qty}× ${esc(p.name)} · US ${l.size}</span><span>${money(S.unitPrice(p) * l.qty)}</span></div>`;
            })
            .join("")}
          ${totalsHTML(t)}
        </div>
      </div>`;
    closeOverlay(false);
    openOverlay($("#checkoutModal"));
  }

  $("#checkoutBody").addEventListener("submit", (e) => {
    if (e.target.id !== "coForm") return;
    e.preventDefault();
    const form = e.target;
    let firstBad = null;
    for (const f of FIELDS) {
      const input = form.elements[f.id];
      const res = f.validate(input.value);
      const wrap = form.querySelector(`[data-field="${f.id}"]`);
      wrap.classList.toggle("invalid", res !== true);
      wrap.querySelector(".err").textContent = res === true ? "" : res;
      if (res !== true && !firstBad) firstBad = input;
    }
    if (firstBad) {
      firstBad.focus();
      return;
    }
    const name = form.elements.name.value.trim().split(" ")[0];
    const email = form.elements.email.value.trim();
    const orderNo = `ASW-${Date.now().toString(36).toUpperCase().slice(-6)}`;
    const total = S.cartTotals(state.cart, PRODUCTS, state.promo, PROMO_CODES).total;
    state.cart = [];
    state.promo = null;
    saveCart();
    renderCart();
    $("#checkoutBody").innerHTML = `
      <button class="icon-btn modal-close" data-close aria-label="Close"><i class="fa-solid fa-xmark"></i></button>
      <div class="success">
        <div class="tick"><i class="fa-solid fa-check"></i></div>
        <h2>You're all set, ${esc(name)}!</h2>
        <p>Order <b>${orderNo}</b> (${money(total)}) is confirmed. A receipt is heading to <b>${esc(email)}</b>. Fresh kicks incoming 👟</p>
        <button class="btn btn-primary" data-close>Keep shopping</button>
      </div>`;
  });

  $("#checkoutBody").addEventListener("input", (e) => {
    const wrap = e.target.closest(".field.invalid");
    if (wrap) {
      wrap.classList.remove("invalid");
      wrap.querySelector(".err").textContent = "";
    }
  });

  // ---------- Newsletter ----------
  $("#newsletterForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const input = $("#newsletterEmail");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.value)) {
      toast("Enter a valid email", "fa-circle-xmark");
      input.focus();
      return;
    }
    input.value = "";
    toast("You're on the list! Watch your inbox 💌", "fa-envelope");
  });

  // ---------- Boot ----------
  $("#year").textContent = new Date().getFullYear();
  renderHero();
  startCountdown();
  renderFilterControls();
  renderGrid();
  renderCart();
  renderWishlist();
})();
