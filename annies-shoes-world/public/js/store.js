// Pure store logic (no DOM). Shared by the browser, the server and the tests.
(function (root) {
  const FREE_DELIVERY_THRESHOLD = 150;
  const DELIVERY_FEE = 10;
  const MAX_QTY = 10;

  const unitPrice = (product) => product.salePrice ?? product.price;
  const round2 = (n) => Math.round(n * 100) / 100;
  const isOneSize = (product) => !product.sizes || product.sizes.length === 0;

  function filterProducts(products, f = {}) {
    const q = (f.query || "").trim().toLowerCase();
    return products.filter((p) => {
      if (q) {
        const haystack = [p.name, p.brand, p.category, p.type, ...p.colorways.map((c) => c.name)]
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      if (f.category && f.category !== "All" && p.category !== f.category) return false;
      if (f.types && f.types.length && !f.types.includes(p.type)) return false;
      if (f.maxPrice != null && unitPrice(p) > f.maxPrice) return false;
      if (f.onSale && p.salePrice == null) return false;
      return true;
    });
  }

  function sortProducts(products, sort) {
    const list = [...products];
    const has = (p, tag) => Number(p.tags.includes(tag));
    switch (sort) {
      case "price-asc":
        return list.sort((a, b) => unitPrice(a) - unitPrice(b));
      case "price-desc":
        return list.sort((a, b) => unitPrice(b) - unitPrice(a));
      case "rating":
        return list.sort((a, b) => b.rating - a.rating);
      case "newest":
        return list.sort((a, b) => has(b, "new") - has(a, "new"));
      default:
        return list.sort((a, b) => has(b, "bestseller") - has(a, "bestseller") || b.reviews - a.reviews);
    }
  }

  const lineKey = (item) => `${item.id}|${item.colorway}|${item.size ?? ""}`;

  function addToCart(cart, item) {
    const key = lineKey(item);
    const existing = cart.find((l) => lineKey(l) === key);
    if (existing) {
      return cart.map((l) => (lineKey(l) === key ? { ...l, qty: Math.min(MAX_QTY, l.qty + item.qty) } : l));
    }
    return [...cart, { ...item, qty: Math.min(MAX_QTY, item.qty) }];
  }

  function updateQty(cart, key, qty) {
    if (qty <= 0) return cart.filter((l) => lineKey(l) !== key);
    return cart.map((l) => (lineKey(l) === key ? { ...l, qty: Math.min(MAX_QTY, qty) } : l));
  }

  /**
   * Validate cart lines against the catalog. Returns { lines, errors } where each
   * line carries trusted name/price data. Used by the server before saving an order.
   */
  function resolveLines(items, products) {
    const byId = Object.fromEntries(products.map((p) => [p.id, p]));
    const lines = [];
    const errors = [];
    if (!Array.isArray(items) || items.length === 0) return { lines, errors: ["Your bag is empty"] };
    if (items.length > 50) return { lines, errors: ["Too many items"] };
    for (const item of items) {
      const p = item && byId[item.id];
      if (!p) {
        errors.push("An item in your bag is no longer available");
        continue;
      }
      const colorway = Number(item.colorway);
      const qty = Number(item.qty);
      if (!Number.isInteger(colorway) || !p.colorways[colorway]) {
        errors.push(`${p.name}: invalid colour`);
        continue;
      }
      if (!Number.isInteger(qty) || qty < 1 || qty > MAX_QTY) {
        errors.push(`${p.name}: invalid quantity`);
        continue;
      }
      let size = null;
      if (!isOneSize(p)) {
        size = p.sizes.find((s) => String(s) === String(item.size));
        if (size === undefined) {
          errors.push(`${p.name}: please choose a size`);
          continue;
        }
        if (p.soldOut.includes(size)) {
          errors.push(`${p.name}: size ${size} is sold out`);
          continue;
        }
      }
      const price = unitPrice(p);
      lines.push({
        id: p.id,
        name: p.name,
        category: p.category,
        colorway,
        colorName: p.colorways[colorway].name,
        size,
        qty,
        unitPrice: price,
        lineTotal: round2(price * qty),
      });
    }
    return { lines, errors };
  }

  function cartTotals(cart, products, promoCode, promoCodes = {}) {
    const byId = Object.fromEntries(products.map((p) => [p.id, p]));
    const subtotal = round2(cart.reduce((sum, l) => (byId[l.id] ? sum + unitPrice(byId[l.id]) * l.qty : sum), 0));
    const count = cart.reduce((n, l) => n + l.qty, 0);
    const code = promoCode ? String(promoCode).toUpperCase() : null;
    const promo = code && Object.prototype.hasOwnProperty.call(promoCodes, code) ? promoCodes[code] : null;
    let discount = 0;
    if (promo) discount = promo.type === "percent" ? round2((subtotal * promo.value) / 100) : Math.min(promo.value, subtotal);
    const afterDiscount = round2(subtotal - discount);
    const delivery = count === 0 || afterDiscount >= FREE_DELIVERY_THRESHOLD ? 0 : DELIVERY_FEE;
    const total = round2(afterDiscount + delivery);
    return { subtotal, discount, delivery, total, count, promo, promoCode: promo ? code : null };
  }

  // Order lifecycle shown on the tracking timeline (cancelled sits outside the flow).
  const ORDER_STATUSES = [
    { key: "pending", label: "Order placed", text: "We've got your order and will confirm it on WhatsApp." },
    { key: "confirmed", label: "Confirmed", text: "Payment and details confirmed." },
    { key: "packed", label: "Packed", text: "Your items are wrapped and ready to go." },
    { key: "shipped", label: "Out for delivery", text: "Your order is on its way to you." },
    { key: "delivered", label: "Delivered", text: "Enjoy your new pieces!" },
  ];
  const CANCELLED = { key: "cancelled", label: "Cancelled", text: "This order was cancelled." };
  const statusInfo = (key) => ORDER_STATUSES.find((s) => s.key === key) || (key === "cancelled" ? CANCELLED : null);

  const api = {
    ORDER_STATUSES,
    statusInfo,
    FREE_DELIVERY_THRESHOLD,
    DELIVERY_FEE,
    MAX_QTY,
    unitPrice,
    isOneSize,
    filterProducts,
    sortProducts,
    lineKey,
    addToCart,
    updateQty,
    resolveLines,
    cartTotals,
  };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.ShoeStore = api;
})(typeof window !== "undefined" ? window : globalThis);
