"use client";

import { useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ChevronRight,
  Circle,
  ClipboardCheck,
  Clock3,
  Eye,
  Fingerprint,
  Gauge,
  MapPin,
  PackageCheck,
  RefreshCw,
  ScanBarcode,
  ShieldCheck,
  Sparkles,
  Target,
  Truck,
  XCircle,
} from "lucide-react";

type Widok = "centrum" | "przyjecie" | "paszport" | "ryzyko" | "symulator";
type StanSlotu = "zajeta" | "wolna" | "rezerwacja" | "blokada";
type Decyzja = "zielona" | "zolta" | "czerwona" | null;
type Klient = "Sieć detaliczna Alfa" | "Marka zdrowej żywności" | "Marka kosmetyczna";
type Dowody = { asn: boolean; zdjecie: boolean; waga: boolean; lokacja: boolean };

type Paleta = {
  produkt: string;
  skrot: string;
  sscc: string;
  gtin: string;
  batch: string;
  data: string;
  dni: number;
  ilosc: string;
  waga: string;
  klient: Klient;
  pewnosc: number;
  stan: "Dostępna" | "Priorytet FEFO" | "Kwarantanna";
  dowody: Dowody;
  historia: { czas: string; tytul: string; opis: string; status: "potwierdzone" | "oczekuje" | "blokada" }[];
};

type Slot = {
  id: string;
  aleja: string;
  poziom: "A" | "B" | "C" | "D";
  pozycja: 1 | 2 | 3;
  stan: StanSlotu;
  dystans: number;
  paleta?: Paleta;
  notatka?: string;
};

const DEMO_GS1 = "(00)123456789012345675(01)05901234123457(10)POMARANCZA-2407(17)270930(37)48";
const SEPARATOR_GS = String.fromCharCode(29);

const KONTRAKTY: Record<Klient, { minimum: number; aleja: string; opis: string }> = {
  "Sieć detaliczna Alfa": { minimum: 21, aleja: "601", opis: "FMCG · towar ambient" },
  "Marka zdrowej żywności": { minimum: 45, aleja: "605", opis: "FMCG · zaostrzone FEFO" },
  "Marka kosmetyczna": { minimum: 90, aleja: "615", opis: "kosmetyki · zapas wrażliwy" },
};

function historia(...items: [string, string, string, "potwierdzone" | "oczekuje" | "blokada"][]) {
  return items.map(([czas, tytul, opis, status]) => ({ czas, tytul, opis, status }));
}

const PALETY = {
  jablko: {
    produkt: "Sok jabłkowy 6 × 1 L",
    skrot: "JABŁKO",
    sscc: "340123450000000000",
    gtin: "05901234123457",
    batch: "JABLKO-2406",
    data: "2026-08-22",
    dni: 48,
    ilosc: "48 kartonów · 288 szt.",
    waga: "512 kg brutto",
    klient: "Sieć detaliczna Alfa" as Klient,
    pewnosc: 96,
    stan: "Dostępna" as const,
    dowody: { asn: true, zdjecie: true, waga: true, lokacja: true },
    historia: historia(
      ["09:16:08", "Skan GS1 potwierdzony", "Odczytano SSCC, GTIN, batch, termin i ilość.", "potwierdzone"],
      ["09:16:10", "Awizacja ASN zgodna", "Paleta występuje w dostawie ASN-PL01-240705-018.", "potwierdzone"],
      ["09:16:21", "Waga kontrolna zgodna", "Odchylenie względem referencji: 0,4%.", "potwierdzone"],
      ["09:18:44", "Lokowanie potwierdzone", "Skan lokacji 601 A1 zamknął łańcuch opieki.", "potwierdzone"],
    ),
  },
  pomarancza: {
    produkt: "Nektar pomarańczowy 6 × 1 L",
    skrot: "POMARAŃCZA",
    sscc: "003400123456789019",
    gtin: "05901234123457",
    batch: "POMARANCZA-2407",
    data: "2026-08-03",
    dni: 29,
    ilosc: "48 kartonów · 288 szt.",
    waga: "498 kg brutto",
    klient: "Marka zdrowej żywności" as Klient,
    pewnosc: 88,
    stan: "Priorytet FEFO" as const,
    dowody: { asn: true, zdjecie: true, waga: false, lokacja: true },
    historia: historia(
      ["09:42:03", "Skan GS1 potwierdzony", "Pełna identyfikacja jednostki została zapisana.", "potwierdzone"],
      ["09:42:07", "Reguła FEFO podniosła priorytet", "Termin krótszy niż 45 dni dla tego kontraktu.", "potwierdzone"],
      ["09:44:33", "Brak drugiego źródła wagi", "Nie blokuje przepływu, ale obniża pewność operacyjną.", "oczekuje"],
    ),
  },
  cola: {
    produkt: "Napój gazowany Cola 12 × 0,5 L",
    skrot: "COLA",
    sscc: "036000291452000000",
    gtin: "05901234999991",
    batch: "COLA-2405",
    data: "2026-10-18",
    dni: 105,
    ilosc: "64 kartony · 768 szt.",
    waga: "742 kg brutto",
    klient: "Sieć detaliczna Alfa" as Klient,
    pewnosc: 91,
    stan: "Dostępna" as const,
    dowody: { asn: true, zdjecie: true, waga: false, lokacja: true },
    historia: historia(
      ["08:33:15", "Skan GS1 potwierdzony", "SSCC i batch zostały dopasowane do awizacji.", "potwierdzone"],
      ["08:36:20", "Lokowanie potwierdzone", "Skan lokacji 601 B2 został zapisany.", "potwierdzone"],
      ["08:36:24", "Waga nieodczytana", "Urządzenie przyrampowe nie zwróciło wyniku drugiego pomiaru.", "oczekuje"],
    ),
  },
  energia: {
    produkt: "Napój energetyczny 24 × 250 ml",
    skrot: "ENERGIA",
    sscc: "590123450000000005",
    gtin: "05901234000006",
    batch: "ENERGIA-2407",
    data: "2026-07-29",
    dni: 24,
    ilosc: "80 kartonów · 1 920 szt.",
    waga: "818 kg brutto",
    klient: "Marka zdrowej żywności" as Klient,
    pewnosc: 94,
    stan: "Priorytet FEFO" as const,
    dowody: { asn: true, zdjecie: true, waga: true, lokacja: true },
    historia: historia(
      ["09:04:08", "Skan GS1 potwierdzony", "Kod zeskanowano w strefie przyjęć D03.", "potwierdzone"],
      ["09:04:15", "Reguła FEFO podniosła priorytet", "Paleta trafi do kolejnej fali uzupełnienia.", "potwierdzone"],
      ["09:06:40", "Lokowanie potwierdzone", "Łańcuch opieki zamknięty w 605 A1.", "potwierdzone"],
    ),
  },
  pielegnacja: {
    produkt: "Zestaw pielęgnacyjny 12 szt.",
    skrot: "PIELĘGNACJA",
    sscc: "950123450000000004",
    gtin: "05901234777772",
    batch: "PIELEGNACJA-2406",
    data: "2027-01-12",
    dni: 191,
    ilosc: "36 kartonów · 432 zestawy",
    waga: "284 kg brutto",
    klient: "Marka kosmetyczna" as Klient,
    pewnosc: 91,
    stan: "Dostępna" as const,
    dowody: { asn: true, zdjecie: true, waga: false, lokacja: true },
    historia: historia(
      ["08:58:11", "Skan GS1 potwierdzony", "Identyfikacja i batch zgodne z etykietą zbiorczą.", "potwierdzone"],
      ["08:59:02", "Zgodność z kontraktem", "Spełniono zasady strefy kosmetycznej.", "potwierdzone"],
      ["09:03:41", "Lokowanie potwierdzone", "Skan lokacji 615 A1 został zapisany.", "potwierdzone"],
    ),
  },
};

