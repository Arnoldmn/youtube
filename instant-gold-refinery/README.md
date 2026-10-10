# Instant Gold Refinery — website

Next.js 16 + Tailwind CSS 4. Static export, so it runs on any cPanel host with no Node.js needed.

## 1. Test locally

Requires [Node.js 20+](https://nodejs.org).

```bash
unzip instant-gold-refinery-local.zip -d instant-gold-refinery
cd instant-gold-refinery
npm install
npm run dev
```

Open http://localhost:3000.

To preview the exact production build: `npm run build && npm start` (serves `out/` on http://localhost:3000).

## 2. Deploy to cPanel

1. Log in to cPanel → **File Manager** → open `public_html` (or your domain's folder).
2. Click **Upload** and upload `instant-gold-refinery-cpanel.zip`.
3. Right-click the zip → **Extract** into `public_html`. `index.html` must sit directly in `public_html`, not in a subfolder.
4. Delete the zip. Visit your domain.

> Hidden files: the zip includes an `.htaccess` (HTTPS redirect, caching, 404 page). In File Manager, **Settings → Show Hidden Files** to see it. If your domain has no SSL certificate yet, comment out the two HTTPS lines in it.

After making changes, rebuild with `npm run build` and upload the contents of the `out/` folder again, or run `./scripts/package.sh` to regenerate both zips.

## Editing content

- **Business details** (name, year, WhatsApp number, opening hours): `src/lib/site.ts`
- **WhatsApp country code**: `whatsapp.international` in `src/lib/site.ts`. It is set to `256774957883` (Uganda, +256). For Zimbabwe use `263774957883`.
- Sections live in `src/components/` (`Hero`, `Services`, `Process`, `Purity`, `About`, `Faq`, `Contact`).
- The hero illustration is a hand-drawn animated SVG (`SmelterScene.tsx`) with canvas sparks (`Sparks.tsx`).

## Contact form

The enquiry form needs no server or email setup: it composes the visitor's details into a WhatsApp message and opens the chat with your number.
