import { board, ceoQuote } from "@/lib/about";

export default function CeoMessage() {
  const ceo = board[0];
  return (
    <section className="relative overflow-hidden py-28 sm:py-36">
      <div aria-hidden="true" className="absolute left-0 top-1/2 h-[500px] w-[500px] -translate-y-1/2 rounded-full bg-gold-500/10 blur-[140px]" />
      <div className="relative mx-auto grid max-w-7xl items-center gap-14 px-4 sm:px-6 lg:grid-cols-12">
        <div className="reveal lg:col-span-5">
          <div className={`relative mx-auto aspect-square max-w-md overflow-hidden rounded-t-full rounded-b-[2.5rem] bg-gradient-to-b ${ceo.tone}`}>
            <div aria-hidden="true" className="absolute inset-6 rounded-t-full border border-white/30" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={ceo.image} alt={`Portrait of ${ceo.name}`} className="absolute inset-x-0 bottom-0 mx-auto w-[88%]" />
          </div>
        </div>
        <div className="lg:col-span-7">
          <p className="reveal font-mono text-[11px] uppercase tracking-[0.3em] text-gold-300">A word from our CEO</p>
          <blockquote className="reveal mt-8" style={{ ["--delay" as string]: "100ms" }}>
            <svg aria-hidden="true" viewBox="0 0 48 36" className="h-10 w-14 text-gold-300">
              <path fill="currentColor" d="M0 36V22C0 9.5 6.7 2.2 18 0l2 5c-6.3 2-9.6 6-10 12h9v19H0Zm28 0V22C28 9.5 34.7 2.2 46 0l2 5c-6.3 2-9.6 6-10 12h9v19H28Z" />
            </svg>
            <p className="mt-6 font-display text-[clamp(1.9rem,3.6vw,3.25rem)] leading-[1.12] text-bone">{ceoQuote}</p>
          </blockquote>
          <div className="reveal mt-10 flex items-center gap-5" style={{ ["--delay" as string]: "200ms" }}>
            <span className="h-px w-14 bg-gold-300/50" />
            <div>
              <p className="font-display text-3xl italic text-gold">{ceo.name}</p>
              <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.25em] text-dust">
                {ceo.role} · {ceo.from}
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
