// ── TURBO-GIT core business data ────────────────────────────────────────────

export const BUSINESS = {
  name: "TURBO-GIT",
  domain: "turbo-git.com",
  yearsExperience: 15,
  establishedYear: 2012,
  unitsReman: "8000+",
  warrantyMonths: 24,
  pickupHours: "24–48h",
  rating: 4.9,
  positivePct: 98,
  address: "ul. Wrocławska 7, 55-095 Januszkowice",
  region: "Dolny Śląsk (okolice Wrocławia)",
  phone: "+48 600 000 000",
  email: "lab@turbo-git.com",
} as const;

export const OEM_BRANDS = ["Garrett", "BorgWarner", "IHI", "Holset"] as const;

export const ACTUATOR_BRANDS = [
  "Hella",
  "Siemens",
  "VDO",
  "Mitsubishi",
  "Sonceboz",
] as const;

// ── Live telemetry ticker statuses ──────────────────────────────────────────

export const TELEMETRY_STATUSES: string[] = [
  "Turbo Technics VSR 301 — dopasowanie parametrów rdzenia · 0.001 g/cm²",
  "REA-Master — kalibracja siłownika Hella · krok 0.1°",
  "G3-MIN-FLOW — pomiar masy powietrza · protokół #A-2291",
  "Mycie ultradźwiękowe rdzenia CHRA · cykl 18 min",
  "Kontrola metrologiczna wału · tolerancja ±0.002 mm",
  "BorgWarner core balancing · 248 000 obr/min",
  "Druk protokołu testowego · stanowisko flow-bench",
  "Synchronizacja geometrii VNT · Siemens VGT",
  "Kurier ekspres — odbiór rdzenia · status: w drodze",
  "Garrett VNT — test szczelności komory · OK",
];

// ── AI Symptom Checker fault rules ──────────────────────────────────────────

export type Symptom = {
  id: string;
  label: string;
  icon: string; // lucide icon name
};

export const SYMPTOMS: Symptom[] = [
  { id: "power-loss", label: "Nagła utrata mocy", icon: "Gauge" },
  { id: "whistle", label: "Głośny gwizd / syrena", icon: "Volume2" },
  { id: "blue-smoke", label: "Niebieski dym z oleju", icon: "CloudFog" },
  { id: "fuel", label: "Wysokie zużycie paliwa", icon: "Fuel" },
  { id: "lag", label: "Opóźniona reakcja (turbo lag)", icon: "Timer" },
  { id: "oil-leak", label: "Wyciek oleju", icon: "Droplets" },
  { id: "limp", label: "Tryb awaryjny (limp mode)", icon: "TriangleAlert" },
  { id: "rattle", label: "Stukanie / grzechotanie", icon: "Activity" },
];

export type Diagnosis = {
  title: string;
  severity: "low" | "medium" | "high";
  cause: string;
  route: string; // recommended lab route
  detail: string;
};

