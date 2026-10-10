import type { Metadata } from "next";
import PageHero from "@/components/PageHero";
import AuTile from "@/components/heroes/AuTile";
import { GhostLink, WhatsAppButton } from "@/components/Buttons";
import Faq from "@/components/Faq";
import CtaBand from "@/components/CtaBand";

export const metadata: Metadata = {
  title: "FAQ",
  description: "Answers to common questions about smelting, assaying, refining and selling gold at Instant Gold Refinery.",
};

export default function FaqPage() {
  return (
    <>
      <PageHero
        crumb="FAQ"
        watermark="Answers"
        lines={["Asked &", <><em className="text-gold">answered.</em></>]}
        intro="Everything you want to know before you bring your gold in. Can't find your question? Ask us on WhatsApp — we reply fast."
        actions={
          <>
            <WhatsAppButton message="Hello, I have a question about your services.">Ask a question</WhatsAppButton>
            <GhostLink href="/process/">See the process</GhostLink>
          </>
        }
        visual={<AuTile />}
      />
      <div className="pt-8" />
      <Faq heading={false} />
      <CtaBand />
    </>
  );
}
