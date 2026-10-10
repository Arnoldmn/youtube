"use client";

import { useEffect, useRef } from "react";

const W = 360, D = 170, H = 64;

const metal = {
  top: "linear-gradient(115deg, #7a510a 0%, #e6a822 18%, #fff3c4 34%, #f3c14a 46%, #c98b12 62%, #f9d878 80%, #a06c0c 100%)",
  side: "linear-gradient(180deg, #f3c14a 0%, #a06c0c 55%, #5c3b06 100%)",
  end: "linear-gradient(180deg, #e6a822 0%, #7a510a 100%)",
};

const chips = [
  { label: "Smelting", cls: "left-[2%] top-[14%]", d: "0s" },
  { label: "Fire assay", cls: "right-[0%] top-[8%]", d: "1.2s" },
  { label: "Refining 999.9", cls: "left-[6%] bottom-[14%]", d: "0.6s" },
  { label: "Casting", cls: "right-[6%] bottom-[20%]", d: "1.8s" },
];

/** A 1 kg bar built from six CSS faces; tilts toward the cursor. */
export default function GoldBar3D() {
  const stage = useRef<HTMLDivElement>(null);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const s = stage.current, b = box.current;
    if (!s || !b) return;
    const target = { x: 0, y: 0 }, cur = { x: 0, y: 0 };
    let raf = 0;
    const onMove = (e: PointerEvent) => {
      target.x = e.clientX / window.innerWidth - 0.5;
      target.y = e.clientY / window.innerHeight - 0.5;
    };
    const loop = (t: number) => {
      cur.x += (target.x - cur.x) * 0.06;
      cur.y += (target.y - cur.y) * 0.06;
      const bob = Math.sin(t / 900) * 6;
      b.style.transform = `translateY(${bob}px) rotateX(${58 - cur.y * 18}deg) rotateZ(${-28 + cur.x * 30}deg)`;
      raf = requestAnimationFrame(loop);
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onMove);
    };
  }, []);

  const face = "absolute left-1/2 top-1/2 [backface-visibility:hidden]";

  return (
    <div ref={stage} className="relative mx-auto aspect-square w-full max-w-[600px] [perspective:1100px]">
      <div aria-hidden="true" className="absolute left-1/2 top-1/2 h-[70%] w-[70%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-gold-400/25 blur-[90px]" />
      <div aria-hidden="true" className="absolute left-1/2 top-1/2 h-[82%] w-[82%] -translate-x-1/2 -translate-y-1/2 rounded-full border border-dashed border-gold-300/15 [animation:spin-slow_60s_linear_infinite]" />
      <div aria-hidden="true" className="absolute bottom-[16%] left-1/2 h-10 w-[60%] -translate-x-1/2 rounded-[50%] bg-black/70 blur-xl" />

      <div className="absolute inset-0 grid place-items-center [transform-style:preserve-3d] max-sm:scale-[0.72]">
        <div ref={box} className="relative [transform-style:preserve-3d]" style={{ width: W, height: D, transform: "rotateX(58deg) rotateZ(-28deg)" }} role="img" aria-label="A one-kilogram 999.9 fine gold bar stamped Instant Gold Refinery">
          {/* Top, with stamp */}
          <div className={face} style={{ width: W, height: D, marginLeft: -W / 2, marginTop: -D / 2, background: metal.top, transform: `translateZ(${H / 2}px)`, borderRadius: 6 }}>
            <div className="absolute inset-3 rounded-[4px] border border-[#7a510a]/50 shadow-[inset_0_1px_0_rgba(255,255,255,0.5),inset_0_-1px_0_rgba(0,0,0,0.25)]">
              <div className="flex h-full flex-col items-center justify-center text-[#6b4508] [text-shadow:0_1px_0_rgba(255,243,196,0.7)]">
                <span className="font-mono text-[9px] tracking-[0.35em]">INSTANT GOLD REFINERY</span>
                <span className="mt-1 font-display text-4xl leading-none">1 KG</span>
                <span className="mt-1 font-mono text-[10px] tracking-[0.3em]">FINE GOLD 999.9</span>
                <span className="mt-1 font-mono text-[8px] tracking-[0.3em] opacity-80">KENYA · EST. 2019</span>
              </div>
            </div>
          </div>
          {/* Bottom */}
          <div className={face} style={{ width: W, height: D, marginLeft: -W / 2, marginTop: -D / 2, background: "#3d2804", transform: `rotateY(180deg) translateZ(${H / 2}px)` }} />
          {/* Long sides */}
          <div className={face} style={{ width: W, height: H, marginLeft: -W / 2, marginTop: -H / 2, background: metal.side, transform: `rotateX(-90deg) translateZ(${D / 2}px)` }} />
          <div className={face} style={{ width: W, height: H, marginLeft: -W / 2, marginTop: -H / 2, background: metal.side, transform: `rotateX(90deg) translateZ(${D / 2}px)` }} />
          {/* Ends */}
          <div className={face} style={{ width: H, height: D, marginLeft: -H / 2, marginTop: -D / 2, background: metal.end, transform: `rotateY(90deg) translateZ(${W / 2}px)` }} />
          <div className={face} style={{ width: H, height: D, marginLeft: -H / 2, marginTop: -D / 2, background: metal.end, transform: `rotateY(-90deg) translateZ(${W / 2}px)` }} />
        </div>
      </div>

      {chips.map((c) => (
        <span
          key={c.label}
          className={`absolute ${c.cls} rounded-full border hairline bg-ink-950/70 px-4 py-2 font-mono text-[11px] uppercase tracking-[0.2em] text-bone backdrop-blur-md`}
          style={{ animation: `float-y 5s ease-in-out ${c.d} infinite` }}
        >
          <span className="mr-2 inline-block h-1.5 w-1.5 rounded-full bg-gold-300 align-middle" />
          {c.label}
        </span>
      ))}
    </div>
  );
}