// Maps a set of symptom ids → a localized diagnosis report.
export function diagnose(selected: string[]): Diagnosis | null {
  if (selected.length === 0) return null;
  const has = (id: string) => selected.includes(id);
  const score =
    (has("power-loss") ? 2 : 0) +
    (has("limp") ? 3 : 0) +
    (has("blue-smoke") ? 2 : 0) +
    (has("rattle") ? 3 : 0);

  if (has("rattle") || (has("whistle") && has("power-loss"))) {
    return {
      title: "Uszkodzenie wału / rdzenia CHRA — wymagane wyważanie",
      severity: "high",
      cause:
        "Grzechotanie i gwizd przy utracie mocy wskazują na luz osiowy wału lub uszkodzone łożyska CHRA.",
      route: "Turbo Technics VSR 301 — wysokoobrotowe wyważanie rdzenia",
      detail:
        "Rdzeń wymaga demontażu, kontroli metrologicznej oraz ponownego wyważenia z dokładnością do 0.001 g/cm². Po wymianie łożysk wykonujemy test na stanowisku.",
    };
  }
  if (has("blue-smoke") || has("oil-leak")) {
    return {
      title: "Przedostawanie się oleju — zużyte uszczelnienia",
      severity: "medium",
      cause:
        "Niebieski dym i wycieki oleju to zwykle zużyte pierścienie uszczelniające i nadmierny luz wału.",
      route: "Wymiana pełnego zestawu naprawczego + wyważanie VSR 301",
      detail:
        "Stosujemy wyłącznie oryginalne komponenty OEM. Po regeneracji rdzeń przechodzi wyważanie oraz test szczelności komory.",
    };
  }
  if (has("whistle") || has("power-loss") || has("lag")) {
    return {
      title: "Nieprawidłowy przepływ / geometria VNT",
      severity: score >= 4 ? "high" : "medium",
      cause:
        "Gwizd, turbo lag i spadki mocy często wynikają z zatartej geometrii VNT lub rozkalibrowanego siłownika.",
      route: "G3-MIN-FLOW (pomiar masy powietrza) + REA-Master (siłownik)",
      detail:
        "Wykonujemy pomiar przepływu na stanowisku flow-bench z drukowanym protokołem oraz kalibrację siłownika z krokiem 0.1°.",
    };
  }
  if (has("fuel") || has("limp")) {
    return {
      title: "Rozkalibrowany siłownik / tryb awaryjny",
      severity: "medium",
      cause:
        "Wysokie zużycie paliwa i limp mode sugerują błędne sterowanie geometrią lub ciśnieniem doładowania.",
      route: "REA-Master — kalibracja siłownika (0.1°)",
      detail:
        "Kalibrujemy siłowniki Hella, Siemens, VDO, Mitsubishi i Sonceboz oraz weryfikujemy nastawy na stanowisku.",
    };
  }
  return {
    title: "Wymagana pełna diagnostyka laboratoryjna",
    severity: "low",
    cause: "Objawy są niejednoznaczne — zalecamy kompleksową kontrolę rdzenia.",
    route: "Pełna ścieżka 7-etapowa TURBO-GIT",
    detail:
      "Prześlij rdzeń kurierem — wykonamy demontaż, kontrolę metrologiczną i pomiary, a następnie prześlemy protokół.",
  };
}

// ── Turbo Finder 2.0 cascading database ─────────────────────────────────────

export type TurboRecord = {
  brand: string;
  model: string;
  engine: string;
  oem: string; // OEM turbo maker
  partNo: string;
  power: string;
  priceEUR: number;
  stock: "in" | "low" | "core";
};

export const TURBO_DB: TurboRecord[] = [
  {
    brand: "Volkswagen",
    model: "Golf IV / Passat B5 (1998–2005)",
    engine: "1.9 TDI (AJM/ATJ)",
    oem: "Garrett",
    partNo: "GT1749V 454232-5011S",
    power: "115 KM",
    priceEUR: 389,
    stock: "in",
  },
  {
    brand: "Volkswagen",
    model: "Passat B6 (2005–2010)",
    engine: "2.0 TDI (BKP)",
    oem: "BorgWarner",
    partNo: "BV43 03L253056",
    power: "140 KM",
    priceEUR: 459,
    stock: "low",
  },
  {
    brand: "BMW",
    model: "320d E90/E91 (2007–2011)",
    engine: "N47D20",
    oem: "Garrett",
    partNo: "GTB1749VK 758352-5024S",
    power: "177 KM",
    priceEUR: 529,
    stock: "in",
  },
  {
    brand: "BMW",
    model: "120d / 320d (2004–2007)",
    engine: "M47D20 (204D4)",
    oem: "Holset",
    partNo: "HY35W 4035392",
    power: "163 KM",
    priceEUR: 489,
    stock: "core",
  },
  {
    brand: "Audi",
    model: "A4 B8 / A6 C7 (2008–2015)",
    engine: "2.0 TFSI (CDNB)",
    oem: "BorgWarner",
    partNo: "K03 06H145702",
    power: "211 KM",
    priceEUR: 575,
    stock: "in",
  },
  {
    brand: "Audi",
    model: "A3 8P (2003–2008)",
    engine: "2.0 TFSI (BWA)",
    oem: "IHI",
    partNo: "K04 53049880064",
    power: "200 KM",
    priceEUR: 615,
    stock: "low",
  },
  {
    brand: "Mercedes-Benz",
    model: "C/E-Class CDI (2008–2016)",
    engine: "OM651 (2.1 CDI)",
    oem: "Garrett",
    partNo: "GTB2056VK 819872-5005S",
    power: "204 KM",
    priceEUR: 689,
    stock: "in",
  },
  {
    brand: "Mercedes-Benz",
    model: "Sprinter 906 (2009–2018)",
    engine: "OM651 (2.1 CDI)",
    oem: "BorgWarner",
    partNo: "BV45 A6510905980",
    power: "163 KM",
    priceEUR: 645,
    stock: "core",
  },
  {
    brand: "Renault",
    model: "Megane III / Clio IV (2011–2018)",
    engine: "1.5 dCi (K9K)",
    oem: "Garrett",
    partNo: "GT1544V 54399700070",
    power: "110 KM",
    priceEUR: 365,
    stock: "in",
  },
  {
    brand: "Renault",
    model: "Captur / Kadjar (2013–2019)",
    engine: "1.5 dCi (K9K 6xx)",
    oem: "IHI",
    partNo: "RHF3 8200994593",
    power: "90 KM",
    priceEUR: 339,
    stock: "low",
  },
];

