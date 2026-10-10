"use client";

import { useEffect, useRef, useState } from "react";

const facts = [
  { k: "Atomic number", v: "79" },
  { k: "Melting point", v: "1,064 °C" },
  { k: "Density", v: "19.32 g/cm³" },
  { k: "One troy ounce", v: "31.103 g" },
  { k: "24 karat", v: "≥ 99.9 % pure" },
  { k: "Tarnish & rust", v: "Never" },
];

/** Giant periodic-table tile that tilts with the cursor, with rotating facts. */
export default function AuTile() {
  const tile = useRef<HTMLDivElement>(null);
  const [i, setI] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setI((n) => (n + 1) % facts.length), 2600);
    const el = tile.current;
    const target = { x: 0, y: 0 }, cur = { x: 0, y: 0 };
    let raf = 0;
    const onMove = (e: PointerEvent) => {
      target.x = e.clientX / window.innerWidth - 0.5;
      target.y = e.clientY / window.innerHeight - 0.5;
    };
    const loop = () => {
      cur.x += (target.x - cur.x) * 0.07;
      cur.y += (target.y - cur.y) * 0.07;
      if (el) {
        el.style.transform = `rotateY(${cur.x * 26 - 8}deg) rotateX(${-cur.y * 22 + 6}deg)`;
        el.style.setProperty("--gx", `${50 + cur.x * 80}%`);
        el.style.setProperty("--gy", `${50 + cur.y * 80}%`);
      }
      raf = requestAnimationFrame(loop);
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    raf = requestAnimationFrame(loop);
    return () => {
      clearInterval(id);
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onMove);
    };
  }, []);

  return (
    <div className="relative mx-auto grid aspect-square w-full max-w-[560px] place-items-center [perspective:1000px]">
      <div aria-hidden="true" className="absolute inset-[15%] rounded-full bg-gold-400/25 blur-[90px]" />
      <div
        ref={tile}
        className="relative -mt-[14%] aspect-[4/5] w-[60%] rounded-[2rem] border border-gold-200/40 p-[7%] shadow-[0_50px_100px_-30px_rgba(0,0,0,0.9)] [transform-style:preserve-3d]"
        style={{ background: "linear-gradient(140deg, #fff3c4 0%, #f3c14a 28%, #c98b12 60%, #7a510a 100%)" }}
      >
        {/* moving sheen */}
        <div aria-hidden="true" className="absolute inset-0 rounded-[2rem] mix-blend-overlay" style={{ background: "radial-gradient(circle at var(--gx,50%) var(--gy,50%), rgba(255,255,255,0.85), transparent 45%)" }} />
        <div className="relative flex h-full flex-col justify-between text-[#4a3005] [transform:translateZ(40px)]">
          <div className="flex justify-between font-mono text-sm sm:text-base">
            <span>79</span>
            <span>196.967</span>
          </div>
          <p className="font-display text-[clamp(6rem,16vw,11rem)] leading-[0.8] tracking-tight [text-shadow:0_2px_0_rgba(255,243,196,0.6)]">Au</p>
          <div>
            <p className="font-display text-3xl">Gold</p>
            <p className="font-mono text-[10px] uppercase tracking-[0.3em] opacity-70">Transition metal · Group 11</p>
          </div>
        </div>
      </div>

      {/* Fact ticker */}
      <div className="absolute bottom-0 left-1/2 w-[80%] -translate-x-1/2 overflow-hidden rounded-2xl border hairline bg-ink-950/80 px-5 py-4 backdrop-blur-md sm:w-[70%]" aria-live="polite">
        <div key={i} className="flex items-baseline justify-between gap-4 [animation:bubble-in_0.5s_ease-out]">
          <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-dust">{facts[i].k}</span>
          <span className="font-display text-2xl text-gold-200">{facts[i].v}</span>
        </div>
        <div className="mt-3 flex gap-1">
          {facts.map((_, n) => (
            <span key={n} className={`h-0.5 flex-1 rounded-full transition-colors duration-500 ${n === i ? "bg-gold-300" : "bg-gold-300/15"}`} />
          ))}
        </div>
      </div>
    </div>
  );
}
