import Navigation from "@/components/Navigation";
import Hero from "@/components/Hero";
import TrustBar from "@/components/TrustBar";
import TurboPicker from "@/components/TurboPicker";
import WhyUs from "@/components/WhyUs";
import TechStack from "@/components/TechStack";
import Process from "@/components/Process";
import Stats from "@/components/Stats";
import B2BSection from "@/components/B2BSection";
import Testimonials from "@/components/Testimonials";
import CallToAction from "@/components/CallToAction";
import FAQ from "@/components/FAQ";
import Contact from "@/components/Contact";
import Footer from "@/components/Footer";
import MobileStickyBar from "@/components/MobileStickyBar";

export default function Home() {
  return (
    <>
      <Navigation />
      <Hero />
      <TrustBar />
      <TurboPicker />
      <WhyUs />
      <TechStack />
      <Process />
      <Stats />
      <B2BSection />
      <Testimonials />
      <CallToAction />
      <FAQ />
      <Contact />
      <Footer />
      <MobileStickyBar />
    </>
  );
}
