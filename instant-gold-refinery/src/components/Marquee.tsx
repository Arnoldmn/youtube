const items = ["Gold Smelting", "Refining to 999.9", "Fire Assay", "XRF Analysis", "Bullion Casting", "Gold Buying", "Scrap Recovery", "Secure Storage"];

export default function Marquee() {
  const row = [...items, ...items];
  return (
    <div className="relative overflow-hidden border-y hairline bg-ink-900 py-6" aria-hidden="true">
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-24 bg-gradient-to-r from-ink-900 to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-24 bg-gradient-to-l from-ink-900 to-transparent" />
      <div className="flex w-max animate-marquee items-center gap-10">
        {row.map((t, i) => (
          <span key={i} className="flex items-center gap-10 whitespace-nowrap font-display text-3xl italic text-bone/80 sm:text-4xl">
            {t}
            <svg viewBox="0 0 20 20" className="h-4 w-4 text-gold-300"><path d="M10 0 12.5 7.5 20 10 12.5 12.5 10 20 7.5 12.5 0 10 7.5 7.5Z" fill="currentColor" /></svg>
          </span>
        ))}
      </div>
    </div>
  );
}
