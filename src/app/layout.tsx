import type { Metadata, Viewport } from "next";
import { Inter, Bebas_Neue } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin", "latin-ext"],
  variable: "--font-inter",
  display: "swap",
});

const bebasNeue = Bebas_Neue({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-bebas",
  display: "swap",
});

export const metadata: Metadata = {
  title: "TurboDiesel – Regeneracja Turbosprężarek | Profesjonalny Serwis",
  description:
    "Profesjonalna regeneracja turbosprężarek, wtryskiwaczy i filtrów DPF. Ponad 10 lat doświadczenia. Gwarancja 12 miesięcy. Diagnostyka CNC. Sprawdź ofertę!",
  keywords: [
    "regeneracja turbosprężarek",
    "serwis turbo",
    "naprawa turbosprężarki",
    "turbodiesel",
    "wtryskiwacze",
    "DPF",
    "diesel",
    "turbosprężarka",
  ],
  authors: [{ name: "TurboDiesel" }],
  openGraph: {
    title: "TurboDiesel – Regeneracja Turbosprężarek",
    description:
      "Profesjonalna regeneracja turbosprężarek z gwarancją 12 miesięcy",
    type: "website",
    locale: "pl_PL",
  },
};

export const viewport: Viewport = {
  themeColor: "#FF6B1A",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pl" className={`${inter.variable} ${bebasNeue.variable}`}>
      <body className="antialiased">{children}</body>
    </html>
  );
}
