import { board } from "@/lib/about";

export default function Board() {
  return (
    <section id="board" className="relative py-28 sm:py-36">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="grid gap-6 lg:grid-cols-12 lg:items-end">
          <div className="lg:col-span-7">
            <p className="reveal flex items-center gap-3 font-mono text-[11px] uppercase tracking-[0.3em] text-gold-300">
              <span className="h-px w-10 bg-gold-300/40" /> Board of directors
            </p>
            <h2 className="reveal mt-5 font-display text-[clamp(2.5rem,5.5vw,4.75rem)] leading-[0.98] text-bone" style={{ ["--delay" as string]: "100ms" }}>
              The people behind <em className="text-gold">the pour.</em>
            </h2>
          </div>
          <p className="reveal text-lg leading-relaxed text-dust lg:col-span-5" style={{ ["--delay" as string]: "200ms" }}>
            Four leaders, one standard: every gram handled in the open, measured with precision and settled fairly.
          </p>
        </div>

        <ul className="mt-16 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {board.map((m, i) => (
            <li key={m.slug} className="reveal" style={{ ["--delay" as string]: `${i * 100}ms` }}>
              <article className="group relative h-full overflow-hidden rounded-[2rem] border hairline bg-ink-900">
                <div className={`relative aspect-[5/4] overflow-hidden sm:aspect-[4/5] bg-gradient-to-b ${m.tone}`}>
                  <div aria-hidden="true" className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/25 to-transparent" />
                  <div aria-hidden="true" className="absolute left-1/2 top-[12%] h-[70%] w-[70%] -translate-x-1/2 rounded-full border border-white/30" />
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={m.image}
                    alt={`Portrait of ${m.name}, ${m.role}`}
                    loading="lazy"
                    className="absolute inset-x-0 bottom-0 mx-auto w-[64%] transition sm:w-[92%] duration-700 group-hover:scale-105"
                  />
                  {i === 0 && (
                    <span className="absolute left-4 top-4 rounded-full bg-ink-950/80 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.2em] text-gold-200 backdrop-blur">
                      CEO
                    </span>
                  )}
                  {/* Bio slides up on hover (always shown on touch screens below) */}
                  <div className="absolute inset-0 hidden translate-y-full flex-col justify-end bg-gradient-to-t from-ink-950 via-ink-950/95 to-ink-950/40 p-6 transition duration-500 group-hover:translate-y-0 lg:flex">
                    <p className="text-sm leading-relaxed text-bone/90">{m.bio}</p>
                  </div>
                </div>
                <div className="p-6">
                  <h3 className="font-display text-3xl text-bone">{m.name}</h3>
                  <p className="mt-1 text-sm text-gold-200">{m.role}</p>
                  <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.25em] text-dust">{m.from}</p>
                  <p className="mt-4 text-sm leading-relaxed text-dust lg:hidden">{m.bio}</p>
                </div>
              </article>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
