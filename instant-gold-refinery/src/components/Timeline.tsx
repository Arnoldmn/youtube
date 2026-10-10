"use client";

import { useEffect, useRef, useState } from "react";
import { milestones } from "@/lib/about";

function Card({ m, i, lit }: { m: (typeof milestones)[number]; i: number; lit: boolean }) {
  return (
    <article
      className={`relative flex h-full flex-col justify-between rounded-[2rem] border p-8 transition duration-700 sm:p-10 ${
        lit ? "border-gold-300/40 bg-gradient-to-b from-ink-800 to-ink-900" : "hairline bg-ink-900/60"
      }`}
    >
      <div className="flex items-center justify-between font-mono text-[11px] uppercase tracking-[0.3em] text-dust">
        <span>Chapter {String(i + 1).padStart(2, "0")}</span>
        <span className={`h-2.5 w-2.5 rounded-full transition ${lit ? "bg-gold-300 shadow-[0_0_16px_3px] shadow-gold-400/70" : "bg-ink-600"}`} />
      </div>
      <p
        className={`mt-10 font-display text-[clamp(5rem,9vw,8.5rem)] leading-[0.8] tracking-tight transition duration-700 ${lit ? "text-gold" : "text-transparent"}`}
        style={lit ? undefined : { WebkitTextStroke: "1px rgba(243,193,74,0.35)" }}
      >
        {m.year}
      </p>
      <div className="mt-10">
        <h3 className="font-display text-3xl text-bone sm:text-4xl">{m.title}</h3>
        <p className="mt-3 leading-relaxed text-dust">{m.body}</p>
      </div>
    </article>
  );
}

/**
 * Desktop: the section pins and the milestones slide sideways as you scroll down.
 * Mobile: a simple vertical list.
 */
export default function Timeline() {
  const outer = useRef<HTMLDivElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const rail = useRef<HTMLDivElement>(null);
  const [progress, setProgress] = useState(0);
  const [shift, setShift] = useState(0);

  useEffect(() => {
    const update = () => {
      const o = outer.current, t = track.current, rl = rail.current;
      if (!o || !t || !rl) return;
      const r = o.getBoundingClientRect();
      const scrollable = r.height - window.innerHeight;
      const p = scrollable > 0 ? Math.max(0, Math.min(1, -r.top / scrollable)) : 0;
      setProgress(p);
      // offsetWidth ignores transforms, so measuring never feeds back into itself
      setShift(p * Math.max(0, rl.offsetWidth - t.clientWidth));
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, []);

  const active = Math.round(progress * (milestones.length - 1));

  return (
    <section id="timeline" className="relative border-y hairline bg-ink-950">
      {/* Desktop: pinned horizontal scroll */}
      <div ref={outer} className="hidden lg:block" style={{ height: `${milestones.length * 60}vh` }}>
        <div className="sticky top-0 flex h-screen flex-col justify-center overflow-hidden pt-20">
          <div className="mx-auto flex w-full max-w-7xl items-end justify-between px-6">
            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-gold-300">Our journey</p>
              <h2 className="mt-4 font-display text-6xl leading-none text-bone">
                From one furnace <em className="text-gold">to today.</em>
              </h2>
            </div>
            <p className="font-mono text-sm text-dust">
              <span className="text-bone">{String(active + 1).padStart(2, "0")}</span> / {String(milestones.length).padStart(2, "0")}
            </p>
          </div>

          <div ref={track} className="mt-10 overflow-hidden">
            <div
              ref={rail}
              className="flex w-max gap-6 pl-[max(1.5rem,calc((100vw-80rem)/2+1.5rem))] pr-[6vw] will-change-transform"
              style={{ transform: `translate3d(${-shift}px,0,0)` }}
            >
              {milestones.map((m, i) => (
                <div key={m.year} className="h-[50vh] min-h-[380px] max-h-[520px] w-[420px] shrink-0">
                  <Card m={m} i={i} lit={i <= active} />
                </div>
              ))}
            </div>
          </div>

          {/* Year rail */}
          <div className="mx-auto mt-10 w-full max-w-7xl px-6">
            <div className="relative h-px bg-gold-300/15">
              <div className="absolute inset-y-0 left-0 bg-gradient-to-r from-gold-200 to-ember-500 shadow-[0_0_14px_2px] shadow-gold-400/50" style={{ width: `${progress * 100}%` }} />
            </div>
            <div className="mt-4 flex justify-between font-mono text-[11px] uppercase tracking-[0.2em]">
              {milestones.map((m, i) => (
                <span key={m.year} className={i <= active ? "text-gold-200" : "text-dust/60"}>{m.year}</span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Mobile / tablet: vertical */}
      <div className="px-4 py-24 sm:px-6 lg:hidden">
        <p className="reveal font-mono text-[11px] uppercase tracking-[0.3em] text-gold-300">Our journey</p>
        <h2 className="reveal mt-4 font-display text-5xl leading-none text-bone">
          From one furnace <em className="text-gold">to today.</em>
        </h2>
        <div className="mt-12 grid gap-4 sm:grid-cols-2">
          {milestones.map((m, i) => (
            <div key={m.year} className="reveal">
              <Card m={m} i={i} lit />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
