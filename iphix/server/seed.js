'use strict';
const { SECTIONS, CATEGORIES, BRANDS, ACCESSORIES, SERVICES, MISC_SPARES } = require('./catalog');
const { hashPassword, newReferralCode } = require('./auth');

// Small deterministic PRNG so the starter catalogue is identical on every install.
function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const round50 = (n) => Math.max(50, Math.round(n / 50) * 50);

function slugify(s) {
  return String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80);
}

function isPremium(brand, model) {
  if (brand === 'iphone') return !/XR|11$/.test(model);
  if (brand === 'samsung') return /S2\d|A54|A34/.test(model);
  return /Reno|Zero|Camon/.test(model);
}

// Build spare-part products for every brand × part × model combination.
function brandSpares(brandSlug, brandName, parts, models, rand) {
  const out = [];
  const mult = brandSlug === 'iphone' ? 2 : brandSlug === 'samsung' ? 1.4 : 1;
  for (const [part] of parts) {
    models.forEach((model, i) => {
      const premium = isPremium(brandSlug, model);
      const tier = 1 + i * 0.12;
      const label = brandSlug === 'iphone' ? model : `${brandName} ${model}`;
      let p;
      switch (part) {
        case 'screen':
          p = premium
            ? { name: `${label} OLED Display Assembly`, cat: 'oled-amoled-screens', price: 6500 * mult * tier }
            : { name: `${label} LCD Display Assembly`, cat: 'lcd-screens', price: 2400 * mult * tier };
          p.desc = 'Complete display with touch digitizer, tested before dispatch. Fits perfectly — free fitting when you book a screen replacement with us.';
          break;
        case 'battery':
          p = { name: `${label} Replacement Battery`, cat: 'batteries', price: 1300 * mult * tier, desc: 'High-capacity replacement battery with protection circuit. 3-month warranty.' };
          break;
        case 'charging-port':
          p = { name: `${label} Charging Port Flex / Board`, cat: 'charging-ports', price: 450 * mult * tier, desc: 'Charging port with mic and signal contacts where applicable.' };
          break;
        case 'back-cover':
          p = brandSlug === 'iphone'
            ? { name: `${label} Back Glass`, cat: 'back-covers', price: 1000 * tier, desc: 'Big-hole back glass for easy laser fitting. Colour options on request.' }
            : { name: `${label} Back Cover`, cat: 'back-covers', price: 650 * mult * tier, desc: 'Replacement back / battery cover with adhesive. Ask on WhatsApp for colours.' };
          break;
        case 'camera':
          p = { name: `${label} Rear Camera Module`, cat: 'back-cameras', price: 1800 * mult * tier, desc: 'Main back camera module, tested for focus and flash sync.' };
          break;
        case 'flex': {
          const variants = [
            ['Power & Volume Flex', 'power-buttons'],
            ['Fingerprint Sensor Flex', 'fingerprint-flexes'],
            ['Main Board FPC Flex', 'motherboard-components'],
          ];
          const [vn, vc] = brandSlug === 'iphone' ? variants[0] : variants[i % variants.length];
          p = { name: `${label} ${vn}`, cat: vc, price: 400 * mult * tier, desc: 'Original-quality flex cable, tested before dispatch.' };
          break;
        }
        case 'housing':
          p = { name: `${label} Full Housing / Middle Frame`, cat: 'middle-frames', price: 3200 * tier, desc: 'Complete housing with side buttons and SIM tray.' };
          break;
        default:
          return;
      }
      out.push({ ...p, brand: brandSlug, model, part, price: round50(p.price * (0.9 + rand() * 0.2)) });
    });
  }
  return out;
}

// Default hero slides (artwork in public/img/slides). Admins can replace them with real photos.
const DEFAULT_SLIDES = [
  { title: 'Cracked screen? Fixed in 1 hour', subtitle: 'Original-quality LCD & OLED screens for Samsung, iPhone, Tecno, Infinix, Redmi, Oppo & Vivo — fitted while you wait.', ctaLabel: 'Shop screens', ctaLink: '#/category/lcd-screens', image: '/img/slides/screens.svg' },
  { title: 'Batteries that last all day', subtitle: 'High-capacity replacement batteries for every major brand, with a 3-month warranty and free health check.', ctaLabel: 'Shop batteries', ctaLink: '#/category/batteries', image: '/img/slides/batteries.svg' },
  { title: 'Fast chargers, cables & power banks', subtitle: 'Type-C, Lightning and Micro-USB. 20W–45W fast chargers and power banks up to 30,000mAh.', ctaLabel: 'Shop charging', ctaLink: '#/category/fast-chargers', image: '/img/slides/chargers.svg' },
  { title: 'Protect your phone', subtitle: 'Shockproof cases, 9H tempered glass, UV full-glue and privacy glass, camera lens protectors.', ctaLabel: 'Shop protection', ctaLink: '#/category/tempered-glass', image: '/img/slides/protection.svg' },
  { title: 'Earbuds, speakers & smart watches', subtitle: 'Wireless earbuds, Bluetooth speakers, smart watches and bands at wholesale-friendly prices.', ctaLabel: 'Shop audio', ctaLink: '#/category/earphones-earbuds', image: '/img/slides/audio.svg' },
  { title: 'Professional phone repairs', subtitle: 'Diagnostics, charging ports, back glass, cameras, speakers, software & water damage — by skilled technicians.', ctaLabel: 'Book a repair', ctaLink: '#/shop/services', image: '/img/slides/repair.svg' },
];

