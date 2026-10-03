# Annie's Shoes World 💕

An online boutique for **women's shoes, clothing, handbags and watches**. Customers sign in to check out, the order is sent to the shop on **WhatsApp**, and buyers can **track their order** on the site or through WhatsApp.

## Features

**Storefront**
- Hero image slider: autoplay, arrows, dots, swipe on mobile, pauses on hover
- Four departments: Shoes, Clothing, Handbags, Watches (20 products in `public/js/products.js`)
- Search, filter by department, style, max price and sale, plus sorting
- Product view with colour picker and sizes (US shoe sizes, XS–XL clothing, one size for bags and watches); sold-out sizes are disabled
- Bag with promo codes (`ANNIE10`, `QUEEN20`) and a free-delivery meter; wishlist
- Responsive layout, floating WhatsApp chat button

**Accounts and checkout**
- Sign up / sign in is required before checkout. Customers give their WhatsApp number at sign-up
- Passwords are hashed with scrypt; sessions use HttpOnly, SameSite cookies; login is rate-limited
- The server re-prices every order from the catalog, so customers can't change prices in their browser

**WhatsApp ordering and tracking**
- Placing an order saves it with an order number (e.g. `ASW-7K2Q9P`) and opens WhatsApp with the full order (items, sizes, colours, totals, address, payment method and tracking link) ready to send to the shop
- Buyers track orders at `/#/track/ASW-…` (order number plus the last 4 digits of their WhatsApp number), from **My account**, or with a "Track on WhatsApp" button
- **Order desk** at `/admin`: Annie sees all orders, changes their status (Order placed → Confirmed → Packed → Out for delivery → Delivered, or Cancelled), adds a note, and WhatsApp opens with the update ready to send to the buyer
- **Optional WhatsApp Business Cloud API:** buyers message an order number to the shop's WhatsApp and get an instant automatic status reply, and status updates are sent automatically

## Getting started

Requires Node.js 18+. There are no npm dependencies to install.

```bash
cp .env.example .env     # then set WHATSAPP_NUMBER and ADMIN_PASSWORD
npm start                # http://localhost:3000   ·   order desk: http://localhost:3000/admin
```

| Variable | Purpose |
| --- | --- |
| `WHATSAPP_NUMBER` | **Required for checkout.** Shop WhatsApp number in international format, digits only (e.g. `254712345678`) |
| `ADMIN_PASSWORD` | Enables the `/admin` order desk |
| `DEFAULT_COUNTRY_CODE` | Lets customers type local numbers (e.g. `0712…` becomes `254712…`) |
| `CURRENCY`, `LOCALE` | Price formatting, e.g. `KES` and `en-KE` (catalog prices are plain numbers) |
| `PUBLIC_URL` | Your site address, used in WhatsApp tracking links |
| `COOKIE_SECURE` | Set `true` when served over HTTPS |
| `DATA_DIR` | Where orders and accounts are stored (default `./data`) |

### Optional: automatic WhatsApp tracking (Cloud API)

1. Create a WhatsApp Business app at developers.facebook.com and add your phone number.
2. Set `WHATSAPP_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_VERIFY_TOKEN` (any secret string you choose) and `WHATSAPP_APP_SECRET`.
3. Point the app's webhook to `https://your-site/webhook/whatsapp`, using the same verify token, and subscribe to `messages`.

When a buyer messages an order number (or just "hi"), the shop replies automatically with the status. Replies only cover orders placed from the sender's own number. Note: WhatsApp only lets businesses send free-form messages within 24 hours of the customer's last message; outside that window it needs approved templates, and the order desk falls back to opening WhatsApp for you.

## Adding your own photos

Put images in `public/images/` and add `image: "images/…"` to a hero slide or a product (or to a single colour) in `public/js/products.js`. Until then, each product shows a built-in illustration, which is also used if a photo fails to load.

## Tests

```bash
npm test
```

Covers catalog and cart logic, WhatsApp message building, phone handling, webhook signature checks, and an end-to-end API run: sign-up → order → WhatsApp link → tracking → admin status update.

## Structure

```
server/
  index.js       start the server
  app.js         HTTP routes: auth, orders, tracking, admin, WhatsApp webhook, static files
  auth.js        password hashing and sessions
  whatsapp.js    wa.me links, order and status messages, Cloud API
  db.js          JSON-file storage (data/db.json)
  config.js      environment settings
public/
  index.html     storefront
  admin.html     order desk
  js/products.js catalog, hero slides, promo codes (shared with the server)
  js/store.js    cart, filter and totals logic (shared with the server)
  js/art.js      generated product illustrations
  js/app.js      storefront UI
  js/admin.js    order desk UI
tests/
```

## Deploying

Any host that runs Node works (Render, Railway, Fly.io, a VPS). Mount a persistent disk for `DATA_DIR` so orders survive restarts, serve over HTTPS, and set `COOKIE_SECURE=true` and `PUBLIC_URL`.
