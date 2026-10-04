/* global PRODUCTS, CATEGORIES, HERO_SLIDES, PROMO_CODES, ShoeStore, productSVG, productArt */
(function () {
  const S = ShoeStore;
  const $ = (sel, el = document) => el.querySelector(sel);
  const $$ = (sel, el = document) => [...el.querySelectorAll(sel)];
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  const byId = Object.fromEntries(PRODUCTS.map((p) => [p.id, p]));

  // ---------- Config, money, API ----------
  let config = { storeName: "Annie's Shoes World", whatsappNumber: "", currency: "USD", locale: "en-US", paymentMethods: [], autoTracking: false };
  let fmt = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
  const money = (n) => fmt.format(n).replace(/\.00$/, "");

  async function api(path, { method = "GET", body } = {}) {
    let res;
    try {
      res = await fetch(path, {
        method,
        credentials: "same-origin",
        headers: body ? { "Content-Type": "application/json" } : {},
        body: body ? JSON.stringify(body) : undefined,
      });
    } catch {
      throw Object.assign(new Error("Can't reach the shop server. Check your connection and try again."), { network: true });
    }
    let data = {};
    try {
      data = await res.json();
    } catch {
      /* non-JSON */
    }
    if (!res.ok) throw Object.assign(new Error(data.error || `Request failed (${res.status})`), { status: res.status, fields: data.fields || {} });
    return data;
  }

  const waChatUrl = (text) => (config.whatsappNumber ? `https://wa.me/${config.whatsappNumber}?text=${encodeURIComponent(text)}` : null);

  // ---------- Persistence (best effort) ----------
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
  const MAX_PRICE = Math.ceil(Math.max(...PRODUCTS.map(S.unitPrice)) / 10) * 10;
  const defaultFilters = () => ({ query: "", category: "All", types: [], maxPrice: MAX_PRICE, onSale: false });

  const state = {
    filters: defaultFilters(),
    sort: "featured",
    cart: storage.get("asw:cart", []).filter((l) => byId[l.id] && byId[l.id].colorways[l.colorway]),
    wishlist: storage.get("asw:wish", []).filter((id) => byId[id]),
    promo: storage.get("asw:promo", null),
    cardColor: {},
    modal: null,
    user: null,
    orders: null,
    afterAuth: null,
  };
  const saveCart = () => {
    storage.set("asw:cart", state.cart);
    storage.set("asw:promo", state.promo);
  };
  const saveWish = () => storage.set("asw:wish", state.wishlist);

  // ---------- Render helpers ----------
  const priceHTML = (p) =>
    p.salePrice != null
      ? `<span class="price"><span class="now">${money(p.salePrice)}</span><s>${money(p.price)}</s></span>`
      : `<span class="price">${money(p.price)}</span>`;

  const starsHTML = (p) => {
    const full = Math.round(p.rating);
    return `<span class="rating" aria-label="${p.rating} out of 5">${"★".repeat(full)}${"☆".repeat(5 - full)}<span>${p.rating} (${p.reviews})</span></span>`;
  };

  const swatchHTML = (c, i, active, extra = "") =>
    `<button class="swatch ${extra} ${active ? "active" : ""}" style="--c1:${c.main};--c2:${c.accent}" data-color="${i}" aria-label="${esc(c.name)}" title="${esc(c.name)}"></button>`;

  const tint = (p, idx) => `${p.colorways[idx].main}26`;
  const sizeLabel = (p, size) => (size == null ? "" : p.category === "Shoes" ? `US ${size}` : `Size ${size}`);
  const optionsLabel = (p, l) => [p.colorways[l.colorway].name, sizeLabel(p, l.size)].filter(Boolean).join(" · ");
  const fmtDate = (ms) => new Date(ms).toLocaleString(config.locale, { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
  const initial = (name) => esc((name || "?").trim().charAt(0).toUpperCase());

  // Swap a broken photo for the built-in illustration.
  document.addEventListener(
    "error",
    (e) => {
      const img = e.target;
      if (!(img instanceof HTMLImageElement) || !img.dataset.artFallback) return;
      const [id, idx] = img.dataset.artFallback.split("|");
      if (byId[id]) img.outerHTML = productSVG(byId[id], Number(idx));
    },
    true
  );

  // ---------- Toasts ----------
  function toast(msg, icon = "fa-circle-check") {
    const el = document.createElement("div");
    el.className = "toast";
    el.innerHTML = `<i class="fa-solid ${icon}"></i><span>${msg}</span>`;
    $("#toasts").appendChild(el);
    setTimeout(() => {
      el.classList.add("out");
      setTimeout(() => el.remove(), 350);
    }, 2600);
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
    const focusable = el.querySelector("input:not([type=hidden]), button:not([data-close]), select, a[href]");
    if (focusable) setTimeout(() => focusable.focus({ preventScroll: true }), 60);
  }

  function closeOverlay(hideScrim = true) {
    if (!openEl) return;
    openEl.classList.remove("open");
    openEl.setAttribute("aria-hidden", "true");
    if (openEl.id === "productModal") state.modal = null;
    if (openEl.id === "trackModal" && location.hash.startsWith("#/track")) history.replaceState(null, "", location.pathname + location.search);
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
    if (e.target.classList && e.target.classList.contains("modal")) closeOverlay();
  });

  // ---------- Hero slider ----------
  const SLIDE_MS = 6000;
  const slider = $("#slider");
  let slideIdx = 0;
  let slideTimer = null;

  function renderSlider() {
    $("#slides").innerHTML = HERO_SLIDES.map((s, i) => {
      const p = byId[s.productId];
      const art = s.image
        ? `<div class="slide-photo"><img src="${esc(s.image)}" alt="" ${i ? 'loading="lazy"' : ""}></div>`
        : "";
      return `<div class="slide ${i === 0 ? "active" : ""} ${s.image ? "has-photo" : ""}" style="background:${s.bg}" role="group" aria-roledescription="slide" aria-label="${i + 1} of ${HERO_SLIDES.length}">
        ${art}
        <div class="slide-copy">
          <p class="kicker">${esc(s.eyebrow)}</p>
          <h1>${esc(s.title)}</h1>
          <p>${esc(s.text)}</p>
          <div class="slide-ctas">
            <button class="btn btn-primary" data-slide-shop="${esc(s.category)}">${esc(s.cta)} <i class="fa-solid fa-arrow-right"></i></button>
            ${p ? `<button class="btn btn-ghost" data-slide-product="${p.id}">View ${esc(p.name)}</button>` : ""}
          </div>
        </div>
        <div class="slide-art">${p ? productSVG(p, 0) : ""}</div>
      </div>`;
    }).join("");
    $("#slideDots").innerHTML = HERO_SLIDES.map(
      (s, i) => `<button role="tab" aria-label="Slide ${i + 1}: ${esc(s.eyebrow)}" aria-selected="${i === 0}" class="${i === 0 ? "active" : ""}"><i></i></button>`
    ).join("");
    slider.style.setProperty("--slide-ms", `${SLIDE_MS}ms`);
    // A broken hero photo falls back to the illustration layout.
    $$("#slides .slide-photo img").forEach((img) =>
      img.addEventListener("error", () => {
        const slide = img.closest(".slide");
        slide.classList.remove("has-photo");
        img.parentElement.remove();
      })
    );
  }

  function goTo(i) {
    const slides = $$("#slides .slide");
    const dots = $$("#slideDots button");
    slideIdx = (i + slides.length) % slides.length;
    slides.forEach((el, n) => el.classList.toggle("active", n === slideIdx));
    dots.forEach((el, n) => {
      el.classList.toggle("active", n === slideIdx);
      el.setAttribute("aria-selected", n === slideIdx);
    });
    restartAutoplay();
  }

  function restartAutoplay() {
    clearInterval(slideTimer);
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    slideTimer = setInterval(() => !slider.classList.contains("paused") && goTo(slideIdx + 1), SLIDE_MS);
  }

  function initSlider() {
    renderSlider();
    $("#slidePrev").addEventListener("click", () => goTo(slideIdx - 1));
    $("#slideNext").addEventListener("click", () => goTo(slideIdx + 1));
    $("#slideDots").addEventListener("click", (e) => {
      const b = e.target.closest("button");
      if (b) goTo($$("#slideDots button").indexOf(b));
    });
    slider.addEventListener("mouseenter", () => slider.classList.add("paused"));
    slider.addEventListener("mouseleave", () => slider.classList.remove("paused"));
    slider.addEventListener("focusin", () => slider.classList.add("paused"));
    slider.addEventListener("focusout", () => slider.classList.remove("paused"));
    slider.addEventListener("keydown", (e) => {
      if (e.key === "ArrowLeft") goTo(slideIdx - 1);
      if (e.key === "ArrowRight") goTo(slideIdx + 1);
    });
    let x0 = null;
    slider.addEventListener("touchstart", (e) => (x0 = e.touches[0].clientX), { passive: true });
    slider.addEventListener("touchend", (e) => {
      if (x0 == null) return;
      const dx = e.changedTouches[0].clientX - x0;
      if (Math.abs(dx) > 40) goTo(slideIdx + (dx < 0 ? 1 : -1));
      x0 = null;
    });
    slider.addEventListener("click", (e) => {
      const shop = e.target.closest("[data-slide-shop]");
      const prod = e.target.closest("[data-slide-product]");
      if (shop) showCategory(shop.dataset.slideShop);
      if (prod) openProduct(prod.dataset.slideProduct, 0);
    });
    restartAutoplay();
  }

  // ---------- Departments ----------
  const DEPT = {
    Shoes: { id: "sh-velvet-stiletto", bg: "#f9e4e6", blurb: "Heels, sneakers, boots" },
    Clothing: { id: "cl-silk-slip-dress", bg: "#efe6d8", blurb: "Dresses, tops, blazers" },
    Handbags: { id: "hb-signature-tote", bg: "#ece3f3", blurb: "Totes, clutches, crossbody" },
    Watches: { id: "wa-rose-classic", bg: "#f6eadb", blurb: "Rose gold, mesh, crystal" },
  };
  function renderDepartments() {
    $("#departments").innerHTML = CATEGORIES.map((c) => {
      const d = DEPT[c];
      const n = PRODUCTS.filter((p) => p.category === c).length;
      return `<button class="dept" style="--dept-bg:${d.bg}" data-dept="${c}">
        ${productArt(byId[d.id], 0)}
        <b>${c}</b><span>${d.blurb} · ${n} styles</span>
      </button>`;
    }).join("");
    $("#departments").addEventListener("click", (e) => {
      const b = e.target.closest("[data-dept]");
      if (b) showCategory(b.dataset.dept);
    });
  }

  function showCategory(category, extra = {}) {
    state.filters = { ...defaultFilters(), category, ...extra };
    renderFilterControls();
    renderGrid();
    $("#shop").scrollIntoView({ behavior: "smooth" });
  }

  // ---------- Filters ----------
  function renderFilterControls() {
    const f = state.filters;
    $("#categoryChips").innerHTML = ["All", ...CATEGORIES]
      .map((c) => `<button class="chip ${f.category === c ? "active" : ""}" data-category="${c}">${c}</button>`)
      .join("");
    $("#shopTitle").textContent = f.onSale ? "On sale" : f.category === "All" ? "Shop all" : f.category;

    const pool = f.category === "All" ? PRODUCTS : PRODUCTS.filter((p) => p.category === f.category);
    const types = [...new Set(pool.map((p) => p.type))];
    f.types = f.types.filter((t) => types.includes(t));
    $("#typeFilters").innerHTML = types
      .map(
        (t) => `<label class="check"><input type="checkbox" value="${esc(t)}" ${f.types.includes(t) ? "checked" : ""}>
        <span>${esc(t)}</span><span class="count">${pool.filter((p) => p.type === t).length}</span></label>`
      )
      .join("");

    const range = $("#priceRange");
    range.max = MAX_PRICE;
    range.value = f.maxPrice;
    $("#priceLabel").textContent = money(f.maxPrice);
    $("#saleOnly").checked = f.onSale;
    $("#sort").value = state.sort;
    if ($("#search").value !== f.query) $("#search").value = f.query;
  }

  function setFilters(patch) {
    Object.assign(state.filters, patch);
    renderFilterControls();
    renderGrid();
  }

  $("#categoryChips").addEventListener("click", (e) => {
    const b = e.target.closest("[data-category]");
    if (b) setFilters({ category: b.dataset.category, types: [] });
  });
  $("#typeFilters").addEventListener("change", () => setFilters({ types: $$("#typeFilters input:checked").map((i) => i.value) }));
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
      if (e.target.value && window.scrollY < $("#shop").offsetTop - 200) $("#shop").scrollIntoView({ behavior: "smooth" });
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
  $("#openFilters").addEventListener("click", () => openOverlay($("#filters")));
  $("#closeFilters").addEventListener("click", () => closeOverlay());

  // Nav links (header, footer, mobile menu)
  function applyNav(el) {
    if (el.dataset.navCategory) showCategory(el.dataset.navCategory);
    else if (el.dataset.navSale) showCategory("All", { onSale: true });
  }
  document.addEventListener("click", (e) => {
    const a = e.target.closest("[data-nav-category], [data-nav-sale]");
    if (!a) return;
    e.preventDefault();
    if (openEl) closeOverlay();
    applyNav(a);
  });
  $("#mobileLinks").innerHTML =
    $$("#nav a").map((a) => a.outerHTML).join("") +
    `<a href="#/track" data-track-link>Track order</a><a href="#" data-orders-link>My account</a>`;
  $("#burger").addEventListener("click", () => openOverlay($("#mobileMenu")));

  // ---------- Product grid ----------
  function cardHTML(p) {
    const idx = state.cardColor[p.id] ?? 0;
    const wished = state.wishlist.includes(p.id);
    const tags = p.tags.map((t) => `<span class="tag tag-${t}">${t === "bestseller" ? "Bestseller" : t}</span>`).join("");
    return `<article class="card" data-id="${p.id}">
      <div style="position:relative">
        <button class="card-media" data-open aria-label="View ${esc(p.name)}" style="--glow:${tint(p, idx)}">${productArt(p, idx)}</button>
        <div class="tags">${tags}</div>
        <button class="wish ${wished ? "on" : ""}" data-wish aria-label="${wished ? "Remove from" : "Add to"} wishlist" aria-pressed="${wished}">
          <i class="fa-${wished ? "solid" : "regular"} fa-heart"></i>
        </button>
        <button class="quick-add" data-open>${S.isOneSize(p) ? "Quick add" : "Choose size"}</button>
      </div>
      <div class="card-body">
        <div class="card-meta"><span>${esc(p.brand)}</span><span>${esc(p.type)}</span></div>
        <h3 class="card-title" data-open>${esc(p.name)}</h3>
        ${starsHTML(p)}
        <div class="card-foot">
          ${priceHTML(p)}
          <div class="card-swatches">${p.colorways.map((c, i) => swatchHTML(c, i, i === idx, "sm")).join("")}</div>
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
      toast(`${esc(byId[id].name)} saved to your wishlist`, "fa-heart");
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
              <div class="line-thumb">${productArt(p)}</div>
              <div class="line-info"><h4>${esc(p.name)}</h4><p>${esc(p.brand)} · ${esc(p.type)}</p>${priceHTML(p)}</div>
              <div class="line-price">
                <button class="btn btn-primary btn-sm" data-view>View</button>
                <button class="link-btn" data-unwish>Remove</button>
              </div>
            </div>`;
          })
          .join("")
      : `<div class="drawer-empty"><i class="fa-solid fa-heart"></i><p>Nothing saved yet.<br>Tap the heart on anything you love.</p></div>`;
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
    const oneSize = S.isOneSize(p);
    $("#productModalBody").innerHTML = `
      <button class="icon-btn modal-close" data-close aria-label="Close"><i class="fa-solid fa-xmark"></i></button>
      <div class="pm-media" style="--glow:${tint(p, m.colorIdx)}">${productArt(p, m.colorIdx)}</div>
      <div class="pm-info">
        <div class="card-meta"><span>${esc(p.brand)}</span><span>${esc(p.category)} · ${esc(p.type)}</span></div>
        <h2>${esc(p.name)}</h2>
        ${starsHTML(p)}
        ${priceHTML(p)}
        <p>${esc(p.description)}</p>
        <div class="pm-label">Colour <b>${esc(c.name)}</b></div>
        ${p.image && !c.image && m.colorIdx !== 0 ? `<p class="shown-in">Photo shows ${esc(p.colorways[0].name)}. Your order will be ${esc(c.name)}.</p>` : ""}
        <div class="swatches" data-pm-colors>${p.colorways.map((cw, i) => swatchHTML(cw, i, i === m.colorIdx)).join("")}</div>
        ${
          oneSize
            ? ""
            : `<div class="pm-label">${p.category === "Shoes" ? "Size (US)" : "Size"} <b>${m.size ?? ""}</b></div>
        <div class="size-grid" data-pm-sizes>
          ${p.sizes
            .map((s) => {
              const out = p.soldOut.includes(s);
              return `<button class="size-btn ${m.size === s ? "active" : ""}" data-size="${s}" ${out ? `disabled aria-label="Size ${s} sold out"` : ""}>${s}</button>`;
            })
            .join("")}
        </div>
        <p class="size-hint">${m.hint}</p>`
        }
        <div class="pm-actions">
          <div class="qty" data-pm-qty>
            <button data-step="-1" aria-label="Decrease quantity"><i class="fa-solid fa-minus"></i></button>
            <span>${m.qty}</span>
            <button data-step="1" aria-label="Increase quantity"><i class="fa-solid fa-plus"></i></button>
          </div>
          <button class="btn btn-primary" data-add><i class="fa-solid fa-bag-shopping"></i> Add to bag · ${money(S.unitPrice(p) * m.qty)}</button>
          <button class="wish ${wished ? "on" : ""}" data-wish aria-label="Toggle wishlist"><i class="fa-${wished ? "solid" : "regular"} fa-heart"></i></button>
        </div>
        <ul class="pm-perks">
          <li><i class="fa-brands fa-whatsapp"></i> Order &amp; track on WhatsApp</li>
          <li><i class="fa-solid fa-truck"></i> Free delivery over ${money(S.FREE_DELIVERY_THRESHOLD)}</li>
          <li><i class="fa-solid fa-rotate-left"></i> Easy exchanges within 14 days</li>
        </ul>
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
      m.size = p.sizes.find((s) => String(s) === size.dataset.size);
      m.hint = "";
    } else if (step) m.qty = Math.max(1, Math.min(S.MAX_QTY, m.qty + Number(step.dataset.step)));
    else if (e.target.closest("[data-wish]")) return toggleWish(p.id);
    else if (e.target.closest("[data-add]")) {
      if (!S.isOneSize(p) && m.size == null) {
        m.hint = "Please choose your size first";
        renderProductModal();
        return;
      }
      addItem({ id: p.id, colorway: m.colorIdx, size: S.isOneSize(p) ? null : m.size, qty: m.qty });
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
    toast(`${esc(byId[item.id].name)} added to your bag`);
  }

  const totals = () => S.cartTotals(state.cart, PRODUCTS, state.promo, PROMO_CODES);

  function totalsHTML(t) {
    return `<div class="totals">
      <div><span>Subtotal</span><span>${money(t.subtotal)}</span></div>
      ${t.discount ? `<div class="disc"><span>Promo ${esc(t.promoCode)}</span><span>−${money(t.discount)}</span></div>` : ""}
      <div><span>Delivery</span><span>${t.delivery ? money(t.delivery) : "Free"}</span></div>
      <div class="grand"><span>Total</span><span>${money(t.total)}</span></div>
    </div>`;
  }

  function renderCart() {
    const t = totals();
    if (state.promo && !t.promo) state.promo = null;
    $("#cartCount").textContent = t.count;
    $("#cartCount").hidden = t.count === 0;
    $("#cartHeadCount").textContent = t.count ? `(${t.count})` : "";

    const net = t.subtotal - t.discount;
    const remaining = S.FREE_DELIVERY_THRESHOLD - net;
    $("#shipMeter").innerHTML = t.count
      ? `${remaining > 0 ? `You're <b>${money(remaining)}</b> away from free delivery` : "You've unlocked <b>free delivery</b> 🎉"}
         <div class="meter"><i style="width:${Math.min(100, (net / S.FREE_DELIVERY_THRESHOLD) * 100)}%"></i></div>`
      : "";

    if (!state.cart.length) {
      $("#cartItems").innerHTML = `<div class="drawer-empty"><i class="fa-solid fa-bag-shopping"></i><p>Your bag is empty.</p>
        <button class="btn btn-primary btn-sm" data-close>Start shopping</button></div>`;
      $("#cartFoot").innerHTML = "";
      return;
    }

    $("#cartItems").innerHTML = state.cart
      .map((l) => {
        const p = byId[l.id];
        return `<div class="line-item" data-key="${esc(S.lineKey(l))}">
          <div class="line-thumb">${productArt(p, l.colorway)}</div>
          <div class="line-info">
            <h4>${esc(p.name)}</h4>
            <p>${esc(optionsLabel(p, l))}</p>
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
        <input id="promoInput" placeholder="Promo code" value="${esc(state.promo || "")}" aria-label="Promo code" autocomplete="off">
        <button class="btn btn-ghost btn-sm" type="submit">${state.promo ? "Update" : "Apply"}</button>
      </form>
      ${totalsHTML(t)}
      <button class="btn btn-rose btn-block" id="checkoutBtn"><i class="fa-solid fa-lock"></i> Checkout · ${money(t.total)}</button>
      <p class="secure-note"><i class="fa-brands fa-whatsapp"></i> You'll confirm your order with us on WhatsApp</p>`;
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
    if (!code) state.promo = null;
    else if (Object.prototype.hasOwnProperty.call(PROMO_CODES, code)) {
      state.promo = code;
      toast(`Code ${esc(code)} applied`, "fa-tag");
    } else {
      toast("That code isn't valid", "fa-circle-xmark");
      return;
    }
    saveCart();
    renderCart();
  });

  $("#cartFoot").addEventListener("click", (e) => {
    if (e.target.closest("#checkoutBtn")) startCheckout();
  });
  $("#cartBtn").addEventListener("click", () => openOverlay($("#cartDrawer")));

  // ---------- Forms ----------
  function showFieldErrors(form, fields = {}) {
    $$(".field", form).forEach((wrap) => {
      const name = wrap.dataset.field;
      const msg = name && fields[name];
      wrap.classList.toggle("invalid", Boolean(msg));
      const err = $(".err", wrap);
      if (err) err.textContent = msg || "";
    });
    const first = $(".field.invalid input, .field.invalid select, .field.invalid textarea", form);
    if (first) first.focus();
  }

  function clearInvalidOnInput(container) {
    container.addEventListener("input", (e) => {
      const wrap = e.target.closest(".field.invalid");
      if (wrap) {
        wrap.classList.remove("invalid");
        const err = $(".err", wrap);
        if (err) err.textContent = "";
      }
    });
  }

  const field = (name, label, { type = "text", autocomplete = "", hint = "", full = false, value = "", attrs = "" } = {}) => `
    <label class="field ${full ? "full" : ""}" data-field="${name}">${label}
      <input name="${name}" type="${type}" ${autocomplete ? `autocomplete="${autocomplete}"` : ""} value="${esc(value)}" ${attrs}>
      ${hint ? `<span class="hint">${hint}</span>` : ""}
      <span class="err"></span>
    </label>`;

  async function withBusy(btn, fn) {
    const label = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Please wait…`;
    try {
      return await fn();
    } finally {
      btn.disabled = false;
      btn.innerHTML = label;
    }
  }

  // ---------- Authentication ----------
  function openAuth(mode = "login", reason = "") {
    renderAuth(mode, reason);
    openOverlay($("#authModal"));
  }

  function renderAuth(mode, reason) {
    const signup = mode === "signup";
    $("#authBody").innerHTML = `
      <button class="icon-btn modal-close" data-close aria-label="Close"><i class="fa-solid fa-xmark"></i></button>
      <h2 class="modal-title">${signup ? "Create your account" : "Welcome back"}</h2>
      <p class="muted">${esc(reason || (signup ? "Checkout faster and track every order." : "Sign in to check out and track your orders."))}</p>
      <div class="auth-tabs" role="tablist">
        <button role="tab" data-auth-tab="login" class="${signup ? "" : "active"}" aria-selected="${!signup}">Sign in</button>
        <button role="tab" data-auth-tab="signup" class="${signup ? "active" : ""}" aria-selected="${signup}">Create account</button>
      </div>
      <form class="form" id="authForm" data-mode="${mode}" novalidate>
        <p class="form-error" id="authError"></p>
        ${signup ? field("name", "Full name", { autocomplete: "name" }) : ""}
        ${field("email", "Email", { type: "email", autocomplete: "email" })}
        ${signup ? field("phone", "WhatsApp number", { type: "tel", autocomplete: "tel", hint: "Include your country code, e.g. +254 712 345 678. We'll send your order updates here." }) : ""}
        <label class="field" data-field="password">Password
          <span class="pw-wrap"><input name="password" type="password" autocomplete="${signup ? "new-password" : "current-password"}" ${signup ? 'minlength="8"' : ""}>
          <button type="button" data-toggle-pw aria-label="Show password"><i class="fa-regular fa-eye"></i></button></span>
          ${signup ? '<span class="hint">At least 8 characters</span>' : ""}
          <span class="err"></span>
        </label>
        <button class="btn btn-primary btn-block" type="submit">${signup ? "Create account" : "Sign in"}</button>
        <p class="secure-note"><i class="fa-solid fa-shield-halved"></i> Your password is encrypted and never shared.</p>
      </form>`;
    $("#authBody").dataset.reason = reason;
  }

  $("#authBody").addEventListener("click", (e) => {
    const tab = e.target.closest("[data-auth-tab]");
    if (tab) {
      renderAuth(tab.dataset.authTab, $("#authBody").dataset.reason);
      $("#authBody input").focus();
    }
    const pw = e.target.closest("[data-toggle-pw]");
    if (pw) {
      const input = pw.previousElementSibling;
      input.type = input.type === "password" ? "text" : "password";
      pw.innerHTML = `<i class="fa-regular fa-eye${input.type === "password" ? "" : "-slash"}"></i>`;
    }
  });
  clearInvalidOnInput($("#authBody"));

  $("#authBody").addEventListener("submit", async (e) => {
    if (e.target.id !== "authForm") return;
    e.preventDefault();
    const form = e.target;
    const signup = form.dataset.mode === "signup";
    const data = Object.fromEntries(new FormData(form));
    // Quick client-side checks; the server validates everything again.
    const fields = {};
    if (signup && (data.name || "").trim().length < 2) fields.name = "Enter your name";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email || "")) fields.email = "Enter a valid email";
    if (signup && (data.phone || "").replace(/\D/g, "").length < 8) fields.phone = "Enter your WhatsApp number";
    if (!data.password || (signup && data.password.length < 8)) fields.password = signup ? "Use at least 8 characters" : "Enter your password";
    $("#authError").textContent = "";
    if (Object.keys(fields).length) return showFieldErrors(form, fields);
    try {
      const res = await withBusy($("button[type=submit]", form), () =>
        api(signup ? "/api/auth/signup" : "/api/auth/login", { method: "POST", body: data })
      );
      setUser(res.user);
      toast(signup ? `Welcome, ${esc(res.user.name.split(" ")[0])}! 💕` : `Welcome back, ${esc(res.user.name.split(" ")[0])}!`, "fa-heart");
      const next = state.afterAuth;
      state.afterAuth = null;
      closeOverlay(!next);
      if (next) next();
    } catch (err) {
      $("#authError").textContent = err.message;
      showFieldErrors(form, err.fields);
    }
  });

  function setUser(user) {
    state.user = user;
    state.orders = null;
    $("#accountBtn").classList.toggle("signed-in", Boolean(user));
    $("#accountBtn").setAttribute("aria-label", user ? `Account: ${user.name}` : "Sign in");
  }

  function requireLogin(reason, next) {
    if (state.user) return next();
    state.afterAuth = next;
    openAuth("login", reason);
  }

  // ---------- Account & orders ----------
  async function openAccount() {
    if (!state.user) return requireLogin("Sign in to see your orders.", openAccount);
    renderAccount();
    openOverlay($("#accountDrawer"));
    try {
      state.orders = (await api("/api/orders")).orders;
    } catch (err) {
      if (err.status === 401) {
        setUser(null);
        closeOverlay();
        return openAuth("login", "Your session expired. Please sign in again.");
      }
      state.orders = [];
      toast(esc(err.message), "fa-circle-xmark");
    }
    renderAccount();
  }

  const statusPill = (key) => `<span class="status-pill status-${key}">${esc(S.statusInfo(key)?.label || key)}</span>`;

  function renderAccount() {
    const u = state.user;
    if (!u) return;
    const orders = state.orders;
    $("#accountBody").innerHTML = `
      <div class="account-card">
        <div class="avatar">${initial(u.name)}</div>
        <div><b>${esc(u.name)}</b><p>${esc(u.email)}</p><p><i class="fa-brands fa-whatsapp"></i> +${esc(u.phone)}</p></div>
      </div>
      <div class="section-title">My orders ${orders ? `<span>${orders.length}</span>` : ""}</div>
      ${
        orders == null
          ? `<p class="muted"><i class="fa-solid fa-spinner fa-spin"></i> Loading your orders…</p>`
          : orders.length
          ? orders
              .map(
                (o) => `<div class="order-row" data-order="${esc(o.id)}">
                <header><b>${esc(o.id)}</b>${statusPill(o.status)}</header>
                <p>${fmtDate(o.createdAt)} · ${o.items.reduce((n, l) => n + l.qty, 0)} item(s) · ${money(o.totals.total)}</p>
                <p>${esc(o.items.map((l) => l.name).join(", "))}</p>
                <div class="actions">
                  <button class="btn btn-ghost btn-sm" data-track-order="${esc(o.id)}"><i class="fa-solid fa-location-dot"></i> Track</button>
                  <button class="btn btn-wa btn-sm" data-wa-order="${esc(o.id)}"><i class="fa-brands fa-whatsapp"></i> ${o.status === "pending" ? "Send on WhatsApp" : "Ask for update"}</button>
                </div>
              </div>`
              )
              .join("")
          : `<div class="drawer-empty"><i class="fa-solid fa-box-open"></i><p>No orders yet.</p><button class="btn btn-primary btn-sm" data-close>Start shopping</button></div>`
      }
      <button class="btn btn-ghost btn-block" id="logoutBtn" style="margin:20px 0"><i class="fa-solid fa-arrow-right-from-bracket"></i> Sign out</button>`;
  }

  $("#accountBody").addEventListener("click", async (e) => {
    const track = e.target.closest("[data-track-order]");
    const waBtn = e.target.closest("[data-wa-order]");
    if (track) return openTrack(track.dataset.trackOrder);
    if (waBtn) {
      const order = (state.orders || []).find((o) => o.id === waBtn.dataset.waOrder);
      if (!order) return;
      if (order.status === "pending") {
        try {
          const res = await api(`/api/orders/${encodeURIComponent(order.id)}`);
          if (res.whatsappUrl) window.open(res.whatsappUrl, "_blank", "noopener");
        } catch (err) {
          toast(esc(err.message), "fa-circle-xmark");
        }
      } else {
        const url = waChatUrl(`Hi! Please send me an update on my order ${order.id} 📦`);
        if (url) window.open(url, "_blank", "noopener");
      }
      return;
    }
    if (e.target.closest("#logoutBtn")) {
      try {
        await api("/api/auth/logout", { method: "POST", body: {} });
      } catch {
        /* sign out locally anyway */
      }
      setUser(null);
      closeOverlay();
      toast("You've been signed out", "fa-arrow-right-from-bracket");
    }
  });
  $("#accountBtn").addEventListener("click", openAccount);
  document.addEventListener("click", (e) => {
    if (!e.target.closest("[data-orders-link]")) return;
    e.preventDefault();
    if (openEl) closeOverlay();
    openAccount();
  });

  // ---------- Checkout ----------
  function startCheckout() {
    if (!totals().count) return;
    requireLogin("Please sign in or create an account to check out.", openCheckout);
  }

  function openCheckout() {
    const t = totals();
    const u = state.user;
    if (!t.count || !u) return;
    const methods = config.paymentMethods.length ? config.paymentMethods : ["Mobile money (M-Pesa)", "Card on delivery", "Cash on delivery"];
    const saved = storage.get("asw:delivery", {});
    $("#checkoutBody").innerHTML = `
      <button class="icon-btn modal-close" data-close aria-label="Close"><i class="fa-solid fa-xmark"></i></button>
      <h2 class="modal-title">Checkout</h2>
      <p class="muted">Almost there! Where should we deliver?</p>
      <div class="co-grid">
        <form class="form form-2" id="coForm" novalidate>
          <div class="co-user">
            <div class="avatar">${initial(u.name)}</div>
            <div><b>${esc(u.name)}</b><p>${esc(u.email)}</p></div>
          </div>
          <p class="form-error full" id="coError" style="grid-column:1/-1"></p>
          ${field("phone", "WhatsApp number for updates", { type: "tel", autocomplete: "tel", full: true, value: u.phone ? `+${u.phone}` : "" })}
          ${field("address", "Delivery address", { autocomplete: "street-address", full: true, value: saved.address || "", attrs: 'placeholder="Street, building, apartment"' })}
          ${field("city", "Town / City", { autocomplete: "address-level2", value: saved.city || "" })}
          <label class="field" data-field="notes">Notes (optional)
            <input name="notes" placeholder="Landmark, delivery time…" maxlength="300">
          </label>
          <div class="field full" data-field="payment">Payment
            <div class="pay-opts" role="radiogroup" aria-label="Payment method">
              ${methods
                .map(
                  (m, i) => `<label class="pay-opt"><input type="radio" name="payment" value="${esc(m)}" ${i === 0 ? "checked" : ""}>
                  <i class="fa-solid ${/mobile|m-pesa/i.test(m) ? "fa-mobile-screen" : /card/i.test(m) ? "fa-credit-card" : "fa-money-bill-wave"}"></i> ${esc(m)}</label>`
                )
                .join("")}
            </div>
            <span class="err"></span>
          </div>
          <div class="wa-note full" style="grid-column:1/-1"><i class="fa-brands fa-whatsapp"></i>
            <span>When you place your order, WhatsApp opens with your order details ready to send to us. We'll confirm payment and delivery there.</span></div>
          <button class="btn btn-wa btn-block" style="grid-column:1/-1" type="submit"><i class="fa-brands fa-whatsapp"></i> Place order · ${money(t.total)}</button>
        </form>
        <div class="co-summary">
          <h4>Order summary</h4>
          ${state.cart
            .map((l) => {
              const p = byId[l.id];
              return `<div class="co-line"><span>${l.qty}× ${esc(p.name)}<br><small>${esc(optionsLabel(p, l))}</small></span><span>${money(S.unitPrice(p) * l.qty)}</span></div>`;
            })
            .join("")}
          ${totalsHTML(t)}
        </div>
      </div>`;
    closeOverlay(false);
    openOverlay($("#checkoutModal"));
  }

  clearInvalidOnInput($("#checkoutBody"));

  $("#checkoutBody").addEventListener("submit", async (e) => {
    if (e.target.id !== "coForm") return;
    e.preventDefault();
    const form = e.target;
    const data = Object.fromEntries(new FormData(form));
    const fields = {};
    if ((data.phone || "").replace(/\D/g, "").length < 8) fields.phone = "Enter your WhatsApp number";
    if ((data.address || "").trim().length < 4) fields.address = "Enter your delivery address";
    if ((data.city || "").trim().length < 2) fields.city = "Enter your town or city";
    $("#coError").textContent = "";
    if (Object.keys(fields).length) return showFieldErrors(form, fields);
    try {
      const res = await withBusy($("button[type=submit]", form), () =>
        api("/api/orders", {
          method: "POST",
          body: {
            items: state.cart,
            promoCode: state.promo,
            phone: data.phone,
            payment: data.payment,
            delivery: { address: data.address, city: data.city, notes: data.notes },
          },
        })
      );
      storage.set("asw:delivery", { address: data.address, city: data.city });
      state.cart = [];
      state.promo = null;
      state.orders = null;
      saveCart();
      renderCart();
      renderOrderPlaced(res.order, res.whatsappUrl);
    } catch (err) {
      if (err.status === 401) {
        setUser(null);
        state.afterAuth = openCheckout;
        return openAuth("login", "Your session expired. Please sign in again to finish checking out.");
      }
      $("#coError").textContent = err.message;
      showFieldErrors(form, err.fields);
    }
  });

  function renderOrderPlaced(order, whatsappUrl) {
    const first = esc(order.customer.name.split(" ")[0]);
    $("#checkoutBody").innerHTML = `
      <button class="icon-btn modal-close" data-close aria-label="Close"><i class="fa-solid fa-xmark"></i></button>
      <div class="success">
        <div class="tick"><i class="fa-brands fa-whatsapp"></i></div>
        <h2 class="modal-title">One last step, ${first}!</h2>
        <p>Your order has been saved. Tap below to send it to us on WhatsApp so we can confirm payment and delivery.</p>
        <div class="order-id">${esc(order.id)}</div>
        <p class="muted" style="margin-top:4px">Total ${money(order.totals.total)} · keep this number to track your order</p>
        <div class="success-actions">
          <a class="btn btn-wa btn-block" href="${esc(whatsappUrl)}" target="_blank" rel="noopener" id="sendWa"><i class="fa-brands fa-whatsapp"></i> Send order on WhatsApp</a>
          <button class="btn btn-ghost btn-block" data-track-order="${esc(order.id)}"><i class="fa-solid fa-location-dot"></i> Track this order</button>
          <button class="link-btn" data-close>Continue shopping</button>
        </div>
      </div>`;
  }

  $("#checkoutBody").addEventListener("click", (e) => {
    const t = e.target.closest("[data-track-order]");
    if (t) openTrack(t.dataset.trackOrder);
    if (e.target.closest("#sendWa")) toast("Opening WhatsApp…", "fa-paper-plane");
  });

  // ---------- Order tracking ----------
  function openTrack(orderId = "") {
    const id = String(orderId).toUpperCase();
    const hash = id ? `#/track/${id}` : "#/track";
    if (location.hash !== hash) history.replaceState(null, "", hash);
    if (id && state.user) loadTracking(id, "");
    else renderTrackForm(id);
    if (openEl !== $("#trackModal")) openOverlay($("#trackModal"));
  }

  function renderTrackForm(id = "", error = "") {
    $("#trackBody").innerHTML = `
      <button class="icon-btn modal-close" data-close aria-label="Close"><i class="fa-solid fa-xmark"></i></button>
      <h2 class="modal-title">Track your order</h2>
      <p class="muted">Enter your order number and the last 4 digits of the WhatsApp number you used at checkout.</p>
      <form class="form" id="trackForm" novalidate style="margin-top:18px">
        <p class="form-error">${esc(error)}</p>
        ${field("orderId", "Order number", { value: id, attrs: 'placeholder="ASW-ABC123" autocapitalize="characters"' })}
        ${field("phone", "Last 4 digits of your WhatsApp number", { type: "tel", attrs: 'inputmode="numeric" maxlength="4" placeholder="5678"' })}
        <button class="btn btn-primary btn-block" type="submit"><i class="fa-solid fa-magnifying-glass"></i> Track order</button>
        ${
          config.whatsappNumber
            ? `<a class="btn btn-wa btn-block" href="${esc(waChatUrl(id ? `Hi! Please send me an update on my order ${id} 📦` : "Hi! I'd like to track my order 📦"))}" target="_blank" rel="noopener"><i class="fa-brands fa-whatsapp"></i> Track on WhatsApp instead</a>`
            : ""
        }
        ${state.user ? "" : `<p class="secure-note">Have an account? <button type="button" class="link-btn" data-orders-link>Sign in to see all your orders</button></p>`}
      </form>`;
  }

  async function loadTracking(id, phone) {
    $("#trackBody").innerHTML = `<div style="padding:40px;text-align:center" class="muted"><i class="fa-solid fa-spinner fa-spin"></i> Finding your order…</div>`;
    try {
      const res = await api(`/api/track/${encodeURIComponent(id)}?phone=${encodeURIComponent(phone)}`);
      renderTracking(res.order, res.whatsappUrl);
    } catch (err) {
      renderTrackForm(id, err.message);
    }
  }

  function renderTracking(o, whatsappUrl) {
    const cancelled = o.status === "cancelled";
    const currentIdx = S.ORDER_STATUSES.findIndex((s) => s.key === o.status);
    const reached = Object.fromEntries(o.history.map((h) => [h.status, h]));
    const steps = cancelled
      ? [...o.history.map((h) => ({ ...S.statusInfo(h.status), entry: h }))]
      : S.ORDER_STATUSES.map((s) => ({ ...s, entry: reached[s.key] }));
    $("#trackBody").innerHTML = `
      <button class="icon-btn modal-close" data-close aria-label="Close"><i class="fa-solid fa-xmark"></i></button>
      <p class="kicker">Order ${esc(o.id)}</p>
      <h2 class="modal-title">${cancelled ? "Order cancelled" : `${esc(S.statusInfo(o.status).label)}`}</h2>
      <p class="muted">Hi ${esc(o.customerFirstName)}, placed ${fmtDate(o.createdAt)} · ${money(o.total)}</p>
      <ol class="timeline">
        ${steps
          .map((s, i) => {
            const done = cancelled ? true : i <= currentIdx;
            const current = cancelled ? i === steps.length - 1 : i === currentIdx;
            return `<li class="${done ? "done" : ""} ${current ? "current" : ""}">
              <span class="dot">${done ? '<i class="fa-solid fa-check"></i>' : ""}</span>
              <b>${esc(s.label)}</b>
              <p>${s.entry ? fmtDate(s.entry.at) : esc(s.text)}</p>
              ${s.entry && s.entry.note ? `<p class="note">“${esc(s.entry.note)}”</p>` : ""}
            </li>`;
          })
          .join("")}
      </ol>
      <div class="track-items">
        ${o.items.map((l) => `<div class="co-line"><span>${l.qty}× ${esc(l.name)}</span><span class="muted">${esc([l.colorName, l.size != null ? `Size ${l.size}` : ""].filter(Boolean).join(" · "))}</span></div>`).join("")}
      </div>
      ${whatsappUrl ? `<a class="btn btn-wa btn-block" href="${esc(whatsappUrl)}" target="_blank" rel="noopener"><i class="fa-brands fa-whatsapp"></i> Get updates on WhatsApp</a>` : ""}
      <p class="secure-note">${config.autoTracking ? "Message your order number to our WhatsApp anytime for an instant status update." : "We'll also message you on WhatsApp whenever your order moves to the next step."}</p>`;
  }

  clearInvalidOnInput($("#trackBody"));
  $("#trackBody").addEventListener("submit", (e) => {
    if (e.target.id !== "trackForm") return;
    e.preventDefault();
    const form = e.target;
    const id = form.elements.orderId.value.trim().toUpperCase();
    const phone = form.elements.phone.value.replace(/\D/g, "");
    const fields = {};
    if (!/^ASW-[A-Z0-9]{6}$/.test(id)) fields.orderId = "Order numbers look like ASW-ABC123";
    if (phone.length !== 4 && !state.user) fields.phone = "Enter the last 4 digits";
    if (Object.keys(fields).length) return showFieldErrors(form, fields);
    history.replaceState(null, "", `#/track/${id}`);
    loadTracking(id, phone);
  });

  document.addEventListener("click", (e) => {
    const t = e.target.closest("[data-track-link], #trackCta");
    if (!t) return;
    e.preventDefault();
    if (openEl) closeOverlay(false);
    openTrack();
  });

  function routeFromHash() {
    const m = location.hash.match(/^#\/track(?:\/([A-Za-z0-9-]+))?/);
    if (m) openTrack(m[1] || "");
  }
  window.addEventListener("hashchange", routeFromHash);

  // ---------- WhatsApp chat links ----------
  function wireChatLinks() {
    const url = waChatUrl(`Hi ${config.storeName}! 💕 I have a question.`);
    $$("[data-chat-link]").forEach((a) => {
      if (url) {
        a.href = url;
        a.target = "_blank";
        a.rel = "noopener";
        a.hidden = false;
      } else if (a.classList.contains("wa-float")) a.hidden = true;
    });
  }

  // ---------- Newsletter ----------
  $("#newsletterForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const input = $("#newsletterEmail");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.value)) {
      toast("Please enter a valid email", "fa-circle-xmark");
      input.focus();
      return;
    }
    input.value = "";
    toast("You're on the list! 💌", "fa-envelope");
  });

  // ---------- Boot ----------
  async function boot() {
    $("#year").textContent = new Date().getFullYear();
    initSlider();
    renderDepartments();
    renderFilterControls();
    renderGrid();
    renderCart();
    renderWishlist();
    wireChatLinks();

    const [cfg, me] = await Promise.allSettled([api("/api/config"), api("/api/auth/me")]);
    if (cfg.status === "fulfilled") {
      config = { ...config, ...cfg.value };
      try {
        fmt = new Intl.NumberFormat(config.locale, { style: "currency", currency: config.currency });
      } catch {
        /* keep default */
      }
      wireChatLinks();
      renderFilterControls();
      renderGrid();
      renderCart();
      renderWishlist();
    } else {
      console.warn("Shop server not reachable; browsing works but checkout needs the server running (npm start).");
    }
    if (me.status === "fulfilled") setUser(me.value.user);
    routeFromHash();
  }

  boot();
})();
