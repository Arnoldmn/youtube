import type { Metadata } from "next";
import PageHero from "@/components/PageHero";
import ProcessRing from "@/components/heroes/ProcessRing";
import { GhostLink, WhatsAppButton } from "@/components/Buttons";
import Process from "@/components/Process";
import CtaBand from "@/components/CtaBand";

export const metadata: Metadata = {
  title: "Our Process",
  description: "How we weigh, assay, smelt, refine, cast and certify your gold — all in front of you.",
};

export default function ProcessPage() {
  return (
    <>
      <PageHero
        crumb="Process"
        watermark="Process"
        lines={["Six steps.", <><em className="text-gold">Zero</em></>, "guesswork."]}
        intro="Transparency is the whole business. You see the scale, you see the assay, you see the pour — and you leave with the paperwork to prove it."
        actions={
          <>
            <WhatsAppButton message="Hello, I'd like to book a smelting appointment.">Book a smelt</WhatsAppButton>
            <GhostLink href="/faq/">Common questions</GhostLink>
          </>
        }
        visual={<ProcessRing />}
      />
      <Process heading={false} />
      <div className="h-28 sm:h-36" />
      <CtaBand />
    </>
  );
}
