import { site } from "@/lib/site";

export default function Logo({ className = "" }: { className?: string }) {
  return (
    <a href="#top" className={`group flex items-center gap-3 ${className}`} aria-label={`${site.name} — home`}>
      <span className="relative grid h-10 w-10 place-items-center rounded-xl border hairline bg-ink-900">
        <svg viewBox="0 0 40 40" className="h-6 w-6" aria-hidden="true">
          <defs>
            <linearGradient id="logoG" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#fff3c4" />
              <stop offset=".45" stopColor="#e6a822" />
              <stop offset="1" stopColor="#7a510a" />
            </linearGradient>
          </defs>
          <path d="M5 30 L11 14 H29 L35 30 Z" fill="url(#logoG)" />
          <path d="M11 14 H29 L26 9 H14 Z" fill="#fff3c4" opacity=".75" />
        </svg>
        <span className="absolute inset-0 rounded-xl bg-gold-300/0 blur-md transition group-hover:bg-gold-300/20" />
      </span>
      <span className="leading-none">
        <span className="block font-display text-xl tracking-tight text-bone">{site.shortName}</span>
        <span className="block font-mono text-[10px] uppercase tracking-[0.3em] text-dust">Refinery · {site.established}</span>
      </span>
    </a>
  );
}
