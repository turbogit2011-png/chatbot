import type { Metadata } from "next";
import Galaxy from "@/components/galaxy/Galaxy";

export const metadata: Metadata = {
  title: "Galaktyka Momentum – repozytorium widziane z góry",
  description:
    "Każdy plik Momentum jako gwiazda: interaktywna mapa nieba kodu, którą można usłyszeć, plus osiem zaskakujących faktów z historii gita.",
};

export default function GalaxyPage() {
  return <Galaxy />;
}
