/* IPHIX COMMUNICATIONS storefront — dependency-free single-page app (hash routing). */
(() => {
  'use strict';

  const $ = (sel, el = document) => el.querySelector(sel);
  const $$ = (sel, el = document) => Array.from(el.querySelectorAll(sel));
  const view = $('#app');
  const state = { config: null, catalog: null, user: null, cart: [], ref: null };
  const productCache = new Map();

  // ---------- utilities ----------
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
  const money = (n) => `${state.config ? state.config.currency : 'KES'} ${Number(n || 0).toLocaleString('en-US')}`;
  const fmtDate = (s) => new Date(`${String(s).replace(' ', 'T')}Z`).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
  const stars = (r) => '★'.repeat(Math.round(r)) + '☆'.repeat(5 - Math.round(r));
  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* storage unavailable */ } },
  };
  const waLink = (number, text) => `https://wa.me/${number}?text=${encodeURIComponent(text)}`;

  async function api(path, { method = 'GET', body } = {}) {
    const res = await fetch(path, {
      method,
      headers: body !== undefined ? { 'Content-Type': 'application/json' } : {},
      body: body !== undefined ? JSON.stringify(body) : undefined,
      credentials: 'same-origin',
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const err = new Error(data.error || `Request failed (${res.status})`);
      err.status = res.status;
      throw err;
    }
    return data;
  }

  function toast(msg, type = '') {
    const el = document.createElement('div');
    el.className = `toast ${type}`;
    el.textContent = msg;
    $('#toasts').appendChild(el);
    setTimeout(() => el.remove(), 3200);
  }

  async function copyText(text) {
    try {
      await navigator.clipboard.writeText(text);
      toast('Copied to clipboard ✔', 'ok');
    } catch {
      window.prompt('Copy this:', text);
    }
  }

  function remember(products) {
    for (const p of products) productCache.set(p.id, p);
    return products;
  }

  // ---------- referral capture ----------
  function captureRef() {
    const params = new URLSearchParams(location.search);
    let code = params.get('ref');
    const hashQuery = new URLSearchParams((location.hash.split('?')[1]) || '');
    if (!code && hashQuery.get('ref')) code = hashQuery.get('ref');
    const saved = store.get('ipx_ref', null);
    state.ref = saved && Date.now() - saved.at < 30 * 864e5 ? saved.code : null;
    if (code) {
      code = code.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 20);
      if (code) {
        state.ref = code;
        store.set('ipx_ref', { code, at: Date.now() });
        api('/api/ref/click', { method: 'POST', body: { code } })
          .then((r) => { if (r.valid) toast(`🎁 Invited by ${r.name}${state.config.referralDiscountPct ? ` — ${state.config.referralDiscountPct}% off your first order!` : ''}`, 'ok'); })
          .catch(() => {});
      }
      if (params.has('ref')) {
        params.delete('ref');
        const qs = params.toString();
        history.replaceState(null, '', `${location.pathname}${qs ? `?${qs}` : ''}${location.hash}`);
      }
    }
  }

  function myRefLink(hashPath = '/') {
    if (!state.user) return null;
    return `${location.origin}/?ref=${state.user.referralCode}#${hashPath}`;
  }

  // ---------- cart ----------
  state.cart = store.get('ipx_cart', []);
  const saveCart = () => { store.set('ipx_cart', state.cart); updateCartBadge(); };
  const cartCount = () => state.cart.reduce((n, l) => n + l.qty, 0);

  function updateCartBadge() {
    const n = cartCount();
    const badge = $('#cart-count');
    badge.textContent = n > 99 ? '99+' : n;
    badge.hidden = n === 0;
  }

  function addToCart(p, qty = 1) {
    const line = state.cart.find((l) => l.id === p.id);
    const max = p.category.section === 'services' ? 99 : p.stock;
    const next = Math.min((line ? line.qty : 0) + qty, max);
    if (next <= 0) return toast('Sorry, this item is out of stock.', 'error');
    if (line) line.qty = next;
    else state.cart.push({ id: p.id, slug: p.slug, name: p.name, price: p.price, image: p.image, qty: next, max });
    saveCart();
    toast(`Added to cart: ${p.name}`, 'ok');
  }

  // ---------- layout chrome ----------
  function renderChrome() {
    const c = state.config;
    $('#free-over').textContent = money(c.freeDeliveryOver);
    const chat = waLink(c.whatsappNumber, `Hi ${c.storeName}, I need help with…`);
    $('#wa-float').href = chat;
    $('#footer-wa').href = chat;
    $('#footer-address').textContent = [c.storeAddress, `WhatsApp: +${c.whatsappNumber}`].filter(Boolean).join(' • ');
    $('#footer-earn').textContent = `Share your link and earn ${c.commissionPct}% on every sale you bring.`;
    $('#year').textContent = new Date().getFullYear();
    renderUserChrome();
    updateCartBadge();
  }

  function renderUserChrome() {
    $('#account-label').textContent = state.user ? state.user.name.split(' ')[0] : 'Sign in';
    $('#account-link').href = state.user ? '#/account' : '#/login';
    $$('.admin-only').forEach((el) => { el.hidden = !(state.user && state.user.role === 'admin'); });
  }

  function setupMegaMenu() {
    const mega = $('#mega');
    let hideTimer;
    const show = (key) => {
      clearTimeout(hideTimer);
      if (key === 'brands') {
        mega.innerHTML = `<div class="wrap mega-brands">${state.catalog.brands.filter((b) => b.featured).map((b) => `
          <div><h5><a href="#/brand/${b.slug}">${esc(b.name)}</a></h5>
          ${b.parts.map((p) => `<a class="part" href="#/brand/${b.slug}?part=${p.key}">${esc(p.label)}</a>`).join('')}</div>`).join('')}
          <div><h5><a href="#/brands">More brands</a></h5>${state.catalog.brands.filter((b) => !b.featured).map((b) => `<a class="part" href="#/brand/${b.slug}">${esc(b.name)}</a>`).join('')}</div></div>`;
      } else {
        const sec = state.catalog.sections.find((s) => s.key === key);
        mega.innerHTML = `<div class="wrap mega-inner">${sec.categories.map((c) => `
          <a href="#/category/${c.slug}"><span>${c.icon}</span><span>${esc(c.name)}</span><span class="count">${c.count}</span></a>`).join('')}</div>`;
      }
      mega.hidden = false;
    };
    const hide = () => { hideTimer = setTimeout(() => { mega.hidden = true; }, 150); };
    $$('.has-mega').forEach((el) => {
      el.addEventListener('mouseenter', () => { if (matchMedia('(hover: hover)').matches) show(el.dataset.mega); });
      el.addEventListener('mouseleave', hide);
    });
    mega.addEventListener('mouseenter', () => clearTimeout(hideTimer));
    mega.addEventListener('mouseleave', hide);
    mega.addEventListener('click', (e) => { if (e.target.closest('a')) mega.hidden = true; });
  }

  // ---------- shared components ----------
  function productCard(p) {
    productCache.set(p.id, p);
    const off = p.comparePrice ? Math.round((1 - p.price / p.comparePrice) * 100) : 0;
    const isService = p.category.section === 'services';
    return `<a class="pcard" href="#/p/${esc(p.slug)}">
      <div class="thumb"><img loading="lazy" src="${esc(p.image)}" alt="${esc(p.name)}">
        ${off > 0 ? `<span class="tag">-${off}%</span>` : p.isNew ? '<span class="tag new">NEW</span>' : ''}</div>
      <div class="body">
        <div class="name">${esc(p.name)}</div>
        <div><span class="price">${isService ? '<small>from </small>' : ''}${money(p.price)}</span>${p.comparePrice ? `<span class="was">${money(p.comparePrice)}</span>` : ''}</div>
        <div class="meta"><span class="stars">★</span>${p.rating} · ${p.sold.toLocaleString()} sold</div>
        <div class="add">${!isService && p.stock <= 0 ? '<button class="btn btn-sm btn-ghost" disabled>Sold out</button>'
          : `<button class="btn btn-sm" data-add="${p.id}">${isService ? 'Book service' : 'Add to cart'}</button>`}</div>
      </div></a>`;
  }

  const productGrid = (list) => (list.length ? `<div class="grid">${list.map(productCard).join('')}</div>` : '<div class="empty card"><div class="big">🔎</div><p>No products found. Try another filter or ask us on WhatsApp — we source parts daily.</p></div>');

  function statusPill(status, label) {
    return `<span class="pill status-${esc(status)}">${esc(label)}</span>`;
  }

  function errorView(err) {
    view.innerHTML = `<div class="empty card"><div class="big">😕</div><h2>${err.status === 404 ? 'Not found' : 'Something went wrong'}</h2>
      <p>${esc(err.message)}</p><a class="btn" href="#/">Back to home</a></div>`;
  }

  function requireLogin(next) {
    if (state.user) return true;
    location.hash = `#/login?next=${encodeURIComponent(next)}`;
    return false;
  }

  // ---------- pages: home ----------
  async function pageHome() {
    const [deals, spares, accessories, services, fresh] = await Promise.all([
      api('/api/products?deal=1&limit=12'),
      api('/api/products?section=spares&limit=12'),
      api('/api/products?section=accessories&limit=12'),
      api('/api/products?section=services&limit=9'),
      api('/api/products?new=1&sort=newest&limit=12'),
    ]);
    const c = state.config;
    const focus = ['lcd-screens', 'oled-amoled-screens', 'phone-covers-cases', 'tempered-glass', 'uv-full-glue-glass', 'chargers-adapters', 'usb-cables', 'batteries', 'charging-ports', 'earphones-earbuds', 'power-banks', 'back-covers'];
    const allCats = state.catalog.sections.flatMap((s) => s.categories);
    const tiles = focus.map((slug) => allCats.find((x) => x.slug === slug)).filter(Boolean);
    const u = state.user;

    view.innerHTML = `
      <section class="hero">
        <div class="card side-cats" style="padding:10px 0">
          ${state.catalog.sections.map((s) => `<h4>${s.icon} ${esc(s.name)}</h4>
            ${s.categories.slice(0, s.key === 'services' ? 4 : 5).map((cat) => `<a href="#/category/${cat.slug}"><span>${cat.icon}</span>${esc(cat.name.split(/[—/(]/)[0])}</a>`).join('')}
            <a href="#/shop/${s.key}" style="color:var(--red);font-weight:600">All ${esc(s.name.toLowerCase())} →</a>`).join('')}
        </div>
        <div class="banner">
          <span class="deco">📱</span>
          <h1>Phone accessories, spares &amp; repairs — all in one place</h1>
          <p>Screens, batteries, charging ports, covers, tempered glass, chargers and more for Samsung, iPhone, Tecno, Infinix, Redmi, Oppo &amp; Vivo. Retail and wholesale.</p>
          <div class="btn-row">
            <a class="btn" href="#/shop/spares">Shop spare parts</a>
            <a class="btn btn-wa" target="_blank" rel="noopener" href="${waLink(c.whatsappNumber, `Hi ${c.storeName}, I'm looking for a part for my phone: `)}">Ask on WhatsApp</a>
          </div>
        </div>
        <div class="hero-side">
          <div class="card welcome">
            <h3>${u ? `Welcome back, ${esc(u.name.split(' ')[0])} 👋` : 'Welcome to IPHIX 👋'}</h3>
            <div class="perk"><span>🚚</span><span>Free delivery over ${money(c.freeDeliveryOver)}</span></div>
            <div class="perk"><span>📦</span><span>Wholesale price on ${c.wholesaleMinQty}+ pcs</span></div>
            <div class="perk"><span>💬</span><span>Order &amp; track on WhatsApp</span></div>
            <div class="btn-row" style="margin-top:8px">${u ? '<a class="btn btn-sm" href="#/account">My orders</a>' : '<a class="btn btn-sm" href="#/register">Join free</a><a class="btn btn-sm btn-outline" href="#/login">Sign in</a>'}</div>
          </div>
          <div class="card earn-card">
            <h3>💰 Earn ${c.commissionPct}% sharing IPHIX</h3>
            <p class="small" style="margin:0 0 10px">Share your link on WhatsApp, Facebook &amp; TikTok. Get paid on M-Pesa for every order you bring.</p>
            <a class="btn btn-sm" href="#/earn">Start earning</a>
          </div>
        </div>
      </section>

      <div class="section-head"><h2>Top categories</h2><a href="#/shop/accessories">See all →</a></div>
      <div class="tiles">${tiles.map((t) => `<a class="tile" href="#/category/${t.slug}"><span class="ico">${t.icon}</span>${esc(t.name.split(/[—/(]/)[0])}</a>`).join('')}</div>

      <section class="flash">
        <div class="flash-head"><h2>⚡ Flash Deals</h2><span class="muted small">Ends in</span><span class="countdown" id="countdown"></span><a href="#/deals">View all deals →</a></div>
        <div class="hscroll">${remember(deals.products).map(productCard).join('')}</div>
      </section>

      <div class="section-head"><h2>Shop spares by brand</h2><a href="#/brands">All brands →</a></div>
      <div class="brand-row">${state.catalog.brands.filter((b) => b.featured).map((b) => `<a class="brand-chip" href="#/brand/${b.slug}">${esc(b.name)}<small>${b.count} parts</small></a>`).join('')}</div>

      <div class="section-head"><h2>🔧 Popular phone spares</h2><a href="#/shop/spares">See all →</a></div>
      ${productGrid(spares.products)}
      <div class="section-head"><h2>🎧 Best-selling accessories</h2><a href="#/shop/accessories">See all →</a></div>
      ${productGrid(accessories.products)}
      <div class="section-head"><h2>🛠️ Repair services</h2><a href="#/shop/services">See all →</a></div>
      ${productGrid(services.products)}
      ${fresh.products.length ? `<div class="section-head"><h2>🆕 New arrivals</h2><a href="#/new">See all →</a></div>${productGrid(fresh.products)}` : ''}`;
    startCountdown();
  }

  let countdownTimer;
  function startCountdown() {
    clearInterval(countdownTimer);
    const tick = () => {
      const el = $('#countdown');
      if (!el) return clearInterval(countdownTimer);
      const now = new Date();
      const end = new Date(now); end.setHours(24, 0, 0, 0);
      const s = Math.max(0, Math.floor((end - now) / 1000));
      const p = (n) => String(n).padStart(2, '0');
      el.innerHTML = `<b>${p(Math.floor(s / 3600))}</b>:<b>${p(Math.floor((s % 3600) / 60))}</b>:<b>${p(s % 60)}</b>`;
    };
    tick();
    countdownTimer = setInterval(tick, 1000);
  }

  // ---------- pages: listings ----------
  async function renderListing({ path, title, crumbs = [], base = {}, query, section, chips = '', intro = '' }) {
    const filters = {};
    for (const k of ['category', 'brand', 'part', 'sort', 'minPrice', 'maxPrice', 'q']) if (query.get(k)) filters[k] = query.get(k);
    const href = (changes) => {
      const q = new URLSearchParams({ ...filters, ...changes });
      for (const [k, v] of [...q]) if (!v) q.delete(k);
      const s = q.toString();
      return `#${path}${s ? `?${s}` : ''}`;
    };
    const params = new URLSearchParams({ ...base, ...filters, limit: 24 });
    let page = 1;
    const data = await api(`/api/products?${params}`);

    const sections = section ? state.catalog.sections.filter((s) => s.key === section) : state.catalog.sections;
    const activeCat = base.category || filters.category;
    view.innerHTML = `
      <div class="breadcrumbs"><a href="#/">Home</a>${crumbs.map(([t, h]) => ` › ${h ? `<a href="${h}">${esc(t)}</a>` : esc(t)}`).join('')}</div>
      ${intro}
      <div class="listing">
        <aside class="card facets" id="facets">
          ${sections.map((s) => `<h4>${s.icon} ${esc(s.name)}</h4>${s.categories.filter((c) => c.count).map((c) => `
            <a href="#/category/${c.slug}" class="${c.slug === activeCat ? 'on' : ''}"><span>${esc(c.name)}</span><span class="count">${c.count}</span></a>`).join('')}`).join('')}
          ${base.brand ? '' : `<h4>Brand</h4>
            <a href="${href({ brand: '' })}" class="${!filters.brand ? 'on' : ''}"><span>All brands</span></a>
            ${state.catalog.brands.filter((b) => b.count).map((b) => `<a href="${href({ brand: b.slug })}" class="${filters.brand === b.slug ? 'on' : ''}"><span>${esc(b.name)}</span></a>`).join('')}`}
          <h4>Price (${esc(state.config.currency)})</h4>
          <form class="price-filter" id="price-filter">
            <input type="number" min="0" name="minPrice" placeholder="Min" value="${esc(filters.minPrice || '')}">
            <input type="number" min="0" name="maxPrice" placeholder="Max" value="${esc(filters.maxPrice || '')}">
            <button class="btn btn-sm" type="submit">Go</button>
          </form>
        </aside>
        <section>
          <div class="toolbar">
            <h1>${esc(title)} <span class="muted small">(${data.total})</span></h1>
            <div class="btn-row">
              <button class="btn btn-sm btn-ghost filter-toggle" id="filter-toggle">⚙️ Filters</button>
              <select id="sort" aria-label="Sort">
                ${[['', 'Best match'], ['popular', 'Best selling'], ['price-asc', 'Price: low to high'], ['price-desc', 'Price: high to low'], ['newest', 'Newest'], ['rating', 'Top rated']]
                  .map(([v, t]) => `<option value="${v}" ${filters.sort === v || (!filters.sort && !v) ? 'selected' : ''}>${t}</option>`).join('')}
              </select>
            </div>
          </div>
          ${chips}
          <div id="results">${productGrid(remember(data.products))}</div>
          <div class="load-more" id="load-more" ${data.pages > 1 ? '' : 'hidden'}><button class="btn btn-outline">Load more</button></div>
        </section>
      </div>`;

    $('#sort').addEventListener('change', (e) => { location.hash = href({ sort: e.target.value }); });
    $('#filter-toggle').addEventListener('click', () => $('#facets').classList.toggle('open'));
    $('#price-filter').addEventListener('submit', (e) => {
      e.preventDefault();
      const f = new FormData(e.target);
      location.hash = href({ minPrice: f.get('minPrice'), maxPrice: f.get('maxPrice') });
    });
    $('#load-more button').addEventListener('click', async (e) => {
      e.target.disabled = true;
      page += 1;
      params.set('page', page);
      const more = await api(`/api/products?${params}`);
      $('#results .grid').insertAdjacentHTML('beforeend', remember(more.products).map(productCard).join(''));
      e.target.disabled = false;
      $('#load-more').hidden = page >= more.pages;
    });
  }

  function pageSection([, key], query) {
    const sec = state.catalog.sections.find((s) => s.key === key);
    const chips = `<div class="chips">${sec.categories.filter((c) => c.count).map((c) => `<a class="chip" href="#/category/${c.slug}">${c.icon} ${esc(c.name.split(/[—(]/)[0])}<span class="count">${c.count}</span></a>`).join('')}</div>`;
    return renderListing({ path: `/shop/${key}`, title: sec.name, crumbs: [[sec.name]], base: { section: key }, query, section: key, chips });
  }

  function pageCategory([, slug], query) {
    const sec = state.catalog.sections.find((s) => s.categories.some((c) => c.slug === slug));
    if (!sec) throw Object.assign(new Error('Category not found.'), { status: 404 });
    const cat = sec.categories.find((c) => c.slug === slug);
    return renderListing({ path: `/category/${slug}`, title: cat.name, crumbs: [[sec.name, `#/shop/${sec.key}`], [cat.name]], base: { category: slug }, query, section: sec.key });
  }

  function pageBrands() {
    const c = state.config;
    view.innerHTML = `
      <div class="breadcrumbs"><a href="#/">Home</a> › Brands</div>
      <h1>Shop spare parts by phone brand</h1>
      <p class="muted">Pick your brand, then the part you need. Can't find your model? <a style="color:var(--red)" target="_blank" rel="noopener" href="${waLink(c.whatsappNumber, 'Hi IPHIX, do you have a part for: ')}">Ask us on WhatsApp</a>.</p>
      <div class="how">${state.catalog.brands.map((b) => `
        <div class="card">
          <h3><a href="#/brand/${b.slug}">${esc(b.name)}</a> ${b.count ? `<span class="pill">${b.count} parts</span>` : '<span class="pill pill-amber">Coming soon</span>'}</h3>
          ${b.parts.map((p) => `<div><a href="#/brand/${b.slug}?part=${p.key}">${esc(p.label)}</a> <span class="muted small">${p.count || ''}</span></div>`).join('')}
        </div>`).join('')}
      </div>`;
  }

  function pageBrand([, slug], query) {
    const b = state.catalog.brands.find((x) => x.slug === slug);
    if (!b) throw Object.assign(new Error('Brand not found.'), { status: 404 });
    const part = query.get('part') || '';
    const keep = new URLSearchParams(query);
    const chipHref = (key) => { const q = new URLSearchParams(keep); if (key) q.set('part', key); else q.delete('part'); const s = q.toString(); return `#/brand/${slug}${s ? `?${s}` : ''}`; };
    const chips = `<div class="chips"><a class="chip ${!part ? 'on' : ''}" href="${chipHref('')}">All ${esc(b.name)} parts</a>
      ${b.parts.map((p) => `<a class="chip ${part === p.key ? 'on' : ''}" href="${chipHref(p.key)}">${esc(p.label)}<span class="count">${p.count}</span></a>`).join('')}</div>`;
    const intro = b.count ? '' : `<div class="card" style="margin-bottom:14px">📦 <b>${esc(b.name)}</b> stock is coming soon. Message us on WhatsApp and we'll source the part for you.</div>`;
    const label = part ? (b.parts.find((p) => p.key === part) || {}).label : 'spare parts';
    return renderListing({ path: `/brand/${slug}`, title: `${b.name} ${label}`, crumbs: [['Brands', '#/brands'], [b.name]], base: { brand: slug, section: 'spares' }, query, section: 'spares', chips, intro });
  }

  const pageDeals = (m, query) => renderListing({ path: '/deals', title: '🔥 Deals', crumbs: [['Deals']], base: { deal: 1 }, query });
  const pageNew = (m, query) => renderListing({ path: '/new', title: '🆕 New arrivals', crumbs: [['New arrivals']], base: { new: 1, sort: 'newest' }, query });
  function pageSearch(m, query) {
    const q = query.get('q') || '';
    $('#search-input').value = q;
    return renderListing({ path: '/search', title: `Results for “${q}”`, crumbs: [['Search']], query });
  }

  // ---------- page: product ----------
  async function pageProduct([, slug]) {
    const { product: p, related } = await api(`/api/products/${encodeURIComponent(slug)}`);
    remember([p, ...related]);
    const c = state.config;
    const isService = p.category.section === 'services';
    const off = p.comparePrice ? Math.round((1 - p.price / p.comparePrice) * 100) : 0;
    const max = isService ? 99 : p.stock;
    const productUrl = `${location.origin}/#/p/${p.slug}`;
    const refLink = myRefLink(`/p/${p.slug}`);
    const sec = state.catalog.sections.find((s) => s.key === p.category.section);

    view.innerHTML = `
      <div class="breadcrumbs"><a href="#/">Home</a> › <a href="#/shop/${sec.key}">${esc(sec.name)}</a> › <a href="#/category/${p.category.slug}">${esc(p.category.name)}</a></div>
      <div class="card product">
        <div class="gallery"><img src="${esc(p.image)}" alt="${esc(p.name)}"></div>
        <div>
          <h1>${esc(p.name)}</h1>
          <div class="meta"><span class="stars">${stars(p.rating)}</span> ${p.rating} · ${p.sold.toLocaleString()} sold
            ${p.isNew ? '<span class="pill pill-blue">NEW</span>' : ''}${p.isDeal ? '<span class="pill pill-red">DEAL</span>' : ''}</div>
          <div class="price-box">
            <span class="price">${isService ? '<small>from </small>' : ''}${money(p.price)}</span>
            ${p.comparePrice ? `<span class="was">${money(p.comparePrice)}</span><span class="off">-${off}%</span>` : ''}
            ${p.wholesalePrice && !isService ? `<div class="wholesale-note">📦 Wholesale: ${money(p.wholesalePrice)} each when you buy ${c.wholesaleMinQty}+ pieces</div>` : ''}
          </div>
          <div class="specs">
            ${p.brand ? `<div><span>Brand</span><span><a href="#/brand/${p.brand.slug}" style="color:var(--red)">${esc(p.brand.name)}</a></span></div>` : ''}
            ${p.model ? `<div><span>Compatible with</span><span>${esc(p.model)}</span></div>` : ''}
            <div><span>Category</span><span>${esc(p.category.name)}</span></div>
            <div><span>Availability</span><span>${isService ? '✅ Book now — done at our repair desk' : p.stock > 0 ? `✅ In stock (${p.stock} available)` : '❌ Out of stock — ask us on WhatsApp'}</span></div>
            <div><span>Delivery</span><span>${money(c.deliveryFee)} · FREE over ${money(c.freeDeliveryOver)} · or pick up at the shop</span></div>
          </div>
          <div class="buy-row">
            <div class="qty"><button type="button" data-q="-1" aria-label="Decrease">−</button><input id="qty" type="number" min="1" max="${max}" value="1" aria-label="Quantity"><button type="button" data-q="1" aria-label="Increase">+</button></div>
            <button class="btn" id="add" ${max <= 0 ? 'disabled' : ''}>${isService ? 'Book service' : 'Add to cart'}</button>
            <button class="btn btn-dark" id="buy" ${max <= 0 ? 'disabled' : ''}>Buy now</button>
          </div>
          <a class="btn btn-wa" id="wa-order" target="_blank" rel="noopener" href="#">💬 Order this on WhatsApp</a>
          <div class="share-box">
            <b>💰 Share &amp; earn ${c.commissionPct}%</b> —
            ${refLink ? `send this to friends and earn on every purchase through your link.
              <div class="copy-row" style="margin-top:8px"><input type="text" readonly value="${esc(refLink)}"><button class="btn btn-sm" id="copy-ref">Copy</button>
              <a class="btn btn-sm btn-wa" target="_blank" rel="noopener" href="${`https://wa.me/?text=${encodeURIComponent(`🔥 ${p.name} — only ${money(p.price)} at ${c.storeName}. Order here: ${refLink}`)}`}">Share</a></div>`
            : `<a href="#/login?next=${encodeURIComponent(`/p/${p.slug}`)}" style="color:#0a7d3b;font-weight:700">sign in</a> to get your personal link.`}
          </div>
          <div class="trust"><div>🛡️ 3-month parts warranty</div><div>🔧 Fitting available</div><div>💬 WhatsApp support</div></div>
        </div>
      </div>
      <div class="card" style="margin-top:14px"><h3>Description</h3><div class="desc">${esc(p.description || 'Contact us on WhatsApp for full details.')}</div></div>
      ${related.length ? `<div class="section-head"><h2>You may also need</h2></div>${productGrid(related)}` : ''}`;

    const qtyInput = $('#qty');
    const getQty = () => Math.max(1, Math.min(max, Math.floor(Number(qtyInput.value) || 1)));
    const updateWa = () => {
      $('#wa-order').href = waLink(c.whatsappNumber, `Hi ${c.storeName}, I'd like to order:\n${p.name}\nQty: ${getQty()}\nPrice: ${money(p.price)} each\n${productUrl}`);
    };
    $$('[data-q]').forEach((b) => b.addEventListener('click', () => { qtyInput.value = Math.max(1, Math.min(max, getQty() + Number(b.dataset.q))); updateWa(); }));
    qtyInput.addEventListener('change', () => { qtyInput.value = getQty(); updateWa(); });
    updateWa();
    $('#add').addEventListener('click', () => addToCart(p, getQty()));
    $('#buy').addEventListener('click', () => { addToCart(p, getQty()); location.hash = '#/cart'; });
    if ($('#copy-ref')) $('#copy-ref').addEventListener('click', () => copyText(refLink));
  }

  // ---------- page: cart ----------
  async function pageCart() {
    if (!state.cart.length) {
      view.innerHTML = `<div class="empty card"><div class="big">🛒</div><h2>Your cart is empty</h2><p>Find screens, batteries, covers, chargers and more.</p><a class="btn" href="#/">Start shopping</a></div>`;
      return;
    }
    let quote = null;
    let error = '';
    try {
      quote = await api('/api/cart/quote', { method: 'POST', body: { items: state.cart.map((l) => ({ productId: l.id, qty: l.qty })), refCode: state.ref } });
    } catch (e) { error = e.message; }
    const c = state.config;
    view.innerHTML = `
      <h1>Shopping cart (${cartCount()})</h1>
      <div class="two-col">
        <div class="card">
          ${error ? `<div class="form-error">${esc(error)}</div>` : ''}
          ${state.cart.map((l) => {
            const q = quote && quote.lines.find((x) => x.productId === l.id);
            return `<div class="cart-line">
              <a href="#/p/${esc(l.slug)}"><img src="${esc(l.image)}" alt=""></a>
              <div><a class="name" href="#/p/${esc(l.slug)}">${esc(l.name)}</a>
                <div class="muted small">${money(q ? q.unitPrice : l.price)} each ${q && q.wholesale ? '<span class="pill pill-green">Wholesale price</span>' : ''}</div></div>
              <div class="right">
                <div class="qty"><button data-dec="${l.id}">−</button><input type="number" min="1" value="${l.qty}" data-set="${l.id}" aria-label="Quantity"><button data-inc="${l.id}">+</button></div>
                <b>${money(q ? q.lineTotal : l.price * l.qty)}</b>
                <button class="link-btn" data-remove="${l.id}">Remove</button>
              </div></div>`;
          }).join('')}
          <p class="muted small">💡 Buy ${c.wholesaleMinQty}+ pieces of an item to unlock wholesale pricing.</p>
        </div>
        <aside class="card summary">
          <h3>Order summary</h3>
          ${quote ? summaryRows(quote) : ''}
          ${quote && quote.referral ? `<div class="ref-banner">🎁 Referred by ${esc(quote.referral.name)}${quote.discount ? ` — you save ${money(quote.discount)}` : ''}</div>` : ''}
          <a class="btn btn-block" href="#/checkout" ${quote ? '' : 'aria-disabled="true" style="pointer-events:none;opacity:.5"'}>Checkout</a>
          <p class="muted small" style="text-align:center;margin-bottom:0">Your order is confirmed on WhatsApp and you get a PDF receipt.</p>
        </aside>
      </div>`;

    const setQty = (id, qty) => {
      const line = state.cart.find((l) => l.id === id);
      if (!line) return;
      line.qty = Math.max(1, Math.min(line.max || 999, qty));
      saveCart();
      pageCart();
    };
    $$('[data-inc]').forEach((b) => b.addEventListener('click', () => setQty(Number(b.dataset.inc), state.cart.find((l) => l.id === Number(b.dataset.inc)).qty + 1)));
    $$('[data-dec]').forEach((b) => b.addEventListener('click', () => setQty(Number(b.dataset.dec), state.cart.find((l) => l.id === Number(b.dataset.dec)).qty - 1)));
    $$('[data-set]').forEach((i) => i.addEventListener('change', () => setQty(Number(i.dataset.set), Math.floor(Number(i.value) || 1))));
    $$('[data-remove]').forEach((b) => b.addEventListener('click', () => {
      state.cart = state.cart.filter((l) => l.id !== Number(b.dataset.remove));
      saveCart();
      pageCart();
    }));
  }

  function summaryRows(q) {
    return `<div class="row"><span>Subtotal</span><span>${money(q.subtotal)}</span></div>
      ${q.discount ? `<div class="row disc"><span>Referral discount</span><span>−${money(q.discount)}</span></div>` : ''}
      <div class="row"><span>Delivery</span><span>${q.deliveryFee ? money(q.deliveryFee) : 'FREE'}</span></div>
      <div class="row total"><span>Total</span><span>${money(q.total)}</span></div>`;
  }

  // ---------- page: checkout ----------
  async function pageCheckout() {
    if (!state.cart.length) { location.hash = '#/cart'; return; }
    if (!requireLogin('/checkout')) return;
    const c = state.config;
    const u = state.user;
    const saved = store.get('ipx_checkout', {});
    view.innerHTML = `
      <div class="steps"><span>1. Cart</span>›<span class="on">2. Details</span>›<span>3. Confirm on WhatsApp</span></div>
      <h1>Checkout</h1>
      <form id="checkout" class="two-col" novalidate>
        <div>
          <div class="card">
            <h3>Contact</h3>
            <div class="grid-2">
              <div class="field"><label for="c-name">Full name</label><input id="c-name" name="name" type="text" required value="${esc(saved.name || u.name)}"></div>
              <div class="field"><label for="c-phone">WhatsApp number</label><input id="c-phone" name="phone" type="tel" required value="${esc(saved.phone || `+${u.phone}`)}"><div class="hint">We send order updates here.</div></div>
            </div>
          </div>
          <div class="card" style="margin-top:14px">
            <h3>Delivery</h3>
            ${Object.entries(c.deliveryMethods).map(([k, label], i) => `<label class="choice"><input type="radio" name="deliveryMethod" value="${k}" ${(saved.deliveryMethod || 'delivery') === k || (!saved.deliveryMethod && i === 0) ? 'checked' : ''}>
              <span>${esc(label)}<small>${k === 'delivery' ? `${money(c.deliveryFee)} — FREE over ${money(c.freeDeliveryOver)}` : 'Free — collect at our shop / repair desk'}</small></span></label>`).join('')}
            <div id="address-fields" class="grid-2">
              <div class="field"><label for="c-city">Town / city</label><input id="c-city" name="city" type="text" value="${esc(saved.city || '')}"></div>
              <div class="field"><label for="c-address">Address / landmark</label><input id="c-address" name="address" type="text" value="${esc(saved.address || '')}" placeholder="Building, street, estate"></div>
            </div>
          </div>
          <div class="card" style="margin-top:14px">
            <h3>Payment</h3>
            ${Object.entries(c.paymentMethods).map(([k, label], i) => `<label class="choice"><input type="radio" name="paymentMethod" value="${k}" ${(saved.paymentMethod || 'mpesa') === k || (!saved.paymentMethod && i === 0) ? 'checked' : ''}><span>${esc(label)}</span></label>`).join('')}
            <div class="field"><label for="c-notes">Order notes (optional)</label><textarea id="c-notes" name="notes" rows="2" placeholder="Phone model, colour, preferred delivery time…"></textarea></div>
          </div>
        </div>
        <aside class="card summary">
          <h3>Your order</h3>
          ${state.cart.map((l) => `<div class="row small"><span>${esc(l.name)} × ${l.qty}</span></div>`).join('')}
          <div id="quote"></div>
          <div class="field" style="margin-top:10px"><label for="c-ref">Referral code</label>
            <div class="copy-row"><input id="c-ref" name="refCode" type="text" value="${esc(state.ref || '')}" placeholder="Optional"><button type="button" class="btn btn-sm btn-ghost" id="apply-ref">Apply</button></div></div>
          <div id="checkout-error"></div>
          <button class="btn btn-block" id="place" type="submit">Place order &amp; continue to WhatsApp</button>
          <p class="muted small" style="text-align:center;margin-bottom:0">You'll get a PDF receipt and a tracking link.</p>
        </aside>
      </form>`;

    const form = $('#checkout');
    const val = (n) => { const el = form.elements[n]; return el ? (el.value || '').trim() : ''; };
    const items = () => state.cart.map((l) => ({ productId: l.id, qty: l.qty }));
    const toggleAddress = () => { $('#address-fields').hidden = val('deliveryMethod') === 'pickup'; };
    const refreshQuote = async () => {
      try {
        const q = await api('/api/cart/quote', { method: 'POST', body: { items: items(), refCode: val('refCode'), deliveryMethod: val('deliveryMethod') } });
        $('#quote').innerHTML = summaryRows(q) + (q.referral ? `<div class="ref-banner">🎁 Referred by ${esc(q.referral.name)}${q.discount ? ` — you save ${money(q.discount)}` : ''}</div>` : '');
        $('#checkout-error').innerHTML = '';
      } catch (e) {
        $('#checkout-error').innerHTML = `<div class="form-error">${esc(e.message)}</div>`;
      }
    };
    $$('input[name=deliveryMethod]', form).forEach((r) => r.addEventListener('change', () => { toggleAddress(); refreshQuote(); }));
    $('#apply-ref').addEventListener('click', () => {
      const code = val('refCode').toUpperCase();
      state.ref = code || null;
      if (code) store.set('ipx_ref', { code, at: Date.now() });
      refreshQuote();
    });
    toggleAddress();
    refreshQuote();

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = $('#place');
      btn.disabled = true;
      btn.textContent = 'Placing order…';
      const details = { name: val('name'), phone: val('phone'), city: val('city'), address: val('address'), deliveryMethod: val('deliveryMethod'), paymentMethod: val('paymentMethod') };
      store.set('ipx_checkout', details);
      try {
        const { order } = await api('/api/orders', {
          method: 'POST',
          body: {
            items: items(), customer: { name: details.name, phone: details.phone, city: details.city, address: details.address },
            deliveryMethod: details.deliveryMethod, paymentMethod: details.paymentMethod, notes: val('notes'), refCode: val('refCode'),
          },
        });
        state.cart = [];
        saveCart();
        location.hash = `#/order-success/${order.code}`;
      } catch (err) {
        $('#checkout-error').innerHTML = `<div class="form-error">${esc(err.message)}</div>`;
        btn.disabled = false;
        btn.textContent = 'Place order & continue to WhatsApp';
        if (err.status === 401) { state.user = null; renderUserChrome(); requireLogin('/checkout'); }
      }
    });
  }

  // ---------- pages: orders & tracking ----------
  async function pageOrderSuccess([, code]) {
    const { order } = await api(`/api/orders/${encodeURIComponent(code)}`);
    view.innerHTML = `
      <div class="card success-hero">
        <div class="big">🎉</div>
        <h1>Order placed — thank you!</h1>
        <p>Your order number is <span class="order-code">${esc(order.code)}</span></p>
        <p><b>Last step:</b> send the order to us on WhatsApp so we can confirm availability and payment.</p>
        <div class="btn-row" style="justify-content:center;margin-top:14px">
          <a class="btn btn-wa" href="${esc(order.whatsappUrl)}" target="_blank" rel="noopener">💬 Send order on WhatsApp</a>
          <a class="btn btn-outline" href="${esc(order.receiptUrl)}&download=1">📄 Download PDF receipt</a>
          <a class="btn btn-ghost" href="#/orders/${esc(order.code)}">📦 Track order</a>
        </div>
      </div>
      ${orderDetails(order)}`;
  }

  const DELIVERY_STEPS = ['pending', 'confirmed', 'processing', 'shipped', 'out_for_delivery', 'delivered'];
  const PICKUP_STEPS = ['pending', 'confirmed', 'processing', 'ready_for_pickup', 'delivered'];

  function timeline(order) {
    const labels = state.config.statuses;
    const steps = order.deliveryMethod === 'pickup' ? PICKUP_STEPS : DELIVERY_STEPS;
    const lastEvent = (s) => [...order.events].reverse().find((e) => e.status === s);
    if (order.status === 'cancelled') {
      return `<ul class="timeline">${order.events.map((e) => `<li class="${e.status === 'cancelled' ? 'cancelled current' : 'done'}"><b>${esc(e.label)}</b>
        <span class="when">${fmtDate(e.at)}${e.note ? ` — ${esc(e.note)}` : ''}</span></li>`).join('')}</ul>`;
    }
    const idx = Math.max(0, steps.indexOf(order.status));
    return `<ul class="timeline">${steps.map((s, i) => {
      const ev = lastEvent(s);
      const cls = i < idx ? 'done' : i === idx ? (s === 'delivered' ? 'done' : 'current') : '';
      return `<li class="${cls}"><b>${esc(labels[s])}</b>${ev ? `<span class="when">${fmtDate(ev.at)}${ev.note ? ` — ${esc(ev.note)}` : ''}</span>` : ''}</li>`;
    }).join('')}</ul>`;
  }

  function orderDetails(order, { owner = false } = {}) {
    return `<div class="two-col" style="margin-top:14px">
      <div class="card">
        <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap">
          <h2 style="margin:0">Order <span class="order-code">${esc(order.code)}</span></h2>${statusPill(order.status, order.statusLabel)}</div>
        <p class="muted small">Placed ${fmtDate(order.createdAt)} · ${esc(order.deliveryLabel)} · ${esc(order.paymentLabel)}</p>
        <h3>Tracking</h3>
        ${timeline(order)}
        <div class="btn-row">
          <a class="btn btn-wa btn-sm" href="${esc(order.trackWhatsappUrl)}" target="_blank" rel="noopener">💬 Track on WhatsApp</a>
          <a class="btn btn-outline btn-sm" href="${esc(order.receiptUrl)}" target="_blank" rel="noopener">📄 View receipt (PDF)</a>
          ${owner && order.canCancel ? '<button class="btn btn-ghost btn-sm" id="cancel-order">Cancel order</button>' : ''}
        </div>
      </div>
      <aside class="card summary">
        <h3>Items</h3>
        <div class="order-items">${order.items.map((i) => `<div class="row"><span>${esc(i.name)} × ${i.qty}</span><b>${money(i.lineTotal)}</b></div>`).join('')}</div>
        ${summaryRows(order)}
        <p class="small muted" style="margin-bottom:0">${esc(order.customerName)} · +${esc(order.phone)}${order.deliveryMethod === 'delivery' ? `<br>${esc(order.address)}, ${esc(order.city)}` : ''}</p>
      </aside>
    </div>`;
  }

  async function pageOrder([, code], query) {
    const t = query.get('t');
    const { order } = await api(`/api/orders/${encodeURIComponent(code)}${t ? `?t=${encodeURIComponent(t)}` : ''}`);
    const owner = Boolean(state.user && !t);
    view.innerHTML = `<div class="breadcrumbs"><a href="#/">Home</a> › ${owner ? '<a href="#/account">My orders</a>' : '<a href="#/track">Track order</a>'} › ${esc(order.code)}</div>${orderDetails(order, { owner })}`;
    const cancel = $('#cancel-order');
    if (cancel) {
      cancel.addEventListener('click', async () => {
        if (!confirm('Cancel this order?')) return;
        try {
          await api(`/api/orders/${encodeURIComponent(order.code)}/cancel`, { method: 'POST', body: {} });
          toast('Order cancelled', 'ok');
          route();
        } catch (e) { toast(e.message, 'error'); }
      });
    }
  }

  function pageTrack() {
    const c = state.config;
    view.innerHTML = `
      <div class="auth card">
        <h1>📍 Track your order</h1>
        <p class="muted" style="text-align:center">Enter your order number and the phone number used at checkout.</p>
        <form id="track-form">
          <div id="track-error"></div>
          <div class="field"><label for="t-code">Order number</label><input id="t-code" name="code" type="text" placeholder="IPX-260929-AB12" required></div>
          <div class="field"><label for="t-phone">Phone number</label><input id="t-phone" name="phone" type="tel" placeholder="0712 345 678" required></div>
          <button class="btn btn-block" type="submit">Track order</button>
        </form>
        <p style="text-align:center;margin:16px 0 6px" class="muted">or</p>
        <a class="btn btn-wa btn-block" target="_blank" rel="noopener" href="${waLink(c.whatsappNumber, 'TRACK ')}">💬 Track on WhatsApp</a>
        <p class="hint" style="text-align:center">Send <b>TRACK</b> followed by your order number.</p>
      </div>`;
    $('#track-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const f = new FormData(e.target);
      try {
        const r = await api('/api/track', { method: 'POST', body: { code: f.get('code'), phone: f.get('phone') } });
        location.hash = `#/track/${r.order.code}?t=${r.token}`;
      } catch (err) {
        $('#track-error').innerHTML = `<div class="form-error">${esc(err.message)}</div>`;
      }
    });
  }

  // ---------- pages: auth ----------
  function authForm(kind, query) {
    const next = query.get('next') || '/account';
    const isReg = kind === 'register';
    view.innerHTML = `
      <div class="auth card">
        <h1>${isReg ? 'Create your account' : 'Welcome back'}</h1>
        <p class="muted" style="text-align:center">${isReg ? 'Shop faster, track orders and earn by sharing.' : 'Sign in with your email or phone number.'}</p>
        <form id="auth-form">
          <div id="auth-error"></div>
          ${isReg ? `
            <div class="field"><label for="a-name">Full name</label><input id="a-name" name="name" type="text" autocomplete="name" required></div>
            <div class="field"><label for="a-email">Email</label><input id="a-email" name="email" type="email" autocomplete="email" required></div>
            <div class="field"><label for="a-phone">WhatsApp number</label><input id="a-phone" name="phone" type="tel" autocomplete="tel" placeholder="0712 345 678" required></div>
            <div class="field"><label for="a-pass">Password</label><input id="a-pass" name="password" type="password" autocomplete="new-password" minlength="8" required><div class="hint">At least 8 characters.</div></div>
            <div class="field"><label for="a-ref">Referral code (optional)</label><input id="a-ref" name="ref" type="text" value="${esc(state.ref || '')}"></div>`
          : `
            <div class="field"><label for="a-id">Email or phone</label><input id="a-id" name="identifier" type="text" autocomplete="username" required></div>
            <div class="field"><label for="a-pass">Password</label><input id="a-pass" name="password" type="password" autocomplete="current-password" required></div>`}
          <button class="btn btn-block" type="submit">${isReg ? 'Create account' : 'Sign in'}</button>
        </form>
        <div class="switch">${isReg ? `Already have an account? <a href="#/login?next=${encodeURIComponent(next)}">Sign in</a>`
          : `New to IPHIX? <a href="#/register?next=${encodeURIComponent(next)}">Create an account</a><br><br>
             <span class="muted small">Forgot your password? <a target="_blank" rel="noopener" href="${waLink(state.config.whatsappNumber, 'Hi IPHIX, I need help resetting my account password.')}">Contact us on WhatsApp</a></span>`}</div>
      </div>`;
    $('#auth-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const body = Object.fromEntries(new FormData(e.target));
      const btn = $('button[type=submit]', e.target);
      btn.disabled = true;
      try {
        const { user } = await api(`/api/auth/${isReg ? 'register' : 'login'}`, { method: 'POST', body });
        state.user = user;
        renderUserChrome();
        toast(isReg ? `Welcome, ${user.name.split(' ')[0]}! 🎉` : 'Signed in', 'ok');
        location.hash = `#${next.startsWith('/') ? next : '/account'}`;
      } catch (err) {
        $('#auth-error').innerHTML = `<div class="form-error">${esc(err.message)}</div>`;
        btn.disabled = false;
      }
    });
  }

  // ---------- page: account ----------
  async function pageAccount(m, query) {
    if (!requireLogin('/account')) return;
    const tab = query.get('tab') || 'orders';
    const u = state.user;
    let body = '';
    if (tab === 'orders') {
      const { orders } = await api('/api/orders');
      body = orders.length ? `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Order</th><th>Date</th><th>Items</th><th>Total</th><th>Status</th></tr></thead><tbody>
        ${orders.map((o) => `<tr><td><a style="color:var(--red);font-weight:700" href="#/orders/${esc(o.code)}">${esc(o.code)}</a></td><td>${fmtDate(o.createdAt)}</td><td>${o.itemCount}</td><td>${money(o.total)}</td><td>${statusPill(o.status, o.statusLabel)}</td></tr>`).join('')}
        </tbody></table></div>` : '<div class="empty"><div class="big">📦</div><p>No orders yet.</p><a class="btn" href="#/">Start shopping</a></div>';
    } else if (tab === 'profile') {
      body = `<form id="profile-form" style="max-width:460px"><div id="form-msg"></div>
        <div class="field"><label>Full name</label><input name="name" type="text" value="${esc(u.name)}" required></div>
        <div class="field"><label>Email</label><input type="email" value="${esc(u.email)}" disabled></div>
        <div class="field"><label>WhatsApp number</label><input name="phone" type="tel" value="+${esc(u.phone)}" required></div>
        <button class="btn" type="submit">Save changes</button></form>`;
    } else {
      body = `<form id="password-form" style="max-width:460px"><div id="form-msg"></div>
        <div class="field"><label>Current password</label><input name="current" type="password" autocomplete="current-password" required></div>
        <div class="field"><label>New password</label><input name="next" type="password" autocomplete="new-password" minlength="8" required></div>
        <button class="btn" type="submit">Change password</button>
        <p class="hint">Changing your password signs you out on other devices.</p></form>`;
    }
    view.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap">
        <h1>Hi, ${esc(u.name.split(' ')[0])} 👋</h1>
        <div class="btn-row"><a class="btn btn-sm" href="#/earn">💰 Promoter dashboard</a>${u.role === 'admin' ? '<a class="btn btn-sm btn-dark" href="#/admin">⚙️ Admin</a>' : ''}<button class="btn btn-sm btn-ghost" id="logout">Sign out</button></div>
      </div>
      <div class="card">
        <div class="tabs">${[['orders', 'My orders'], ['profile', 'Profile'], ['security', 'Password']].map(([k, t]) => `<button data-tab="${k}" class="${tab === k ? 'on' : ''}">${t}</button>`).join('')}</div>
        ${body}
      </div>`;
    $$('[data-tab]').forEach((b) => b.addEventListener('click', () => { location.hash = `#/account?tab=${b.dataset.tab}`; }));
    $('#logout').addEventListener('click', async () => {
      await api('/api/auth/logout', { method: 'POST', body: {} });
      state.user = null;
      renderUserChrome();
      toast('Signed out');
      location.hash = '#/';
    });
    const bindForm = (id, url, done) => {
      const f = $(id);
      if (!f) return;
      f.addEventListener('submit', async (e) => {
        e.preventDefault();
        try {
          const r = await api(url, { method: 'PUT', body: Object.fromEntries(new FormData(f)) });
          done(r);
          $('#form-msg').innerHTML = '<div class="ref-banner">Saved ✔</div>';
          if (id === '#password-form') f.reset();
        } catch (err) {
          $('#form-msg').innerHTML = `<div class="form-error">${esc(err.message)}</div>`;
        }
      });
    };
    bindForm('#profile-form', '/api/auth/me', (r) => { state.user = r.user; renderUserChrome(); });
    bindForm('#password-form', '/api/auth/password', () => {});
  }

  // ---------- page: earn (affiliate programme) ----------
  async function pageEarn() {
    const c = state.config;
    const how = `<div class="how">
      <div class="card"><div class="n">1</div><h3>Get your link</h3><p class="muted">Create a free account — you instantly get a personal referral link and code.</p></div>
      <div class="card"><div class="n">2</div><h3>Share it</h3><p class="muted">Post products on WhatsApp status, groups, Facebook, TikTok &amp; Instagram. Friends get ${c.referralDiscountPct}% off their first order.</p></div>
      <div class="card"><div class="n">3</div><h3>They buy</h3><p class="muted">Every order through your link — and all future orders by people who signed up with your code — is tracked to you.</p></div>
      <div class="card"><div class="n">4</div><h3>Get paid</h3><p class="muted">Earn ${c.commissionPct}% of each sale once it's delivered. Withdraw to M-Pesa from ${money(c.minPayout)}.</p></div>
    </div>`;
    if (!state.user) {
      view.innerHTML = `
        <div class="earn-hero"><h1>💰 Earn money sharing IPHIX COMMUNICATIONS</h1>
          <p>Become an IPHIX promoter. Share phone accessories, spares and repair deals with your friends and earn <b>${c.commissionPct}% commission</b> on every purchase — paid to your M-Pesa.</p>
          <div class="btn-row"><a class="btn" href="#/register?next=%2Fearn">Join free &amp; get my link</a><a class="btn btn-outline" style="background:transparent;color:#fff;box-shadow:inset 0 0 0 2px #fff" href="#/login?next=%2Fearn">I have an account</a></div></div>
        ${how}`;
      return;
    }
    const a = await api('/api/affiliate');
    const s = a.stats;
    const shareText = `📱 Need phone accessories, screens, batteries or a repair? Shop at ${c.storeName} — order online & confirm on WhatsApp. Use my link for ${a.referralDiscountPct}% off your first order: ${a.link}`;
    view.innerHTML = `
      <div class="earn-hero"><h1>💰 Promoter dashboard</h1>
        <p>Earn <b>${a.commissionPct}%</b> on every sale from your link. Your friends save <b>${a.referralDiscountPct}%</b> on their first order.</p>
        <div class="copy-row" style="max-width:620px"><input id="ref-link" type="text" readonly value="${esc(a.link)}"><button class="btn btn-sm" id="copy-link">Copy link</button></div>
        <p class="small" style="margin:10px 0 0">Your code: <b style="font-size:18px;letter-spacing:1px">${esc(a.code)}</b></p>
        <div class="btn-row" style="margin-top:12px">
          <a class="btn btn-sm" target="_blank" rel="noopener" href="https://wa.me/?text=${encodeURIComponent(shareText)}">Share on WhatsApp</a>
          <a class="btn btn-sm" target="_blank" rel="noopener" href="https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(a.link)}">Share on Facebook</a>
          <a class="btn btn-sm" target="_blank" rel="noopener" href="https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}">Share on X</a>
          <button class="btn btn-sm" id="copy-caption">Copy caption</button>
        </div>
      </div>
      <div class="stats">
        <div class="stat green"><div class="v">${money(s.available)}</div><div class="k">Available to withdraw</div></div>
        <div class="stat hl"><div class="v">${money(s.pending)}</div><div class="k">Pending (awaiting delivery)</div></div>
        <div class="stat"><div class="v">${money(s.paid)}</div><div class="k">Paid out</div></div>
        <div class="stat"><div class="v">${s.clicks}</div><div class="k">Link visitors</div></div>
        <div class="stat"><div class="v">${s.signups}</div><div class="k">Sign-ups</div></div>
        <div class="stat"><div class="v">${s.orders}</div><div class="k">Orders</div></div>
        <div class="stat"><div class="v">${money(s.sales)}</div><div class="k">Sales you generated</div></div>
      </div>
      <div class="two-col">
        <div class="card">
          <h3>Referred orders</h3>
          ${a.orders.length ? `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Order</th><th>Customer</th><th>Sale</th><th>Commission</th><th>Status</th></tr></thead><tbody>
            ${a.orders.map((o) => `<tr><td>${esc(o.code)}<div class="muted small">${fmtDate(o.createdAt)}</div></td><td>${esc(o.customer)}</td><td>${money(o.amount)}</td><td><b>${money(o.commission)}</b></td>
              <td><span class="pill ${o.commissionStatus === 'approved' ? 'pill-green' : o.commissionStatus === 'void' ? 'pill-grey' : 'pill-amber'}">${o.commissionStatus === 'approved' ? 'Earned' : o.commissionStatus === 'void' ? 'Cancelled' : 'Pending'}</span>
              <div class="muted small">${esc(o.status)}</div></td></tr>`).join('')}</tbody></table></div>`
            : '<p class="muted">No referred orders yet — share your link to get started!</p>'}
          <h3 style="margin-top:20px">Tips to earn more</h3>
          <ul class="tips muted">
            <li>Post one product per day on your WhatsApp status with your link — screens, covers and chargers sell fastest.</li>
            <li>Every product page has a <b>Share &amp; earn</b> box that creates a link straight to that item.</li>
            <li>Join phone-repair and campus WhatsApp groups — technicians buy spares in bulk (wholesale from ${c.wholesaleMinQty} pcs).</li>
            <li>Ask friends to sign up with your code <b>${esc(a.code)}</b> — you earn on all their future orders too.</li>
          </ul>
        </div>
        <aside class="card">
          <h3>Withdraw earnings</h3>
          <form id="payout-form">
            <div id="payout-msg"></div>
            <div class="field"><label>Amount (${esc(c.currency)})</label><input name="amount" type="number" min="${a.minPayout}" max="${Math.max(0, s.available)}" required placeholder="Min ${a.minPayout}"></div>
            <div class="field"><label>M-Pesa number</label><input name="account" type="tel" value="+${esc(state.user.phone)}" required></div>
            <button class="btn btn-block" type="submit" ${s.available < a.minPayout ? 'disabled' : ''}>Request payout</button>
            <p class="hint">${s.available < a.minPayout ? `You can withdraw once you have ${money(a.minPayout)} available.` : 'Payouts are sent to M-Pesa within 48 hours.'}</p>
          </form>
          ${a.payouts.length ? `<h3 style="margin-top:16px">Payout history</h3>${a.payouts.map((p) => `<div class="row" style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--line);font-size:14px"><span>${money(p.amount)}<div class="muted small">${fmtDate(p.createdAt)}</div></span><span class="pill ${p.status === 'paid' ? 'pill-green' : p.status === 'rejected' ? 'pill-grey' : 'pill-amber'}">${esc(p.status)}</span></div>`).join('')}` : ''}
        </aside>
      </div>
      <h2 style="margin-top:24px">How it works</h2>${how}`;
    $('#copy-link').addEventListener('click', () => copyText(a.link));
    $('#copy-caption').addEventListener('click', () => copyText(shareText));
    $('#payout-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const f = Object.fromEntries(new FormData(e.target));
      try {
        await api('/api/affiliate/payouts', { method: 'POST', body: { amount: Number(f.amount), method: 'mpesa', account: f.account } });
        toast('Payout requested ✔', 'ok');
        pageEarn();
      } catch (err) {
        $('#payout-msg').innerHTML = `<div class="form-error">${esc(err.message)}</div>`;
      }
    });
  }

  // ---------- page: admin ----------
  async function pageAdmin(m, query) {
    if (!requireLogin('/admin')) return;
    if (state.user.role !== 'admin') throw Object.assign(new Error('This page is for store admins.'), { status: 403 });
    const tab = query.get('tab') || 'orders';
    const tabs = [['orders', '📦 Orders'], ['products', '🏷️ Products'], ['promoters', '💰 Promoters'], ['payouts', '💸 Payouts']];
    const st = await api('/api/admin/stats');
    view.innerHTML = `
      <h1>⚙️ Store admin</h1>
      <div class="stats">
        <div class="stat hl"><div class="v">${st.openOrders}</div><div class="k">Open orders</div></div>
        <div class="stat"><div class="v">${st.ordersToday}</div><div class="k">Orders today</div></div>
        <div class="stat"><div class="v">${money(st.revenue)}</div><div class="k">Delivered revenue</div></div>
        <div class="stat"><div class="v">${money(st.pipeline)}</div><div class="k">In progress</div></div>
        <div class="stat"><div class="v">${st.customers}</div><div class="k">Customers</div></div>
        <div class="stat"><div class="v">${st.lowStock}</div><div class="k">Low-stock items (≤3)</div></div>
        <div class="stat green"><div class="v">${money(st.commissionsOwed)}</div><div class="k">Promoter commission owed</div></div>
      </div>
      <div class="card">
        <div class="tabs">${tabs.map(([k, t]) => `<button data-tab="${k}" class="${tab === k ? 'on' : ''}">${t}${k === 'payouts' && st.pendingPayouts ? ` (${st.pendingPayouts})` : ''}</button>`).join('')}</div>
        <div id="admin-body"><div class="loading">Loading…</div></div>
      </div>`;
    $$('[data-tab]').forEach((b) => b.addEventListener('click', () => { location.hash = `#/admin?tab=${b.dataset.tab}`; }));
    const body = $('#admin-body');
    if (tab === 'orders') await adminOrders(body, query);
    else if (tab === 'products') await adminProducts(body, query);
    else if (tab === 'promoters') await adminPromoters(body);
    else await adminPayouts(body);
  }

  async function adminOrders(body, query) {
    const status = query.get('status') || '';
    const q = query.get('q') || '';
    const { orders } = await api(`/api/admin/orders?status=${encodeURIComponent(status)}&q=${encodeURIComponent(q)}`);
    const statuses = state.config.statuses;
    body.innerHTML = `
      <form class="inline-form" id="order-filter" style="margin-bottom:12px">
        <div class="field"><label>Status</label><select name="status"><option value="">All</option>${Object.entries(statuses).map(([k, v]) => `<option value="${k}" ${status === k ? 'selected' : ''}>${v}</option>`).join('')}</select></div>
        <div class="field"><label>Search</label><input name="q" type="search" value="${esc(q)}" placeholder="Order no., name or phone"></div>
        <button class="btn btn-sm" type="submit">Filter</button>
      </form>
      ${orders.length ? `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Order</th><th>Customer</th><th>Items</th><th>Total</th><th>Status</th><th>Update</th></tr></thead><tbody>
      ${orders.map((o) => `<tr>
        <td><a style="color:var(--red);font-weight:700" href="#/orders/${esc(o.code)}">${esc(o.code)}</a><div class="muted small">${fmtDate(o.createdAt)}</div>
          ${o.referrer ? `<div class="small">🤝 ${esc(o.referrer)} · ${money(o.commission)} <span class="muted">(${esc(o.commissionStatus)})</span></div>` : ''}</td>
        <td>${esc(o.customerName)}<div class="muted small">+${esc(o.phone)}</div><div class="muted small">${esc(o.deliveryLabel)}${o.deliveryMethod === 'delivery' ? `: ${esc(o.address)}, ${esc(o.city)}` : ''}</div><div class="muted small">${esc(o.paymentLabel)}</div></td>
        <td class="small">${o.items.map((i) => `${esc(i.name)} × ${i.qty}`).join('<br>')}${o.notes ? `<div class="muted">📝 ${esc(o.notes)}</div>` : ''}</td>
        <td><b>${money(o.total)}</b></td>
        <td>${statusPill(o.status, o.statusLabel)}</td>
        <td>${['delivered', 'cancelled'].includes(o.status) ? '' : `<form class="admin-row-form" data-code="${esc(o.code)}">
            <select name="status">${Object.entries(statuses).filter(([k]) => k !== o.status).map(([k, v]) => `<option value="${k}">${v}</option>`).join('')}</select>
            <input name="note" type="text" placeholder="Note (optional)">
            <button class="btn btn-sm" type="submit">Update</button></form>`}
          <div class="btn-row" style="margin-top:6px">
            <a class="btn btn-sm btn-wa" target="_blank" rel="noopener" href="${esc(o.customerWhatsappUrl)}">💬 WhatsApp customer</a>
            <a class="btn btn-sm btn-ghost" target="_blank" rel="noopener" href="${esc(o.receiptUrl)}">📄 PDF</a></div></td>
      </tr>`).join('')}</tbody></table></div>` : '<p class="muted">No orders match.</p>'}`;
    $('#order-filter').addEventListener('submit', (e) => {
      e.preventDefault();
      const f = new FormData(e.target);
      location.hash = `#/admin?tab=orders&status=${encodeURIComponent(f.get('status'))}&q=${encodeURIComponent(f.get('q'))}`;
    });
    $$('.admin-row-form', body).forEach((f) => f.addEventListener('submit', async (e) => {
      e.preventDefault();
      const d = Object.fromEntries(new FormData(f));
      try {
        const r = await api(`/api/admin/orders/${encodeURIComponent(f.dataset.code)}/status`, { method: 'PUT', body: d });
        toast(r.autoSent ? 'Status updated & customer notified on WhatsApp ✔' : 'Status updated — tap "WhatsApp customer" to notify them', 'ok');
        await pageAdmin(null, query);
      } catch (err) { toast(err.message, 'error'); }
    }));
  }

  async function adminProducts(body, query) {
    const q = query.get('q') || '';
    const { products } = await api(`/api/admin/products?q=${encodeURIComponent(q)}`);
    const cats = state.catalog.sections.map((s) => `<optgroup label="${esc(s.name)}">${s.categories.map((c) => `<option value="${c.slug}">${esc(c.name)}</option>`).join('')}</optgroup>`).join('');
    const brands = state.catalog.brands.map((b) => `<option value="${b.slug}">${esc(b.name)}</option>`).join('');
    const parts = Object.entries(state.catalog.partLabels).map(([k, v]) => `<option value="${k}">${esc(v)}</option>`).join('');
    body.innerHTML = `
      <details style="margin-bottom:14px"><summary class="btn btn-sm" style="list-style:none;display:inline-flex">➕ Add product</summary>
        <form id="new-product" class="card" style="margin-top:10px;box-shadow:none;border:1px solid var(--line)">
          <div id="np-msg"></div>
          <div class="grid-2">
            <div class="field"><label>Name</label><input name="name" type="text" required placeholder="e.g. Samsung A15 LCD Display Assembly"></div>
            <div class="field"><label>Category</label><select name="category" required>${cats}</select></div>
            <div class="field"><label>Brand (for spares)</label><select name="brand"><option value="">— none —</option>${brands}</select></div>
            <div class="field"><label>Part type (for brand pages)</label><select name="part"><option value="">— none —</option>${parts}</select></div>
            <div class="field"><label>Phone model</label><input name="model" type="text" placeholder="Galaxy A15"></div>
            <div class="field"><label>Image URL (optional)</label><input name="image" type="url" placeholder="https://…"></div>
            <div class="field"><label>Price</label><input name="price" type="number" min="0" required></div>
            <div class="field"><label>Was price (for deals)</label><input name="comparePrice" type="number" min="0"></div>
            <div class="field"><label>Wholesale price (${state.config.wholesaleMinQty}+ pcs)</label><input name="wholesalePrice" type="number" min="0"></div>
            <div class="field"><label>Stock</label><input name="stock" type="number" min="0" value="10" required></div>
          </div>
          <div class="field"><label>Description</label><textarea name="description" rows="3"></textarea></div>
          <label style="display:inline-flex;gap:6px;margin-right:16px"><input type="checkbox" name="isNew"> New arrival</label>
          <label style="display:inline-flex;gap:6px"><input type="checkbox" name="isDeal"> Deal</label>
          <div style="margin-top:12px"><button class="btn" type="submit">Save product</button></div>
        </form></details>
      <form class="inline-form" id="product-search" style="margin-bottom:12px"><div class="field"><input name="q" type="search" value="${esc(q)}" placeholder="Search products"></div><button class="btn btn-sm" type="submit">Search</button></form>
      <div class="tbl-wrap"><table class="tbl admin-edit"><thead><tr><th>Product</th><th>Price</th><th>Was</th><th>Wholesale</th><th>Stock</th><th>Deal</th><th>Live</th><th></th></tr></thead><tbody>
        ${products.map((p) => `<tr data-id="${p.id}">
          <td><a href="#/p/${esc(p.slug)}">${esc(p.name)}</a><div class="muted small">${esc(p.category.name)}</div></td>
          <td><input name="price" type="number" min="0" value="${p.price}"></td>
          <td><input name="comparePrice" type="number" min="0" value="${p.comparePrice ?? ''}"></td>
          <td><input name="wholesalePrice" type="number" min="0" value="${p.wholesalePrice ?? ''}"></td>
          <td><input name="stock" type="number" min="0" value="${p.stock}" style="width:70px;${p.stock <= 3 && p.category.section !== 'services' ? 'border-color:var(--red)' : ''}"></td>
          <td><input name="isDeal" type="checkbox" ${p.isDeal ? 'checked' : ''}></td>
          <td><input name="active" type="checkbox" ${p.active ? 'checked' : ''}></td>
          <td><button class="btn btn-sm" data-save="${p.id}">Save</button></td></tr>`).join('')}
      </tbody></table></div>`;
    $('#product-search').addEventListener('submit', (e) => { e.preventDefault(); location.hash = `#/admin?tab=products&q=${encodeURIComponent(new FormData(e.target).get('q'))}`; });
    $$('[data-save]', body).forEach((b) => b.addEventListener('click', async () => {
      const row = b.closest('tr');
      const v = (n) => $(`[name=${n}]`, row);
      try {
        await api(`/api/admin/products/${b.dataset.save}`, {
          method: 'PUT',
          body: { price: v('price').value, comparePrice: v('comparePrice').value, wholesalePrice: v('wholesalePrice').value, stock: v('stock').value, isDeal: v('isDeal').checked, active: v('active').checked },
        });
        toast('Product saved ✔', 'ok');
      } catch (err) { toast(err.message, 'error'); }
    }));
    $('#new-product').addEventListener('submit', async (e) => {
      e.preventDefault();
      const f = new FormData(e.target);
      const data = Object.fromEntries(f);
      data.isNew = f.has('isNew');
      data.isDeal = f.has('isDeal');
      try {
        const { product } = await api('/api/admin/products', { method: 'POST', body: data });
        toast('Product added ✔', 'ok');
        state.catalog = await api('/api/catalog');
        location.hash = `#/p/${product.slug}`;
      } catch (err) { $('#np-msg').innerHTML = `<div class="form-error">${esc(err.message)}</div>`; }
    });
  }

  async function adminPromoters(body) {
    const { affiliates } = await api('/api/admin/affiliates');
    body.innerHTML = affiliates.length ? `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Promoter</th><th>Code</th><th>Sign-ups</th><th>Orders</th><th>Sales</th><th>Earned</th><th>Available</th></tr></thead><tbody>
      ${affiliates.map((a) => `<tr><td>${esc(a.name)}<div class="muted small">+${esc(a.phone)}</div></td><td>${esc(a.referral_code)}</td><td>${a.signups}</td><td>${a.orders}</td><td>${money(a.sales)}</td><td>${money(a.earned)}</td><td><b>${money(a.balance.available)}</b></td></tr>`).join('')}
      </tbody></table></div>` : '<p class="muted">No promoters yet. Share the Earn page with your customers to grow your sales team.</p>';
  }

  async function adminPayouts(body) {
    const { payouts } = await api('/api/admin/payouts');
    body.innerHTML = payouts.length ? `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Date</th><th>Promoter</th><th>Amount</th><th>Send to</th><th>Status</th><th></th></tr></thead><tbody>
      ${payouts.map((p) => `<tr><td>${fmtDate(p.createdAt)}</td><td>${esc(p.name)} <span class="muted small">(${esc(p.code)})</span></td><td><b>${money(p.amount)}</b></td>
        <td>${esc(p.method === 'mpesa' ? 'M-Pesa' : 'Bank')}: ${esc(p.method === 'mpesa' ? `+${p.account}` : p.account)}</td>
        <td><span class="pill ${p.status === 'paid' ? 'pill-green' : p.status === 'rejected' ? 'pill-grey' : 'pill-amber'}">${esc(p.status)}</span></td>
        <td>${p.status === 'pending' ? `<div class="btn-row"><button class="btn btn-sm" data-payout="${p.id}" data-status="paid">Mark paid</button><button class="btn btn-sm btn-ghost" data-payout="${p.id}" data-status="rejected">Reject</button></div>` : ''}
          <a class="small" style="color:#0a7d3b" target="_blank" rel="noopener" href="${waLink(p.phone, `Hi ${p.name.split(' ')[0]}, your IPHIX promoter payout of ${money(p.amount)} has been processed. Thank you for promoting ${state.config.storeName}! 🎉`)}">💬 Notify</a></td></tr>`).join('')}
      </tbody></table></div>` : '<p class="muted">No payout requests yet.</p>';
    $$('[data-payout]', body).forEach((b) => b.addEventListener('click', async () => {
      if (!confirm(b.dataset.status === 'paid' ? 'Confirm you have sent this payout?' : 'Reject this payout request?')) return;
      try {
        await api(`/api/admin/payouts/${b.dataset.payout}`, { method: 'PUT', body: { status: b.dataset.status } });
        toast('Payout updated ✔', 'ok');
        pageAdmin(null, new URLSearchParams('tab=payouts'));
      } catch (err) { toast(err.message, 'error'); }
    }));
  }

  // ---------- router ----------
  const routes = [
    [/^\/$/, pageHome],
    [/^\/shop\/(accessories|spares|services)$/, pageSection],
    [/^\/category\/([\w-]+)$/, pageCategory],
    [/^\/brands$/, pageBrands],
    [/^\/brand\/([\w-]+)$/, pageBrand],
    [/^\/deals$/, pageDeals],
    [/^\/new$/, pageNew],
    [/^\/search$/, pageSearch],
    [/^\/p\/([\w-]+)$/, pageProduct],
    [/^\/cart$/, pageCart],
    [/^\/checkout$/, pageCheckout],
    [/^\/order-success\/([\w-]+)$/, pageOrderSuccess],
    [/^\/orders\/([\w-]+)$/, pageOrder],
    [/^\/track$/, pageTrack],
    [/^\/track\/([\w-]+)$/, pageOrder],
    [/^\/login$/, (m, q) => (state.user ? (location.hash = `#${q.get('next') || '/account'}`) : authForm('login', q))],
    [/^\/register$/, (m, q) => (state.user ? (location.hash = `#${q.get('next') || '/account'}`) : authForm('register', q))],
    [/^\/account$/, pageAccount],
    [/^\/earn$/, pageEarn],
    [/^\/admin$/, pageAdmin],
  ];

  let routeSeq = 0;
  async function route() {
    const seq = ++routeSeq;
    const raw = location.hash.replace(/^#/, '') || '/';
    const [path, qs] = raw.split('?');
    const query = new URLSearchParams(qs || '');
    $('#mega').hidden = true;
    $$('.mainnav .nav-item').forEach((el) => {
      const a = $('a', el);
      const target = a.getAttribute('href').slice(1);
      el.classList.toggle('active', target !== '/' && (path === target || (target.startsWith('/shop/') && path.startsWith(target))));
    });
    const match = routes.map(([re, fn]) => [path.match(re), fn]).find(([mm]) => mm);
    window.scrollTo(0, 0);
    if (!match) return errorView(Object.assign(new Error('Page not found.'), { status: 404 }));
    view.innerHTML = '<div class="loading">Loading…</div>';
    try {
      await match[1](match[0], query);
    } catch (err) {
      if (seq !== routeSeq) return;
      if (err.status === 401) { state.user = null; renderUserChrome(); requireLogin(path); return; }
      errorView(err);
    }
  }

  // Delegated "add to cart" buttons inside product cards.
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-add]');
    if (!btn) return;
    e.preventDefault();
    const p = productCache.get(Number(btn.dataset.add));
    if (p) addToCart(p, 1);
  });

  $('#search-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const q = $('#search-input').value.trim();
    if (q) location.hash = `#/search?q=${encodeURIComponent(q)}`;
  });

  async function init() {
    try {
      const [config, catalog, me] = await Promise.all([api('/api/config'), api('/api/catalog'), api('/api/auth/me')]);
      state.config = config;
      state.catalog = catalog;
      state.user = me.user;
    } catch (err) {
      view.innerHTML = `<div class="empty card"><div class="big">📡</div><h2>Can't reach the store</h2><p>${esc(err.message)}</p></div>`;
      return;
    }
    captureRef();
    renderChrome();
    setupMegaMenu();
    window.addEventListener('hashchange', route);
    route();
  }

  init();
})();
