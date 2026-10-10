const steps = ["Weigh", "Assay", "Smelt", "Refine", "Cast", "Certify"];
const R = 200;
const C = 2 * Math.PI * R;
const CYCLE = 12; // seconds for the drop to travel the full ring

/** A molten drop circles the six stages; each node flares as it passes. */
export default function ProcessRing() {
  return (
    <div className="relative mx-auto aspect-square w-full max-w-[600px]">
      <div aria-hidden="true" className="absolute inset-[18%] rounded-full bg-ember-500/20 blur-[80px]" />
      <svg viewBox="0 0 600 600" className="relative h-full w-full overflow-visible" role="img" aria-label="Our six-stage process: weigh, assay, smelt, refine, cast, certify">
        <defs>
          <linearGradient id="trail" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#ff6a1a" stopOpacity="0" />
            <stop offset="1" stopColor="#fff3c4" />
          </linearGradient>
          <radialGradient id="drop">
            <stop offset="0" stopColor="#fffbe8" />
            <stop offset="0.5" stopColor="#ffd25e" />
            <stop offset="1" stopColor="#ff8f3a" stopOpacity="0" />
          </radialGradient>
          <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="6" result="b" />
            <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>

        {/* Slowly turning tick dial */}
        <g style={{ transformOrigin: "300px 300px", animation: "spin-slow 90s linear infinite" }}>
          {Array.from({ length: 120 }, (_, i) => {
            const a = (i / 120) * Math.PI * 2;
            const long = i % 10 === 0;
            const r1 = 262, r2 = long ? 280 : 270;
            return (
              <line key={i} x1={300 + Math.cos(a) * r1} y1={300 + Math.sin(a) * r1} x2={300 + Math.cos(a) * r2} y2={300 + Math.sin(a) * r2} stroke="#f3c14a" strokeOpacity={long ? 0.5 : 0.18} strokeWidth={long ? 1.5 : 1} />
            );
          })}
        </g>

        <circle cx="300" cy="300" r={R} fill="none" stroke="#f3c14a" strokeOpacity="0.14" strokeWidth="2" />

        {/* Trail + drop rotate together; starts at 12 o'clock */}
        <g style={{ transformOrigin: "300px 300px", animation: `spin-slow ${CYCLE}s linear infinite` }}>
          <circle
            cx="300" cy="300" r={R} fill="none" stroke="url(#trail)" strokeWidth="4" strokeLinecap="round"
            strokeDasharray={`${C * 0.16} ${C}`}
            transform={`rotate(${-90 - 0.16 * 360} 300 300)`}
            filter="url(#glow)"
          />
          <circle cx="300" cy={300 - R} r="22" fill="url(#drop)" />
          <circle cx="300" cy={300 - R} r="7" fill="#fffbe8" filter="url(#glow)" />
        </g>

        {steps.map((s, i) => {
          const a = (i / steps.length) * Math.PI * 2 - Math.PI / 2;
          const x = 300 + Math.cos(a) * R, y = 300 + Math.sin(a) * R;
          const lx = 300 + Math.cos(a) * (R + 62), ly = 300 + Math.sin(a) * (R + 62);
          return (
            <g key={s}>
              <circle cx={x} cy={y} r="11" stroke="#f3c14a" strokeOpacity="0.6" strokeWidth="1.5" style={{ animation: `node-pulse ${CYCLE}s linear ${(i * CYCLE) / steps.length - CYCLE}s infinite` }} />
              <text x={lx} y={ly - 6} textAnchor="middle" className="fill-[#a99b86] font-mono text-[11px] uppercase tracking-[0.2em]">
                {String(i + 1).padStart(2, "0")}
              </text>
              <text x={lx} y={ly + 16} textAnchor="middle" className="fill-[#f1e8d8] font-display text-[22px]">
                {s}
              </text>
            </g>
          );
        })}

        {/* Core */}
        <circle cx="300" cy="300" r="128" fill="#0d0b09" stroke="#f3c14a" strokeOpacity="0.2" />
        <circle cx="300" cy="300" r="112" fill="none" stroke="#f3c14a" strokeOpacity="0.08" strokeDasharray="2 6" />
        <text x="300" y="262" textAnchor="middle" className="fill-[#a99b86] font-mono text-[11px] uppercase tracking-[0.3em]">Melt point</text>
        <text x="300" y="322" textAnchor="middle" className="fill-[#f3c14a] font-display text-[64px]">1,064°</text>
        <text x="300" y="352" textAnchor="middle" className="fill-[#a99b86] font-mono text-[11px] uppercase tracking-[0.3em]">Celsius · Au</text>
      </svg>
    </div>
  );
}
