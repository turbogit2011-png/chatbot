import type { Metadata, Viewport } from "next";
import { Inter, Bebas_Neue } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin", "latin-ext"], variable: "--font-inter", display: "swap" });
const bebasNeue = Bebas_Neue({ weight: "400", subsets: ["latin"], variable: "--font-bebas", display: "swap" });

export const metadata: Metadata = {
  title: "TURBO-GIT – Sklep z Turbosprężarkami | Regeneracja z Gwarancją 24M",
  description: "Sklep z regenerowanymi turbosprężarkami. Gwarancja 24 miesiące, VSR 301 balansowanie, CHRA diagnostyka. 15 lat doświadczenia. Wysyłka w 24h. Program B2B dla warsztatów.",
  keywords: ["turbosprężarki sklep", "regeneracja turbo", "turbosprężarki online", "turbo B2B", "gwarancja turbo", "turbo-git"],
  authors: [{ name: "TURBO-GIT" }],
  openGraph: {
    title: "TURBO-GIT – Regenerowane Turbosprężarki z Gwarancją",
    description: "Profesjonalny sklep z regenerowanymi turbosprężarkami. Gwarancja 24 miesiące.",
    type: "website",
    locale: "pl_PL",
  },
};

export const viewport: Viewport = { themeColor: "#FF7A00" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pl" className={`${inter.variable} ${bebasNeue.variable}`}>
      <body className="antialiased">{children}</body>
    </html>
  );
}
