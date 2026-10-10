"use client";

import { useState, type FormEvent } from "react";
import { ClockIcon, PhoneIcon, WhatsAppIcon } from "./Icons";
import { site, whatsappLink } from "@/lib/site";

const services = ["Smelting", "Assay / testing", "Refining", "Sell my gold", "Bullion casting", "Other"];

/** No server needed: the form composes a WhatsApp message and opens the chat. */
export default function Contact() {
  const [service, setService] = useState(services[0]);

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const lines = [
      `Hello ${site.name},`,
      `Name: ${data.get("name")}`,
      `Service: ${service}`,
      data.get("weight") ? `Approx. quantity: ${data.get("weight")}` : "",
      data.get("message") ? `Details: ${data.get("message")}` : "",
    ].filter(Boolean);
    window.open(whatsappLink(lines.join("\n")), "_blank", "noopener,noreferrer");
  };

  const field = "w-full rounded-xl border hairline bg-ink-950/70 px-4 py-3.5 text-bone placeholder:text-dust/50 outline-none transition focus:border-gold-300/60 focus:ring-4 focus:ring-gold-300/10";

  return (
    <section id="contact" className="grain relative isolate overflow-hidden pb-28 pt-36 sm:pb-36 sm:pt-44">
      <div aria-hidden="true" className="absolute inset-x-0 bottom-0 -z-10 h-[70%] bg-gradient-to-t from-ember-600/20 via-gold-500/5 to-transparent" />
      <div aria-hidden="true" className="absolute bottom-[-30%] left-1/2 -z-10 h-[600px] w-[1100px] -translate-x-1/2 rounded-full bg-gold-400/20 blur-[160px]" />

      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="text-center">
          <p className="reveal font-mono text-[11px] uppercase tracking-[0.3em] text-gold-300">Get in touch</p>
          <h2 className="reveal mx-auto mt-6 max-w-4xl font-display text-[clamp(2.8rem,7vw,6.5rem)] leading-[0.95] text-bone" style={{ ["--delay" as string]: "100ms" }}>
            Bring us your gold.
            <br />
            <em className="text-gold text-gold-animated">We&rsquo;ll bring the fire.</em>
          </h2>
        </div>

        <div className="mt-16 grid gap-6 lg:grid-cols-5">
          {/* Direct contact */}
          <div className="reveal flex flex-col gap-4 lg:col-span-2">
            <a
              href={whatsappLink(`Hello ${site.name}!`)}
              target="_blank"
              rel="noopener noreferrer"
              className="spotlight group flex flex-1 flex-col justify-between rounded-3xl border hairline bg-gradient-to-br from-[#0f2a1c] to-ink-900 p-8 transition hover:-translate-y-1"
            >
              <div className="flex items-center justify-between">
                <span className="grid h-14 w-14 place-items-center rounded-2xl bg-[#25D366] text-white shadow-[0_0_40px_-6px_#25D366]">
                  <WhatsAppIcon className="h-7 w-7" />
                </span>
                <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-dust">Fastest reply</span>
              </div>
              <div className="mt-10">
                <p className="font-mono text-xs uppercase tracking-[0.25em] text-dust">WhatsApp</p>
                <p className="mt-2 font-display text-5xl text-bone transition group-hover:text-[#5cf08f] sm:text-6xl">{site.whatsapp.display}</p>
                <p className="mt-3 text-sm text-dust">Tap to start a chat →</p>
              </div>
            </a>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
              <a href={`tel:+${site.whatsapp.international}`} className="flex items-center gap-4 rounded-2xl border hairline bg-ink-900/70 p-5 transition hover:border-gold-300/40">
                <PhoneIcon className="h-6 w-6 text-gold-300" />
                <span>
                  <span className="block font-mono text-[10px] uppercase tracking-[0.25em] text-dust">Call</span>
                  <span className="text-bone">{site.whatsapp.intlDisplay}</span>
                </span>
              </a>
              <div className="flex items-start gap-4 rounded-2xl border hairline bg-ink-900/70 p-5">
                <ClockIcon className="mt-1 h-6 w-6 text-gold-300" />
                <dl className="w-full space-y-1 text-sm">
                  {site.hours.map((h) => (
                    <div key={h.days} className="flex justify-between gap-4">
                      <dt className="text-dust">{h.days}</dt>
                      <dd className="text-bone">{h.time}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            </div>
          </div>

          {/* Enquiry form */}
          <form onSubmit={onSubmit} className="reveal rounded-3xl border hairline bg-ink-900/70 p-6 backdrop-blur sm:p-10 lg:col-span-3" style={{ ["--delay" as string]: "150ms" }}>
            <h3 className="font-display text-3xl text-bone">Send an enquiry</h3>
            <p className="mt-2 text-sm text-dust">Fill this in and we&rsquo;ll open WhatsApp with your message ready to send.</p>

            <fieldset className="mt-8">
              <legend className="mb-3 font-mono text-[10px] uppercase tracking-[0.25em] text-dust">I need</legend>
              <div className="flex flex-wrap gap-2">
                {services.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setService(s)}
                    aria-pressed={service === s}
                    className={`rounded-full border px-4 py-2 text-sm transition ${service === s ? "border-gold-300 bg-gold-300 text-ink-950" : "hairline text-dust hover:text-bone"}`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </fieldset>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="mb-2 block font-mono text-[10px] uppercase tracking-[0.25em] text-dust">Your name</span>
                <input name="name" required autoComplete="name" placeholder="Full name" className={field} />
              </label>
              <label className="block">
                <span className="mb-2 block font-mono text-[10px] uppercase tracking-[0.25em] text-dust">Approx. quantity</span>
                <input name="weight" placeholder="e.g. 250 g" className={field} />
              </label>
            </div>
            <label className="mt-4 block">
              <span className="mb-2 block font-mono text-[10px] uppercase tracking-[0.25em] text-dust">Details</span>
              <textarea name="message" rows={4} placeholder="Type of material, preferred date, questions…" className={`${field} resize-none`} />
            </label>

            <button
              type="submit"
              className="group mt-8 inline-flex w-full items-center justify-center gap-3 rounded-full bg-gradient-to-b from-gold-200 to-gold-400 px-7 py-4 font-semibold text-ink-950 shadow-[0_0_40px_-8px] shadow-gold-400/70 transition hover:shadow-gold-300"
            >
              <WhatsAppIcon className="h-5 w-5" />
              Send via WhatsApp
            </button>
          </form>
        </div>
      </div>
    </section>
  );
}
