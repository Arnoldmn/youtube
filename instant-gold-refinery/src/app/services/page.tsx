import type { Metadata } from "next";
import PageHeader from "@/components/PageHeader";
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
      <PageHeader
        eyebrow="Services"
        title={<>Every step from <em className="text-gold">fire</em> to fine.</>}
        intro="One roof, one chain of custody. Bring us raw material and leave with certified gold — or cash."
      />
      <Services heading={false} />
      <Purity />
      <CtaBand />
    </>
  );
}
