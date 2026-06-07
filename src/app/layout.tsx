import type { Metadata, Viewport } from "next";
import { Sora, Space_Grotesk } from "next/font/google";
import "./globals.css";

const sora = Sora({
  subsets: ["latin", "latin-ext"],
  variable: "--font-sora",
  display: "swap",
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin", "latin-ext"],
  variable: "--font-grotesk",
  display: "swap",
});

export const metadata: Metadata = {
  title: "TURBO-GIT — Laboratorium Regeneracji Turbosprężarek i DPF",
  description:
    "Elitarna regeneracja turbosprężarek i DPF. Wyważanie VSR 301 (0,001 g/cm²), kalibracja REA-Master, oryginalne części OEM Garrett, BorgWarner, IHI, Holset. Gwarancja 24 miesiące bez limitu kilometrów.",
  keywords: [
    "regeneracja turbosprężarek",
    "TURBO-GIT",
    "wyważanie VSR 301",
    "REA-Master",
    "G3-MIN-FLOW",
    "DPF",
    "Garrett",
    "BorgWarner",
    "Holset",
    "Wrocław",
  ],
  authors: [{ name: "TURBO-GIT" }],
  openGraph: {
    title: "TURBO-GIT — Inżynieria Doładowania",
    description:
      "Elitarne laboratorium regeneracji turbosprężarek i DPF. Gwarancja 24 miesiące bez limitu kilometrów.",
    type: "website",
    locale: "pl_PL",
  },
};

export const viewport: Viewport = {
  themeColor: "#060608",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pl" className={`${sora.variable} ${spaceGrotesk.variable}`}>
      <body className="antialiased">{children}</body>
    </html>
  );
}
