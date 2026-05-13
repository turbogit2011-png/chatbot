import Navigation from "@/components/Navigation";
import Hero from "@/components/Hero";
import Stats from "@/components/Stats";
import CategoryGrid from "@/components/CategoryGrid";
import FeaturedProducts from "@/components/FeaturedProducts";
import WhyUs from "@/components/WhyUs";
import B2BSection from "@/components/B2BSection";
import Testimonials from "@/components/Testimonials";
import Contact from "@/components/Contact";
import Footer from "@/components/Footer";

export default function Home() {
  return (
    <>
      <Navigation />
      <Hero />
      <Stats />
      <CategoryGrid />
      <FeaturedProducts />
      <WhyUs />
      <B2BSection />
      <Testimonials />
      <Contact />
      <Footer />
    </>
  );
}
