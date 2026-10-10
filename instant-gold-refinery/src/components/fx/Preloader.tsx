"use client";

import { useEffect, useState } from "react";
import { site } from "@/lib/site";

const KEY = "igr-intro-seen";

/**
 * First-visit intro: a counter fills a gold bar, then the curtain lifts.
 * An inline script in <head> marks return visits as loaded before paint,
 * so they never see it.
 */
export default function Preloader() {
  const [count, setCount] = useState(0);
  const [done, setDone] = useState(false);
  const [gone, setGone] = useState(false);

  useEffect(() => {
    const html = document.documentElement;
    if (html.dataset.skipIntro) {
      setGone(true);
      return;
    }
    const finish = () => {
      setDone(true);
      html.dataset.loaded = "true";
      try { sessionStorage.setItem(KEY, "1"); } catch {}
      setTimeout(() => setGone(true), 1100);
    };
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      finish();
      return;
    }
    const start = performance.now();
    const dur = 1500;
    let raf = 0;
    const tick = () => {
      const t = Math.min(1, (performance.now() - start) / dur);
      const eased = 1 - Math.pow(1 - t, 3);
      setCount(Math.round(eased * 100));
      if (t < 1) raf = requestAnimationFrame(tick);
      else setTimeout(finish, 250);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  if (gone) return null;

  return (
    <div
      aria-hidden="true"
      className="preloader fixed inset-0 z-[100] flex flex-col items-center justify-center bg-ink-950 transition-[clip-path] duration-1000 ease-[cubic-bezier(0.76,0,0.24,1)]"
      style={{ clipPath: done ? "inset(0 0 100% 0)" : "inset(0 0 0% 0)" }}
    >
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_60%,rgba(201,139,18,0.18),transparent_60%)]" />
      <p className="relative font-mono text-[11px] uppercase tracking-[0.4em] text-dust">Est. {site.established} · {site.country}</p>
      <p className="relative mt-6 font-display text-5xl text-bone sm:text-7xl">
        Instant <em className="text-gold">Gold</em>
      </p>
      <div className="relative mt-10 h-px w-64 overflow-hidden bg-gold-300/15 sm:w-80">
        <div className="h-full bg-gradient-to-r from-gold-200 via-gold-300 to-ember-500 shadow-[0_0_12px_2px] shadow-gold-400/60" style={{ width: `${count}%` }} />
      </div>
      <p className="relative mt-4 font-mono text-sm tabular-nums text-gold-200">{String(count).padStart(3, "0")}°</p>
    </div>
  );
}

/** Inline in <head>: skip the intro for return visits within the session. */
export const preloaderScript = `try{if(sessionStorage.getItem("${KEY}")||matchMedia("(prefers-reduced-motion: reduce)").matches){var d=document.documentElement.dataset;d.loaded=d.skipIntro="true"}}catch(e){var d=document.documentElement.dataset;d.loaded=d.skipIntro="true"}`;
