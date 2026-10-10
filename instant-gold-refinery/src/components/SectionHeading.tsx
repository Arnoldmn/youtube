export default function SectionHeading({ index, eyebrow, title, intro }: { index: string; eyebrow: string; title: React.ReactNode; intro?: string }) {
  return (
    <div className="grid gap-6 lg:grid-cols-12 lg:items-end">
      <div className="lg:col-span-7">
        <p className="reveal flex items-center gap-3 font-mono text-[11px] uppercase tracking-[0.3em] text-gold-300">
          <span className="text-dust">{index}</span>
          <span className="h-px w-10 bg-gold-300/40" />
          {eyebrow}
        </p>
        <h2 className="reveal mt-5 font-display text-[clamp(2.5rem,5.5vw,4.75rem)] leading-[0.98] tracking-[-0.015em] text-bone" style={{ ["--delay" as string]: "100ms" }}>
          {title}
        </h2>
      </div>
      {intro && (
        <p className="reveal text-lg leading-relaxed text-dust lg:col-span-5" style={{ ["--delay" as string]: "200ms" }}>
          {intro}
        </p>
      )}
    </div>
  );
}
