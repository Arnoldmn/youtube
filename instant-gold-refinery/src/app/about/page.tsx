import type { Metadata } from "next";
import PageHeader from "@/components/PageHeader";
import About from "@/components/About";
import Timeline from "@/components/Timeline";
import CeoMessage from "@/components/CeoMessage";
import Board from "@/components/Board";
import CtaBand from "@/components/CtaBand";
import { aboutStats } from "@/lib/about";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "About Us",
  description: `The story, journey and board of ${site.name} — a Kenyan gold refinery established in ${site.established}.`,
};

export default function AboutPage() {
  return (
    <>
      <PageHeader
        eyebrow="About"
        title={<>We turn trust <br className="hidden sm:block" />into <em className="text-gold text-gold-animated">gold.</em></>}
        intro={`A Kenyan refinery, established ${site.established}. We smelt, assay, refine and cast — openly, precisely and fast.`}
      >
        <dl className="reveal mt-16 grid grid-cols-2 border-y hairline lg:grid-cols-4" style={{ ["--delay" as string]: "300ms" }}>
          {aboutStats.map((s, i) => (
            <div key={s.label} className={`px-1 py-8 sm:px-6 ${i % 2 ? "border-l hairline" : ""} ${i > 1 ? "border-t hairline lg:border-t-0" : ""} ${i === 2 ? "lg:border-l" : ""} first:sm:pl-0`}>
              <dt className="font-mono text-[10px] uppercase tracking-[0.25em] text-dust">{s.label}</dt>
              <dd className="mt-3 font-display text-4xl text-bone sm:text-5xl">{s.value}</dd>
            </div>
          ))}
        </dl>
      </PageHeader>
      <About />
      <Timeline />
      <CeoMessage />
      <Board />
      <CtaBand />
    </>
  );
}