export const STOCK_LABEL: Record<TurboRecord["stock"], { label: string; tone: string }> = {
  in: { label: "Na stanie", tone: "ok" },
  low: { label: "Ostatnie sztuki", tone: "warn" },
  core: { label: "Tylko wymiana rdzenia", tone: "copper" },
};

// Currency context for dynamic price rendering
export type Currency = "PLN" | "EUR" | "GBP";
export const CURRENCY: Record<Currency, { symbol: string; rate: number }> = {
  PLN: { symbol: "zł", rate: 4.32 },
  EUR: { symbol: "€", rate: 1 },
  GBP: { symbol: "£", rate: 0.85 },
};

// ── 7-step lab workflow ─────────────────────────────────────────────────────

export const WORKFLOW: { step: number; title: string; desc: string; icon: string }[] = [
  {
    step: 1,
    title: "Demontaż i mycie ultradźwiękowe",
    desc: "Pełny rozbiór rdzenia oraz mycie ultradźwiękowe usuwające nagar i osady.",
    icon: "Wrench",
  },
  {
    step: 2,
    title: "Kontrola metrologiczna",
    desc: "Pomiar wału, łożysk i komór z tolerancją ±0.002 mm i kwalifikacja części.",
    icon: "Ruler",
  },
  {
    step: 3,
    title: "Wymiana części (OEM)",
    desc: "Montaż wyłącznie oryginalnych komponentów Garrett, BorgWarner, IHI, Holset.",
    icon: "Cog",
  },
  {
    step: 4,
    title: "Wyważanie VSR 301",
    desc: "Wysokoobrotowe wyważanie rdzenia Turbo Technics z dokładnością 0.001 g/cm².",
    icon: "Disc3",
  },
  {
    step: 5,
    title: "Pomiar masy powietrza G3",
    desc: "Regulacja na stanowisku G3-MIN-FLOW (G3 Concepts) z drukowanym protokołem.",
    icon: "Wind",
  },
  {
    step: 6,
    title: "Synchronizacja siłownika REA-Master",
    desc: "Kalibracja siłownika z krokiem 0.1° (Hella, Siemens, VDO, Mitsubishi, Sonceboz).",
    icon: "SlidersHorizontal",
  },
  {
    step: 7,
    title: "Test końcowy i protokół",
    desc: "Test końcowy oraz wydruk protokołu pomiarowego dołączanego do każdej sztuki.",
    icon: "FileCheck",
  },
];

// ── Virtual Turbo Explorer hotspots ─────────────────────────────────────────

export type Hotspot = {
  id: string;
  label: string;
  x: number; // % position on the SVG
  y: number;
  params: { k: string; v: string }[];
  summary: string;
};

