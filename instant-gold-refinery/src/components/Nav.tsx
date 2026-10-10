"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import Logo from "./Logo";
import { WhatsAppIcon } from "./Icons";
import { site, whatsappLink } from "@/lib/site";

const links = site.nav;
const normalize = (p: string) => (p.endsWith("/") ? p : `${p}/`);

export default function Nav() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const pathname = normalize(usePathname() ?? "/");

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className="fixed inset-x-0 top-0 z-50 px-4 pt-4 sm:px-6">
      <nav
        className={`mx-auto flex max-w-7xl items-center justify-between rounded-2xl border px-4 py-3 transition-all duration-500 sm:px-5 ${
          scrolled || open ? "hairline bg-ink-950/75 shadow-2xl shadow-black/40 backdrop-blur-xl" : "border-transparent"
        }`}
      >
        <Logo />
        <ul className="hidden items-center gap-1 lg:flex">
          {links.map((l) => (
            <li key={l.href}>
              <Link
                href={l.href}
                aria-current={pathname === l.href ? "page" : undefined}
                className={`relative rounded-full px-4 py-2 text-sm transition hover:bg-white/5 hover:text-bone ${pathname === l.href ? "text-gold-200" : "text-dust"}`}
              >
                {l.label}
                {pathname === l.href && <span className="absolute inset-x-4 -bottom-0.5 h-px bg-gradient-to-r from-transparent via-gold-300 to-transparent" />}
              </Link>
            </li>
          ))}
        </ul>
        <div className="flex items-center gap-2">
          <a
            href={whatsappLink("Hello Instant Gold Refinery, I'd like to enquire about your services.")}
            target="_blank"
            rel="noopener noreferrer"
            className="hidden items-center gap-2 rounded-full bg-gold-300 px-4 py-2 text-sm font-semibold text-ink-950 transition hover:bg-gold-200 sm:inline-flex"
          >
            <WhatsAppIcon className="h-4 w-4" /> WhatsApp us
          </a>
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            className="grid h-10 w-10 place-items-center rounded-full border hairline lg:hidden"
            aria-expanded={open}
            aria-controls="mobile-menu"
            aria-label={open ? "Close menu" : "Open menu"}
          >
            <span className="relative block h-3 w-5">
              <span className={`absolute left-0 h-px w-5 bg-bone transition ${open ? "top-1.5 rotate-45" : "top-0"}`} />
              <span className={`absolute left-0 h-px w-5 bg-bone transition ${open ? "top-1.5 -rotate-45" : "top-3"}`} />
            </span>
          </button>
        </div>
      </nav>

      <div
        id="mobile-menu"
        className={`mx-auto mt-2 max-w-7xl overflow-hidden rounded-2xl border hairline bg-ink-950/90 backdrop-blur-xl transition-all duration-500 lg:hidden ${
          open ? "max-h-[520px] opacity-100" : "pointer-events-none max-h-0 opacity-0"
        }`}
      >
        <ul className="p-3">
          {links.map((l) => (
            <li key={l.href}>
              <Link
                href={l.href}
                onClick={() => setOpen(false)}
                aria-current={pathname === l.href ? "page" : undefined}
                className={`flex items-center justify-between rounded-xl px-4 py-3 font-display text-2xl hover:bg-white/5 ${pathname === l.href ? "text-gold-200" : "text-bone"}`}
              >
                {l.label}
                <span className="font-mono text-xs text-dust">→</span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </header>
  );
}
