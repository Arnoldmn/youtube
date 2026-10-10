import Link from "next/link";
import { ArrowIcon, WhatsAppIcon } from "./Icons";
import { whatsappLink } from "@/lib/site";

export function WhatsAppButton({ message, children }: { message: string; children: React.ReactNode }) {
  return (
    <a
      href={whatsappLink(message)}
      target="_blank"
      rel="noopener noreferrer"
      data-magnetic
      className="group relative inline-flex items-center justify-center gap-3 overflow-hidden rounded-full bg-gradient-to-b from-gold-200 to-gold-400 px-7 py-4 font-semibold text-ink-950 shadow-[0_0_40px_-8px] shadow-gold-400/70 transition-shadow hover:shadow-gold-300"
    >
      <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/50 to-transparent transition duration-700 group-hover:translate-x-full" />
      <WhatsAppIcon className="h-5 w-5" />
      {children}
    </a>
  );
}

export function GhostLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      data-magnetic
      className="group inline-flex items-center justify-center gap-3 rounded-full border hairline bg-ink-950/40 px-7 py-4 font-medium text-bone backdrop-blur transition-colors hover:border-gold-300/50 hover:bg-white/5"
    >
      {children}
      <ArrowIcon className="h-4 w-4 transition group-hover:translate-x-1" />
    </Link>
  );
}
