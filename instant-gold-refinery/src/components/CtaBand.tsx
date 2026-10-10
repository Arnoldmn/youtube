import Link from "next/link";
import { ArrowIcon, WhatsAppIcon } from "./Icons";
import { site, whatsappLink } from "@/lib/site";

export default function CtaBand() {
  return (
    <section className="px-4 pb-28 sm:px-6 sm:pb-36">
      <div className="reveal relative mx-auto max-w-7xl overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-gold-200 via-gold-300 to-gold-500 px-6 py-16 text-ink-950 sm:px-14 sm:py-20">
        <div aria-hidden="true" className="absolute -right-24 -top-24 h-80 w-80 rounded-full bg-white/30 blur-3xl" />
        <div aria-hidden="true" className="absolute -bottom-32 left-1/3 h-80 w-80 rounded-full bg-ember-500/30 blur-3xl" />
        <div className="relative grid items-end gap-10 lg:grid-cols-12">
          <div className="lg:col-span-8">
            <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-ink-950/60">Ready when you are</p>
            <h2 className="mt-4 font-display text-[clamp(2.5rem,6vw,5rem)] leading-[0.95]">
              Bring us your gold. <em>We&rsquo;ll bring the fire.</em>
            </h2>
          </div>
          <div className="flex flex-col gap-3 lg:col-span-4">
            <a
              href={whatsappLink(`Hello ${site.name}, I'd like to book an appointment.`)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-3 rounded-full bg-ink-950 px-7 py-4 font-semibold text-gold-200 transition hover:bg-ink-800"
            >
              <WhatsAppIcon className="h-5 w-5" /> {site.whatsapp.intlDisplay}
            </a>
            <Link href="/contact/" className="group inline-flex items-center justify-center gap-2 rounded-full border border-ink-950/25 px-7 py-4 font-medium transition hover:bg-ink-950/10">
              Send an enquiry <ArrowIcon className="h-4 w-4 transition group-hover:translate-x-1" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
