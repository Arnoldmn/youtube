import type { Metadata } from "next";
import Contact from "@/components/Contact";

export const metadata: Metadata = {
  title: "Contact",
  description: "Book smelting, assay or refining with Instant Gold Refinery on WhatsApp: +254 774 957 883.",
};

export default function ContactPage() {
  return (
    <>
      <Contact />
    </>
  );
}
