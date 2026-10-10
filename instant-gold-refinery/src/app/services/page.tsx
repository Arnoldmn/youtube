import type { Metadata } from "next";
import PageHero from "@/components/PageHero";
import GoldBar3D from "@/components/heroes/GoldBar3D";
import { GhostLink, WhatsAppButton } from "@/components/Buttons";
import Services from "@/components/Services";
import Purity from "@/components/Purity";
import CtaBand from "@/components/CtaBand";

export const metadata: Metadata = {
  title: "Services",
  description: "Gold smelting, fire assay and XRF testing, refining to 999.9, bullion casting and gold buying in Kenya.",
};

export default function ServicesPage() {
  return (
    <>
      <PageHero
        crumb="Services"
        watermark="Services"
        lines={["Every step", <>from <em className="text-gold">fire</em></>, "to fine."]}
        intro="Smelting, assaying, refining, casting and buying — under one roof, with one chain of custody. Bring raw material, leave with certified gold or cash."
        actions={
          <>
            <WhatsAppButton message="Hello, I'd like a quote for your services.">Get a quote</WhatsAppButton>
            <GhostLink href="/process/">How it works</GhostLink>
          </>
        }
        visual={<GoldBar3D />}
      />
      <Services heading={false} />
      <Purity />
      <CtaBand />
    </>
  );
}