function slot(aleja: string, poziom: Slot["poziom"], pozycja: Slot["pozycja"], stan: StanSlotu, dystans: number, paleta?: Paleta, notatka?: string): Slot {
  return { id: `${aleja}-${poziom}${pozycja}`, aleja, poziom, pozycja, stan, dystans, paleta, notatka };
}

const POCZATKOWE_REGAŁY: Record<string, Slot[]> = {
  "601": [
    slot("601", "A", 1, "zajeta", 12, PALETY.jablko), slot("601", "A", 2, "wolna", 14, undefined, "Najbliższa zgodna lokalizacja"), slot("601", "A", 3, "rezerwacja", 16, undefined, "Oczekuje na paletę z rampy D05"),
    slot("601", "B", 1, "zajeta", 19, PALETY.pomarancza), slot("601", "B", 2, "zajeta", 21, PALETY.cola), slot("601", "B", 3, "wolna", 24),
    slot("601", "C", 1, "wolna", 27), slot("601", "C", 2, "blokada", 29, undefined, "Inspekcja belki regałowej do 12:30"), slot("601", "C", 3, "wolna", 31),
    slot("601", "D", 1, "wolna", 34), slot("601", "D", 2, "wolna", 36), slot("601", "D", 3, "wolna", 38),
  ],
  "605": [
    slot("605", "A", 1, "zajeta", 11, PALETY.energia), slot("605", "A", 2, "wolna", 14, undefined, "Strefa FEFO zgodna z kontraktem"), slot("605", "A", 3, "blokada", 17, undefined, "Czyszczenie po incydencie jakościowym"),
    slot("605", "B", 1, "wolna", 20), slot("605", "B", 2, "rezerwacja", 23, undefined, "Przypisano do ASN-PL01-240705-022"), slot("605", "B", 3, "wolna", 26),
    slot("605", "C", 1, "wolna", 29), slot("605", "C", 2, "wolna", 32), slot("605", "C", 3, "wolna", 35),
    slot("605", "D", 1, "wolna", 38), slot("605", "D", 2, "wolna", 41), slot("605", "D", 3, "wolna", 44),
  ],
  "615": [
    slot("615", "A", 1, "zajeta", 15, PALETY.pielegnacja), slot("615", "A", 2, "wolna", 18), slot("615", "A", 3, "wolna", 21),
    slot("615", "B", 1, "rezerwacja", 24, undefined, "Oczekuje na kontrolę etykiety"), slot("615", "B", 2, "wolna", 27), slot("615", "B", 3, "wolna", 30),
    slot("615", "C", 1, "wolna", 33), slot("615", "C", 2, "wolna", 36), slot("615", "C", 3, "wolna", 39),
    slot("615", "D", 1, "wolna", 42), slot("615", "D", 2, "wolna", 45), slot("615", "D", 3, "wolna", 48),
  ],
};

function dataGs1(wartosc?: string) {
  if (!wartosc || !/^\d{6}$/.test(wartosc)) return undefined;
  const rok = 2000 + Number(wartosc.slice(0, 2));
  const miesiac = Number(wartosc.slice(2, 4));
  const dzien = Number(wartosc.slice(4, 6));
  if (miesiac < 1 || miesiac > 12 || dzien > 31) return undefined;
  return new Date(rok, miesiac - 1, dzien || 1);
}

function dniDoTerminu(data?: Date) {
  if (!data) return undefined;
  const dzisiaj = new Date();
  dzisiaj.setHours(0, 0, 0, 0);
  return Math.ceil((data.getTime() - dzisiaj.getTime()) / 86_400_000);
}

function poprawnySscc(sscc?: string) {
  if (!sscc || !/^\d{18}$/.test(sscc)) return false;
  const suma = [...sscc.slice(0, -1)].reverse().reduce((wynik, cyfra, indeks) => wynik + Number(cyfra) * (indeks % 2 === 0 ? 3 : 1), 0);
  return (10 - (suma % 10)) % 10 === Number(sscc[17]);
}

function parsujGs1(tekst: string) {
  const surowy = tekst.trim().replace(/^\][A-Za-z0-9]{2}/, "");
  const elementy: Record<string, string> = {};
  if (surowy.includes("(")) {
    const wzorzec = /\((\d{2,4})\)([^\(]*)/g;
    let wynik: RegExpExecArray | null;
    while ((wynik = wzorzec.exec(surowy)) !== null) elementy[wynik[1]] = wynik[2].trim();
  } else {
    const stale: Record<string, number> = { "00": 18, "01": 14, "15": 6, "17": 6 };
    let pozycja = 0;
    while (pozycja < surowy.length) {
      if (surowy[pozycja] === SEPARATOR_GS) { pozycja += 1; continue; }
      const ai = surowy.slice(pozycja, pozycja + 2);
      if (!stale[ai] && ai !== "10" && ai !== "37") break;
      pozycja += 2;
      const koniec = stale[ai] ? pozycja + stale[ai] : (() => { const separator = surowy.indexOf(SEPARATOR_GS, pozycja); return separator === -1 ? surowy.length : separator; })();
      elementy[ai] = surowy.slice(pozycja, koniec);
      pozycja = stale[ai] ? koniec : koniec + 1;
    }
  }
  return { sscc: elementy["00"], gtin: elementy["01"], batch: elementy["10"], data: elementy["17"] || elementy["15"], ilosc: elementy["37"] };
}

function kolorStanu(stan: StanSlotu) {
  if (stan === "wolna") return "border-[#3e9f88] bg-[#123c36] text-[#b8f3d9]";
  if (stan === "rezerwacja") return "border-[#cc9a37] bg-[#3a2b0e] text-[#ffe0a0]";
  if (stan === "blokada") return "border-[#cc535e] bg-[#3a151c] text-[#ffc1c8]";
  return "border-[#34506d] bg-[#111e2c] text-[#d9ecff]";
}

function kolorPewnosci(punkty: number) {
  if (punkty >= 90) return "border-[#3e9f88] bg-[#123c36] text-[#b8f3d9]";
  if (punkty >= 75) return "border-[#cc9a37] bg-[#3a2b0e] text-[#ffe0a0]";
  return "border-[#cc535e] bg-[#3a151c] text-[#ffc1c8]";
}

function opisPewnosci(punkty: number) {
  if (punkty >= 90) return "bardzo wysoka";
  if (punkty >= 75) return "warunkowa";
  return "niska";
}

function widokDaty(data?: Date) { return data ? data.toISOString().slice(0, 10) : "—"; }

