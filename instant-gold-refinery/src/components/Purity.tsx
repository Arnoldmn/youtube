"use client";

import { useState } from "react";
import SectionHeading from "./SectionHeading";
import { whatsappLink } from "@/lib/site";

const karats = [
  { k: 9, fineness: "375", note: "Common in budget jewellery. Heavy in copper and silver." },
  { k: 14, fineness: "585", note: "Durable everyday jewellery. Just over half gold." },
  { k: 18, fineness: "750", note: "Fine jewellery standard. Three parts gold in four." },
  { k: 22, fineness: "916", note: "Traditional high-purity jewellery and coins." },
  { k: 24, fineness: "999.9", note: "Investment-grade bullion. What leaves our refinery." },
];

// Lower karat = paler, redder alloy; 24K = deep rich yellow.
const lerp = (a: number, b: number, t: number) => Math.round(a + (b - a) * t);
function goldTone(k: number) {
  const t = (k - 9) / 15;
  const hi = `rgb(${lerp(246, 255, t)}, ${lerp(214, 236, t)}, ${lerp(168, 150, t)})`;
  const mid = `rgb(${lerp(196, 240, t)}, ${lerp(150, 182, t)}, ${lerp(104, 40, t)})`;
  const lo = `rgb(${lerp(120, 150, t)}, ${lerp(84, 98, t)}, ${lerp(60, 8, t)})`;
  return { hi, mid, lo };
}

export default function Purity() {
  const [i, setI] = useState(karats.length - 1);
  const current = karats[i];
  // Fineness is parts per thousand, so 999.9 → 99.99 %
  const pct = String(Number(current.fineness) / 10);
  const tone = goldTone(current.k);

  return (
    <section id="purity" className="relative py-28 sm:py-36">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <SectionHeading
          index="03"
          eyebrow="Know your metal"
          title={<>Not all gold is <em className="text-gold">gold.</em></>}
          intro="Slide through the karats to see how purity changes the colour and the value. We tell you exactly where your metal sits — before we make an offer."
        />

        <div className="mt-16 grid items-center gap-10 overflow-hidden rounded-[2.5rem] border hairline bg-gradient-to-br from-ink-800 to-ink-950 p-6 sm:p-12 lg:grid-cols-2">
          {/* The bar */}
          <div className="relative grid min-h-[320px] place-items-center">
            <div className="absolute h-64 w-64 rounded-full blur-[90px] transition-colors duration-700" style={{ background: tone.mid, opacity: 0.35 }} />
            <div className="relative w-full max-w-sm [perspective:900px]">
              <div className="relative transition-transform duration-700 [transform:rotateX(52deg)_rotateZ(-28deg)] [transform-style:preserve-3d]">
                {/* Top face */}
                <div
                  className="relative h-40 rounded-xl transition-[background] duration-700"
                  style={{ background: `linear-gradient(135deg, ${tone.hi} 0%, ${tone.mid} 45%, ${tone.lo} 100%)`, boxShadow: `0 40px 60px -20px ${tone.lo}` }}
                >
                  <div className="absolute inset-3 grid place-items-center rounded-lg border border-black/15 bg-gradient-to-br from-white/25 to-transparent">
                    <div className="text-center text-black/55">
                      <p className="font-display text-5xl leading-none">{current.k}K</p>
                      <p className="mt-1 font-mono text-[11px] tracking-[0.3em]">FINE {current.fineness}</p>
                      <p className="mt-1 font-mono text-[9px] tracking-[0.3em]">INSTANT GOLD</p>
                    </div>
                  </div>
                </div>
                {/* Front edge */}
                <div className="absolute left-0 right-0 top-full h-8 origin-top rounded-b-xl [transform:rotateX(-90deg)]" style={{ background: tone.lo }} />
              </div>
            </div>
          </div>

          {/* Controls */}
          <div>
            <div className="flex items-baseline gap-4">
              <span className="font-display text-8xl leading-none text-bone sm:text-9xl">{pct}</span>
              <span className="font-display text-4xl text-dust">% gold</span>
            </div>
            <p className="mt-4 min-h-[3.5rem] max-w-md text-lg text-dust">{current.note}</p>

            <div className="mt-10">
              <label htmlFor="karat" className="sr-only">Gold karat</label>
              <input
                id="karat"
                type="range"
                min={0}
                max={karats.length - 1}
                step={1}
                value={i}
                onChange={(e) => setI(Number(e.target.value))}
                className="w-full cursor-pointer appearance-none bg-transparent [&::-moz-range-thumb]:h-7 [&::-moz-range-thumb]:w-7 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-gold-200 [&::-moz-range-track]:h-1.5 [&::-moz-range-track]:rounded-full [&::-moz-range-track]:bg-ink-600 [&::-webkit-slider-runnable-track]:h-1.5 [&::-webkit-slider-runnable-track]:rounded-full [&::-webkit-slider-runnable-track]:bg-ink-600 [&::-webkit-slider-thumb]:-mt-[11px] [&::-webkit-slider-thumb]:h-7 [&::-webkit-slider-thumb]:w-7 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-gold-200 [&::-webkit-slider-thumb]:shadow-[0_0_20px_4px_rgba(243,193,74,0.5)]"
                aria-valuetext={`${current.k} karat, ${pct}% gold`}
              />
              <div className="mt-4 flex justify-between">
                {karats.map((kk, idx) => (
                  <button
                    key={kk.k}
                    type="button"
                    onClick={() => setI(idx)}
                    className={`rounded-full px-3 py-1 font-mono text-xs transition ${idx === i ? "bg-gold-300 text-ink-950" : "text-dust hover:text-bone"}`}
                  >
                    {kk.k}K
                  </button>
                ))}
              </div>
            </div>

            <a
              href={whatsappLink(`Hello, I have ${current.k}K gold and would like an assay and a quote.`)}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-10 inline-flex items-center gap-2 border-b border-gold-300/40 pb-1 text-gold-200 transition hover:border-gold-200"
            >
              Get a quote for your {current.k}K gold →
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
