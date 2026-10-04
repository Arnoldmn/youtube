const test = require("node:test");
const assert = require("node:assert/strict");
const { PRODUCTS, CATEGORIES, HERO_SLIDES, PROMO_CODES } = require("../public/js/products.js");
const S = require("../public/js/store.js");

test("catalog entries are well formed", () => {
  const ids = new Set();
  for (const p of PRODUCTS) {
    assert.ok(!ids.has(p.id), `duplicate id ${p.id}`);
    ids.add(p.id);
    assert.ok(CATEGORIES.includes(p.category), `${p.id} has unknown category`);
    assert.ok(p.colorways.length > 0);
    for (const s of p.soldOut) assert.ok(p.sizes.includes(s), `${p.id} sold-out size ${s} not offered`);
    if (p.salePrice != null) assert.ok(p.salePrice < p.price);
  }
  for (const c of CATEGORIES) assert.ok(PRODUCTS.some((p) => p.category === c), `no products in ${c}`);
  for (const s of HERO_SLIDES) assert.ok(PRODUCTS.some((p) => p.id === s.productId), `slide product ${s.productId} missing`);
});

test("filters by category, type, sale and price", () => {
  assert.ok(S.filterProducts(PRODUCTS, { category: "Watches" }).every((p) => p.category === "Watches"));
  assert.ok(S.filterProducts(PRODUCTS, { types: ["Heels"] }).every((p) => p.type === "Heels"));
  assert.ok(S.filterProducts(PRODUCTS, { onSale: true }).every((p) => p.salePrice != null));
  assert.ok(S.filterProducts(PRODUCTS, { maxPrice: 90 }).every((p) => S.unitPrice(p) <= 90));
});

test("search matches name, type and colour", () => {
  assert.equal(S.filterProducts(PRODUCTS, { query: "slip dress" })[0].id, "cl-silk-slip-dress");
  assert.ok(S.filterProducts(PRODUCTS, { query: "tote" }).some((p) => p.id === "hb-signature-tote"));
  assert.ok(S.filterProducts(PRODUCTS, { query: "emerald" }).some((p) => p.id === "cl-silk-slip-dress"));
});

test("sorts by effective price", () => {
  const asc = S.sortProducts(PRODUCTS, "price-asc").map(S.unitPrice);
  assert.deepEqual(asc, [...asc].sort((a, b) => a - b));
});

test("cart merges identical lines (including one-size items) and caps quantity", () => {
  let cart = S.addToCart([], { id: "hb-signature-tote", colorway: 0, size: null, qty: 4 });
  cart = S.addToCart(cart, { id: "hb-signature-tote", colorway: 0, size: null, qty: 9 });
  cart = S.addToCart(cart, { id: "cl-knit-top", colorway: 1, size: "M", qty: 1 });
  assert.equal(cart.length, 2);
  assert.equal(cart[0].qty, S.MAX_QTY);
  cart = S.updateQty(cart, S.lineKey(cart[1]), 0);
  assert.equal(cart.length, 1);
});

test("resolveLines validates sizes, colours and quantities against the catalog", () => {
  const ok = S.resolveLines(
    [
      { id: "sh-velvet-stiletto", colorway: 0, size: 7, qty: 2 },
      { id: "cl-knit-top", colorway: 0, size: "S", qty: 1 },
      { id: "wa-rose-classic", colorway: 0, size: null, qty: 1 },
    ],
    PRODUCTS
  );
  assert.deepEqual(ok.errors, []);
  assert.equal(ok.lines[0].lineTotal, 240);
  assert.equal(ok.lines[0].colorName, "Noir");
  assert.equal(ok.lines[1].unitPrice, 32); // sale price, not client-supplied
  assert.equal(ok.lines[2].size, null);

  const bad = (item) => S.resolveLines([item], PRODUCTS).errors[0];
  assert.match(bad({ id: "nope", colorway: 0, qty: 1 }), /no longer available/);
  assert.match(bad({ id: "sh-velvet-stiletto", colorway: 0, size: 11, qty: 1 }), /sold out/);
  assert.match(bad({ id: "sh-velvet-stiletto", colorway: 0, size: 99, qty: 1 }), /choose a size/);
  assert.match(bad({ id: "sh-velvet-stiletto", colorway: 9, size: 7, qty: 1 }), /colour/);
  assert.match(bad({ id: "sh-velvet-stiletto", colorway: 0, size: 7, qty: 0 }), /quantity/);
  assert.match(S.resolveLines([], PRODUCTS).errors[0], /empty/);
});

test("totals apply sale price, promo and delivery", () => {
  let t = S.cartTotals([{ id: "cl-knit-top", colorway: 0, size: "S", qty: 1 }], PRODUCTS, null, PROMO_CODES);
  assert.equal(t.subtotal, 32);
  assert.equal(t.delivery, S.DELIVERY_FEE);
  assert.equal(t.total, 42);

  t = S.cartTotals([{ id: "hb-signature-tote", colorway: 0, size: null, qty: 1 }], PRODUCTS, "annie10", PROMO_CODES);
  assert.equal(t.discount, 22);
  assert.equal(t.delivery, 0);
  assert.equal(t.total, 198);
  assert.equal(t.promoCode, "ANNIE10");

  assert.equal(S.cartTotals([], PRODUCTS, "toString", PROMO_CODES).promo, null);
});

test("order statuses", () => {
  assert.equal(S.statusInfo("shipped").label, "Out for delivery");
  assert.equal(S.statusInfo("cancelled").key, "cancelled");
  assert.equal(S.statusInfo("bogus"), null);
});

test("every product and hero slide has a photo", () => {
  for (const p of PRODUCTS) assert.match(p.image, /^https:\/\/images\.pexels\.com\/photos\/(\d+)\/pexels-photo-\1\.jpeg/, p.id);
  for (const s of HERO_SLIDES) assert.ok(s.image, s.title);
});
