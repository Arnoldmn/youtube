import SectionHeading from "./SectionHeading";
import { ClockIcon, EyeIcon, ScaleIcon } from "./Icons";
import { site } from "@/lib/site";

const values = [
  { icon: EyeIcon, title: "In front of you", body: "Weighing, sampling and pouring happen where you can see them. No back rooms." },
  { icon: ScaleIcon, title: "Measured, not guessed", body: "Calibrated scales and proper assay methods behind every figure we quote." },
  { icon: ClockIcon, title: "Instant by name", body: "Most smelting and assay jobs are turned around the same day you walk in." },
];

export default function About() {
  return (
    <section id="story" className="relative overflow-hidden border-y hairline bg-ink-900 py-28 sm:py-36">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="grid gap-16 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <div className="reveal relative">
              <p aria-hidden="true" className="select-none font-display text-[clamp(8rem,22vw,17rem)] leading-[0.8] tracking-tighter text-gold opacity-90">
                {String(site.established).slice(0, 2)}
                <br />
                {String(site.established).slice(2)}
              </p>
              <p className="mt-6 font-mono text-xs uppercase tracking-[0.3em] text-dust">Proudly Kenyan · The year we lit the first furnace</p>
            </div>
          </div>

          <div className="lg:col-span-7">
            <SectionHeading
              eyebrow="Our story"
              title={<>Built on trust, <em className="text-gold">tested</em> by fire.</>}
            />
            <div className="reveal mt-8 space-y-5 text-lg leading-relaxed text-dust" style={{ ["--delay" as string]: "150ms" }}>
              <p>
                {site.name} opened its doors in {site.address.town}, {site.country} in {site.established} with one simple idea: miners,
                dealers and jewellers deserve a refinery that is fast, honest and precise — without the waiting, without the
                mystery.
              </p>
              <p>
                Today we smelt, assay, refine and cast for small-scale miners and established traders alike. Whether you
                bring a few grams of dust or a kilogram of doré, you get the same process, the same care and the same
                straight answers.
              </p>
            </div>

            <div className="mt-12 grid gap-4 sm:grid-cols-3">
              {values.map(({ icon: Icon, title, body }, i) => (
                <div key={title} className="spotlight reveal rounded-2xl border hairline bg-ink-950/60 p-6" style={{ ["--delay" as string]: `${200 + i * 100}ms` }}>
                  <Icon className="h-6 w-6 text-gold-300" />
                  <h3 className="mt-5 font-display text-2xl text-bone">{title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-dust">{body}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
