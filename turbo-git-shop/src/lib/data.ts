export interface Product {
  id: number;
  name: string;
  brand: string;
  model: string;
  engineCode: string;
  oemNumber: string;
  price: number;
  b2bPrice: number;
  warranty: string;
  available: boolean;
  isNew: boolean;
  isBestseller: boolean;
  description: string;
  specs: string[];
}

export interface Category {
  name: string;
  slug: string;
  count: number;
}

export const products: Product[] = [
  {
    id: 1,
    name: "Turbosprężarka Regenerowana",
    brand: "Audi",
    model: "A4 2.0 TDI",
    engineCode: "BRD / BPW / BVA",
    oemNumber: "03G253014H",
    price: 1599,
    b2bPrice: 1439,
    warranty: "24 miesiące",
    available: true,
    isNew: false,
    isBestseller: true,
    description:
      "Regenerowana turbosprężarka do Audi A4 B7 2.0 TDI. Pełna regeneracja w standardzie VSR 301. Testowana na stanowisku G3-MIN-FLOW.",
    specs: [
      "Ciśnienie doładowania: 1.8 bar",
      "Przepływ powietrza: 320 kg/h",
      "Maks. prędkość obrotowa: 190 000 RPM",
      "Typ CHRA: BorgWarner K03",
    ],
  },
  {
    id: 2,
    name: "Turbosprężarka Regenerowana",
    brand: "BMW",
    model: "320d",
    engineCode: "N47D20",
    oemNumber: "11657797078",
    price: 1799,
    b2bPrice: 1619,
    warranty: "24 miesiące",
    available: true,
    isNew: true,
    isBestseller: true,
    description:
      "Regenerowana turbosprężarka do BMW serii 3 E90/E91/E92 320d. Silnik N47D20 – pełna diagnostyka CHRA i balansowanie na VSR 301.",
    specs: [
      "Ciśnienie doładowania: 2.0 bar",
      "Przepływ powietrza: 380 kg/h",
      "Maks. prędkość obrotowa: 210 000 RPM",
      "Typ CHRA: BorgWarner K03",
    ],
  },
  {
    id: 3,
    name: "Turbosprężarka Regenerowana",
    brand: "Ford",
    model: "Focus 1.5 TDCi",
    engineCode: "XWDB / XWDC",
    oemNumber: "9676934380",
    price: 899,
    b2bPrice: 809,
    warranty: "24 miesiące",
    available: true,
    isNew: false,
    isBestseller: false,
    description:
      "Regenerowana turbosprężarka do Ford Focus Mk3 1.5 TDCi 120 KM. Sprawdzona pod kątem szczelności i parametrów przepływu.",
    specs: [
      "Ciśnienie doładowania: 1.6 bar",
      "Przepływ powietrza: 270 kg/h",
      "Maks. prędkość obrotowa: 180 000 RPM",
      "Typ CHRA: Garrett GT1544V",
    ],
  },
  {
    id: 4,
    name: "Turbosprężarka Regenerowana",
    brand: "Volkswagen",
    model: "Golf 2.0 TDI",
    engineCode: "AZV / BKD / BMM",
    oemNumber: "03G253014F",
    price: 1299,
    b2bPrice: 1169,
    warranty: "24 miesiące",
    available: true,
    isNew: false,
    isBestseller: true,
    description:
      "Regenerowana turbosprężarka do VW Golf V/VI 2.0 TDI 140 KM. Jeden z najpopularniejszych modeli w naszej ofercie.",
    specs: [
      "Ciśnienie doładowania: 1.9 bar",
      "Przepływ powietrza: 340 kg/h",
      "Maks. prędkość obrotowa: 195 000 RPM",
      "Typ CHRA: BorgWarner K03",
    ],
  },
  {
    id: 5,
    name: "Turbosprężarka Regenerowana",
    brand: "Mercedes",
    model: "C220d",
    engineCode: "OM651",
    oemNumber: "A6510901086",
    price: 1999,
    b2bPrice: 1799,
    warranty: "24 miesiące",
    available: true,
    isNew: true,
    isBestseller: false,
    description:
      "Regenerowana turbosprężarka do Mercedes-Benz C220d W205. Silnik OM651 – dwustopniowe doładowanie, pełna regeneracja obu turbosów.",
    specs: [
      "Ciśnienie doładowania: 2.2 bar",
      "Przepływ powietrza: 420 kg/h",
      "Maks. prędkość obrotowa: 220 000 RPM",
      "Typ CHRA: IHI RHF3",
    ],
  },
  {
    id: 6,
    name: "Turbosprężarka Regenerowana",
    brand: "Renault",
    model: "Megane 1.5 dCi",
    engineCode: "K9K",
    oemNumber: "7701476883",
    price: 799,
    b2bPrice: 719,
    warranty: "24 miesiące",
    available: true,
    isNew: false,
    isBestseller: false,
    description:
      "Regenerowana turbosprężarka do Renault Megane II/III 1.5 dCi 90/110 KM. Popularny silnik K9K – szybka dostępność.",
    specs: [
      "Ciśnienie doładowania: 1.5 bar",
      "Przepływ powietrza: 240 kg/h",
      "Maks. prędkość obrotowa: 165 000 RPM",
      "Typ CHRA: Garrett GT1544V",
    ],
  },
  {
    id: 7,
    name: "Turbosprężarka Regenerowana",
    brand: "Volvo",
    model: "XC60 D4",
    engineCode: "D4204T",
    oemNumber: "31219562",
    price: 1899,
    b2bPrice: 1709,
    warranty: "24 miesiące",
    available: false,
    isNew: false,
    isBestseller: false,
    description:
      "Regenerowana turbosprężarka do Volvo XC60 D4 163/181 KM. Silnik D4204T – precyzyjna regeneracja geometrii zmiennej.",
    specs: [
      "Ciśnienie doładowania: 2.0 bar",
      "Przepływ powietrza: 370 kg/h",
      "Maks. prędkość obrotowa: 205 000 RPM",
      "Typ CHRA: Garrett GT1749V",
    ],
  },
  {
    id: 8,
    name: "Turbosprężarka Regenerowana",
    brand: "Opel",
    model: "Astra 1.7 CDTI",
    engineCode: "A17DTS / Z17DTH",
    oemNumber: "8971812990",
    price: 749,
    b2bPrice: 674,
    warranty: "24 miesiące",
    available: true,
    isNew: false,
    isBestseller: false,
    description:
      "Regenerowana turbosprężarka do Opel Astra H 1.7 CDTI 100/110 KM. Silniki A17DTS i Z17DTH.",
    specs: [
      "Ciśnienie doładowania: 1.6 bar",
      "Przepływ powietrza: 250 kg/h",
      "Maks. prędkość obrotowa: 175 000 RPM",
      "Typ CHRA: IHI RHF4",
    ],
  },
  {
    id: 9,
    name: "Turbosprężarka Regenerowana",
    brand: "Toyota",
    model: "Avensis 2.2 D4D",
    engineCode: "2AD-FHV",
    oemNumber: "17201-26030",
    price: 1099,
    b2bPrice: 989,
    warranty: "24 miesiące",
    available: true,
    isNew: false,
    isBestseller: false,
    description:
      "Regenerowana turbosprężarka do Toyota Avensis T25 2.2 D4D 150/177 KM. Silnik 2AD-FHV – niezawodna regeneracja.",
    specs: [
      "Ciśnienie doładowania: 1.8 bar",
      "Przepływ powietrza: 300 kg/h",
      "Maks. prędkość obrotowa: 185 000 RPM",
      "Typ CHRA: Garrett GT1749V",
    ],
  },
  {
    id: 10,
    name: "Turbosprężarka Regenerowana",
    brand: "Peugeot",
    model: "308 2.0 HDi",
    engineCode: "DW10CTED4",
    oemNumber: "0375J6",
    price: 849,
    b2bPrice: 764,
    warranty: "24 miesiące",
    available: true,
    isNew: false,
    isBestseller: false,
    description:
      "Regenerowana turbosprężarka do Peugeot 308 2.0 HDi 136/150 KM. Silnik DW10 – profesjonalna regeneracja z testem szczelności.",
    specs: [
      "Ciśnienie doładowania: 1.7 bar",
      "Przepływ powietrza: 290 kg/h",
      "Maks. prędkość obrotowej: 190 000 RPM",
      "Typ CHRA: Garrett GT1749V",
    ],
  },
  {
    id: 11,
    name: "Turbosprężarka Regenerowana",
    brand: "Ford",
    model: "Mondeo 2.0 TDCi",
    engineCode: "AZBA / UFBA",
    oemNumber: "2145762",
    price: 1199,
    b2bPrice: 1079,
    warranty: "24 miesiące",
    available: true,
    isNew: true,
    isBestseller: false,
    description:
      "Regenerowana turbosprężarka do Ford Mondeo Mk5 2.0 TDCi 150/180 KM. Nowoczesna geometria zmiennej łopatki.",
    specs: [
      "Ciśnienie doładowania: 1.9 bar",
      "Przepływ powietrza: 350 kg/h",
      "Maks. prędkość obrotowa: 200 000 RPM",
      "Typ CHRA: BorgWarner EFR",
    ],
  },
  {
    id: 12,
    name: "Turbosprężarka Regenerowana",
    brand: "Skoda",
    model: "Octavia 2.0 TDI",
    engineCode: "CFHC / CLCB",
    oemNumber: "03L253056A",
    price: 1399,
    b2bPrice: 1259,
    warranty: "24 miesiące",
    available: true,
    isNew: false,
    isBestseller: true,
    description:
      "Regenerowana turbosprężarka do Skoda Octavia III 2.0 TDI 150/184 KM. Silniki CFHC i CLCB – pełna regeneracja z gwarancją.",
    specs: [
      "Ciśnienie doładowania: 2.0 bar",
      "Przepływ powietrza: 360 kg/h",
      "Maks. prędkość obrotowa: 200 000 RPM",
      "Typ CHRA: BorgWarner K04",
    ],
  },
];

export const categories: Category[] = [
  { name: "Audi", slug: "audi", count: 34 },
  { name: "BMW", slug: "bmw", count: 28 },
  { name: "Ford", slug: "ford", count: 41 },
  { name: "Mercedes", slug: "mercedes", count: 25 },
  { name: "Volkswagen", slug: "volkswagen", count: 38 },
  { name: "Volvo", slug: "volvo", count: 19 },
  { name: "Renault", slug: "renault", count: 32 },
  { name: "Opel", slug: "opel", count: 27 },
  { name: "Toyota", slug: "toyota", count: 22 },
  { name: "Peugeot", slug: "peugeot", count: 18 },
  { name: "Skoda", slug: "skoda", count: 31 },
  { name: "Hyundai", slug: "hyundai", count: 15 },
];