function seed(db, config) {
  const already = db.get('SELECT COUNT(*) AS n FROM categories').n;
  if (!already) {
    const rand = rng(20260929);
    db.tx(() => {
      const insCat = db.prepare('INSERT INTO categories (slug, name, section, icon, sort) VALUES (?, ?, ?, ?, ?)');
      for (const s of SECTIONS) CATEGORIES[s.key].forEach(([slug, name, icon], i) => insCat.run(slug, name, s.key, icon, i));

      const insBrand = db.prepare('INSERT INTO brands (slug, name, parts, featured, sort) VALUES (?, ?, ?, ?, ?)');
      BRANDS.forEach(([slug, name, parts, , featured], i) => insBrand.run(slug, name, JSON.stringify(parts), featured, i));

      const catId = Object.fromEntries(db.all('SELECT slug, id FROM categories').map((r) => [r.slug, r.id]));
      const brandId = Object.fromEntries(db.all('SELECT slug, id FROM brands').map((r) => [r.slug, r.id]));
      const insProd = db.prepare(`INSERT INTO products
        (slug, name, description, category_id, brand_id, model, part, price, compare_price, wholesale_price, stock, is_new, is_deal, rating, sold)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
      const used = new Set();

      const add = (p, { service = false } = {}) => {
        let slug = slugify(p.name);
        for (let n = 2; used.has(slug); n++) slug = `${slugify(p.name)}-${n}`;
        used.add(slug);
        const isDeal = !service && rand() < 0.22;
        const isNew = rand() < 0.18;
        const compare = isDeal ? round50(p.price * (1.2 + rand() * 0.4)) : null;
        const wholesale = service ? null : round50(p.price * 0.85);
        insProd.run(
          slug, p.name, p.desc || '', catId[p.cat], p.brand ? brandId[p.brand] : null, p.model || '', p.part || '',
          p.price, compare, wholesale, service ? 999 : 5 + Math.floor(rand() * 60), isNew ? 1 : 0, isDeal ? 1 : 0,
          Math.round((4 + rand()) * 10) / 10, Math.floor(rand() * 900),
        );
      };

      for (const [cat, items] of Object.entries(ACCESSORIES)) {
        for (const [name, price, brand, model] of items) {
          const brandName = brand ? BRANDS.find((b) => b[0] === brand)[1] : '';
          const forWhat = model ? ` – ${brand === 'iphone' ? model : `${brandName} ${model}`}` : brand ? ` – ${brandName}` : '';
          add({
            name: `${name}${forWhat}`, cat, brand, model, price,
            desc: 'Quality phone accessory from IPHIX COMMUNICATIONS. Retail and wholesale available — buy 10+ pieces for the wholesale price.',
          });
        }
      }
      for (const [slug, name, parts, models] of BRANDS) {
        for (const p of brandSpares(slug, name, parts, models, rand)) add({ ...p, desc: p.desc });
      }
      for (const [cat, partName, brand, model, price] of MISC_SPARES) {
        const label = brand === 'iphone' ? model : `${BRANDS.find((b) => b[0] === brand)[1]} ${model}`;
        add({ name: `${label} ${partName}`, cat, brand, model, price, desc: 'Tested replacement part. Fitting available at our repair desk.' });
      }
      for (const [cat, [name, price, desc]] of Object.entries(SERVICES)) add({ name, cat, price, desc }, { service: true });
    });
  }

  if (!db.get('SELECT COUNT(*) AS n FROM slides').n) {
    const insSlide = db.prepare('INSERT INTO slides (title, subtitle, cta_label, cta_link, image, sort) VALUES (?, ?, ?, ?, ?, ?)');
    DEFAULT_SLIDES.forEach((s, i) => insSlide.run(s.title, s.subtitle, s.ctaLabel, s.ctaLink, s.image, i));
  }

  if (!db.get("SELECT id FROM users WHERE role = 'admin' LIMIT 1")) {
    db.run(
      `INSERT INTO users (name, email, phone, password_hash, role, referral_code) VALUES (?, ?, ?, ?, 'admin', ?)`,
      'IPHIX Admin', config.admin.email, config.whatsappNumber, hashPassword(config.admin.password), newReferralCode(db, 'IPHIX'),
    );
  }
}

module.exports = { seed, slugify, DEFAULT_SLIDES };
