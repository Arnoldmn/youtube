# Brand logos

Put the two IPHIX logo files in **any one** of these folders:

- `iphix/public/img/` (recommended)
- `iphix/img/`
- `img/` at the top of the repository

| File (suggested name) | Used for |
|---|---|
| `IPHIX Logo.png` | **Main logo**: site header, footer, PDF receipts, link previews |
| `IPHIX Logo Icon.png` | **App logo**: browser tab icon, phone home-screen icon ("Add to Home Screen") |

- Names are flexible: `iphix-logo.png`, `logo.png`, `logo-icon.png` and `app-icon.png` all work, in any capitals.
- PNG, JPG, WebP and SVG are accepted. Use PNG or JPG for the main logo if you want it on PDF receipts.
- New or replaced files are picked up within a few seconds, with no restart.
- When the server starts it prints which logo files it found, or where it looked:
  ```
  Main logo: public/img/IPHIX Logo.png
  App logo:  public/img/IPHIX Logo Icon.png
  ```
- Until a logo is found, the site shows its built-in text logo.
