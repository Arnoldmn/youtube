const test = require("node:test");
const assert = require("node:assert/strict");
const { PRODUCTS, PROMO_CODES } = require("../js/products.js");
const S = require("../js/store.js");

test("catalog entries are well formed", () => {
  const ids = new Set();
  for (const p of PRODUCTS) {
    assert.ok(!ids.has(p.id), `duplicate id ${p.id}`);
    ids.add(p.id);
    assert.ok(p.colorways.length > 0);
    for (const s of p.soldOut) assert.ok(p.sizes.includes(s), `${p.id} sold-out size ${s} not offered`);
    if (p.salePrice != null) assert.ok(p.salePrice < p.price);
  }
});

test("filters by category, brand, sale, size and price", () => {
  assert.ok(S.filterProducts(PRODUCTS, { category: "Skate" }).every((p) => p.category === "Skate"));
  assert.ok(S.filterProducts(PRODUCTS, { brands: ["Rift"] }).every((p) => p.brand === "Rift"));
  assert.ok(S.filterProducts(PRODUCTS, { onSale: true }).every((p) => p.salePrice != null));
  assert.ok(S.filterProducts(PRODUCTS, { maxPrice: 100 }).every((p) => S.unitPrice(p) <= 100));
  const size13 = S.filterProducts(PRODUCTS, { size: 13 });
  assert.ok(size13.every((p) => p.sizes.includes(13) && !p.soldOut.includes(13)));
  assert.ok(!size13.some((p) => p.id === "w-orbit-1"), "sold-out size should be excluded");
});

test("gender filter keeps unisex styles", () => {
  const women = S.filterProducts(PRODUCTS, { genders: ["Women"] });
  assert.ok(women.every((p) => p.gender === "Women" || p.gender === "Unisex"));
  assert.ok(women.some((p) => p.gender === "Unisex"));
});

test("search matches name, brand and colorway", () => {
  assert.equal(S.filterProducts(PRODUCTS, { query: "orbit" })[0].id, "w-orbit-1");
  assert.ok(S.filterProducts(PRODUCTS, { query: "annie" }).every((p) => p.brand === "Annie's"));
  assert.ok(S.filterProducts(PRODUCTS, { query: "matcha" }).some((p) => p.id === "k-zen-slip"));
});

test("sorts by effective price", () => {
  const asc = S.sortProducts(PRODUCTS, "price-asc").map(S.unitPrice);
  assert.deepEqual(asc, [...asc].sort((a, b) => a - b));
  const desc = S.sortProducts(PRODUCTS, "price-desc").map(S.unitPrice);
  assert.deepEqual(desc, [...desc].sort((a, b) => b - a));
});

test("cart merges identical lines and caps quantity at 10", () => {
  let cart = S.addToCart([], { id: "w-orbit-1", colorway: 0, size: 9, qty: 2 });
  cart = S.addToCart(cart, { id: "w-orbit-1", colorway: 0, size: 9, qty: 9 });
  cart = S.addToCart(cart, { id: "w-orbit-1", colorway: 1, size: 9, qty: 1 });
  assert.equal(cart.length, 2);
  assert.equal(cart[0].qty, 10);
  cart = S.updateQty(cart, S.lineKey(cart[1]), 0);
  assert.equal(cart.length, 1);
});

test("totals apply sale price, promo, shipping and tax", () => {
  // Vapor Run on sale at 119 → under the free-shipping threshold
  let t = S.cartTotals([{ id: "s-vapor-run", colorway: 0, size: 8, qty: 1 }], PRODUCTS, null, PROMO_CODES);
  assert.equal(t.subtotal, 119);
  assert.equal(t.shipping, S.SHIPPING_FEE);
  assert.equal(t.tax, 9.52);
  assert.equal(t.total, 140.52);

  // 2 × Apex Hi (185) with 10% off → free shipping
  t = S.cartTotals([{ id: "w-apex-hi", colorway: 0, size: 10, qty: 2 }], PRODUCTS, "annie10", PROMO_CODES);
  assert.equal(t.subtotal, 370);
  assert.equal(t.discount, 37);
  assert.equal(t.shipping, 0);
  assert.equal(t.total, 359.64);

  // Unknown code is ignored; empty cart costs nothing
  assert.equal(S.cartTotals([], PRODUCTS, "NOPE", PROMO_CODES).total, 0);
  assert.equal(S.cartTotals([], PRODUCTS, "NOPE", PROMO_CODES).promo, undefined);
});
