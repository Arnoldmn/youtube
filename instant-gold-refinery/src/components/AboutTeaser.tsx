import Link from "next/link";
import { ArrowIcon } from "./Icons";
import { board } from "@/lib/about";
import { site } from "@/lib/site";

export default function AboutTeaser() {
  return (
    <section className="relative overflow-hidden border-y hairline bg-ink-900 py-28 sm:py-36">
      <div className="mx-auto grid max-w-7xl items-center gap-14 px-4 sm:px-6 lg:grid-cols-12">
        <div className="reveal lg:col-span-5">
          <p aria-hidden="true" className="select-none font-display text-[clamp(7rem,18vw,14rem)] leading-[0.8] tracking-tighter text-gold">
            {site.established}
          </p>
          <p className="mt-6 font-mono text-xs uppercase tracking-[0.3em] text-dust">Proudly Kenyan · The year we lit the first furnace</p>
        </div>
        <div className="lg:col-span-7">
          <p className="reveal font-mono text-[11px] uppercase tracking-[0.3em] text-gold-300">Who we are</p>
          <h2 className="reveal mt-5 font-display text-[clamp(2.5rem,5vw,4.5rem)] leading-[0.98] text-bone" style={{ ["--delay" as string]: "100ms" }}>
            Built on trust, <em className="text-gold">tested</em> by fire.
          </h2>
          <p className="reveal mt-6 max-w-xl text-lg leading-relaxed text-dust" style={{ ["--delay" as string]: "200ms" }}>
            Since {site.established}, {site.name} has smelted, assayed and refined for miners, dealers and jewellers across Kenya —
            fast, transparent and precise.
          </p>
          <div className="reveal mt-10 flex flex-wrap items-center gap-6" style={{ ["--delay" as string]: "300ms" }}>
            <div className="flex -space-x-3">
              {board.map((m) => (
                <span key={m.slug} className={`h-14 w-14 overflow-hidden rounded-full border-2 border-ink-900 bg-gradient-to-b ${m.tone}`}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={m.image} alt={m.name} className="mt-1 h-full w-full object-cover" />
                </span>
              ))}
            </div>
            <Link href="/about/" className="group inline-flex items-center gap-2 border-b border-gold-300/40 pb-1 text-gold-200 transition hover:border-gold-200">
              Meet our story &amp; board <ArrowIcon className="h-4 w-4 transition group-hover:translate-x-1" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
