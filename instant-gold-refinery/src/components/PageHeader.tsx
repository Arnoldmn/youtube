import Link from "next/link";

/** Hero band for inner pages. */
export default function PageHeader({ eyebrow, title, intro, children }: { eyebrow: string; title: React.ReactNode; intro?: string; children?: React.ReactNode }) {
  return (
    <section className="grain relative isolate overflow-hidden pb-20 pt-40 sm:pb-28 sm:pt-48">
      <div aria-hidden="true" className="absolute inset-0 -z-10">
        <div className="absolute -right-32 -top-32 h-[560px] w-[560px] rounded-full bg-ember-500/20 blur-[140px]" />
        <div className="absolute -left-40 top-10 h-[420px] w-[420px] rounded-full bg-gold-500/10 blur-[120px]" />
        <div
          className="absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage: "linear-gradient(to right, #f3c14a 1px, transparent 1px), linear-gradient(to bottom, #f3c14a 1px, transparent 1px)",
            backgroundSize: "72px 72px",
            maskImage: "radial-gradient(ellipse at 50% 30%, black, transparent 70%)",
          }}
        />
      </div>
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <nav aria-label="Breadcrumb" className="reveal font-mono text-[11px] uppercase tracking-[0.3em] text-dust">
          <Link href="/" className="hover:text-bone">Home</Link>
          <span className="mx-3 text-gold-300/50">/</span>
          <span className="text-gold-300">{eyebrow}</span>
        </nav>
        <h1 className="reveal mt-8 max-w-5xl font-display text-[clamp(3rem,8vw,7rem)] leading-[0.92] tracking-[-0.02em] text-bone" style={{ ["--delay" as string]: "100ms" }}>
          {title}
        </h1>
        {intro && (
          <p className="reveal mt-8 max-w-2xl text-lg leading-relaxed text-dust" style={{ ["--delay" as string]: "200ms" }}>
            {intro}
          </p>
        )}
        {children}
      </div>
    </section>
  );
}
