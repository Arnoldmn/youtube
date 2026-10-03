'use strict';
// Brand assets. Drop the PNGs into public/img/ with these exact names and the site picks them up.
const fs = require('fs');
const path = require('path');

const IMG_DIR = path.join(__dirname, '..', 'public', 'img');
const MAIN_LOGO = 'IPHIX Logo.png'; // header, footer, PDF receipts
const APP_ICON = 'IPHIX Logo Icon.png'; // favicon, home-screen icon, app manifest

/** Returns { file, url, width, height } for a PNG in public/img, or null if it is missing or not a PNG. */
function pngAsset(name) {
  const file = path.join(IMG_DIR, name);
  let fd;
  try {
    fd = fs.openSync(file, 'r');
    const head = Buffer.alloc(24);
    fs.readSync(fd, head, 0, 24, 0);
    if (head.readUInt32BE(0) !== 0x89504e47 || head.toString('ascii', 12, 16) !== 'IHDR') return null;
    const { mtimeMs } = fs.fstatSync(fd);
    return {
      file,
      url: `/img/${encodeURIComponent(name)}?v=${Math.round(mtimeMs)}`,
      width: head.readUInt32BE(16),
      height: head.readUInt32BE(20),
    };
  } catch {
    return null;
  } finally {
    if (fd !== undefined) fs.closeSync(fd);
  }
}

const mainLogo = () => pngAsset(MAIN_LOGO);
const appIcon = () => pngAsset(APP_ICON);

module.exports = { mainLogo, appIcon, MAIN_LOGO, APP_ICON };
