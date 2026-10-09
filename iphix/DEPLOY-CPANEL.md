# Deploying IPHIX COMMUNICATIONS to cPanel

These steps work on any cPanel host that has **Setup Node.js App** (most hosts with CloudLinux do). Any Node.js version from **18 upwards** works. The store picks the best database engine available automatically.

## 1. Upload

1. In cPanel, open **File Manager** and go to your **home folder** (e.g. `/home/youruser/`). Do **not** use `public_html`.
2. Click **Upload** and choose `iphix-cpanel.zip`.
3. Right-click the zip → **Extract**. This creates the folder `/home/youruser/iphix/`.
4. In File Manager, click **Settings** (top right), tick **Show Hidden Files**, and click **Save**. You will need this to see `.env`.

## 2. Settings: `iphix/.env`

Right-click `iphix/.env` → **Edit** and set:

| Setting | What to put |
|---|---|
| `BASE_URL` | Your live address, e.g. `https://iphix.co.ke` (with **https**, no slash at the end) |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | Your admin login. A strong password has already been generated; change it if you like. |
| `STORE_ADDRESS` | Your shop location, shown on receipts and in the footer |

These are already filled in: WhatsApp **0702 222272** (`254702222272`), M-Pesa Paybill **529914**, Account **638804**, and a random `SESSION_SECRET`. **Keep `.env` private.**

## 3. Create the Node.js app

cPanel → **Setup Node.js App** → **Create Application**:

| Field | Value |
|---|---|
| Node.js version | The **highest** version offered (22 or newer is best; 18 or 20 also work) |
| Application mode | **Production** |
| Application root | `iphix` |
| Application URL | Your domain (or a subdomain such as `shop.yourdomain.com`) |
| Application startup file | `app.js` |

Click **Create**. Then scroll down on the same page:

1. Click **Run NPM Install** and wait until it says it has finished. This installs the store's code libraries (Express, PDFKit and sql.js).
2. Click **Restart** at the top.

Open your domain. The store should load. 🎉

> If NPM Install complains that `node_modules` already exists, delete the `iphix/node_modules` folder in File Manager and click **Run NPM Install** again. cPanel keeps its own copy of these libraries elsewhere.

## 4. HTTPS (SSL)

cPanel → **SSL/TLS Status** → select your domain → **Run AutoSSL**. HTTPS matters because:
- logins use secure cookies;
- links in WhatsApp messages and receipts use `BASE_URL`;
- M-Pesa payment prompts (if you add Daraja keys later) need an https callback.

## 5. First login

1. Go to `https://your-domain/#/login` and sign in with `ADMIN_EMAIL` and `ADMIN_PASSWORD` from `.env`.
2. Open **⚙️ Admin** in the menu. From there you can manage orders, products, the slider, promoters and payouts.
3. Change the admin password: **Account → Password**.

## 6. Logos

Upload `IPHIX Logo.png` (main logo) and `IPHIX Logo Icon.png` (app icon) to `iphix/public/img/` with File Manager. They appear within a few seconds; no restart is needed.

## Updating the store later

1. Upload and extract the new zip over the old `iphix` folder.
2. **Keep** your `.env` and the `data/` folder. Don't replace them.
3. In **Setup Node.js App**, click **Run NPM Install**, then **Restart**.

Existing databases are upgraded automatically on start.

## Backups

Everything the store saves is in `iphix/data/`:
- `iphix.db`: products, orders, customers, promoters and payouts;
- `uploads/`: photos you uploaded;
- `.session-secret`: only used if `.env` has no `SESSION_SECRET`.

Download this folder regularly, or include it in cPanel **Backup**.

## Troubleshooting

| Problem | Fix |
|---|---|
| "Incomplete response" or 503 page | Open **Setup Node.js App** → your app → check the log (or `iphix/stderr.log` in File Manager). Usually NPM Install hasn't been run; run it, then **Restart**. |
| Logins don't stick | `BASE_URL` must match the address you visit exactly (https and www included). Restart after editing `.env`. |
| Changes to `.env` not applied | Click **Restart** in Setup Node.js App after every edit. |
| Logo not showing | Check the start-up log: it prints which logo files were found and which folders were checked. |
| Which database engine is running | The log says `database: node:sqlite` (Node 22.13+) or `database: sql.js` (older Node). Both store data in `data/iphix.db`. |
