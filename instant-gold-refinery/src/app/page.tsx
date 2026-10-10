import Hero from "@/components/Hero";
import Marquee from "@/components/Marquee";
import Services from "@/components/Services";
import Purity from "@/components/Purity";
import AboutTeaser from "@/components/AboutTeaser";
import CtaBand from "@/components/CtaBand";

export default function Home() {
  return (
    <>
      <Hero />
      <Marquee />
      <Services />
      <AboutTeaser />
      <Purity />
      <CtaBand />
    </>
  );
}
