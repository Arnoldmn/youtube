import type { Metadata } from "next";
import PageHero from "@/components/PageHero";
import ChatPhone from "@/components/heroes/ChatPhone";
import { WhatsAppButton } from "@/components/Buttons";
import Contact from "@/components/Contact";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Contact",
  description: `Book smelting, assay or refining with ${site.name} on WhatsApp: ${site.whatsapp.intlDisplay}.`,
};

export default function ContactPage() {
  return (
    <>
      <PageHero
        crumb="Contact"
        watermark="Contact"
        lines={["Talk to", <>the <em className="text-gold">furnace.</em></>]}
        intro="The fastest way to reach us is WhatsApp. Tell us what you have and when you'd like to come — we'll reply with a time."
        actions={
          <>
            <WhatsAppButton message={`Hello ${site.name}!`}>{site.whatsapp.intlDisplay}</WhatsAppButton>
          </>
        }
        footer={
          <a href="#enquiry" className="reveal mt-8 inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.25em] text-dust transition hover:text-gold-200" style={{ ["--delay" as string]: "600ms" }}>
            Or send an enquiry ↓
          </a>
        }
        visual={<ChatPhone />}
      />
      <Contact />
    </>
  );
}
