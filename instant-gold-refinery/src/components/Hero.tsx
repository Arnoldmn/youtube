import SmelterScene from "./SmelterScene";
import Sparks from "./Sparks";
import GoldShader from "./fx/GoldShader";
import { GhostLink, WhatsAppButton } from "./Buttons";
import { site } from "@/lib/site";

const stats = [
  { value: String(site.established), label: "Established" },
  { value: "999.9", label: "Fineness refined" },
  { value: "1,064°C", label: "Gold melts here" },
];

export default function Hero() {
  return (
    <section className="grain relative isolate flex min-h-[100svh] items-center overflow-hidden pt-28 sm:pt-32">
      {/* Background: liquid gold under a dark wash */}
      <div aria-hidden="true" className="absolute inset-0 -z-10">
        <GoldShader className="absolute inset-0 h-full w-full opacity-80" />
        <div className="absolute inset-0 bg-gradient-to-b from-ink-950 via-ink-950/85 to-ink-950/40 lg:bg-gradient-to-r lg:from-ink-950 lg:via-ink-950/80 lg:to-ink-950/10" />
        <div className="absolute inset-x-0 bottom-0 h-56 bg-gradient-to-t from-ink-950 to-transparent" />
        <div
          className="absolute inset-0 opacity-[0.05]"
          style={{
            backgroundImage:
              "linear-gradient(to right, #f3c14a 1px, transparent 1px), linear-gradient(to bottom, #f3c14a 1px, transparent 1px)",
            backgroundSize: "72px 72px",
          }}
        />
      </div>

      <div className="mx-auto grid w-full max-w-7xl items-center gap-10 px-4 pb-16 sm:px-6 lg:grid-cols-12 lg:gap-6 lg:pb-24">
        <div className="lg:col-span-6 xl:col-span-6">
          <p className="reveal inline-flex items-center gap-3 rounded-full border hairline bg-ink-900/60 py-1.5 pl-1.5 pr-4 font-mono text-[10px] uppercase tracking-[0.15em] text-dust backdrop-blur sm:text-[11px] sm:tracking-[0.25em]">
            <span className="whitespace-nowrap rounded-full bg-gold-300 px-2.5 py-1 text-ink-950">Est. {site.established}</span>
            Smelting · Refining · Assay
          </p>

          <h1 className="reveal mt-8 font-display text-[clamp(3.2rem,8.5vw,7.5rem)] leading-[0.92] tracking-[-0.02em] text-bone">
            <span className="line-mask"><span>Raw ore in.</span></span>
            <span className="line-mask">
              <span style={{ ["--i" as string]: 1 }}>
                <em className="text-gold text-gold-animated pr-2">Pure gold</em> out.
              </span>
            </span>
          </h1>

          <p className="reveal mt-8 max-w-xl text-lg leading-relaxed text-dust" style={{ ["--delay" as string]: "240ms" }}>
            {site.name} turns dust, nuggets and scrap into certified bullion. Weighed in front of you,
            assayed with precision and smelted in our own furnaces — with settlement you can trust.
          </p>

          <div className="reveal mt-10 flex flex-col gap-3 sm:flex-row" style={{ ["--delay" as string]: "360ms" }}>
            <WhatsAppButton message="Hello Instant Gold Refinery, I'd like to book a smelting / assay appointment.">Book on WhatsApp</WhatsAppButton>
            <GhostLink href="/process/">See how we refine</GhostLink>
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
          <div data-tilt className="relative mx-auto aspect-square w-full max-w-[680px]">
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
