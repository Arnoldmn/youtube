import SmelterScene from "./SmelterScene";
import Sparks from "./Sparks";
import { ArrowIcon, WhatsAppIcon } from "./Icons";
import { site, whatsappLink } from "@/lib/site";

const stats = [
  { value: String(site.established), label: "Established" },
  { value: "999.9", label: "Fineness refined" },
  { value: "1,064°C", label: "Gold melts here" },
];

export default function Hero() {
  return (
    <section id="top" className="grain relative isolate overflow-hidden pt-28 sm:pt-32">
      {/* Background light */}
      <div aria-hidden="true" className="absolute inset-0 -z-10">
        <div className="absolute -right-40 top-1/4 h-[720px] w-[720px] rounded-full bg-ember-500/25 blur-[140px]" />
        <div className="absolute -left-40 -top-40 h-[520px] w-[520px] rounded-full bg-gold-500/10 blur-[120px]" />
        <div
          className="absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              "linear-gradient(to right, #f3c14a 1px, transparent 1px), linear-gradient(to bottom, #f3c14a 1px, transparent 1px)",
            backgroundSize: "72px 72px",
            maskImage: "radial-gradient(ellipse at 30% 40%, black, transparent 70%)",
          }}
        />
      </div>

      <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 pb-16 sm:px-6 lg:grid-cols-12 lg:gap-6 lg:pb-24">
        <div className="lg:col-span-6 xl:col-span-6">
          <p className="reveal inline-flex items-center gap-3 rounded-full border hairline bg-ink-900/60 py-1.5 pl-1.5 pr-4 font-mono text-[10px] uppercase tracking-[0.15em] text-dust backdrop-blur sm:text-[11px] sm:tracking-[0.25em]">
            <span className="whitespace-nowrap rounded-full bg-gold-300 px-2.5 py-1 text-ink-950">Est. {site.established}</span>
            Smelting · Refining · Assay
          </p>

          <h1 className="reveal mt-8 font-display text-[clamp(3.2rem,8.5vw,7.5rem)] leading-[0.92] tracking-[-0.02em] text-bone" style={{ ["--delay" as string]: "120ms" }}>
            Raw ore in.
            <br />
            <em className="text-gold text-gold-animated pr-2">Pure gold</em> out.
          </h1>

          <p className="reveal mt-8 max-w-xl text-lg leading-relaxed text-dust" style={{ ["--delay" as string]: "240ms" }}>
            {site.name} turns dust, nuggets and scrap into certified bullion. Weighed in front of you,
            assayed with precision and smelted in our own furnaces — with settlement you can trust.
          </p>

          <div className="reveal mt-10 flex flex-col gap-3 sm:flex-row" style={{ ["--delay" as string]: "360ms" }}>
            <a
              href={whatsappLink("Hello Instant Gold Refinery, I'd like to book a smelting / assay appointment.")}
              target="_blank"
              rel="noopener noreferrer"
              className="group relative inline-flex items-center justify-center gap-3 overflow-hidden rounded-full bg-gradient-to-b from-gold-200 to-gold-400 px-7 py-4 font-semibold text-ink-950 shadow-[0_0_40px_-8px] shadow-gold-400/70 transition hover:shadow-gold-300"
            >
              <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/50 to-transparent transition duration-700 group-hover:translate-x-full" />
              <WhatsAppIcon className="h-5 w-5" />
              Book on WhatsApp
            </a>
            <a href="#process" className="group inline-flex items-center justify-center gap-3 rounded-full border hairline px-7 py-4 font-medium text-bone transition hover:border-gold-300/50 hover:bg-white/5">
              See how we refine
              <ArrowIcon className="h-4 w-4 transition group-hover:translate-x-1" />
            </a>
          </div>

          <dl className="reveal mt-14 grid max-w-lg grid-cols-3 divide-x divide-gold-300/15 border-y hairline" style={{ ["--delay" as string]: "480ms" }}>
            {stats.map((s) => (
              <div key={s.label} className="px-4 py-5 first:pl-0">
                <dt className="font-mono text-[10px] uppercase tracking-[0.2em] text-dust">{s.label}</dt>
                <dd className="mt-2 font-display text-3xl text-bone sm:text-4xl">{s.value}</dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="relative lg:col-span-6 xl:col-span-6">
          <div className="relative mx-auto aspect-square w-full max-w-[680px]">
            <div className="absolute inset-0 overflow-hidden rounded-[2.5rem] border hairline bg-gradient-to-b from-ink-800 to-ink-950 shadow-[0_40px_120px_-30px] shadow-ember-600/40">
              <SmelterScene className="absolute inset-0 h-full w-full" />
              <Sparks className="absolute inset-0 h-full w-full" />
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-ink-950/70 via-transparent to-transparent" />
            </div>

            {/* Periodic tile */}
            <div className="absolute left-3 top-6 w-24 rounded-2xl border hairline bg-ink-950/70 p-3 backdrop-blur-md sm:-left-6 sm:top-8 sm:w-32 sm:p-4">
              <div className="flex justify-between font-mono text-[10px] text-dust">
                <span>79</span>
                <span>196.967</span>
              </div>
              <div className="mt-1 font-display text-4xl leading-none text-gold sm:text-6xl">Au</div>
              <div className="mt-1 font-mono text-[10px] uppercase tracking-[0.2em] text-dust">Aurum</div>
            </div>

            {/* Live status chip */}
            <div className="absolute bottom-6 right-3 sm:-right-4 sm:bottom-10 flex items-center gap-3 rounded-full border hairline bg-ink-950/70 py-2 pl-2 pr-4 backdrop-blur-md">
              <span className="relative flex h-3 w-3">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-ember-400 opacity-75" />
                <span className="relative inline-flex h-3 w-3 rounded-full bg-ember-500" />
              </span>
              <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-bone">Furnace is hot</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
