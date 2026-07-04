import type { Metadata, Viewport } from "next";
import { Inter, Bebas_Neue } from "next/font/google";
import "./globals.css";
import { ViewTransitions } from "next-view-transitions";
import { CartProvider } from "@/lib/shop/cart";
import CartDrawer from "@/components/shop/CartDrawer";
import { CommandPalette } from "@/components/shop/CommandPalette";
import { ServiceWorkerRegister } from "@/components/shop/Pwa";
import { SITE_URL } from "@/lib/site";

const inter = Inter({ subsets: ["latin", "latin-ext"], variable: "--font-inter", display: "swap" });
const bebasNeue = Bebas_Neue({ weight: "400", subsets: ["latin"], variable: "--font-bebas", display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  applicationName: "TURBO-GIT",
  appleWebApp: { capable: true, title: "TURBO-GIT", statusBarStyle: "black-translucent" },
  icons: { icon: [{ url: "/icon.svg", type: "image/svg+xml" }], apple: [{ url: "/icon.svg" }] },
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
    <ViewTransitions>
      <html lang="pl" className={`${inter.variable} ${bebasNeue.variable}`}>
        <body className="antialiased">
          <CartProvider>
            {children}
            <CartDrawer />
            <CommandPalette />
          </CartProvider>
          <ServiceWorkerRegister />
        </body>
      </html>
    </ViewTransitions>
  );
}