export const HOTSPOTS: Hotspot[] = [
  {
    id: "chra",
    label: "Rdzeń CHRA",
    x: 50,
    y: 50,
    summary:
      "Serce turbosprężarki — wał, łożyska i komora środkowa. Po regeneracji wyważany na VSR 301.",
    params: [
      { k: "Wyważanie", v: "0.001 g/cm²" },
      { k: "Obroty testowe", v: "do 248 000 obr/min" },
      { k: "Tolerancja wału", v: "±0.002 mm" },
      { k: "Łożyska", v: "OEM Garrett / BorgWarner" },
    ],
  },
  {
    id: "actuator",
    label: "Siłownik elektroniczny",
    x: 80,
    y: 30,
    summary:
      "Sterowanie geometrią doładowania. Kalibrowane na stanowisku REA-Master z krokiem 0.1°.",
    params: [
      { k: "Krok kalibracji", v: "0.1°" },
      { k: "Obsługa", v: "Hella, Siemens, VDO" },
      { k: "Dodatkowo", v: "Mitsubishi, Sonceboz" },
      { k: "Protokół", v: "drukowany raport" },
    ],
  },
  {
    id: "compressor",
    label: "Wirnik sprężarki",
    x: 22,
    y: 38,
    summary:
      "Koło kompresji tłoczące powietrze. Sprawdzane pod kątem erozji i geometrii łopatek.",
    params: [
      { k: "Materiał", v: "oryginał OEM" },
      { k: "Kontrola", v: "geometria łopatek" },
      { k: "Pomiar przepływu", v: "G3-MIN-FLOW" },
      { k: "Protokół flow", v: "drukowany" },
    ],
  },
  {
    id: "vnt",
    label: "Geometria VNT",
    x: 72,
    y: 68,
    summary:
      "Zmienna geometria łopatek po stronie turbiny. Czyszczona, regenerowana i synchronizowana.",
    params: [
      { k: "Łopatki VNT", v: "regeneracja + czyszczenie" },
      { k: "Synchronizacja", v: "z siłownikiem" },
      { k: "Test szczelności", v: "komora turbiny" },
      { k: "Geometria", v: "weryfikacja ruchu" },
    ],
  },
];

// ── FAQ ─────────────────────────────────────────────────────────────────────

export const FAQ_ITEMS: { q: string; a: string }[] = [
  {
    q: "Jak działa system wymiany (kaucja za rdzeń)?",
    a: "Możesz zamówić gotową, zregenerowaną turbosprężarkę z naszego magazynu wymiennego. Doliczamy zwrotną kaucję za rdzeń (core deposit), którą zwracamy w całości po otrzymaniu Twojego sprawnego rdzenia w ciągu 14 dni. Rdzeń musi być kompletny i nadający się do regeneracji.",
  },
  {
    q: "Co obejmuje 24-miesięczna gwarancja?",
    a: "Udzielamy 24 miesięcy gwarancji bez limitu kilometrów na wszystkie regenerowane turbosprężarki. Gwarancja obejmuje wady wykonania oraz zastosowanych komponentów OEM, pod warunkiem prawidłowego montażu zgodnego z protokołem.",
  },
  {
    q: "Ile trwa regeneracja i wysyłka?",
    a: "Standardowy czas regeneracji to 24–48h od otrzymania rdzenia. Oferujemy ekspresowy odbiór i zwrot kurierem na terenie całego kraju, dzięki czemu cały proces jest maksymalnie szybki.",
  },
  {
    q: "Czy używacie oryginalnych części?",
    a: "Tak. Stosujemy wyłącznie oryginalne komponenty OEM marek Garrett, BorgWarner, IHI oraz Holset. Nie stosujemy zamienników niskiej jakości — każda regeneracja jest dokumentowana protokołem.",
  },
  {
    q: "Czy otrzymam protokół z pomiarów?",
    a: "Do każdej zregenerowanej turbosprężarki dołączamy drukowany protokół z wyważania VSR 301 oraz pomiaru masy powietrza na stanowisku G3-MIN-FLOW. To Twój dowód jakości wykonania.",
  },
  {
    q: "Jak dołączyć do programu B2B dla warsztatów?",
    a: "Program Garage Trade zapewnia 10% rabatu hurtowego, 30 dni odroczonej płatności (faktura) oraz dostęp do AI Core Scanner. Wystarczy wypełnić formularz rejestracji partnera B2B z numerem NIP.",
  },
];

// ── B2B perks ───────────────────────────────────────────────────────────────

export const B2B_PERKS: { title: string; desc: string; icon: string }[] = [
  {
    title: "10% rabatu hurtowego",
    desc: "Stały rabat wholesale na całą ofertę regeneracji dla zarejestrowanych warsztatów.",
    icon: "Percent",
  },
  {
    title: "30 dni odroczonej płatności",
    desc: "Rozliczenie fakturą z terminem 30 dni — większa płynność dla Twojego serwisu.",
    icon: "CalendarClock",
  },
  {
    title: "Dostęp do AI Core Scanner",
    desc: "Natychmiastowa identyfikacja rdzenia i doboru ścieżki regeneracji w panelu partnera.",
    icon: "ScanLine",
  },
];
