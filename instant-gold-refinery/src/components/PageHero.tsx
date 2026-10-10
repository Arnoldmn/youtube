import Link from "next/link";
import GoldShader from "./fx/GoldShader";

type Props = {
  crumb: string;
  /** Each entry is one headline line; lines slide up in sequence. */
  lines: React.ReactNode[];
  intro?: string;
  actions?: React.ReactNode;
  visual: React.ReactNode;
  /** Big outlined word behind the hero */
  watermark?: string;
  footer?: React.ReactNode;
};

/** Full-height hero used by every inner page: copy on the left, a live visual on the right. */
export default function PageHero({ crumb, lines, intro, actions, visual, watermark, footer }: Props) {
  return (
    <section className="grain relative isolate flex min-h-[100svh] flex-col overflow-hidden pt-28 sm:pt-32">
      <div aria-hidden="true" className="absolute inset-0 -z-10">
        <GoldShader className="absolute inset-0 h-full w-full opacity-70" intensity={0.9} />
        <div className="absolute inset-0 bg-gradient-to-b from-ink-950 via-ink-950/85 to-ink-950/40 lg:bg-gradient-to-r lg:from-ink-950 lg:via-ink-950/85 lg:to-ink-950/20" />
        <div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-ink-950 to-transparent" />
        <div
          className="absolute inset-0 opacity-[0.05]"
          style={{
            backgroundImage: "linear-gradient(to right, #f3c14a 1px, transparent 1px), linear-gradient(to bottom, #f3c14a 1px, transparent 1px)",
            backgroundSize: "72px 72px",
          }}
        />
      </div>

      {watermark && (
        <p aria-hidden="true" className="pointer-events-none absolute -bottom-[0.18em] left-1/2 -z-10 -translate-x-1/2 select-none whitespace-nowrap font-display text-[22vw] leading-none text-transparent [-webkit-text-stroke:1px_rgba(243,193,74,0.12)]">
          {watermark}
        </p>
      )}

      <div className="mx-auto grid w-full max-w-7xl flex-1 items-center gap-12 px-4 pb-16 sm:px-6 lg:grid-cols-12 lg:gap-8">
        <div className="lg:col-span-6">
          <nav aria-label="Breadcrumb" className="reveal flex items-center font-mono text-[11px] uppercase tracking-[0.3em] text-dust">
            <Link href="/" className="transition hover:text-bone">Home</Link>
            <span className="mx-3 h-px w-6 bg-gold-300/40" />
            <span className="text-gold-300">{crumb}</span>
          </nav>
          <h1 className="reveal mt-8 font-display text-[clamp(3.1rem,7.6vw,7rem)] leading-[0.92] tracking-[-0.02em] text-bone">
            {lines.map((line, i) => (
              <span key={i} className="line-mask">
                <span style={{ ["--i" as string]: i }}>{line}</span>
              </span>
            ))}
          </h1>
          {intro && (
            <p className="reveal mt-8 max-w-xl text-lg leading-relaxed text-dust" style={{ ["--delay" as string]: "350ms" }}>
              {intro}
            </p>
          )}
          {actions && (
            <div className="reveal mt-10 flex flex-col gap-3 sm:flex-row" style={{ ["--delay" as string]: "480ms" }}>
              {actions}
            </div>
          )}
          {footer}
        </div>
        <div className="reveal relative lg:col-span-6" style={{ ["--delay" as string]: "250ms" }}>
          {visual}
        </div>
      </div>

      <div aria-hidden="true" className="mx-auto mb-8 hidden w-full max-w-7xl items-center gap-4 px-6 font-mono text-[10px] uppercase tracking-[0.3em] text-dust lg:flex">
        <span className="relative block h-10 w-px overflow-hidden bg-gold-300/15">
          <span className="absolute inset-0 bg-gold-300 [animation:scroll-hint_2.2s_ease-in-out_infinite]" />
        </span>
        Scroll to explore
      </div>
    </section>
  );
}