export default function FlowOsCommandCenter() {
  const [widok, setWidok] = useState<Widok>("centrum");
  const [aleja, setAleja] = useState("601");
  const [regały, setRegały] = useState(POCZATKOWE_REGAŁY);
  const [wybranySlot, setWybranySlot] = useState("601-A1");
  const [klient, setKlient] = useState<Klient>("Sieć detaliczna Alfa");
  const [tekstSkanu, setTekstSkanu] = useState(DEMO_GS1);
  const [dowody, setDowody] = useState<Dowody>({ asn: true, zdjecie: true, waga: true, lokacja: true });
  const [odczyt, setOdczyt] = useState<ReturnType<typeof parsujGs1> | null>(null);
  const [decyzja, setDecyzja] = useState<Decyzja>(null);
  const [opisDecyzji, setOpisDecyzji] = useState("Brama Prawdy oczekuje na skan GS1 i zestaw niezależnych dowodów.");
  const [scenariusz, setScenariusz] = useState<"dopuszcz" | "zatrzymaj" | "eskaluj">("dopuszcz");
  const [komunikat, setKomunikat] = useState("Wersja demonstracyjna: żadna decyzja nie trafia do systemu produkcyjnego.");

  const wszystkieSloty = useMemo(() => Object.values(regały).flat(), [regały]);
  const slot = wszystkieSloty.find((pozycja) => pozycja.id === wybranySlot) ?? wszystkieSloty[0];
  const paleta = slot.paleta;
  const regulka = KONTRAKTY[klient];
  const data = dataGs1(odczyt?.data);
  const dni = dniDoTerminu(data);
  const duplikat = Boolean(odczyt?.sscc && wszystkieSloty.some((pozycja) => pozycja.paleta?.sscc === odczyt.sscc));
  const pewnosc = odczyt ? Math.max(0, (poprawnySscc(odczyt.sscc) ? 25 : 0) + (odczyt.gtin ? 8 : 0) + (odczyt.batch ? 12 : 0) + (odczyt.data ? 15 : 0) + (odczyt.ilosc ? 4 : 0) + (dowody.asn ? 13 : 0) + (dowody.zdjecie ? 8 : 0) + (dowody.waga ? 8 : 0) + (dowody.lokacja ? 7 : 0) - (duplikat ? 70 : 0)) : 0;
  const statystyki = useMemo(() => {
    const palety = wszystkieSloty.flatMap((pozycja) => pozycja.paleta ? [pozycja.paleta] : []);
    return {
      pewnosc: Math.round(palety.reduce((suma, pozycja) => suma + pozycja.pewnosc, 0) / palety.length),
      fefo: palety.filter((pozycja) => pozycja.stan === "Priorytet FEFO").length,
      wolne: wszystkieSloty.filter((pozycja) => pozycja.stan === "wolna").length,
      blokady: wszystkieSloty.filter((pozycja) => pozycja.stan === "blokada").length,
    };
  }, [wszystkieSloty]);

  function wybierzAleje(nowaAleja: string) {
    setAleja(nowaAleja);
    const pierwszy = regały[nowaAleja][0];
    setWybranySlot(pierwszy.id);
  }

  function sprawdzPalete() {
    const dane = parsujGs1(tekstSkanu);
    const termin = dataGs1(dane.data);
    const pozostalo = dniDoTerminu(termin);
    const istnieje = Boolean(dane.sscc && wszystkieSloty.some((pozycja) => pozycja.paleta?.sscc === dane.sscc));
    const wynikPewnosci = Math.max(0, (poprawnySscc(dane.sscc) ? 25 : 0) + (dane.gtin ? 8 : 0) + (dane.batch ? 12 : 0) + (dane.data ? 15 : 0) + (dane.ilosc ? 4 : 0) + (dowody.asn ? 13 : 0) + (dowody.zdjecie ? 8 : 0) + (dowody.waga ? 8 : 0) + (dowody.lokacja ? 7 : 0) - (istnieje ? 70 : 0));
    setOdczyt(dane);
    if (!dane.sscc || !dane.batch || !dane.data || !poprawnySscc(dane.sscc) || istnieje || !termin || pozostalo === undefined || pozostalo < 0) {
      setDecyzja("czerwona");
      setOpisDecyzji(istnieje ? "SSCC występuje już w cyfrowym bliźniaku. Zatrzymujemy potencjalne podwójne przyjęcie lub błędny ruch." : "Brak danych krytycznych, błędny SSCC lub termin po dacie. Paleta nie może wejść do prawdy magazynowej.");
    } else if (pozostalo < regulka.minimum || wynikPewnosci < 80) {
      setDecyzja("zolta");
      setOpisDecyzji(pozostalo < regulka.minimum ? `Pozostało ${pozostalo} dni trwałości. Kontrakt wymaga minimum ${regulka.minimum} dni — potrzebna decyzja lidera.` : `Pewność operacyjna to ${wynikPewnosci}/100. Dane są możliwe do odczytania, ale brakuje niezależnego potwierdzenia.`);
    } else {
      setDecyzja("zielona");
      setOpisDecyzji(`Paleta uzyskała ${wynikPewnosci}/100. Dane GS1, termin, kontrakt i dowody są spójne — system może wskazać bezpieczne lokowanie.`);
    }
  }

  function zatwierdzRuch() {
    if (!odczyt || !decyzja) { setKomunikat("Najpierw przejdź przez Bramę Prawdy."); return; }
    if (decyzja === "czerwona") { setKomunikat("Utworzono kwarantannę jakościową. W produkcji trafiłaby do QHSE wraz z pełnym śladem audytowym."); setWidok("ryzyko"); return; }
    if (decyzja === "zolta") { setKomunikat("Utworzono kartę decyzji dla lidera zmiany. System nie zgaduje tam, gdzie brakuje pewności."); setWidok("ryzyko"); return; }
    const cel = wszystkieSloty.filter((pozycja) => pozycja.stan === "wolna" && pozycja.aleja === regulka.aleja).sort((a, b) => a.dystans - b.dystans)[0];
    if (!cel || !odczyt.sscc || !odczyt.batch || !data || dni === undefined) { setKomunikat("Nie znaleziono zgodnej wolnej lokalizacji. Zamiast przypadkowego ruchu system tworzy wyjątek."); return; }
    const nowaPaleta: Paleta = {
      produkt: "Nektar pomarańczowy 6 × 1 L",
      skrot: "POMARAŃCZA",
      sscc: odczyt.sscc,
      gtin: odczyt.gtin || "—",
      batch: odczyt.batch,
      data: widokDaty(data),
      dni,
      ilosc: `${odczyt.ilosc || "—"} kartonów`,
      waga: "Oczekuje na potwierdzenie",
      klient,
      pewnosc,
      stan: dni <= 45 ? "Priorytet FEFO" : "Dostępna",
      dowody,
      historia: historia(
        ["teraz", "Skan GS1 potwierdzony", "SSCC, GTIN, batch, data i ilość przeszły przez Bramę Prawdy.", "potwierdzone"],
        ["teraz", "Pewność operacyjna", `Wynik ${pewnosc}/100 na podstawie danych i niezależnych dowodów.`, "potwierdzone"],
        ["teraz", "Rekomendacja lokowania", `Wybrano ${cel.id.replace("-", " ")} według kontraktu, dystansu i dostępności.`, "potwierdzone"],
      ),
    };
    setRegały((obecne) => ({ ...obecne, [cel.aleja]: obecne[cel.aleja].map((pozycja) => pozycja.id === cel.id ? { ...pozycja, stan: "zajeta", paleta: nowaPaleta, notatka: undefined } : pozycja) }));
    setAleja(cel.aleja);
    setWybranySlot(cel.id);
    setTekstSkanu("");
    setOdczyt(null);
    setDecyzja(null);
    setKomunikat(`Utworzono paszport palety i kontrolowaną rekomendację lokowania ${cel.id.replace("-", " ")}.`);
    setWidok("paszport");
  }

  const menu = [
    { id: "centrum" as Widok, etykieta: "Centrum dowodzenia", ikona: Activity },
    { id: "przyjecie" as Widok, etykieta: "Brama przyjęć GS1", ikona: ScanBarcode },
    { id: "paszport" as Widok, etykieta: "Paszport palety", ikona: Fingerprint },
    { id: "ryzyko" as Widok, etykieta: "Radar ryzyka", ikona: Gauge },
    { id: "symulator" as Widok, etykieta: "Symulator decyzji", ikona: Sparkles },
  ];

  const scenariusze = {
    dopuszcz: { tytul: "Dopuść warunkowo", kolor: "border-[#3e9f88] bg-[#123c36]", opis: "Ruch przechodzi tylko dlatego, że paleta posiada komplet sprawdzalnych dowodów.", skutki: ["Tworzy paszport przed ruchem do regału.", "Rekomenduje lokalizację zgodną z kontraktem.", "Zostawia podstawę do FEFO, recall i rozliczenia jakości."] },
    zatrzymaj: { tytul: "Zatrzymaj w kwarantannie", kolor: "border-[#cc535e] bg-[#3a151c]", opis: "Brak pewności nie może zamienić się w ukrytą wadę zapasu.", skutki: ["Nie dopuszcza palety do stanu dostępnego.", "Przekazuje powód i dowody do jakości / QHSE.", "Chroni wysyłkę przed niewłaściwą partią lub terminem."] },
    eskaluj: { tytul: "Przekaż liderowi zmianę", kolor: "border-[#cc9a37] bg-[#3a2b0e]", opis: "System pokazuje konsekwencję, ale nie udaje, że zastępuje odpowiedzialną decyzję człowieka.", skutki: ["Łączy skan, kontrakt, termin i dowody na jednej karcie.", "Wyznacza właściciela oraz priorytet decyzji.", "Zapisuje uzasadnienie override zamiast ukrytego obejścia."] },
  }[scenariusz];

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#05090f] text-[#edf5f7] selection:bg-[#fe5c45] selection:text-white">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_20%_0%,rgba(41,91,132,.24),transparent_36%),radial-gradient(circle_at_82%_12%,rgba(254,92,69,.15),transparent_28%),linear-gradient(145deg,#05090f_0%,#0a111b_54%,#05090f_100%)]" />
      <div className="relative mx-auto flex min-h-screen max-w-[1720px] flex-col xl:flex-row">
        <aside className="w-full border-b border-white/10 bg-[#071019]/90 px-4 py-4 backdrop-blur xl:sticky xl:top-0 xl:h-screen xl:w-[292px] xl:shrink-0 xl:border-b-0 xl:border-r xl:px-5 xl:py-6">
          <div className="flex items-center gap-3 px-1">
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-[#fe5c45] text-xs font-black tracking-[-.14em] shadow-[0_12px_30px_rgba(254,92,69,.34)]">FM</div>
            <div><p className="text-sm font-black tracking-[.12em]">FLOW.OS</p><p className="mt-0.5 text-[10px] font-bold tracking-[.18em] text-[#88a0ad]">PULS PRAWDY FIZYCZNEJ</p></div>
          </div>
          <div className="mt-5 rounded-2xl border border-white/10 bg-white/[.035] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,.04)]">
            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[.14em] text-[#93acb8]"><i className="h-2 w-2 rounded-full bg-[#a8df52] shadow-[0_0_0_5px_rgba(168,223,82,.10)]" />Platforma PL-01 · pilotaż</div>
            <p className="mt-2 text-sm font-extrabold">FM LOGISTIC · 3PL / FMCG</p>
            <p className="mt-1.5 text-xs leading-5 text-[#a8bbc3]">Warstwa decyzyjna nad WMS: dowody, pewność i ryzyko przed fizycznym ruchem palety.</p>
          </div>
          <nav className="mt-5 flex gap-1 overflow-x-auto pb-1 xl:flex-col xl:overflow-visible">{menu.map((pozycja) => { const Ikona = pozycja.ikona; return <button key={pozycja.id} onClick={() => setWidok(pozycja.id)} className={`flex shrink-0 items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-bold transition ${widok === pozycja.id ? "bg-[#fe5c45]/16 text-white shadow-[inset_3px_0_0_#fe5c45]" : "text-[#a8bbc3] hover:bg-white/5 hover:text-white"}`}><Ikona size={17} />{pozycja.etykieta}</button>; })}</nav>
          <div className="mt-7 hidden rounded-2xl border border-[#a8df52]/15 bg-[#a8df52]/[.05] p-4 xl:block"><p className="text-[10px] font-black uppercase tracking-[.12em] text-[#bfe67e]">Zasada FLOW.OS</p><p className="mt-2 text-xs leading-5 text-[#c9d9d0]">Nie zapisuje ruchu tylko dlatego, że ktoś zeskanował kod. Najpierw pyta: <strong>czy możemy to udowodnić?</strong></p></div>
        </aside>

        <section className="min-w-0 flex-1 px-4 py-5 sm:px-6 lg:px-8 xl:px-9">
          <header className="flex flex-col gap-4 border-b border-white/10 pb-5 lg:flex-row lg:items-start lg:justify-between">
            <div><div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[.15em] text-[#8fa6b2]"><span>FM Logistic</span><ChevronRight size={12} /><span className="text-[#fe765e]">PL-01</span><ChevronRight size={12} /><span>{menu.find((pozycja) => pozycja.id === widok)?.etykieta}</span></div><h1 className="mt-2 text-3xl font-black tracking-[-.065em] text-white sm:text-4xl">Magazyn, który potrafi uzasadnić swoją decyzję.</h1><p className="mt-2 max-w-4xl text-sm leading-6 text-[#9eb2bc]">FLOW.OS nie jest kolejnym WMS-em. To cyfrowy bliźniak prawdy fizycznej: pokazuje położenie, stan i historię każdej palety — oraz dowody, które pozwalają jej wykonać kolejny ruch.</p></div>
            <div className="flex flex-wrap items-center gap-2"><select value={klient} onChange={(event) => setKlient(event.target.value as Klient)} className="h-10 rounded-xl border border-white/10 bg-[#0b1620] px-3 text-xs font-bold text-white outline-none"><option>Sieć detaliczna Alfa</option><option>Marka zdrowej żywności</option><option>Marka kosmetyczna</option></select><button onClick={() => { setTekstSkanu(DEMO_GS1); setOdczyt(null); setDecyzja(null); setKomunikat("Wczytano poprawną etykietę demonstracyjną GS1."); }} className="inline-flex h-10 items-center gap-2 rounded-xl border border-white/10 bg-white/[.04] px-3 text-xs font-bold text-white transition hover:bg-white/[.08]"><RefreshCw size={14} />Demo GS1</button></div>
          </header>
          <div className="mt-4 flex items-start gap-2 rounded-xl border border-[#fe5c45]/25 bg-[#fe5c45]/[.07] px-4 py-3 text-xs leading-5 text-[#f5c3ba]"><ShieldCheck size={17} className="mt-0.5 shrink-0 text-[#fe765e]" /><span><strong>Bezpieczny prototyp:</strong> to demonstracja interfejsu i logiki. Nie ma dostępu do prywatnych serwerów, WMS, klientów ani urządzeń FM Logistic.</span></div>

          {widok === "centrum" && <div className="space-y-5 pt-5">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{[["Pewność zapasu", `${statystyki.pewnosc}/100`, "średnia z aktywnych palet", "#a8df52"], ["Priorytet FEFO", statystyki.fefo, "palety wymagające kolejności", "#f9bf57"], ["Wolne sloty", statystyki.wolne, "po odjęciu rezerwacji i blokad", "#72b7ff"], ["Blokady fizyczne", statystyki.blokady, "automatycznie pomijane", "#ff7281"]].map(([etykieta, wartosc, opis, kolor]) => <article key={String(etykieta)} className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/[.035] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,.04)]"><div className="absolute -right-7 -top-7 h-24 w-24 rounded-full opacity-20" style={{ backgroundColor: String(kolor) }} /><p className="relative text-[10px] font-black uppercase tracking-[.12em] text-[#8fa6b2]">{etykieta}</p><p className="relative mt-3 text-3xl font-black tracking-[-.07em] text-white">{wartosc}</p><p className="relative mt-1 text-[11px] font-bold" style={{ color: String(kolor) }}>{opis}</p></article>)}</div>

            <div className="grid gap-5 2xl:grid-cols-[minmax(0,1.45fr)_minmax(320px,.55fr)]">
              <article className="overflow-hidden rounded-3xl border border-white/10 bg-[#09131e]/92 shadow-[0_22px_70px_rgba(0,0,0,.32)]">
                <div className="flex flex-col gap-4 border-b border-white/10 p-5 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-[10px] font-black uppercase tracking-[.15em] text-[#fe765e]">Cyfrowy bliźniak · stan fizyczny</p><h2 className="mt-1 text-xl font-black tracking-[-.04em] text-white">Regał paletowy — aleja {aleja}</h2><p className="mt-1 text-xs leading-5 text-[#94aab5]">Poziomy A–D i trzy pozycje. Kliknij slot, aby otworzyć pełną historię i paszport palety.</p></div><div className="flex rounded-xl border border-white/10 bg-black/15 p-1">{["601", "605", "615"].map((kod) => <button key={kod} onClick={() => wybierzAleje(kod)} className={`rounded-lg px-3 py-2 text-xs font-black transition ${aleja === kod ? "bg-[#fe5c45] text-white shadow-[0_6px_16px_rgba(254,92,69,.26)]" : "text-[#9eb2bc] hover:text-white"}`}>Aleja {kod}</button>)}</div></div>
                <div className="relative overflow-x-auto p-5"><div className="absolute inset-0 opacity-[.16] [background-image:linear-gradient(rgba(130,160,175,.25)_1px,transparent_1px),linear-gradient(90deg,rgba(130,160,175,.25)_1px,transparent_1px)] [background-size:28px_28px]" /><div className="relative min-w-[680px] rounded-2xl border border-[#4f6473]/60 bg-[#08111a] p-4 shadow-[inset_0_0_38px_rgba(0,0,0,.4)]"><div className="mb-3 grid grid-cols-[54px_repeat(3,minmax(0,1fr))] gap-3 px-1 text-[10px] font-black uppercase tracking-[.14em] text-[#738c99]"><span>Poziom</span><span className="text-center">Miejsce 1</span><span className="text-center">Miejsce 2</span><span className="text-center">Miejsce 3</span></div><div className="space-y-3">{(["D", "C", "B", "A"] as const).map((poziom) => <div key={poziom} className="grid grid-cols-[54px_repeat(3,minmax(0,1fr))] gap-3"><div className="flex items-center justify-center rounded-xl border border-white/10 bg-white/[.03] text-lg font-black text-[#d6e8ee]">{poziom}</div>{regały[aleja].filter((pozycja) => pozycja.poziom === poziom).map((pozycja) => <button key={pozycja.id} onClick={() => setWybranySlot(pozycja.id)} className={`group relative min-h-[112px] overflow-hidden rounded-xl border p-2.5 text-left transition duration-200 ${kolorStanu(pozycja.stan)} ${wybranySlot === pozycja.id ? "ring-2 ring-[#fe5c45] ring-offset-2 ring-offset-[#08111a]" : "hover:-translate-y-0.5 hover:brightness-110"}`}><div className="absolute inset-x-0 bottom-0 h-2 bg-black/25" /><div className="flex items-center justify-between"><span className="text-[10px] font-black tracking-[.1em]">{pozycja.id.replace("-", " ")}</span><span className="text-[9px] font-bold opacity-70">{pozycja.stan === "zajeta" ? "ZAJĘTE" : pozycja.stan === "wolna" ? "WOLNE" : pozycja.stan === "rezerwacja" ? "REZERW." : "BLOKADA"}</span></div>{pozycja.paleta ? <div className="relative mt-2 overflow-hidden rounded-lg border border-white/15 bg-gradient-to-br from-[#d2a75b] via-[#b68137] to-[#6e4316] px-2 py-2 text-[#251607] shadow-[0_9px_0_#5e3710,0_13px_18px_rgba(0,0,0,.28)]"><div className="absolute inset-x-2 top-1 h-px bg-white/45" /><p className="relative text-[10px] font-black leading-3">{pozycja.paleta.skrot}</p><p className="relative mt-1 font-mono text-[9px] font-black">…{pozycja.paleta.sscc.slice(-6)}</p><div className="relative mt-1 flex items-center justify-between text-[8px] font-black"><span>{pozycja.paleta.batch.slice(-6)}</span><span>{pozycja.paleta.dni} dni</span></div></div> : <div className="mt-5 text-center"><p className="text-xs font-black">{pozycja.stan === "wolna" ? "Miejsce dostępne" : pozycja.notatka || "Niedostępne"}</p><p className="mt-1 text-[10px] opacity-70">{pozycja.dystans} m od punktu D04</p></div>}</button>)}</div>)}</div><div className="mt-4 flex flex-wrap gap-3 text-[10px] font-bold text-[#9fb4be]"><span className="inline-flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-full bg-[#d2a75b]" />zajęte paletą</span><span className="inline-flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-full bg-[#3e9f88]" />wolne</span><span className="inline-flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-full bg-[#cc9a37]" />rezerwacja</span><span className="inline-flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-full bg-[#cc535e]" />blokada</span></div></div></div>
              </article>

              <article className="rounded-3xl border border-white/10 bg-[#09131e]/92 p-5 shadow-[0_22px_70px_rgba(0,0,0,.32)]"><div className="flex items-start justify-between gap-3"><div><p className="text-[10px] font-black uppercase tracking-[.14em] text-[#fe765e]">Inspektor slotu</p><h2 className="mt-1 text-xl font-black tracking-[-.04em] text-white">{slot.id.replace("-", " ")}</h2><p className="mt-1 text-xs text-[#93a8b3]">Aleja {slot.aleja} · poziom {slot.poziom} · miejsce {slot.pozycja}</p></div><MapPin className="text-[#fe765e]" size={23} /></div>{paleta ? <><div className="mt-5 rounded-2xl border border-[#d2a75b]/40 bg-gradient-to-br from-[#3b2b12] to-[#15120b] p-4"><div className="flex items-center justify-between gap-3"><div><p className="text-[10px] font-black uppercase tracking-[.1em] text-[#e9c77f]">{paleta.stan}</p><p className="mt-1 text-sm font-black text-white">{paleta.produkt}</p></div><span className={`rounded-xl border px-3 py-2 text-sm font-black ${kolorPewnosci(paleta.pewnosc)}`}>{paleta.pewnosc}/100</span></div><p className="mt-3 font-mono text-[11px] font-bold text-[#ead9b7]">SSCC {paleta.sscc}</p></div><div className="mt-4 grid grid-cols-2 gap-2">{[["Batch", paleta.batch],["Termin", `${paleta.data} · ${paleta.dni} dni`],["Ilość", paleta.ilosc],["Waga", paleta.waga]].map(([etykieta, wartosc]) => <div key={etykieta} className="rounded-xl border border-white/10 bg-white/[.035] p-3"><p className="text-[9px] font-black uppercase tracking-[.1em] text-[#7f99a5]">{etykieta}</p><p className="mt-1 text-xs font-extrabold text-white">{wartosc}</p></div>)}</div><button onClick={() => setWidok("paszport")} className="mt-4 inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-white/[.07] text-xs font-black text-white transition hover:bg-white/[.12]"><Fingerprint size={15} />Otwórz pełny paszport</button></> : <><div className={`mt-5 rounded-2xl border p-4 ${kolorStanu(slot.stan)}`}><p className="text-sm font-black">{slot.stan === "wolna" ? "Gotowe na decyzję" : slot.stan === "rezerwacja" ? "Slot przypisany" : "Slot wyłączony"}</p><p className="mt-2 text-xs leading-5 opacity-85">{slot.notatka || "System nie wybierze tej pozycji dopóki stan nie zmieni się na dostępny."}</p></div><div className="mt-4 rounded-xl border border-white/10 bg-white/[.035] p-3"><p className="text-[10px] font-black uppercase tracking-[.1em] text-[#7f99a5]">Ocena lokacji</p><p className="mt-1 text-sm font-black text-white">{slot.dystans} m od rampy D04</p><p className="mt-1 text-[11px] leading-5 text-[#95abb5]">Silnik uwzględnia kontrakt, ograniczenia oraz kolejną trasę operatora — nie tylko pusty slot.</p></div></>}</article>
            </div>

            <div className="grid gap-5 xl:grid-cols-[1.05fr_.95fr]"><article className="rounded-3xl border border-white/10 bg-white/[.035] p-5"><div className="flex items-start justify-between gap-3"><div><p className="text-[10px] font-black uppercase tracking-[.14em] text-[#fe765e]">Misja operatora · M-8041</p><h3 className="mt-1 text-lg font-black text-white">Jedna trasa, cztery wartościowe ruchy</h3></div><span className="rounded-xl bg-[#a8df52] px-3 py-2 text-xs font-black text-[#14220f]">11 min</span></div><div className="mt-5 space-y-2">{[["01","Przyjmij paletę","Rampa D04 · Brama Prawdy"],["02","Odłóż do 601 A2","Najbliższy zgodny slot"],["03","Pobierz FEFO z 601 B1","Nektar pomarańczowy · 29 dni"],["04","Dostarcz do PICK-04","Fala wysyłkowa 11:30"]].map(([numer,tytul,opis]) => <div key={numer} className="grid grid-cols-[34px_1fr_auto] items-center gap-3 rounded-xl border border-white/10 bg-black/10 p-3"><span className="grid h-8 w-8 place-items-center rounded-lg bg-[#fe5c45]/15 text-[10px] font-black text-[#fe8c7a]">{numer}</span><div><p className="text-xs font-black text-white">{tytul}</p><p className="mt-1 text-[11px] text-[#91a8b3]">{opis}</p></div><ArrowRight size={15} className="text-[#5d7581]" /></div>)}</div></article><article className="rounded-3xl border border-white/10 bg-white/[.035] p-5"><p className="text-[10px] font-black uppercase tracking-[.14em] text-[#fe765e]">Dlaczego system tak zdecydował?</p><h3 className="mt-1 text-lg font-black text-white">Uzasadnienie decyzji, nie czarna skrzynka.</h3><div className="mt-5 space-y-3">{[["SSCC", "poprawny identyfikator jednostki logistycznej", true], ["Batch + data", `spełnia regułę ${KONTRAKTY[klient].minimum} dni dla kontraktu`, true], ["Dowody", "ASN, zdjęcie, waga i lokalizacja budują wynik pewności", true], ["Slot", "wybrano najbliższą zgodną pozycję bez blokady", true]].map(([nazwa,opis,poprawne]) => <div key={String(nazwa)} className="flex gap-3"><span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-[#123c36] text-[#a8df52]"><CheckCircle2 size={15} /></span><p className="pt-1 text-xs leading-5 text-[#bfced4]"><strong className="text-white">{nazwa}:</strong> {opis}</p></div>)}</div></article></div>
          </div>}

          {widok === "przyjecie" && <div className="grid gap-5 pt-5 2xl:grid-cols-[1.1fr_.9fr]">
            <article className="rounded-3xl border border-white/10 bg-[#09131e]/92 p-5 shadow-[0_22px_70px_rgba(0,0,0,.32)]"><p className="text-[10px] font-black uppercase tracking-[.14em] text-[#fe765e]">Brama przyjęć GS1</p><h2 className="mt-1 text-2xl font-black tracking-[-.045em] text-white">Najpierw udowodnij paletę. Potem pozwól jej wejść.</h2><p className="mt-2 max-w-3xl text-sm leading-6 text-[#9cb1bb]">Skaner przekazuje kod GS1-128 lub GS1 DataMatrix. FLOW.OS rozkłada go na SSCC, GTIN, batch, datę i ilość, następnie dokłada dowody niezależne od samego skanu.</p><label className="mt-5 block text-xs font-extrabold text-white">Surowy odczyt kolektora / HRI GS1</label><textarea value={tekstSkanu} onChange={(event) => setTekstSkanu(event.target.value)} className="mt-2 min-h-40 w-full rounded-2xl border border-white/10 bg-black/20 p-4 font-mono text-xs leading-6 text-[#d8e8ed] outline-none transition focus:border-[#fe5c45] focus:ring-4 focus:ring-[#fe5c45]/10" placeholder="(00)SSCC(01)GTIN(10)BATCH(17)YYMMDD(37)ILOŚĆ" /><div className="mt-3 flex flex-wrap gap-2"><button onClick={sprawdzPalete} className="inline-flex h-11 items-center gap-2 rounded-xl bg-[#fe5c45] px-4 text-xs font-black text-white shadow-[0_10px_24px_rgba(254,92,69,.24)]"><ScanBarcode size={16} />Sprawdź paletę</button><button onClick={() => { setTekstSkanu(DEMO_GS1); setOdczyt(null); setDecyzja(null); }} className="inline-flex h-11 items-center gap-2 rounded-xl border border-white/10 bg-white/[.04] px-4 text-xs font-bold text-white"><RefreshCw size={15} />Wczytaj przykład</button></div><div className="mt-5 rounded-2xl border border-white/10 bg-black/15 p-4"><div className="flex items-center gap-2"><Eye size={16} className="text-[#fe765e]" /><h3 className="text-sm font-black text-white">Dowody niezależne od kodu</h3></div><p className="mt-1 text-xs leading-5 text-[#94aab5]">Każdy dodatkowy dowód obniża ryzyko, że skan jest jedyną wersją prawdy.</p><div className="mt-4 grid gap-2 sm:grid-cols-2">{[["asn", "Zgodność z ASN", "awizacja klienta"],["zdjecie", "Zdjęcie etykiety", "dowód wizualny"],["waga", "Waga kontrolna", "porównanie z referencją"],["lokacja", "Skan lokacji", "łańcuch opieki"]].map(([klucz,nazwa,opis]) => <label key={klucz} className="flex cursor-pointer items-start gap-3 rounded-xl border border-white/10 bg-white/[.03] p-3"><input type="checkbox" checked={dowody[klucz as keyof Dowody]} onChange={(event) => setDowody((obecne) => ({ ...obecne, [klucz]: event.target.checked }))} className="mt-0.5 h-4 w-4 accent-[#fe5c45]" /><span><strong className="block text-xs text-white">{nazwa}</strong><span className="mt-1 block text-[11px] text-[#93a8b3]">{opis}</span></span></label>)}</div></div><div className="mt-4 rounded-xl border border-[#a8df52]/20 bg-[#a8df52]/[.05] p-3 text-[11px] leading-5 text-[#cfe5b2]">Aktywny kontrakt: <strong>{klient}</strong> · {regulka.opis} · minimalna pozostała trwałość: <strong>{regulka.minimum} dni</strong> · rekomendowana aleja: <strong>{regulka.aleja}</strong>.</div></article>
            <article className="rounded-3xl border border-white/10 bg-[#09131e]/92 shadow-[0_22px_70px_rgba(0,0,0,.32)]"><div className="border-b border-white/10 p-5"><p className="text-[10px] font-black uppercase tracking-[.14em] text-[#8fa6b2]">Karta decyzji</p><h2 className="mt-1 text-xl font-black text-white">Czy następny ruch jest uzasadniony?</h2></div><div className="p-5"><div className={`rounded-2xl border p-4 ${decyzja === "zielona" ? "border-[#3e9f88] bg-[#123c36]" : decyzja === "zolta" ? "border-[#cc9a37] bg-[#3a2b0e]" : decyzja === "czerwona" ? "border-[#cc535e] bg-[#3a151c]" : "border-white/10 bg-white/[.03]"}`}><div className="flex items-start gap-3">{decyzja === "zielona" ? <CheckCircle2 className="mt-0.5 text-[#a8df52]" size={22} /> : decyzja === "czerwona" ? <XCircle className="mt-0.5 text-[#ff8692]" size={22} /> : <ClipboardCheck className="mt-0.5 text-[#f9bf57]" size={22} />}<div><p className="text-sm font-black text-white">{decyzja === "zielona" ? "ZIELONA · dopuszczona" : decyzja === "zolta" ? "ŻÓŁTA · decyzja człowieka" : decyzja === "czerwona" ? "CZERWONA · kwarantanna" : "OCZEKIWANIE NA WERYFIKACJĘ"}</p><p className="mt-1 text-xs leading-5 text-[#c4d3d9]">{opisDecyzji}</p></div></div></div><div className="mt-4 grid grid-cols-2 gap-2">{[["SSCC · AI (00)", odczyt?.sscc || "—"],["GTIN · AI (01)", odczyt?.gtin || "—"],["Batch · AI (10)", odczyt?.batch || "—"],["Data · AI (17)/(15)", widokDaty(data)],["Ilość · AI (37)", odczyt?.ilosc || "—"],["Termin", dni !== undefined ? `${dni} dni` : "—"]].map(([etykieta,wartosc]) => <div key={etykieta} className="rounded-xl border border-white/10 bg-white/[.03] p-3"><p className="text-[9px] font-black uppercase tracking-[.09em] text-[#8097a3]">{etykieta}</p><p className="mt-1 break-all text-xs font-extrabold text-white">{wartosc}</p></div>)}</div><div className={`mt-4 rounded-2xl border p-4 ${kolorPewnosci(pewnosc)}`}><div className="flex items-center justify-between"><div><p className="text-[10px] font-black uppercase tracking-[.1em]">Pewność operacyjna</p><p className="mt-1 text-sm font-black">{odczyt ? opisPewnosci(pewnosc) : "brak oceny"}</p></div><p className="text-4xl font-black tracking-[-.07em]">{odczyt ? pewnosc : "—"}<small className="text-sm">/100</small></p></div><div className="mt-3 h-2 overflow-hidden rounded-full bg-black/25"><div className="h-full rounded-full bg-current" style={{ width: `${pewnosc}%` }} /></div></div><button disabled={!decyzja} onClick={zatwierdzRuch} className="mt-5 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-white text-xs font-black text-[#08111a] transition hover:bg-[#d8edf1] disabled:cursor-not-allowed disabled:opacity-35"><PackageCheck size={16} />{decyzja === "zielona" ? "Utwórz rekomendację lokowania" : decyzja === "zolta" ? "Przekaż do lidera zmiany" : decyzja === "czerwona" ? "Utwórz kwarantannę jakościową" : "Czeka na weryfikację"}</button></div></article>
          </div>}

          {widok === "paszport" && <div className="space-y-5 pt-5">
            <div className="flex flex-col gap-4 rounded-3xl border border-white/10 bg-[#09131e]/92 p-5 shadow-[0_22px_70px_rgba(0,0,0,.32)] lg:flex-row lg:items-end lg:justify-between"><div><p className="text-[10px] font-black uppercase tracking-[.14em] text-[#fe765e]">Paszport palety</p><h2 className="mt-1 text-2xl font-black tracking-[-.045em] text-white">Jedna jednostka logistyczna. Pełny łańcuch dowodowy.</h2><p className="mt-2 max-w-3xl text-sm leading-6 text-[#9db2bc]">To nie jest rekord magazynowy. To audytowalna historia: źródło, batch, data, lokalizacja, dowody i decyzje dotyczące konkretnej palety.</p></div><select value={slot.id} onChange={(event) => setWybranySlot(event.target.value)} className="h-10 rounded-xl border border-white/10 bg-[#0b1620] px-3 font-mono text-xs font-bold text-white">{wszystkieSloty.filter((pozycja) => pozycja.paleta).map((pozycja) => <option key={pozycja.id} value={pozycja.id}>{pozycja.id.replace("-", " ")} · {pozycja.paleta?.sscc}</option>)}</select></div>
            {paleta ? <div className="grid gap-5 2xl:grid-cols-[.78fr_1.22fr]"><article className="rounded-3xl border border-white/10 bg-[#09131e]/92 p-5 shadow-[0_22px_70px_rgba(0,0,0,.32)]"><div className="flex items-start justify-between gap-3"><div><p className="text-[10px] font-black uppercase tracking-[.12em] text-[#8fa6b2]">Tożsamość fizyczna</p><p className="mt-2 font-mono text-sm font-black text-white">{paleta.sscc}</p></div><span className={`rounded-xl border px-3 py-2 text-sm font-black ${kolorPewnosci(paleta.pewnosc)}`}>{paleta.pewnosc}/100</span></div><div className="mt-5 rounded-2xl border border-[#d2a75b]/35 bg-gradient-to-br from-[#3a2a12] to-[#14110a] p-4"><p className="text-[10px] font-black uppercase tracking-[.1em] text-[#e7c679]">{paleta.stan}</p><p className="mt-1 text-lg font-black text-white">{paleta.produkt}</p><p className="mt-2 text-xs text-[#e3d4b1]">{paleta.ilosc} · {paleta.waga}</p></div><div className="mt-4 grid grid-cols-2 gap-2">{[["Lokacja",slot.id.replace("-", " ")],["Klient",paleta.klient],["Batch",paleta.batch],["Data",paleta.data],["Termin",`${paleta.dni} dni`],["GTIN",paleta.gtin]].map(([etykieta,wartosc]) => <div key={etykieta} className="rounded-xl border border-white/10 bg-white/[.03] p-3"><p className="text-[9px] font-black uppercase tracking-[.09em] text-[#8097a3]">{etykieta}</p><p className="mt-1 text-xs font-extrabold text-white">{wartosc}</p></div>)}</div><div className="mt-4 rounded-xl border border-white/10 bg-white/[.03] p-3"><p className="text-[10px] font-black uppercase tracking-[.1em] text-[#8097a3]">Dowody</p><div className="mt-2 grid grid-cols-2 gap-2 text-[11px] font-bold text-[#c8d8dd]">{[["ASN",paleta.dowody.asn],["Zdjęcie",paleta.dowody.zdjecie],["Waga",paleta.dowody.waga],["Lokacja",paleta.dowody.lokacja]].map(([nazwa,potwierdzone]) => <span key={String(nazwa)} className="flex items-center gap-1.5"><i className={`h-2 w-2 rounded-full ${potwierdzone ? "bg-[#a8df52]" : "bg-[#f9bf57]"}`} />{nazwa}: {potwierdzone ? "potwierdzone" : "oczekuje"}</span>)}</div></div></article><article className="rounded-3xl border border-white/10 bg-[#09131e]/92 p-5 shadow-[0_22px_70px_rgba(0,0,0,.32)]"><p className="text-[10px] font-black uppercase tracking-[.12em] text-[#8fa6b2]">Czarna skrzynka palety</p><h3 className="mt-1 text-xl font-black text-white">Historia zdarzeń i decyzji</h3><div className="mt-5 space-y-0">{paleta.historia.map((zdarzenie, indeks) => <div key={`${zdarzenie.czas}-${zdarzenie.tytul}`} className="grid grid-cols-[36px_1fr] gap-3 pb-5 last:pb-0"><div className="relative"><span className={`grid h-8 w-8 place-items-center rounded-lg ${zdarzenie.status === "potwierdzone" ? "bg-[#123c36] text-[#a8df52]" : zdarzenie.status === "oczekuje" ? "bg-[#3a2b0e] text-[#f9bf57]" : "bg-[#3a151c] text-[#ff8692]"}`}>{zdarzenie.status === "potwierdzone" ? <CheckCircle2 size={16} /> : zdarzenie.status === "oczekuje" ? <Clock3 size={16} /> : <XCircle size={16} />}</span>{indeks < paleta.historia.length - 1 && <span className="absolute left-4 top-9 h-[calc(100%-15px)] border-l border-dashed border-[#455b67]" />}</div><div><div className="flex flex-wrap items-center justify-between gap-1"><p className="text-sm font-extrabold text-white">{zdarzenie.tytul}</p><span className="font-mono text-[10px] font-bold text-[#8ba1ac]">{zdarzenie.czas}</span></div><p className="mt-1 text-xs leading-5 text-[#9db2bc]">{zdarzenie.opis}</p></div></div>)}</div></article></div> : <div className="rounded-3xl border border-white/10 bg-[#09131e]/92 p-10 text-center text-sm text-[#9db2bc]">Wybierz zajęty slot z mapy magazynu, aby otworzyć paszport palety.</div>}
          </div>}

          {widok === "ryzyko" && <div className="space-y-5 pt-5"><article className="rounded-3xl border border-white/10 bg-[#09131e]/92 p-5 shadow-[0_22px_70px_rgba(0,0,0,.32)]"><p className="text-[10px] font-black uppercase tracking-[.14em] text-[#fe765e]">Radar ryzyka</p><h2 className="mt-1 text-2xl font-black tracking-[-.045em] text-white">Zobacz problem zanim stanie się błędnym zapasem.</h2><p className="mt-2 max-w-3xl text-sm leading-6 text-[#9eb2bc]">Radar agreguje sygnały, które zwykły WMS często rozrzuca po ekranach: niepewne dowody, terminy FEFO, blokady fizyczne, różnice batchu i przypisanie odpowiedzialności.</p></article><div className="grid gap-4 xl:grid-cols-3">{[["Krytyczne", "Termin po dacie · SSCC 590123412345678909", "Kwarantanna jakościowa przed zapisem do WMS", "#ff7281"],["Wymaga decyzji", "Batch różny od ASN-PL01-240705-022", "Lider zmiany otrzymuje kompletny kontekst", "#f9bf57"],["Obserwacja", "605 A3 wyłączona z rekomendacji", "Silnik przelicza trasę z pominięciem slotu", "#72b7ff"]].map(([poziom,tytul,opis,kolor]) => <article key={String(poziom)} className="rounded-3xl border border-white/10 bg-white/[.035] p-5"><div className="flex items-center justify-between"><p className="text-[10px] font-black uppercase tracking-[.12em]" style={{ color: String(kolor) }}>{poziom}</p><AlertTriangle size={18} style={{ color: String(kolor) }} /></div><h3 className="mt-3 text-base font-black text-white">{tytul}</h3><p className="mt-2 text-xs leading-5 text-[#9db2bc]">{opis}</p><button onClick={() => setKomunikat(`Otworzono workflow: ${tytul}. W produkcji znalazłby się tutaj SLA, właściciel i pełny audyt.`)} className="mt-4 inline-flex items-center gap-1.5 text-xs font-black" style={{ color: String(kolor) }}>Otwórz sprawę <ArrowRight size={14} /></button></article>)}</div><article className="rounded-3xl border border-white/10 bg-[#09131e]/92 shadow-[0_22px_70px_rgba(0,0,0,.32)]"><div className="border-b border-white/10 p-5"><p className="text-[10px] font-black uppercase tracking-[.12em] text-[#8fa6b2]">Ryzyka paletowe</p><h3 className="mt-1 text-xl font-black text-white">Najpierw decyzja, później ruch</h3></div><div className="divide-y divide-white/10">{wszystkieSloty.filter((pozycja) => pozycja.paleta).sort((a,b) => (a.paleta?.pewnosc || 0) - (b.paleta?.pewnosc || 0)).map((pozycja) => { const p = pozycja.paleta!; const brak = Object.entries(p.dowody).filter(([,wartosc]) => !wartosc).map(([nazwa]) => nazwa).join(", "); return <div key={pozycja.id} className="grid gap-3 p-5 sm:grid-cols-[34px_1fr_auto] sm:items-center"><span className={`grid h-8 w-8 place-items-center rounded-lg ${p.pewnosc < 90 ? "bg-[#3a2b0e] text-[#f9bf57]" : "bg-[#123c36] text-[#a8df52]"}`}>{p.pewnosc < 90 ? <AlertTriangle size={16} /> : <CheckCircle2 size={16} />}</span><div><p className="text-sm font-extrabold text-white">{pozycja.id.replace("-", " ")} · {p.produkt}</p><p className="mt-1 text-xs text-[#9db2bc]">Pewność {p.pewnosc}/100 · {p.stan}{brak ? ` · brak dowodu: ${brak}` : " · komplet dowodów"}</p></div><button onClick={() => { setWybranySlot(pozycja.id); setWidok("paszport"); }} className="text-xs font-black text-[#74baff]">Paszport</button></div>; })}</div></article></div>}

          {widok === "symulator" && <div className="grid gap-5 pt-5 2xl:grid-cols-[.85fr_1.15fr]"><article className="rounded-3xl border border-white/10 bg-[#09131e]/92 p-5 shadow-[0_22px_70px_rgba(0,0,0,.32)]"><p className="text-[10px] font-black uppercase tracking-[.14em] text-[#fe765e]">Symulator decyzji</p><h2 className="mt-1 text-2xl font-black tracking-[-.045em] text-white">Pokaż skutek, zanim klikniesz.</h2><p className="mt-2 text-sm leading-6 text-[#9db2bc]">To część, która ma odróżniać FLOW.OS od kolejnego WMS-u: system nie tylko sugeruje akcję, ale pokazuje operacyjny koszt i odpowiedzialność decyzji.</p><div className="mt-5 space-y-2">{[["dopuszcz","Dopuść warunkowo","gdy dowody i reguły tworzą wystarczającą pewność"],["zatrzymaj","Zatrzymaj w kwarantannie","gdy ryzyko byłoby przeniesione dalej do zapasu lub wysyłki"],["eskaluj","Przekaż do lidera zmiany","gdy system nie powinien zastępować świadomej decyzji"]].map(([id,nazwa,opis]) => <button key={id} onClick={() => setScenariusz(id as typeof scenariusz)} className={`w-full rounded-2xl border p-4 text-left transition ${scenariusz === id ? "border-[#fe5c45] bg-[#fe5c45]/10 ring-2 ring-[#fe5c45]/15" : "border-white/10 bg-white/[.03] hover:bg-white/[.06]"}`}><p className="text-sm font-black text-white">{nazwa}</p><p className="mt-1 text-xs leading-5 text-[#9db2bc]">{opis}</p></button>)}</div></article><article className={`rounded-3xl border p-5 shadow-[0_22px_70px_rgba(0,0,0,.32)] ${scenariusze.kolor}`}><div className="flex items-start justify-between gap-4"><div><p className="text-[10px] font-black uppercase tracking-[.14em] text-[#d7e6eb]/80">Skutek decyzji</p><h3 className="mt-1 text-2xl font-black text-white">{scenariusze.tytul}</h3></div><Target size={26} className="text-[#fe765e]" /></div><p className="mt-4 max-w-2xl text-sm leading-6 text-[#dbe9ed]">{scenariusze.opis}</p><div className="mt-6 grid gap-3">{scenariusze.skutki.map((skutek, indeks) => <div key={skutek} className="flex gap-3 rounded-2xl border border-white/10 bg-black/15 p-4"><span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-white/10 text-[11px] font-black text-white">{indeks + 1}</span><p className="pt-1 text-xs font-bold leading-5 text-[#e6f0f2]">{skutek}</p></div>)}</div><div className="mt-5 rounded-2xl border border-white/10 bg-black/15 p-4"><p className="text-[10px] font-black uppercase tracking-[.1em] text-[#aabdc5]">Różnica wobec klasycznego WMS</p><p className="mt-2 text-sm font-black leading-6 text-white">Nie: „przesuń paletę”.<br />Tylko: „przesuń ją, bo masz dowody — i wiesz, co stanie się, gdy decyzja będzie błędna”.</p></div><button onClick={() => setWidok("przyjecie")} className="mt-5 inline-flex h-10 items-center gap-2 rounded-xl bg-white px-4 text-xs font-black text-[#09131e]"><ArrowRight size={15} />Przejdź do Bramy Prawdy</button></article></div>}

          <footer className="mt-6 flex flex-col gap-2 rounded-2xl border border-white/10 bg-white/[.035] px-4 py-3 text-xs text-[#9fb3bd] sm:flex-row sm:items-center sm:justify-between"><span><strong className="text-white">Status:</strong> {komunikat}</span><span className="inline-flex items-center gap-1.5 font-bold text-[#d9e8ec]"><Truck size={13} className="text-[#fe765e]" />FLOW.OS 3.0 · Warehouse Command Center</span></footer>
        </section>
      </div>
    </main>
  );
}
