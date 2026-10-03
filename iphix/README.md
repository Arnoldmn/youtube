# IPHIX COMMUNICATIONS — online store

An AliExpress-style shop for **phone accessories, phone spare parts and repair services**:

- **Login and accounts:** register, sign in with email or phone, edit your profile, change your password (this signs you out on your other devices) and sign out.
- **Checkout:** cart → checkout → the order is saved → **M-Pesa payment** (a PIN prompt on the customer's phone, or Paybill 529914 / Account 638804 with the code checked by an admin) → **the order is sent to the shop's WhatsApp** with a ready-made message → a **PDF receipt** is created, showing whether the order is paid.
- **Order tracking:** a step-by-step timeline on the website, a **"Track on WhatsApp"** button, and WhatsApp status messages each time the admin changes an order. With the optional Cloud API, these messages go out automatically and the shop replies to "TRACK" messages by itself.
- **Promoter (affiliate) programme:** each customer gets a personal referral link. Promoters earn a percentage of every sale they bring in, and their friends get a discount on their first order. Promoters ask for payouts to M-Pesa and an admin pays them.
- **Admin panel:** orders and status updates (with a WhatsApp message to the customer), products (prices, stock, deals, wholesale price), promoters and payouts.
- **Catalogue:** Accessories | Phone Spares | Repair Services | Brands | New Arrivals | Deals. Spares are also grouped by brand: Samsung, iPhone, Tecno, Infinix, Xiaomi/Redmi, Oppo, Vivo, plus Realme, Nokia, Huawei, Honor, Motorola and OnePlus ready for when stock arrives. About 260 starter products come pre-loaded.
- **Wholesale pricing:** the price per piece drops automatically when someone orders 10 or more of the same item.

Tech: Node.js 22.13+ (it uses the built-in SQLite, so there is no database server to install), Express, PDFKit, and plain HTML/CSS/JS on the front end with no build step.

## Run it locally

```bash
cd iphix
cp .env.example .env      # then edit WHATSAPP_NUMBER, SESSION_SECRET, ADMIN_PASSWORD, BASE_URL…
npm install
npm start                 # http://localhost:3000
npm test                  # API tests (auth, checkout, PDF, tracking, commissions, payouts)
```

The admin account is created on first start from `ADMIN_EMAIL` / `ADMIN_PASSWORD` (default `admin@iphix.local` / `ChangeMe123!` — **change it**). Sign in and open **⚙️ Admin** in the menu.

## How the order flow works

1. The customer adds items to the cart and goes to checkout. They must be signed in, so every order is linked to an account and to any referral.
2. The server re-prices the cart (it never trusts prices sent by the browser), checks stock, applies wholesale prices and any referral discount, adds delivery, saves the order and reduces stock.
3. The success page shows:
   - **Send order on WhatsApp**: opens `wa.me/<shop number>` with the full order, including the receipt link and tracking link.
   - **Download PDF receipt**: `/api/orders/<code>/receipt.pdf`, protected by a signed token.
   - **Track order**: a timeline of each status (Order placed → Confirmed → Being prepared → Dispatched / Ready for pickup → Out for delivery → Delivered).
4. The admin moves the order through each status. Each change offers a **💬 WhatsApp customer** button with a ready-made update message, or sends it automatically when the Cloud API is set up.
5. When an order is marked **Delivered**, the promoter's commission becomes available to withdraw. Cancelling an order puts the stock back and cancels the commission.

Customers can also track an order without signing in at `#/track`, using the order number and phone number, or by sending `TRACK IPX-…` on WhatsApp.

## M-Pesa payments

There are two ways to pay, and both can be on at the same time.

**1. Lipa na M-Pesa Paybill (works with no API keys).** IPHIX's Paybill is built in as the default. It appears as a "Lipa na M-PESA" card at checkout, on the order payment page, in the site footer, on the PDF receipt and in WhatsApp order messages. To change it, set these in `.env`, or set `MPESA_PAYBILL=` (empty) to hide it:

```
MPESA_PAYBILL=529914
MPESA_PAYBILL_ACCOUNT=638804
MPESA_PAYBILL_NAME=KB M-Collection General Merchants (Kingdom Bank)
```

The customer pays from their phone and types the M-Pesa confirmation code from the SMS into the order page. The order shows **Verifying M-Pesa payment**. In **Admin → Orders** you compare the code with your Kingdom Bank / M-Collection statement and click **Confirm paid**. The order then moves to *Confirmed* and you can send the customer a WhatsApp message. The same code can't be used on two orders.

**2. STK push (a pop-up on the customer's phone asking for their M-Pesa PIN).** Once Daraja credentials are set, the site sends this prompt to the customer's phone straight after they place an order. If no prompt arrives, they can press **Send M-Pesa prompt** to resend it.
- Safaricom reports the result to `/api/mpesa/callback/<secret>`. The order is then marked **Paid**, moves to *Confirmed*, and the M-Pesa receipt number is saved and printed on the PDF receipt.
- If Safaricom's report is late or never arrives, the order page asks Safaricom directly for the result instead.
- A cancelled or failed prompt leaves the order unpaid, and the customer can try again.

```
MPESA_ENV=production            # or sandbox for testing
MPESA_CONSUMER_KEY=...          # from your Daraja app
MPESA_CONSUMER_SECRET=...
MPESA_SHORTCODE=...             # the Paybill/Till these credentials were issued for
MPESA_PASSKEY=...               # Lipa na M-Pesa Online passkey from Safaricom
MPESA_TRANSACTION_TYPE=CustomerPayBillOnline   # or CustomerBuyGoodsOnline for a Till (+ MPESA_PARTY_B=till no.)
MPESA_ACCOUNT_REFERENCE=        # empty = order number; or a fixed account such as 638804
```

`BASE_URL` must be a public **https** address, otherwise Safaricom cannot send payment results to your site.

> **Important about Paybill 529914.** 529914 is **Kingdom Bank's** collection Paybill. Many merchants share it, and each has their own account number. STK prompts for a shortcode only work with Daraja credentials and a passkey issued **for that shortcode**, and for 529914 those belong to Kingdom Bank. To get prompts on your phone, pick one of these:
> - **Ask Kingdom Bank** whether KB M-Collection offers STK push or API access for your account (638804). If they give you a consumer key, secret and passkey, put them in the settings above with `MPESA_ACCOUNT_REFERENCE=638804`.
> - **Get your own Paybill or Till from Safaricom** (via the M-Pesa for Business portal), then go live on the Daraja portal (https://developer.safaricom.co.ke). You can keep settling into your Kingdom Bank account.
> - **Use a payment aggregator that offers STK push** (for example Pesapal, IntaSend or Kopo Kopo). This needs a small adapter in `server/mpesa.js`.
>
> Until one of these is in place, the Paybill flow above works, and every order and receipt carries the correct 529914 / 638804 details.

To test STK push for free, create an app on the Daraja portal and use `MPESA_ENV=sandbox`, `MPESA_SHORTCODE=174379` and the sandbox passkey shown on the portal. The site shows a "test mode" notice in sandbox.

## WhatsApp setup

**Works straight away (no setup):** the site uses click-to-chat links (`wa.me`). Set `WHATSAPP_NUMBER` to your business number in international format with digits only, e.g. `254712345678`.

**Optional: fully automatic messages (WhatsApp Cloud API)**

1. Create an app at <https://developers.facebook.com>, add the **WhatsApp** product and register your business number.
2. Put these in `.env`: `WA_TOKEN` (a permanent system-user token), `WA_PHONE_NUMBER_ID`, `WA_VERIFY_TOKEN` (any secret string) and `WA_APP_SECRET`.
3. Set the webhook URL to `https://<your-domain>/api/whatsapp/webhook`, with the same verify token, and subscribe to `messages`.

With the API set up:
- the shop gets new orders on WhatsApp automatically;
- customers get "order received" and status-change messages;
- anyone who sends `TRACK IPX-…` (or just `TRACK`) gets an automatic status reply.

For privacy, a status is only shared with the phone number used on the order.

> WhatsApp only lets businesses send free-form messages within 24 hours of the customer's last message. Customers usually message you first, when they tap "Send order on WhatsApp", which opens that window. For updates sent later, create approved *message templates* in Meta Business Manager.

## Deploying

Any host that runs Node 22.13 or newer works: a VPS, Railway, Render or Fly.io.

- Set `BASE_URL=https://your-domain`. Cookies become `Secure` automatically when it starts with https.
- Set a long random `SESSION_SECRET` and keep it the same across restarts. If it changes, everyone is logged out and old receipt and tracking links stop working.
- Keep `data/` on persistent storage. This is the SQLite database (`DB_FILE`), so back it up.
- Run it with a process manager, e.g. `pm2 start "npm start" --name iphix`, behind Nginx or Caddy for HTTPS.

## Managing products

In **Admin → Products** you can change prices, "was" prices (which make a product a deal), wholesale prices, stock, and whether the product is visible. **➕ Add product** creates new items. Set **Brand + Part type** so the item appears on the brand pages (for example Samsung → Screens). Paste an `https://` image URL to show a real photo; otherwise a branded placeholder image is generated.

## Project layout

```
iphix/
  server/
    index.js      – starts the server
    app.js        – all API routes (auth, catalogue, cart, orders, tracking, affiliate, admin, WhatsApp webhook)
    catalog.js    – categories, brands, starter stock
    seed.js       – loads the starter catalogue and the admin account
    receipt.js    – PDF receipt
    whatsapp.js   – wa.me links and the Cloud API client
    mpesa.js      – Safaricom Daraja client (STK push + status query)
    auth.js       – password hashing, signed session cookies, rate limiting
    db.js         – SQLite schema
  public/         – storefront (index.html, css/, js/app.js)
  test/           – API tests (node --test)
  docs/PROMOTION.md – how to promote the shop and run the promoter programme
```

## Next steps

- **Password reset** by WhatsApp or email code. For now, customers are pointed to WhatsApp support.
- **Product photo uploads.** Today you paste image URLs.
