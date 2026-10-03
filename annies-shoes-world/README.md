# Annie's Shoes World 👟

A sneaker retail storefront built with plain HTML, CSS and JavaScript. There's no build step and no backend.

## Features

- **Hero drop** with switchable colorways and a live countdown to the next Friday drop
- **Catalog** of 16 styles across 6 brands (Lifestyle, Running, Basketball, Skate, Trail)
- **Search, filters and sort**: search by name, brand or colorway; filter by category, brand, gender, size (sold-out sizes are skipped), max price and sale; sort by featured, newest, price or rating
- **Product view** with colorway picker, size grid (sold-out sizes disabled), quantity and wishlist
- **Bag** with quantity controls, a free-shipping progress meter, promo codes, shipping and tax
- **Wishlist**; bag and wishlist are saved in `localStorage`
- **Checkout** with form validation and an order confirmation. It's a demo: no payment is taken and nothing leaves the browser
- Responsive layout with a mobile menu and a filter drawer
- Shoe artwork is generated as SVG from each colorway (`js/shoe-art.js`), so there are no image files to host

Promo codes: `ANNIE10` (10% off), `FRESHKICKS` ($20 off).

## Run it

Open `index.html` in a browser, or serve the folder:

```bash
npm start      # serves on http://localhost:5173
```

## Test

```bash
npm test       # unit tests for filtering, sorting, cart and totals (node:test)
```

## Structure

```
index.html        page markup
css/styles.css    styles
js/products.js    catalog data and promo codes
js/store.js       pure cart/filter/totals logic (shared with tests)
js/shoe-art.js    SVG sneaker generator
js/app.js         UI rendering and interactions
tests/            node:test unit tests
```

To add a product, add an entry to `PRODUCTS` in `js/products.js`.
