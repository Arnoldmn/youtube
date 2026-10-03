// Pure store logic (no DOM) so it can be unit-tested in Node.
(function (root) {
  const FREE_SHIPPING_THRESHOLD = 150;
  const SHIPPING_FEE = 12;
  const TAX_RATE = 0.08;

  const unitPrice = (product) => product.salePrice ?? product.price;

  const round2 = (n) => Math.round(n * 100) / 100;

  function filterProducts(products, f = {}) {
    const q = (f.query || "").trim().toLowerCase();
    return products.filter((p) => {
      if (q) {
        const haystack = [p.name, p.brand, p.category, p.gender, ...p.colorways.map((c) => c.name)]
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      if (f.category && f.category !== "All" && p.category !== f.category) return false;
      if (f.brands && f.brands.length && !f.brands.includes(p.brand)) return false;
      if (f.genders && f.genders.length && !f.genders.includes(p.gender) && p.gender !== "Unisex") return false;
      if (f.size != null && !(p.sizes.includes(f.size) && !p.soldOut.includes(f.size))) return false;
      if (f.maxPrice != null && unitPrice(p) > f.maxPrice) return false;
      if (f.onSale && p.salePrice == null) return false;
      return true;
    });
  }

  function sortProducts(products, sort) {
    const list = [...products];
    switch (sort) {
      case "price-asc":
        return list.sort((a, b) => unitPrice(a) - unitPrice(b));
      case "price-desc":
        return list.sort((a, b) => unitPrice(b) - unitPrice(a));
      case "rating":
        return list.sort((a, b) => b.rating - a.rating);
      case "newest":
        return list.sort((a, b) => Number(b.tags.includes("new")) - Number(a.tags.includes("new")));
      default:
        // "featured": hot first, then by review count
        return list.sort(
          (a, b) => Number(b.tags.includes("hot")) - Number(a.tags.includes("hot")) || b.reviews - a.reviews
        );
    }
  }

  const lineKey = (item) => `${item.id}|${item.colorway}|${item.size}`;

  function addToCart(cart, item) {
    const key = lineKey(item);
    const existing = cart.find((l) => lineKey(l) === key);
    if (existing) {
      return cart.map((l) => (lineKey(l) === key ? { ...l, qty: Math.min(10, l.qty + item.qty) } : l));
    }
    return [...cart, { ...item, qty: Math.min(10, item.qty) }];
  }

  function updateQty(cart, key, qty) {
    if (qty <= 0) return cart.filter((l) => lineKey(l) !== key);
    return cart.map((l) => (lineKey(l) === key ? { ...l, qty: Math.min(10, qty) } : l));
  }

  function cartTotals(cart, products, promoCode, promoCodes = {}) {
    const byId = Object.fromEntries(products.map((p) => [p.id, p]));
    const subtotal = round2(
      cart.reduce((sum, l) => (byId[l.id] ? sum + unitPrice(byId[l.id]) * l.qty : sum), 0)
    );
    const count = cart.reduce((n, l) => n + l.qty, 0);
    const promo = promoCode ? promoCodes[promoCode.toUpperCase()] : null;
    let discount = 0;
    if (promo) discount = promo.type === "percent" ? round2((subtotal * promo.value) / 100) : Math.min(promo.value, subtotal);
    const afterDiscount = round2(subtotal - discount);
    const shipping = count === 0 || afterDiscount >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_FEE;
    const tax = round2(afterDiscount * TAX_RATE);
    const total = round2(afterDiscount + shipping + tax);
    return { subtotal, discount, shipping, tax, total, count, promo };
  }

  const exportsObj = {
    ShoeStore: {
      FREE_SHIPPING_THRESHOLD,
      SHIPPING_FEE,
      TAX_RATE,
      unitPrice,
      filterProducts,
      sortProducts,
      lineKey,
      addToCart,
      updateQty,
      cartTotals,
    },
  };
  if (typeof module !== "undefined" && module.exports) module.exports = exportsObj.ShoeStore;
  else Object.assign(root, exportsObj);
})(typeof window !== "undefined" ? window : globalThis);
