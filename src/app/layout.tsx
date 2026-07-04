import type { Metadata, Viewport } from "next";
import { Inter, Bebas_Neue } from "next/font/google";
import "./globals.css";
import { ServiceWorkerRegister } from "@/components/momentum/Pwa";
import { Aurora } from "@/components/ui/Aurora";
import { CommandPalette } from "@/components/ui/CommandPalette";

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
  title: "Momentum – Twoje centrum produktywności",
  description:
    "Momentum to działające offline centrum produktywności: timer skupienia (Pomodoro), zadania z priorytetami, nawyki z passami, notatnik i statystyki dnia. Bez kont, bez śledzenia — wszystkie dane zostają na Twoim urządzeniu.",
  keywords: [
    "produktywność",
    "pomodoro",
    "timer skupienia",
    "lista zadań",
    "nawyki",
    "streak",
    "notatnik",
    "offline",
  ],
  authors: [{ name: "Momentum" }],
  applicationName: "Momentum",
  appleWebApp: {
    capable: true,
    title: "Momentum",
    statusBarStyle: "black-translucent",
  },
  icons: {
    icon: [{ url: "/icon.svg", type: "image/svg+xml" }],
    apple: [{ url: "/icon.svg" }],
  },
  openGraph: {
    title: "Momentum – Twoje centrum produktywności",
    description:
      "Timer skupienia, zadania, nawyki i statystyki w jednej aplikacji działającej offline.",
    type: "website",
    locale: "pl_PL",
  },
};

export const viewport: Viewport = {
  themeColor: "#8B5CF6",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pl" className={`${inter.variable} ${bebasNeue.variable}`}>
      <body className="antialiased">
        <Aurora />
        {children}
        <CommandPalette />
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
