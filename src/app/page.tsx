import { SelectionProvider } from "@/lib/selection";
import { TelemetryBar } from "@/components/TelemetryBar";
import { Navbar } from "@/components/Navbar";
import { Hero } from "@/components/Hero";
import { SymptomChecker } from "@/components/SymptomChecker";
import { TurboFinder } from "@/components/TurboFinder";
import { LabWorkflow } from "@/components/LabWorkflow";
import { TurboExplorer } from "@/components/TurboExplorer";
import { TCOSimulator } from "@/components/TCOSimulator";
import { B2BZone } from "@/components/B2BZone";
import { FAQContact } from "@/components/FAQContact";
import { Footer } from "@/components/Footer";

export default function Home() {
  return (
    <SelectionProvider>
      <TelemetryBar />
      <Navbar />
      <main>
        <Hero />
        <SymptomChecker />
        <TurboFinder />
        <LabWorkflow />
        <TurboExplorer />
        <TCOSimulator />
        <B2BZone />
        <FAQContact />
      </main>
      <Footer />
    </SelectionProvider>
  );
}
