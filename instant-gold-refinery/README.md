# Instant Gold Refinery — website

Next.js 16 + Tailwind CSS 4. Static export, so it runs on any cPanel host with no Node.js needed.

Pages: `/` (home), `/services/`, `/process/`, `/about/`, `/faq/`, `/contact/` — each is its own folder in `src/app/`. To add a page, create `src/app/<name>/page.tsx` and add it to `nav` in `src/lib/site.ts`.

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
- **WhatsApp**: `whatsapp` in `src/lib/site.ts` — set to Kenya, +254 774 957 883.
- **About page** (board, CEO quote, timeline milestones, stats): `src/lib/about.ts`.
- **Board photos**: the portraits in `public/team/` are illustrations. To use real photos, put e.g. `public/team/henry-morton.jpg` (portrait, ~800×1000, plain or transparent background) and change that person's `image` in `src/lib/about.ts`.
- Sections live in `src/components/` (`Hero`, `Services`, `Process`, `Purity`, `About`, `Timeline`, `CeoMessage`, `Board`, `Faq`, `Contact`).
- Every page opens with its own full-screen hero (`PageHero.tsx`) over a live WebGL liquid-gold background (`fx/GoldShader.tsx`). Page visuals live in `src/components/heroes/`: 3D gold bar (Services), process ring (Process), Kenya map (About), Au element tile (FAQ), WhatsApp phone (Contact). The Home hero is the animated smelting scene (`SmelterScene.tsx` + `Sparks.tsx`).
- Site-wide effects: first-visit intro (`fx/Preloader.tsx`), smooth scrolling (`fx/SmoothScroll.tsx`, Lenis), custom cursor (`fx/Cursor.tsx`). All respect the visitor's "reduce motion" setting.

## Contact form

The enquiry form needs no server or email setup: it composes the visitor's details into a WhatsApp message and opens the chat with your number.
