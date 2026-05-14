/**
 * TURBO-GIT brand & contact constants.
 * Single source of truth — change here, propagates everywhere.
 */

export const BRAND = {
  name: "TURBO-GIT",
  tagline: "Regeneracja turbosprężarek na poziomie technologii premium",
  legalName: "TURBO-GIT",
  url: "https://www.turbo-git.com",
  foundedYear: 2010,
  experienceYears: new Date().getFullYear() - 2010,
} as const;

export const CONTACT = {
  phone: "+48 600 000 000",
  phoneTel: "tel:+48600000000",
  phoneDisplay: "+48 600 000 000",
  whatsapp: "+48600000000",
  whatsappUrl: "https://wa.me/48600000000",
  email: "kontakt@turbo-git.com",
  emailMailto: "mailto:kontakt@turbo-git.com",
  hours: {
    weekday: "Pn–Pt · 8:00–18:00",
    saturday: "Sob · 9:00–14:00",
    full: "Pn–Pt 8:00–18:00 · Sob 9:00–14:00",
  },
  address: {
    street: "ul. Przykładowa 1",
    city: "Wrocław",
    postalCode: "50-000",
    region: "Dolnośląskie",
    country: "PL",
  },
  geo: { lat: 51.1079, lng: 17.0385 },
} as const;

export const USP = {
  warranty: "24 miesiące gwarancji bez limitu kilometrów",
  warrantyShort: "24 mc gwarancji",
  chra: "Nowe rdzenie CHRA",
  balancing: "Wyważanie TurboTechnics VSR301",
  flow: "Ustawianie przepływu G3-Min-Flow",
  vgt: "Kalibracja zmiennej geometrii G3-REA-MASTER",
  gaskets: "Komplet uszczelek gratis",
  shipping: "Wysyłka 24h — cała Polska",
  experience: `${BRAND.experienceYears} lat doświadczenia`,
} as const;
