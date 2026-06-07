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
  title: "Turbo-Git – Regenerowane Turbosprężarki | 8000+ modeli | Gwarancja 24M",
  description:
    "Sklep z regenerowanymi turbosprężarkami. 8000+ modeli w magazynie, gwarancja 24 miesiące, wysyłka 24h. Technologia VSR 301. Obsługujemy wszystkie marki. Ceny od 699 zł.",
  keywords: [
    "regenerowane turbosprężarki",
    "turbosprężarka sklep",
    "kupno turbosprężarki",
    "turbo z gwarancją",
    "turbosprężarka używana",
    "wymiana turbo",
    "VSR 301",
    "turbo-git",
  ],
  authors: [{ name: "Turbo-Git" }],
  openGraph: {
    title: "Turbo-Git – Regenerowane Turbosprężarki",
    description:
      "8000+ modeli w magazynie. Gwarancja 24 miesiące. Wysyłka 24h. Ceny od 699 zł.",
    type: "website",
    locale: "pl_PL",
  },
};

export const viewport: Viewport = {
  themeColor: "#F97316",
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
