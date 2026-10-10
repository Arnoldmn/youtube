import SectionHeading from "./SectionHeading";
import { whatsappLink } from "@/lib/site";
import { ArrowIcon, BarIcon, CoinsIcon, FlameIcon, FlaskIcon, ScaleIcon, ShieldIcon } from "./Icons";

const services = [
  {
    icon: FlameIcon,
    title: "Gold Smelting",
    body: "Alluvial dust, nuggets and sponge gold melted down in induction and gas furnaces into a single, homogeneous doré bar.",
    tag: "Core",
    wide: true,
  },
  {
    icon: FlaskIcon,
    title: "Assaying",
    body: "Fire assay and XRF analysis that tell you exactly how much gold — and what else — is in your material.",
    tag: "Lab",
  },
  {
    icon: BarIcon,
    title: "Refining",
    body: "Chemical refining that strips silver, copper and base metals to deliver high-fineness gold.",
    tag: "999.9",
  },
  {
    icon: CoinsIcon,
    title: "Gold Buying",
    body: "Sell your gold straight after assay. Clear pricing, transparent deductions and prompt settlement.",
    tag: "Fast",
  },
  {
    icon: ScaleIcon,
    title: "Bullion Casting",
    body: "Bars cast to your preferred weight, stamped and documented — ready for trade, export or vault.",
    tag: "Custom",
  },
  {
    icon: ShieldIcon,
    title: "Secure Handling",
    body: "Monitored premises, calibrated scales and documented chain-of-custody from drop-off to collection.",
    tag: "Safe",
    wide: true,
  },
];

export default function Services() {
  return (
    <section id="services" className="relative py-28 sm:py-36">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <SectionHeading
          index="01"
          eyebrow="What we do"
          title={<>Every step from <em className="text-gold">fire</em> to fine.</>}
          intro="One roof, one chain of custody. Bring us raw material and leave with certified gold — or cash."
        />

        <div className="mt-16 grid gap-4 md:grid-cols-3">
          {services.map(({ icon: Icon, title, body, tag, wide }, i) => (
            <article
              key={title}
              className={`spotlight reveal group overflow-hidden rounded-3xl border hairline bg-gradient-to-b from-ink-800/80 to-ink-900 p-8 transition duration-500 hover:-translate-y-1 ${wide ? "md:col-span-2" : ""}`}
              style={{ ["--delay" as string]: `${(i % 3) * 90}ms` }}
            >
              <div className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-gold-400/0 blur-3xl transition duration-700 group-hover:bg-gold-400/15" />
              <div className="flex items-start justify-between">
                <span className="grid h-14 w-14 place-items-center rounded-2xl border hairline bg-ink-950 text-gold-300 transition group-hover:scale-110 group-hover:text-gold-200">
                  <Icon className="h-7 w-7" />
                </span>
                <span className="rounded-full border hairline px-3 py-1 font-mono text-[10px] uppercase tracking-[0.2em] text-dust">{tag}</span>
              </div>
              <h3 className="mt-10 font-display text-4xl text-bone">{title}</h3>
              <p className="mt-3 max-w-md leading-relaxed text-dust">{body}</p>
              <span className="absolute bottom-6 right-8 font-mono text-xs text-dust/50">0{i + 1}</span>
            </article>
          ))}
          <a
            href={whatsappLink("Hello, I'm not sure which service I need. Can you advise?")}
            target="_blank"
            rel="noopener noreferrer"
            className="reveal group flex flex-col justify-between rounded-3xl bg-gradient-to-br from-gold-200 via-gold-300 to-gold-500 p-8 text-ink-950 transition duration-500 hover:-translate-y-1"
            style={{ ["--delay" as string]: "180ms" }}
          >
            <p className="font-mono text-[10px] uppercase tracking-[0.25em]">Not sure?</p>
            <p className="mt-10 font-display text-4xl leading-tight">Tell us what you have. We&rsquo;ll tell you what it needs.</p>
            <span className="mt-6 inline-flex items-center gap-2 font-semibold">
              Ask on WhatsApp <ArrowIcon className="h-4 w-4 transition group-hover:translate-x-1" />
            </span>
          </a>
        </div>
      </div>
    </section>
  );
}
