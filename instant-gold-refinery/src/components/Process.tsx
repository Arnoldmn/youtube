"use client";

import { useEffect, useRef, useState } from "react";
import SectionHeading from "./SectionHeading";

const steps = [
  { title: "Receive & weigh", body: "Your material is logged and weighed on calibrated scales — in front of you, with a written receipt." },
  { title: "Assay", body: "A sample is tested by fire assay or XRF so the gold content is known before anything is melted." },
  { title: "Smelt", body: "Fluxes and heat above 1,064 °C separate gold from slag inside our furnaces." },
  { title: "Refine", body: "Impurities like silver and copper are chemically removed for high-fineness output." },
  { title: "Cast", body: "Pure metal is poured into moulds and cooled into bars of the agreed weight." },
  { title: "Certify & settle", body: "Final weight and purity are documented. Collect your bars or get paid — same day where possible." },
];

export default function Process({ heading = true }: { heading?: boolean }) {
  const ref = useRef<HTMLOListElement>(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onScroll = () => {
      const r = el.getBoundingClientRect();
      const vh = window.innerHeight;
      const p = (vh * 0.6 - r.top) / r.height;
      setProgress(Math.max(0, Math.min(1, p)));
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  const active = Math.min(steps.length - 1, Math.floor(progress * steps.length));

  return (
    <section id="process" className="relative overflow-clip border-y hairline bg-ink-900 py-28 sm:py-36">
      <div aria-hidden="true" className="absolute left-1/2 top-0 h-[600px] w-[900px] -translate-x-1/2 rounded-full bg-ember-600/10 blur-[160px]" />
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6">
        {heading && (<SectionHeading
          eyebrow="The process"
          title={<>Six steps. <em className="text-gold">Zero</em> guesswork.</>}
          intro="Transparency is the whole business. You see the scale, you see the assay, you see the pour."
        />)}

        <div className={`grid gap-12 lg:grid-cols-12 ${heading ? "mt-20" : ""}`}>
        <div className="hidden lg:col-span-5 lg:block">
          <div className="sticky top-32 overflow-hidden rounded-3xl border hairline bg-ink-950/60 p-10">
            <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-dust">Now at step</p>
            <p className="mt-4 font-display text-[10rem] leading-none text-gold">{String(active + 1).padStart(2, "0")}</p>
            <p className="mt-2 font-display text-3xl italic text-bone">{steps[active].title}</p>
            <div className="mt-10 h-1.5 overflow-hidden rounded-full bg-ink-700">
              <div className="h-full rounded-full bg-gradient-to-r from-gold-200 to-ember-500 transition-[width] duration-300" style={{ width: `${Math.max(4, progress * 100)}%` }} />
            </div>
            <div className="mt-3 flex justify-between font-mono text-[10px] uppercase tracking-[0.2em] text-dust">
              <span>Raw</span>
              <span>Bullion</span>
            </div>
          </div>
        </div>
        <ol ref={ref} className="relative grid gap-y-14 lg:col-span-7 lg:gap-y-24 lg:py-6">
          {/* The pour line: fills with molten gold as you scroll */}
          <span aria-hidden="true" className="absolute bottom-2 left-[19px] top-2 w-px bg-gold-300/15" />
          <span
            aria-hidden="true"
            className="absolute left-[18px] top-2 w-[3px] rounded-full bg-gradient-to-b from-gold-100 via-gold-300 to-ember-500 shadow-[0_0_18px_2px] shadow-gold-400/60"
            style={{ height: `calc(${progress * 100}% - 16px)` }}
          />
          {steps.map((s, i) => {
            const lit = progress * steps.length > i + 0.3;
            return (
              <li key={s.title} className="relative grid grid-cols-[40px_1fr] gap-6">
                <span
                  className={`relative z-10 grid h-10 w-10 place-items-center rounded-full border font-mono text-xs transition duration-500 ${
                    lit ? "border-gold-300 bg-gold-300 text-ink-950 shadow-[0_0_24px] shadow-gold-400/70" : "hairline bg-ink-900 text-dust"
                  }`}
                >
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div className={`transition duration-700 ${lit ? "opacity-100" : "opacity-40"}`}>
                  <h3 className="font-display text-3xl text-bone sm:text-4xl">{s.title}</h3>
                  <p className="mt-2 max-w-lg leading-relaxed text-dust">{s.body}</p>
                </div>
              </li>
            );
          })}
        </ol>
        </div>
      </div>
    </section>
  );
}
