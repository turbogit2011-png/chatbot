import type { Metadata, Viewport } from "next";
import { Inter, Inter_Tight, JetBrains_Mono } from "next/font/google";
import { BRAND, CONTACT } from "@/lib/brand";
import "./globals.css";

const inter = Inter({
  subsets: ["latin", "latin-ext"],
  variable: "--font-inter",
  display: "swap",
});

const interTight = Inter_Tight({
  subsets: ["latin", "latin-ext"],
  weight: ["600", "700", "800"],
  variable: "--font-display",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-mono",
  display: "swap",
});

const description =
  "TURBO-GIT — regeneracja turbosprężarek z nowym rdzeniem CHRA, wyważaniem TurboTechnics VSR301 i precyzyjnym ustawianiem przepływu G3-Min-Flow. 24 miesiące gwarancji bez limitu kilometrów. Wysyłka 24h w całej Polsce. 15 lat doświadczenia, Wrocław.";

export const metadata: Metadata = {
  metadataBase: new URL(BRAND.url),
  title: {
    default:
      "Regeneracja turbosprężarek Wrocław — nowy CHRA, gwarancja 24 mc | TURBO-GIT",
    template: "%s | TURBO-GIT",
  },
  description,
  keywords: [
    "regeneracja turbosprężarek",
    "regeneracja turbo",
    "turbosprężarki regenerowane",
    "turbosprężarka po regeneracji",
    "naprawa turbosprężarek",
    "regeneracja turbosprężarek Wrocław",
    "regeneracja turbo Wrocław",
    "turbosprężarki Wrocław",
    "nowy CHRA",
    "wyważanie turbosprężarki VSR",
    "TurboTechnics VSR301",
    "G3-Min-Flow",
    "ustawianie zmiennej geometrii turbo",
    "turbosprężarka z gwarancją 24 miesiące",
    "sprzedaż turbosprężarek",
    "turbo do samochodu",
  ],
  authors: [{ name: BRAND.name }],
  creator: BRAND.name,
  publisher: BRAND.name,
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "pl_PL",
    url: BRAND.url,
    siteName: BRAND.name,
    title:
      "TURBO-GIT — regeneracja turbosprężarek premium · nowy CHRA · VSR301",
    description,
    images: [
      {
        url: "/og.jpg",
        width: 1200,
        height: 630,
        alt: "TURBO-GIT — regeneracja turbosprężarek na poziomie technologii premium",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "TURBO-GIT — regeneracja turbosprężarek premium",
    description,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
};

export const viewport: Viewport = {
  themeColor: "#0A0B0D",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

const organizationLd = {
  "@context": "https://schema.org",
  "@type": "AutomotiveBusiness",
  "@id": `${BRAND.url}/#organization`,
  name: BRAND.name,
  legalName: BRAND.legalName,
  url: BRAND.url,
  logo: `${BRAND.url}/logo.png`,
  image: `${BRAND.url}/og.jpg`,
  description,
  foundingDate: `${BRAND.foundedYear}`,
  telephone: CONTACT.phone,
  email: CONTACT.email,
  priceRange: "$$",
  address: {
    "@type": "PostalAddress",
    streetAddress: CONTACT.address.street,
    addressLocality: CONTACT.address.city,
    postalCode: CONTACT.address.postalCode,
    addressRegion: CONTACT.address.region,
    addressCountry: CONTACT.address.country,
  },
  geo: {
    "@type": "GeoCoordinates",
    latitude: CONTACT.geo.lat,
    longitude: CONTACT.geo.lng,
  },
  openingHoursSpecification: [
    {
      "@type": "OpeningHoursSpecification",
      dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
      opens: "08:00",
      closes: "18:00",
    },
    {
      "@type": "OpeningHoursSpecification",
      dayOfWeek: "Saturday",
      opens: "09:00",
      closes: "14:00",
    },
  ],
  areaServed: { "@type": "Country", name: "Polska" },
  serviceArea: { "@type": "Country", name: "Polska" },
  knowsAbout: [
    "regeneracja turbosprężarek",
    "TurboTechnics VSR301",
    "G3-Min-Flow",
    "kalibracja zmiennej geometrii",
    "rdzenie CHRA",
    "aktuatory elektroniczne",
  ],
  sameAs: [],
  aggregateRating: {
    "@type": "AggregateRating",
    ratingValue: "4.9",
    reviewCount: "380",
    bestRating: "5",
    worstRating: "1",
  },
};

const websiteLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  "@id": `${BRAND.url}/#website`,
  url: BRAND.url,
  name: BRAND.name,
  publisher: { "@id": `${BRAND.url}/#organization` },
  inLanguage: "pl-PL",
  potentialAction: {
    "@type": "SearchAction",
    target: `${BRAND.url}/sklep?q={search_term_string}`,
    "query-input": "required name=search_term_string",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pl"
      className={`${inter.variable} ${interTight.variable} ${jetbrainsMono.variable}`}
    >
      <body className="antialiased">
        {children}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationLd) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteLd) }}
        />
      </body>
    </html>
  );
}
