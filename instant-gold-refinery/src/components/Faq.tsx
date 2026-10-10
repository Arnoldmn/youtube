import SectionHeading from "./SectionHeading";
import { PlusIcon } from "./Icons";

const faqs = [
  { q: "What kinds of gold do you accept?", a: "Alluvial dust, nuggets, sponge gold, doré bars, old jewellery and gold scrap. If it contains gold, bring it in and we will assay it." },
  { q: "Can I watch my gold being smelted?", a: "Yes. Weighing, sampling and smelting are done in front of the client. You see every number as it is recorded." },
  { q: "How long does smelting and assay take?", a: "Most jobs are completed the same day. Larger batches or full refining may take longer — we will give you a time when you book." },
  { q: "Do you buy gold as well?", a: "Yes. After assay you can choose to collect your bar or sell to us. Our offer is based on the measured weight and purity." },
  { q: "How do I book?", a: "Send us a WhatsApp message with what you have and roughly how much. We will reply with availability and what to bring." },
  { q: "What documents should I bring?", a: "Bring a valid ID. Depending on the material and quantity, additional paperwork may be required — ask us on WhatsApp before you come." },
];

export default function Faq() {
  return (
    <section id="faq" className="relative py-28 sm:py-36">
      <div className="mx-auto grid max-w-7xl gap-16 px-4 sm:px-6 lg:grid-cols-12">
        <div className="lg:col-span-5">
          <SectionHeading index="05" eyebrow="Questions" title={<>Asked &amp; <em className="text-gold">answered.</em></>} />
        </div>
        <div className="lg:col-span-7">
          <div className="divide-y divide-gold-300/15 border-y hairline">
            {faqs.map((f, i) => (
              <details key={f.q} className="reveal group py-2" style={{ ["--delay" as string]: `${i * 60}ms` }}>
                <summary className="flex cursor-pointer list-none items-center justify-between gap-6 py-5 text-left [&::-webkit-details-marker]:hidden">
                  <span className="font-display text-2xl text-bone transition group-hover:text-gold-200 sm:text-3xl">{f.q}</span>
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full border hairline text-gold-300 transition duration-300 group-open:rotate-45 group-open:bg-gold-300 group-open:text-ink-950">
                    <PlusIcon className="h-5 w-5" />
                  </span>
                </summary>
                <p className="max-w-2xl pb-6 leading-relaxed text-dust">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
