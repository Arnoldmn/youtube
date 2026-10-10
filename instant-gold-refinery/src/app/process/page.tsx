import type { Metadata } from "next";
import PageHeader from "@/components/PageHeader";
import Process from "@/components/Process";
import CtaBand from "@/components/CtaBand";

export const metadata: Metadata = {
  title: "Our Process",
  description: "How we weigh, assay, smelt, refine, cast and certify your gold — all in front of you.",
};

export default function ProcessPage() {
  return (
    <>
      <PageHeader
        eyebrow="Process"
        title={<>Six steps. <em className="text-gold">Zero</em> guesswork.</>}
        intro="Transparency is the whole business. You see the scale, you see the assay, you see the pour."
      />
      <Process heading={false} />
      <div className="h-28 sm:h-36" />
      <CtaBand />
    </>
  );
}
