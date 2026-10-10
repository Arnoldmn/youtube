"use client";

import { useEffect, useRef } from "react";

/** Gold dot + trailing ring that swells over anything clickable. Fine pointers only. */
export default function Cursor() {
  const dot = useRef<HTMLDivElement>(null);
  const ring = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const html = document.documentElement;
    html.classList.add("has-cursor");

    const pos = { x: -100, y: -100, rx: -100, ry: -100 };
    let hover = false;
    let down = false;
    let raf = 0;

    const onMove = (e: PointerEvent) => {
      pos.x = e.clientX;
      pos.y = e.clientY;
      const t = e.target as Element | null;
      hover = !!t?.closest("a, button, summary, label, input, textarea, [data-cursor]");
    };
    const onDown = () => (down = true);
    const onUp = () => (down = false);
    const onLeave = () => { pos.x = pos.y = -100; };

    const loop = () => {
      pos.rx += (pos.x - pos.rx) * 0.18;
      pos.ry += (pos.y - pos.ry) * 0.18;
      if (dot.current) dot.current.style.transform = `translate3d(${pos.x}px, ${pos.y}px, 0) translate(-50%, -50%) scale(${hover ? 0 : 1})`;
      if (ring.current) {
        const s = (hover ? 1.9 : 1) * (down ? 0.8 : 1);
        ring.current.style.transform = `translate3d(${pos.rx}px, ${pos.ry}px, 0) translate(-50%, -50%) scale(${s})`;
        ring.current.style.backgroundColor = hover ? "rgba(243,193,74,0.12)" : "transparent";
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerdown", onDown);
    window.addEventListener("pointerup", onUp);
    document.addEventListener("pointerleave", onLeave);
    return () => {
      cancelAnimationFrame(raf);
      html.classList.remove("has-cursor");
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointerup", onUp);
      document.removeEventListener("pointerleave", onLeave);
    };
  }, []);

  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-[90] hidden [@media(hover:hover)_and_(pointer:fine)]:block">
      <div ref={dot} className="fixed left-0 top-0 h-2 w-2 rounded-full bg-gold-200 transition-[scale] duration-200" />
      <div ref={ring} className="fixed left-0 top-0 h-9 w-9 rounded-full border border-gold-300/60 transition-[background-color] duration-300" />
    </div>
  );
}
