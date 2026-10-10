/**
 * Hand-drawn SVG of a refinery worker in a protective suit pouring molten
 * gold from a crucible into an ingot mould, back-lit by an open furnace.
 * Coordinates are in a 800×800 viewBox; Sparks.tsx uses the same space.
 */

// Points shared with the spark emitter (viewBox units).
export const POUR_LIP = { x: 609, y: 474 };
export const POUR_IMPACT = { x: 630, y: 640 };

function Figure() {
  return (
    <g>
      {/* Legs */}
      <path d="M292 548 Q266 616 278 684" strokeWidth="42" strokeLinecap="round" fill="none" />
      <path d="M338 548 Q374 610 366 684" strokeWidth="42" strokeLinecap="round" fill="none" />
      {/* Boots */}
      <ellipse cx="276" cy="690" rx="34" ry="14" />
      <ellipse cx="372" cy="690" rx="36" ry="14" />
      {/* Far arm (behind body) */}
      <path d="M282 392 Q300 470 330 466 L418 462" strokeWidth="30" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      {/* Protective coat */}
      <path d="M262 356 Q300 336 352 352 Q376 364 370 412 Q364 470 384 572 Q316 590 238 570 Q256 470 250 408 Q248 368 262 356 Z" />
      {/* Hood draping to shoulders */}
      <path d="M266 300 Q262 260 300 252 Q342 248 346 296 L356 356 Q306 372 258 358 Z" />
      {/* Helmet */}
      <path d="M262 290 Q262 240 306 238 Q352 240 352 290 Z" />
      <rect x="252" y="284" width="112" height="12" rx="6" />
      {/* Near arm */}
      <path d="M352 380 Q392 450 398 452 L446 446" strokeWidth="32" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      {/* Gloves */}
      <circle cx="424" cy="461" r="15" />
      <circle cx="448" cy="446" r="16" />
      {/* Tongs */}
      <path d="M440 446 L532 456" strokeWidth="7" strokeLinecap="round" fill="none" />
      <path d="M420 462 L534 486" strokeWidth="7" strokeLinecap="round" fill="none" />
    </g>
  );
}

