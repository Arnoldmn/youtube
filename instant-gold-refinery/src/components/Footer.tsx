import Link from "next/link";
import Logo from "./Logo";
import { site, whatsappLink } from "@/lib/site";

export default function Footer() {
  return (
    <footer className="relative overflow-hidden border-t hairline bg-ink-950">
      <div className="mx-auto flex max-w-7xl flex-col gap-10 px-4 py-14 sm:px-6 md:flex-row md:items-end md:justify-between">
        <div>
          <Logo />
          <p className="mt-5 max-w-sm text-sm leading-relaxed text-dust">{site.description}</p>
        </div>
        <nav aria-label="Footer" className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
          {site.nav.map((l) => (
            <Link key={l.href} href={l.href} className="text-dust transition hover:text-gold-200">
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="flex flex-col gap-2 text-sm md:items-end">
          <a href={whatsappLink()} target="_blank" rel="noopener noreferrer" className="text-bone hover:text-gold-200">
            WhatsApp · {site.whatsapp.intlDisplay}
          </a>
          <p className="text-dust">
            © {new Date().getFullYear()} {site.name}. Established {site.established} · {site.country}.
          </p>
        </div>
      </div>
      <p aria-hidden="true" className="pointer-events-none select-none whitespace-nowrap px-4 text-center font-display text-[18vw] leading-[0.75] text-gold opacity-[0.12]">
        Instant Gold
      </p>
    </footer>
  );
}
