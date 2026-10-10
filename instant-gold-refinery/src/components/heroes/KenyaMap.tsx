// Dotted map of Kenya (simplified border, lon/lat) with the Nakuru refinery and the
// board's home towns. Dots are computed at build time.

const BORDER: [number, number][] = [
  [33.95, 4.22], [34.39, 4.61], [35.3, 5.5], [35.82, 5.33], [35.82, 4.78], [36.16, 4.45], [37.0, 4.4],
  [38.12, 3.6], [38.9, 3.5], [39.56, 3.42], [39.85, 3.84], [40.77, 4.26], [41.17, 3.92], [41.86, 3.92],
  [40.99, 2.78], [40.99, -0.86], [41.59, -1.68], [40.88, -2.08], [40.64, -2.5], [40.26, -2.57],
  [40.12, -3.28], [39.8, -3.68], [39.6, -4.35], [39.2, -4.68], [37.76, -3.68], [37.7, -3.1],
  [34.07, -1.06], [33.9, -0.95], [33.89, 0.11], [34.18, 0.52], [34.67, 1.18], [35.04, 1.9],
  [34.6, 3.06], [34.48, 3.56], [34.0, 4.25],
];

const K = 58;
const px = (lon: number) => (lon - 33.4) * K;
const py = (lat: number) => (5.8 - lat) * K;

function inside(lon: number, lat: number) {
  let hit = false;
  for (let i = 0, j = BORDER.length - 1; i < BORDER.length; j = i++) {
    const [xi, yi] = BORDER[i], [xj, yj] = BORDER[j];
    if (yi > lat !== yj > lat && lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) hit = !hit;
  }
  return hit;
}

// Refinery location: Kiamunyu, Nakuru
const HQ = { name: "Nakuru", lon: 36.07, lat: -0.3 };

const STEP = 0.2;
const dots: { x: number; y: number; d: number }[] = [];
for (let lat = 5.6; lat > -4.8; lat -= STEP) {
  for (let lon = 33.8; lon < 42; lon += STEP) {
    if (inside(lon, lat)) {
      const d = Math.hypot(lon - HQ.lon, lat - HQ.lat);
      dots.push({ x: px(lon), y: py(lat), d });
    }
  }
}

const towns = [
  { name: "Nairobi", lon: 36.82, lat: -1.29, dx: 14, anchor: "start" as const },
  { name: "Nyeri", lon: 36.95, lat: -0.42, dx: 14, anchor: "start" as const },
  { name: "Kisumu", lon: 34.76, lat: -0.09, dx: -14, anchor: "end" as const },
  { name: "Mombasa", lon: 39.67, lat: -4.04, dx: -14, anchor: "end" as const },
];

export default function KenyaMap() {
  const hx = px(HQ.lon), hy = py(HQ.lat);
  return (
    <div className="relative mx-auto w-full max-w-[560px]">
      <div aria-hidden="true" className="absolute left-[38%] top-[60%] h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full bg-gold-400/25 blur-[80px]" />
      <svg viewBox="-20 -10 540 640" className="relative h-auto w-full overflow-visible" role="img" aria-label="Map of Kenya highlighting our refinery in Kiamunyu, Nakuru">
        <defs>
          <radialGradient id="dotFade" cx={hx} cy={hy} r="420" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#fff3c4" />
            <stop offset="0.35" stopColor="#e6a822" />
            <stop offset="1" stopColor="#7a510a" stopOpacity="0.55" />
          </radialGradient>
        </defs>

        <polygon points={BORDER.map(([lo, la]) => `${px(lo)},${py(la)}`).join(" ")} fill="#f3c14a" fillOpacity="0.03" stroke="#f3c14a" strokeOpacity="0.25" strokeWidth="1" strokeLinejoin="round" />

        <g fill="url(#dotFade)">
          {dots.map((p, i) => (
            <circle key={i} cx={p.x.toFixed(1)} cy={p.y.toFixed(1)} r={p.d < 1.2 ? 2.6 : 2} />
          ))}
        </g>

        {/* Routes from HQ */}
        {towns.map((t, i) => {
          const tx = px(t.lon), ty = py(t.lat);
          const cx = (hx + tx) / 2, cy = Math.min(hy, ty) - 70;
          return (
            <g key={t.name}>
              <path d={`M${hx},${hy} Q${cx},${cy} ${tx},${ty}`} fill="none" stroke="#fff3c4" strokeWidth="1.5" strokeDasharray="6 6" strokeOpacity="0.8" pathLength={100} style={{ strokeDashoffset: 100, animation: `dash-flow 2.4s ease-out ${0.6 + i * 0.3}s forwards` }} />
              <circle cx={tx} cy={ty} r="5" fill="#f3c14a" />
              <text x={tx + t.dx} y={ty + 4} textAnchor={t.anchor} className="fill-[#f1e8d8] font-mono text-[12px] uppercase tracking-[0.2em]">{t.name}</text>
            </g>
          );
        })}

        {/* HQ beacon */}
        <g>
          {[0, 1, 2].map((i) => (
            <circle key={i} cx={hx} cy={hy} r="14" fill="none" stroke="#f3c14a" strokeWidth="1.5" style={{ transformOrigin: `${hx}px ${hy}px`, animation: `ping-ring 3s ease-out ${i}s infinite` }} />
          ))}
          <circle cx={hx} cy={hy} r="9" fill="#fff3c4" />
          <circle cx={hx} cy={hy} r="4" fill="#c98b12" />
        </g>
      </svg>

      {/* HQ card */}
      <div className="absolute rounded-2xl border hairline bg-ink-950/80 p-3 backdrop-blur-md max-sm:scale-90 max-sm:origin-top-left sm:p-4" style={{ left: "2%", top: `${((hy + 10) / 640) * 100 + 10}%` }}>
        <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-gold-300">HQ · Est. 2019</p>
        <p className="mt-1 font-display text-2xl leading-none text-bone sm:text-3xl">{HQ.name}</p>
        <p className="mt-2 font-mono text-[10px] tracking-[0.15em] text-dust">Kiamunyu · 0.30° S · 36.07° E</p>
      </div>
    </div>
  );
}