export default function SmelterScene({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 800 800" className={className} role="img" aria-label="A refinery worker in a heat-proof suit pouring molten gold from a crucible into an ingot mould in front of a glowing furnace">
      <defs>
        <radialGradient id="furnaceCore" cx="50%" cy="62%" r="60%">
          <stop offset="0" stopColor="#fffbe8" />
          <stop offset="0.25" stopColor="#ffe08a" />
          <stop offset="0.55" stopColor="#ff9a2e" />
          <stop offset="0.85" stopColor="#c2410c" />
          <stop offset="1" stopColor="#5a1a05" />
        </radialGradient>
        <radialGradient id="ambient" cx="35%" cy="60%" r="65%">
          <stop offset="0" stopColor="#ff8f3a" stopOpacity="0.55" />
          <stop offset="0.45" stopColor="#c2410c" stopOpacity="0.18" />
          <stop offset="1" stopColor="#000" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="pourGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0" stopColor="#ffe9a8" stopOpacity="0.9" />
          <stop offset="0.4" stopColor="#ffb23e" stopOpacity="0.35" />
          <stop offset="1" stopColor="#ff6a1a" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="stream" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff6cf" />
          <stop offset="0.5" stopColor="#ffd25e" />
          <stop offset="1" stopColor="#ff9d1f" />
        </linearGradient>
        <linearGradient id="molten" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#ff9d1f" />
          <stop offset="0.5" stopColor="#fff2bd" />
          <stop offset="1" stopColor="#ffb02e" />
        </linearGradient>
        <linearGradient id="floor" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#1d140c" />
          <stop offset="1" stopColor="#070605" />
        </linearGradient>
        <linearGradient id="bar" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fff3c4" />
          <stop offset="0.35" stopColor="#f3c14a" />
          <stop offset="0.7" stopColor="#c98b12" />
          <stop offset="1" stopColor="#7a510a" />
        </linearGradient>
        <linearGradient id="visor" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ffe08a" />
          <stop offset="0.5" stopColor="#ff8f3a" />
          <stop offset="1" stopColor="#5a1a05" />
        </linearGradient>
        <filter id="blur8" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="8" />
        </filter>
        <filter id="blur3" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3" />
        </filter>
        <filter id="haze" x="-10%" y="-10%" width="120%" height="120%">
          <feTurbulence type="fractalNoise" baseFrequency="0.012 0.04" numOctaves="2" seed="3">
            <animate attributeName="baseFrequency" dur="7s" values="0.012 0.04;0.014 0.05;0.012 0.04" repeatCount="indefinite" />
          </feTurbulence>
          <feDisplacementMap in="SourceGraphic" scale="14" />
        </filter>
      </defs>

      {/* Ambient furnace light filling the room */}
      <rect width="800" height="800" fill="url(#ambient)" />

      {/* Ceiling: exhaust hood, duct and pendant lamps */}
      <g>
        <path d="M118 0 L182 0 L182 120 L118 120 Z" fill="#120d09" />
        <path d="M60 210 L240 210 L200 120 L100 120 Z" fill="#17100a" stroke="#2a1d12" strokeWidth="2" />
        <path d="M60 210 L240 210" stroke="#ff9a2e" strokeOpacity="0.45" strokeWidth="2" />
        <path d="M0 40 H800 M0 58 H800" stroke="#1c140d" strokeWidth="6" />
        {[470, 680].map((x) => (
          <g key={x}>
            <line x1={x} y1="0" x2={x} y2="150" stroke="#1c140d" strokeWidth="3" />
            <path d={`M${x - 30} 172 L${x + 30} 172 L${x + 14} 150 L${x - 14} 150 Z`} fill="#1c140d" />
            <path d={`M${x - 30} 172 L${x + 30} 172 L${x + 110} 640 L${x - 110} 640 Z`} fill="#ffe2a6" opacity="0.035" />
            <ellipse cx={x} cy="173" rx="26" ry="4" fill="#ffe9b8" opacity="0.85" />
            <ellipse cx={x} cy="176" rx="40" ry="12" fill="#ffd27a" opacity="0.35" filter="url(#blur8)" />
          </g>
        ))}
      </g>

      {/* Furnace body */}
      <g>
        <path d="M20 660 L20 380 Q20 250 150 250 Q280 250 280 380 L280 660 Z" fill="#17100a" />
        {/* Brick courses */}
        <g stroke="#2a1d12" strokeWidth="2" opacity="0.9">
          {[300, 340, 380, 420, 460, 500, 540, 580, 620].map((y) => (
            <line key={y} x1="20" y1={y} x2="280" y2={y} />
          ))}
        </g>
        {/* Glowing mouth with heat haze */}
        <g filter="url(#haze)" className="animate-flicker">
          <path d="M60 640 L60 430 Q60 330 150 330 Q240 330 240 430 L240 640 Z" fill="url(#furnaceCore)" />
          <ellipse cx="150" cy="580" rx="60" ry="30" fill="#fffbe8" opacity="0.45" filter="url(#blur8)" />
        </g>
        <path d="M60 640 L60 430 Q60 330 150 330 Q240 330 240 430 L240 640" fill="none" stroke="#3a2614" strokeWidth="10" />
      </g>

      {/* Floor */}
      <rect x="0" y="660" width="800" height="140" fill="url(#floor)" />
      <ellipse cx="150" cy="676" rx="210" ry="22" fill="#ff8f3a" opacity="0.28" filter="url(#blur8)" />
      <ellipse cx="640" cy="668" rx="150" ry="18" fill="#ffb23e" opacity="0.35" filter="url(#blur8)" />

      {/* Rising smoke */}
      <g fill="#a99b86" opacity="0.18" filter="url(#blur8)">
        <ellipse cx="620" cy="600" rx="30" ry="16" className="animate-rise" style={{ transformBox: "fill-box", transformOrigin: "center" }} />
        <ellipse cx="650" cy="610" rx="24" ry="14" className="animate-rise" style={{ animationDelay: "3s", transformBox: "fill-box", transformOrigin: "center" }} />
        <ellipse cx="600" cy="560" rx="22" ry="12" className="animate-rise" style={{ animationDelay: "6s", transformBox: "fill-box", transformOrigin: "center" }} />
      </g>

      {/* Worker: rim light from furnace (left) and from the pour (right), then silhouette */}
      <g transform="translate(-4 -1)" fill="#ff9a2e" stroke="#ff9a2e" opacity="0.9" filter="url(#blur3)" className="animate-flicker">
        <Figure />
      </g>
      <g transform="translate(3 0)" fill="#ffd25e" stroke="#ffd25e" opacity="0.55" filter="url(#blur3)">
        <Figure />
      </g>
      <g fill="#0b0806" stroke="#0b0806">
        <Figure />
      </g>
      {/* Aluminised suit sheen */}
      <path d="M262 380 Q258 470 252 560" stroke="#ffb23e" strokeOpacity="0.35" strokeWidth="3" fill="none" />
      {/* Face shield reflecting the melt */}
      <path d="M318 294 Q350 296 352 330 Q350 352 320 354 Q326 324 318 294 Z" fill="url(#visor)" opacity="0.95" />
      <path d="M326 302 Q340 306 342 322" stroke="#fff3c4" strokeWidth="2" fill="none" opacity="0.8" strokeLinecap="round" />

      {/* Glow around pour */}
      <circle cx="590" cy="520" r="150" fill="url(#pourGlow)" className="animate-flicker" />

      {/* Crucible, tilted to pour */}
      <g transform="translate(560 470) rotate(50)">
        <path d="M-35 -35 L35 -35 L26 35 Q0 44 -26 35 Z" fill="#2b2420" stroke="#ff8f3a" strokeOpacity="0.6" strokeWidth="2" />
        <path d="M-35 -35 L35 -35 L31 -6 L-31 -6 Z" fill="#ff7a1f" opacity="0.35" />
        <ellipse cx="0" cy="-35" rx="35" ry="9" fill="url(#molten)" />
        <ellipse cx="0" cy="-35" rx="35" ry="9" fill="#fff6cf" opacity="0.6" filter="url(#blur3)" />
      </g>

      {/* Molten stream */}
      <g>
        <path d="M609 474 Q616 520 622 560 T630 640" stroke="#ffb23e" strokeWidth="22" fill="none" opacity="0.5" filter="url(#blur8)" />
        <path d="M609 474 Q616 520 622 560 T630 640" stroke="url(#stream)" strokeWidth="9" fill="none" strokeLinecap="round" />
        <path d="M609 474 Q616 520 622 560 T630 640" stroke="#fffbe8" strokeWidth="3" fill="none" strokeDasharray="18 42" className="animate-flow" strokeLinecap="round" />
      </g>

      {/* Ingot mould */}
      <g>
        <path d="M566 636 L694 636 L704 666 L556 666 Z" fill="#1b1612" stroke="#3a2e22" strokeWidth="2" />
        <path d="M576 638 L684 638 L680 650 L580 650 Z" fill="url(#molten)" />
        <ellipse cx="630" cy="642" rx="40" ry="8" fill="#fffbe8" opacity="0.8" filter="url(#blur3)" />
      </g>

      {/* Finished bars */}
      <g>
        <path d="M712 646 L780 646 L788 668 L704 668 Z" fill="url(#bar)" />
        <path d="M712 646 L780 646 L775 640 L717 640 Z" fill="#fff3c4" opacity="0.8" />
        <path d="M722 622 L772 622 L780 644 L714 644 Z" fill="url(#bar)" />
        <path d="M722 622 L772 622 L767 616 L727 616 Z" fill="#fff3c4" opacity="0.8" />
      </g>

      {/* Vignette */}
      <rect width="800" height="800" fill="url(#ambient)" opacity="0.25" />
    </svg>
  );
}
