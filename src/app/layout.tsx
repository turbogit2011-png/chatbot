import type { Metadata, Viewport } from "next";
import { Inter, Syncopate, Rajdhani } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin", "latin-ext"],
  variable: "--font-inter",
  display: "swap",
  weight: ["300", "400", "500", "600", "700"],
});

const syncopate = Syncopate({
  weight: ["400", "700"],
  subsets: ["latin"],
  variable: "--font-syncopate",
  display: "swap",
});

const rajdhani = Rajdhani({
  weight: ["300", "400", "500", "600", "700"],
  subsets: ["latin"],
  variable: "--font-rajdhani",
  display: "swap",
});

export const metadata: Metadata = {
  title: "TURBO-GIT | Regeneracja Turbosprężarek Premium",
  description:
    "Profesjonalnie regenerowane turbosprężarki na nowych uszczelkach i najwyższej jakości podzespołach. Filtry DPF. Gwarancja jakości premium.",
  keywords: [
    "regeneracja turbosprężarek",
    "turbosprężarka premium",
    "turbo-git",
    "filtry DPF",
    "turbo sklep",
    "regeneracja turbo",
  ],
  authors: [{ name: "TURBO-GIT" }],
  openGraph: {
    title: "TURBO-GIT | Regeneracja Turbosprężarek Premium",
    description:
      "Profesjonalnie regenerowane turbosprężarki premium z gwarancją jakości",
    type: "website",
    locale: "pl_PL",
  },
};

export const viewport: Viewport = {
  themeColor: "#D4A843",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pl"
      className={`${inter.variable} ${syncopate.variable} ${rajdhani.variable}`}
    >
      <body className="antialiased">{children}</body>
    </html>
  );
}
