// Manage the Pexels product photos referenced in public/js/products.js.
//
//   npm run photos:check      check every photo link loads
//   npm run photos:download   save all photos into public/images/pexels/ and serve them locally
//
// Downloading is optional but recommended before going live: pages load faster and
// the shop no longer depends on Pexels being reachable.
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");
const PRODUCTS_FILE = path.join(ROOT, "public/js/products.js");
const OUT_DIR = path.join(ROOT, "public/images/pexels");
const remoteUrl = (id, w) => `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=${w}`;

function photoRefs() {
  const src = fs.readFileSync(PRODUCTS_FILE, "utf8");
  const refs = new Map();
  for (const m of src.matchAll(/px\((\d+)(?:,\s*(\d+))?\)/g)) {
    const id = m[1];
    const w = Number(m[2] || 900);
    refs.set(id, Math.max(refs.get(id) || 0, w));
  }
  return refs;
}

async function check() {
  const refs = photoRefs();
  let bad = 0;
  for (const [id, w] of refs) {
    const url = remoteUrl(id, w);
    try {
      const res = await fetch(url, { method: "HEAD" });
      const ok = res.ok && String(res.headers.get("content-type")).startsWith("image/");
      if (!ok) bad++;
      console.log(`${ok ? "✅" : "❌"} ${id}  ${res.status}  https://www.pexels.com/photo/${id}/`);
    } catch (err) {
      bad++;
      console.log(`❌ ${id}  ${err.message}`);
    }
  }
  console.log(bad ? `\n${bad} photo(s) failed. Those products will show their illustration instead.` : `\nAll ${refs.size} photos load.`);
  process.exitCode = bad ? 1 : 0;
}

async function download() {
  const refs = photoRefs();
  fs.mkdirSync(OUT_DIR, { recursive: true });
  let failed = 0;
  for (const [id, w] of refs) {
    const file = path.join(OUT_DIR, `${id}.jpg`);
    if (fs.existsSync(file)) {
      console.log(`• ${id} already downloaded`);
      continue;
    }
    try {
      const res = await fetch(remoteUrl(id, w));
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      fs.writeFileSync(file, Buffer.from(await res.arrayBuffer()));
      console.log(`✅ ${id} saved`);
    } catch (err) {
      failed++;
      console.log(`❌ ${id} ${err.message}`);
    }
  }
  if (failed) {
    console.log(`\n${failed} photo(s) failed, so the shop keeps using remote links. Fix or replace them and run again.`);
    process.exitCode = 1;
    return;
  }
  const src = fs.readFileSync(PRODUCTS_FILE, "utf8");
  fs.writeFileSync(PRODUCTS_FILE, src.replace('const PHOTO_SOURCE = "remote";', 'const PHOTO_SOURCE = "local";'));
  console.log(`\nAll ${refs.size} photos saved to public/images/pexels/. The shop now serves them locally.`);
}

const cmd = process.argv[2];
if (cmd === "check") check();
else if (cmd === "download") download();
else console.log("Usage: node scripts/photos.js check|download");
