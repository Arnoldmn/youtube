'use strict';
// Brand assets: finds the IPHIX logo files wherever they were dropped, so no exact path or name is required.
//   Main logo (header, footer, receipts): e.g. "IPHIX Logo.png", "iphix-logo.jpg", "logo.png"
//   App logo (favicon, home-screen icon): e.g. "IPHIX Logo Icon.png", "logo-icon.png", "app-icon.png"
const fs = require('fs');
const path = require('path');

const PROJECT = path.join(__dirname, '..');
const SEARCH_DIRS = [
  path.join(PROJECT, 'public', 'img'),
  path.join(PROJECT, 'img'),
  path.join(PROJECT, '..', 'img'),
  path.join(PROJECT, 'public'),
];
const EXTS = ['.png', '.jpg', '.jpeg', '.webp', '.svg'];
const MAIN_NAMES = ['iphixlogo', 'iphixmainlogo', 'mainlogo', 'logo'];
const ICON_NAMES = ['iphixlogoicon', 'iphixicon', 'logoicon', 'appicon', 'applogo', 'icon'];

const normalize = (file) => path.basename(file, path.extname(file)).toLowerCase().replace(/[^a-z0-9]/g, '');

/** Width/height for PNG and JPEG (used for the app manifest); null if unknown. */
function dimensions(buf) {
  if (buf.length > 24 && buf.readUInt32BE(0) === 0x89504e47) return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
  if (buf[0] === 0xff && buf[1] === 0xd8) {
    let i = 2;
    while (i + 9 < buf.length) {
      if (buf[i] !== 0xff) { i += 1; continue; }
      const marker = buf[i + 1];
      const len = buf.readUInt16BE(i + 2);
      if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) {
        return { width: buf.readUInt16BE(i + 7), height: buf.readUInt16BE(i + 5) };
      }
      i += 2 + len;
    }
  }
  return null;
}

/** Detects the real image type from the file's bytes (a JPG saved as ".png" still works). */
function sniff(buf) {
  if (buf.length > 8 && buf.readUInt32BE(0) === 0x89504e47) return { ext: '.png', type: 'image/png' };
  if (buf[0] === 0xff && buf[1] === 0xd8) return { ext: '.jpg', type: 'image/jpeg' };
  if (buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP') return { ext: '.webp', type: 'image/webp' };
  if (/<svg[\s>]/i.test(buf.toString('utf8', 0, 4096))) return { ext: '.svg', type: 'image/svg+xml' };
  return null;
}

function find(names) {
  for (const wanted of names) {
    for (const dir of SEARCH_DIRS) {
      let entries;
      try { entries = fs.readdirSync(dir); } catch { continue; }
      for (const entry of entries) {
        const ext = path.extname(entry).toLowerCase();
        if (!EXTS.includes(ext) || normalize(entry) !== wanted) continue;
        const file = path.join(dir, entry);
        try {
          const buf = fs.readFileSync(file);
          const real = sniff(buf);
          if (!real) continue;
          const { mtimeMs } = fs.statSync(file);
          return { file, ...real, version: Math.round(mtimeMs), ...(dimensions(buf) || {}) };
        } catch { /* unreadable: keep looking */ }
      }
    }
  }
  return null;
}

// Looked up at most every 5 seconds, so a newly added logo shows up without a restart.
const cache = {};
function cached(key, names) {
  const hit = cache[key];
  if (hit && Date.now() - hit.at < 5000) return hit.value;
  const value = find(names);
  cache[key] = { at: Date.now(), value };
  return value;
}

const mainLogo = () => cached('main', MAIN_NAMES);
// The app icon falls back to the main logo if no separate icon file exists.
const appIcon = () => cached('icon', ICON_NAMES);

function describe() {
  const where = SEARCH_DIRS.map((d) => path.relative(process.cwd(), d) || '.').join(', ');
  const m = mainLogo();
  const i = appIcon();
  return [
    m ? `Main logo: ${path.relative(process.cwd(), m.file)}` : `Main logo not found (looked for "IPHIX Logo.png" in: ${where}) — using the text logo.`,
    i ? `App logo:  ${path.relative(process.cwd(), i.file)}` : `App logo not found (looked for "IPHIX Logo Icon.png" in: ${where}) — ${m ? 'using the main logo' : 'using the built-in icon'}.`,
  ];
}

module.exports = { mainLogo, appIcon, describe, SEARCH_DIRS };
