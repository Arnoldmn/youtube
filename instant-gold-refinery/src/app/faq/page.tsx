import type { Metadata } from "next";
import PageHeader from "@/components/PageHeader";
import Faq from "@/components/Faq";
import CtaBand from "@/components/CtaBand";

export const metadata: Metadata = {
  title: "FAQ",
  description: "Answers to common questions about smelting, assaying, refining and selling gold at Instant Gold Refinery.",
};

export default function FaqPage() {
  return (
    <>
      <PageHeader eyebrow="FAQ" title={<>Asked &amp; <em className="text-gold">answered.</em></>} intro="Can't find your question? Ask us directly on WhatsApp — we reply fast." />
      <Faq heading={false} />
      <CtaBand />
    </>
  );
}
