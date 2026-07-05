"use client";

import { useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Boxes,
  CheckCircle2,
  ChevronRight,
  CircleAlert,
  ClipboardCheck,
  Clock3,
  FileCheck2,
  LayoutDashboard,
  MapPin,
  PackageCheck,
  PackageSearch,
  RotateCcw,
  ScanBarcode,
  ShieldCheck,
  Truck,
  Warehouse,
  XCircle,
  Zap,
} from "lucide-react";

type Decision = "accepted" | "review" | "hold";
type ZoneStatus = "free" | "occupied" | "reserved" | "blocked";

type Location = {
  code: string;
  aisle: string;
  status: ZoneStatus;
  client: string;
  distance: number;
};

type Pallet = {
  sscc: string;
  gtin: string;
  batch: string;
  expiry: string;
  remainingDays: number;
  client: string;
  location: string;
  status: "available" | "fefo" | "quality_hold";
  receivedAt: string;
};

type Exception = {
  id: string;
  title: string;
  detail: string;
  level: "critical" | "review" | "info";
  createdAt: string;
  owner: string;
};

type ParsedLabel = {
  sscc?: string;
  gtin?: string;
  batch?: string;
  bestBefore?: string;
  expiry?: string;
  count?: string;
  raw: string;
};

const GS = String.fromCharCode(29);
const SAMPLE_GS1 =
  "(00)340123450000000000(01)05901234123457(10)ORANGE-2407(17)270930(37)48";

const clientRules = {
  "FreshMart Retail": {
    minShelfLife: 21,
    homeAisle: "601",
    short: "FMCG · ambient",
  },
  "Beauty Partner": {
    minShelfLife: 90,
    homeAisle: "615",
    short: "beauty · sensitive stock",
  },
  "Healthy Choice": {
    minShelfLife: 45,
    homeAisle: "605",
    short: "FMCG · FEFO priority",
  },
};

const initialLocations: Location[] = [
  { code: "601 A1", aisle: "601", status: "occupied", client: "FreshMart Retail", distance: 12 },
  { code: "601 A2", aisle: "601", status: "free", client: "FreshMart Retail", distance: 14 },
  { code: "601 A3", aisle: "601", status: "reserved", client: "FreshMart Retail", distance: 17 },
  { code: "601 B1", aisle: "601", status: "free", client: "FreshMart Retail", distance: 19 },
  { code: "601 B2", aisle: "601", status: "free", client: "FreshMart Retail", distance: 21 },
  { code: "601 B3", aisle: "601", status: "occupied", client: "FreshMart Retail", distance: 24 },
  { code: "605 A1", aisle: "605", status: "occupied", client: "Healthy Choice", distance: 35 },
  { code: "605 A2", aisle: "605", status: "free", client: "Healthy Choice", distance: 37 },
  { code: "605 A3", aisle: "605", status: "blocked", client: "Shared", distance: 40 },
  { code: "605 B1", aisle: "605", status: "free", client: "Healthy Choice", distance: 42 },
  { code: "605 B2", aisle: "605", status: "reserved", client: "Healthy Choice", distance: 45 },
  { code: "605 B3", aisle: "605", status: "free", client: "Healthy Choice", distance: 47 },
  { code: "615 A1", aisle: "615", status: "occupied", client: "Beauty Partner", distance: 52 },
  { code: "615 A2", aisle: "615", status: "free", client: "Beauty Partner", distance: 55 },
  { code: "615 A3", aisle: "615", status: "free", client: "Beauty Partner", distance: 58 },
  { code: "615 B1", aisle: "615", status: "occupied", client: "Beauty Partner", distance: 61 },
  { code: "615 B2", aisle: "615", status: "free", client: "Beauty Partner", distance: 64 },
  { code: "615 B3", aisle: "615", status: "free", client: "Beauty Partner", distance: 67 },
];

const initialPallets: Pallet[] = [
  {
    sscc: "340123450000000000",
    gtin: "05901234123457",
    batch: "APPLE-2406",
    expiry: "2026-08-22",
    remainingDays: 48,
    client: "FreshMart Retail",
    location: "601 A1",
    status: "available",
    receivedAt: "2026-07-05 09:16",
  },
  {
    sscc: "003400123456789019",
    gtin: "05901234123457",
    batch: "ENERGY-2407",
    expiry: "2026-08-03",
    remainingDays: 29,
    client: "Healthy Choice",
    location: "605 A1",
    status: "fefo",
    receivedAt: "2026-07-05 09:42",
  },
  {
    sscc: "036000291452000000",
    gtin: "05901234123457",
    batch: "CARE-2406",
    expiry: "2027-01-12",
    remainingDays: 191,
    client: "Beauty Partner",
    location: "615 A1",
    status: "available",
    receivedAt: "2026-07-05 08:58",
  },
];

const initialExceptions: Exception[] = [
  {
    id: "EX-1093",
    title: "Quality Hold · termin po dacie",
    detail: "SSCC 590123412345678909 został zatrzymany przed utworzeniem ruchu magazynowego.",
    level: "critical",
    createdAt: "09:56",
    owner: "QHSE",
  },
  {
    id: "EX-1094",
    title: "ASN mismatch · wymaga decyzji",
    detail: "Różnica batchu pomiędzy etykietą GS1 a awizacją ASN-PL01-240703-018.",
    level: "review",
    createdAt: "10:04",
    owner: "Team Leader",
  },
  {
    id: "EX-1095",
    title: "Blokada lokacji 605 A3",
    detail: "Lokacja wykluczona z silnika slottingu do zakończenia inspekcji regału.",
    level: "info",
    createdAt: "10:11",
    owner: "Maintenance",
  },
];

function todayStart() {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return now;
}

function parseGs1Date(value?: string) {
  if (!value || !/^\d{6}$/.test(value)) return undefined;
  const year = 2000 + Number(value.slice(0, 2));
  const month = Number(value.slice(2, 4));
  const day = Number(value.slice(4, 6));
  if (month < 1 || month > 12 || day > 31) return undefined;
  const date = day === 0 ? new Date(year, month, 0) : new Date(year, month - 1, day);
  if (Number.isNaN(date.getTime())) return undefined;
  return date;
}

function formatIsoDate(date?: Date) {
  if (!date) return "—";
  return date.toISOString().slice(0, 10);
}

function daysUntil(date?: Date) {
  if (!date) return undefined;
  return Math.ceil((date.getTime() - todayStart().getTime()) / 86_400_000);
}

function validateSscc(sscc?: string) {
  if (!sscc || !/^\d{18}$/.test(sscc)) return false;
  const body = sscc.slice(0, -1);
  const expected = Number(sscc.at(-1));
  const sum = [...body]
    .reverse()
    .reduce((total, digit, index) => total + Number(digit) * (index % 2 === 0 ? 3 : 1), 0);
  return (10 - (sum % 10)) % 10 === expected;
}

function parseGs1(input: string): ParsedLabel {
  const raw = input.trim().replace(/^\][A-Za-z0-9]{2}/, "");
  const label: ParsedLabel = { raw: input };

  if (raw.includes("(")) {
    const expression = /\((\d{2,4})\)([^(${GS})]*)/g;
    let match: RegExpExecArray | null;
    while ((match = expression.exec(raw)) !== null) {
      const ai = match[1];
      const value = match[2].trim();
      if (ai === "00") label.sscc = value;
      if (ai === "01") label.gtin = value;
      if (ai === "10") label.batch = value;
      if (ai === "15") label.bestBefore = value;
      if (ai === "17") label.expiry = value;
      if (ai === "37") label.count = value;
    }
    return label;
  }

  let cursor = 0;
  const fixed: Record<string, number> = { "00": 18, "01": 14, "15": 6, "17": 6 };
  while (cursor < raw.length) {
    if (raw[cursor] === GS) {
      cursor += 1;
      continue;
    }
    const ai = raw.slice(cursor, cursor + 2);
    if (!Object.keys(fixed).includes(ai) && ai !== "10" && ai !== "37") break;
    cursor += 2;
    let value = "";
    if (fixed[ai]) {
      value = raw.slice(cursor, cursor + fixed[ai]);
      cursor += fixed[ai];
    } else {
      const end = raw.indexOf(GS, cursor);
      value = raw.slice(cursor, end === -1 ? raw.length : end);
      cursor = end === -1 ? raw.length : end + 1;
    }
    if (ai === "00") label.sscc = value;
    if (ai === "01") label.gtin = value;
    if (ai === "10") label.batch = value;
    if (ai === "15") label.bestBefore = value;
    if (ai === "17") label.expiry = value;
    if (ai === "37") label.count = value;
  }
  return label;
}

function statusClass(status: Decision) {
  if (status === "accepted") return "border-emerald-200 bg-emerald-50 text-emerald-800";
  if (status === "review") return "border-amber-200 bg-amber-50 text-amber-800";
  return "border-rose-200 bg-rose-50 text-rose-800";
}

function statusDot(status: ZoneStatus) {
  if (status === "free") return "bg-lime-400";
  if (status === "occupied") return "bg-slate-500";
  if (status === "reserved") return "bg-amber-400";
  return "bg-rose-400";
}

export default function FlowOsTraceCommandPage() {
  const [activeView, setActiveView] = useState<"command" | "intake" | "trace" | "exceptions" | "settings">("command");
  const [selectedClient, setSelectedClient] = useState<keyof typeof clientRules>("FreshMart Retail");
  const [scanInput, setScanInput] = useState(SAMPLE_GS1);
  const [scanResult, setScanResult] = useState<ParsedLabel | null>(null);
  const [decision, setDecision] = useState<Decision | null>(null);
  const [decisionText, setDecisionText] = useState("Zeskanuj etykietę GS1, aby uruchomić bramkę walidacyjną.");
  const [pallets, setPallets] = useState<Pallet[]>(initialPallets);
  const [locations, setLocations] = useState<Location[]>(initialLocations);
  const [exceptions, setExceptions] = useState<Exception[]>(initialExceptions);
  const [toast, setToast] = useState("System gotowy · tryb demonstracyjny, bez połączenia z WMS.");
  const [search, setSearch] = useState("");

  const activeRule = clientRules[selectedClient];
  const parsedExpiry = parseGs1Date(scanResult?.expiry ?? scanResult?.bestBefore);
  const remainingDays = daysUntil(parsedExpiry);

  const metrics = useMemo(() => {
    const now = new Date();
    const fefo = pallets.filter((pallet) => pallet.remainingDays <= 45 && pallet.status !== "quality_hold").length;
    const free = locations.filter((location) => location.status === "free").length;
    return {
      acceptedToday: 146 + pallets.length,
      held: exceptions.filter((exception) => exception.level === "critical").length,
      fefo,
      free,
      uptime: now.getHours() < 23 ? "99.98%" : "100%",
    };
  }, [exceptions, locations, pallets]);

  const filteredPallets = pallets.filter((pallet) => {
    const needle = search.toLowerCase();
    return [pallet.sscc, pallet.batch, pallet.location, pallet.client, pallet.gtin]
      .join(" ")
      .toLowerCase()
      .includes(needle);
  });

  function evaluateScan() {
    const parsed = parseGs1(scanInput);
    setScanResult(parsed);

    const date = parseGs1Date(parsed.expiry ?? parsed.bestBefore);
    const shelfDays = daysUntil(date);
    const duplicate = pallets.some((pallet) => pallet.sscc === parsed.sscc);
    const missingFields = !parsed.sscc || !parsed.batch || !(parsed.expiry || parsed.bestBefore);

    if (missingFields) {
      setDecision("hold");
      setDecisionText("Brak danych obowiązkowych: SSCC, batch i data muszą być obecne przed dopuszczeniem palety.");
      return;
    }
    if (!validateSscc(parsed.sscc)) {
      setDecision("hold");
      setDecisionText("SSCC nie przeszedł walidacji 18 cyfr / cyfry kontrolnej. Ruch magazynowy został zatrzymany.");
      return;
    }
    if (duplicate) {
      setDecision("hold");
      setDecisionText("Duplikat SSCC. Jednostka logistyczna jest już obecna w cyfrowej historii platformy.");
      return;
    }
    if (!date || shelfDays === undefined || shelfDays < 0) {
      setDecision("hold");
      setDecisionText("Termin jest po dacie lub nieprawidłowy. Paleta wymaga Quality Hold i decyzji QHSE.");
      return;
    }
    if (shelfDays < activeRule.minShelfLife) {
      setDecision("review");
      setDecisionText(`Pozostało ${shelfDays} dni trwałości. Reguła klienta wymaga minimum ${activeRule.minShelfLife} dni — decyzja Team Leadera.`);
      return;
    }
    setDecision("accepted");
    setDecisionText("Zielona bramka: zgodne SSCC, batch, data i reguła trwałości. Paleta może otrzymać zadanie lokowania.");
  }

  function createException(title: string, detail: string, level: Exception["level"], owner: string) {
    setExceptions((current) => [
      {
        id: `EX-${1100 + current.length}`,
        title,
        detail,
        level,
        createdAt: new Date().toLocaleTimeString("pl-PL", { hour: "2-digit", minute: "2-digit" }),
        owner,
      },
      ...current,
    ]);
  }

  function commitDecision() {
    if (!scanResult || !decision) {
      setToast("Najpierw uruchom walidację etykiety GS1.");
      return;
    }

    if (decision === "hold") {
      createException("Quality Hold · etykieta GS1", decisionText, "critical", "QHSE");
      setToast("Paleta zatrzymana. Utworzono Quality Hold i pełny wpis audytowy.");
      setActiveView("exceptions");
      return;
    }

    if (decision === "review") {
      createException("Wymaga decyzji · shelf life", decisionText, "review", "Team Leader");
      setToast("Utworzono wyjątek wymagający decyzji Team Leadera.");
      setActiveView("exceptions");
      return;
    }

    const target = locations
      .filter((location) => location.status === "free" && location.aisle === activeRule.homeAisle)
      .sort((a, b) => a.distance - b.distance)[0];

    if (!target || !scanResult.sscc || !scanResult.batch) {
      createException("Brak wolnej zgodnej lokacji", "Silnik nie znalazł wolnej lokacji w kontrakcie klienta. Wymagana decyzja operacyjna.", "review", "Team Leader");
      setToast("Nie znaleziono zgodnej wolnej lokacji — utworzono wyjątek.");
      return;
    }

    const expiry = formatIsoDate(parseGs1Date(scanResult.expiry ?? scanResult.bestBefore));
    const days = daysUntil(parseGs1Date(scanResult.expiry ?? scanResult.bestBefore)) ?? 0;
    const newPallet: Pallet = {
      sscc: scanResult.sscc,
      gtin: scanResult.gtin ?? "—",
      batch: scanResult.batch,
      expiry,
      remainingDays: days,
      client: selectedClient,
      location: target.code,
      status: days <= 45 ? "fefo" : "available",
      receivedAt: new Date().toLocaleString("pl-PL", { dateStyle: "short", timeStyle: "short" }),
    };

    setPallets((current) => [newPallet, ...current]);
    setLocations((current) => current.map((location) => (location.code === target.code ? { ...location, status: "occupied" } : location)));
    setToast(`Ruch zaakceptowany: SSCC ${scanResult.sscc} → zadanie lokowania ${target.code}.`);
    setScanInput("");
    setScanResult(null);
    setDecision(null);
    setDecisionText("Przyjęto paletę. Zeskanuj kolejną etykietę, aby utworzyć następne zadanie.");
    setActiveView("command");
  }

  function loadSample() {
    setScanInput(SAMPLE_GS1);
    setScanResult(null);
    setDecision(null);
    setDecisionText("Załadowano etykietę demonstracyjną. Uruchom walidację, aby sprawdzić pełną ścieżkę GS1.");
    setToast("Załadowano poprawną etykietę GS1 z SSCC, GTIN, batch, expiry i count.");
  }

  const navigation = [
    { id: "command" as const, label: "Trace Command", icon: LayoutDashboard },
    { id: "intake" as const, label: "GS1 Intake Gate", icon: ScanBarcode },
    { id: "trace" as const, label: "Trace Ledger", icon: PackageSearch },
    { id: "exceptions" as const, label: "Exception Center", icon: CircleAlert },
    { id: "settings" as const, label: "Pilot setup", icon: ShieldCheck },
  ];

  return (
    <main className="min-h-screen bg-[#f4f6f5] text-[#16202b]">
      <div className="mx-auto flex min-h-screen max-w-[1600px] flex-col xl:flex-row">
        <aside className="w-full border-b border-white/10 bg-[#16202b] px-4 py-5 text-white xl:sticky xl:top-0 xl:h-screen xl:w-72 xl:border-b-0 xl:border-r xl:px-5">
          <div className="flex items-center gap-3 px-2">
            <div className="grid h-11 w-11 place-items-center rounded-2xl bg-[#ef4e3a] font-black tracking-[-0.14em] shadow-[0_10px_24px_rgba(239,78,58,.28)]">FM</div>
            <div>
              <p className="text-sm font-black tracking-wide">FLOW.OS</p>
              <p className="mt-0.5 text-[10px] font-bold tracking-[0.18em] text-slate-400">TRACE COMMAND</p>
            </div>
          </div>

          <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-3.5">
            <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
              <span className="h-2 w-2 rounded-full bg-lime-300 shadow-[0_0_0_5px_rgba(190,242,100,.1)]" />
              Pilot platformy PL-01
            </div>
            <p className="mt-2 text-sm font-extrabold">FM LOGISTIC · multi-client FMCG</p>
            <p className="mt-1.5 text-xs leading-5 text-slate-300">Warstwa walidacji fizycznej palety: przed ruchem, przed WMS, z pełnym audytem.</p>
          </div>

          <nav className="mt-6 flex gap-1 overflow-x-auto xl:flex-col xl:overflow-visible">
            {navigation.map((item) => {
              const Icon = item.icon;
              const isActive = activeView === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveView(item.id)}
                  className={`flex shrink-0 items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-bold transition ${
                    isActive ? "bg-[#ef4e3a]/20 text-white shadow-[inset_3px_0_0_#ef4e3a]" : "text-slate-300 hover:bg-white/5 hover:text-white"
                  }`}
                >
                  <Icon size={17} />
                  {item.label}
                </button>
              );
            })}
          </nav>

          <div className="mt-8 hidden border-t border-white/10 px-2 pt-5 xl:block">
            <p className="text-xs font-bold">Tryb demonstracyjny</p>
            <p className="mt-1 text-[11px] leading-5 text-slate-400">Brak podłączenia do Reflex WMS, My-SCM, automatyki lub danych FM Logistic.</p>
          </div>
        </aside>

        <section className="min-w-0 flex-1 px-4 py-6 sm:px-7 lg:px-9">
          <header className="flex flex-col gap-5 border-b border-[#dbe2e5] pb-5 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.15em] text-[#61717d]">
                <span>FM Logistic</span>
                <ChevronRight size={13} />
                <span className="text-[#ef4e3a]">PL-01</span>
                <ChevronRight size={13} />
                <span>{activeView === "command" ? "konsola zmiany" : navigation.find((item) => item.id === activeView)?.label}</span>
              </div>
              <h1 className="mt-2 text-3xl font-black tracking-[-0.055em] sm:text-4xl">Prawda fizyczna magazynu.</h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-[#61717d]">Każdy SSCC, batch i termin są sprawdzane przed ruchem. FLOW.OS nie zastępuje WMS — tworzy kontrolowaną bramkę operacyjną nad jego transakcjami.</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={selectedClient}
                onChange={(event) => setSelectedClient(event.target.value as keyof typeof clientRules)}
                className="h-10 rounded-xl border border-[#dbe2e5] bg-white px-3 text-xs font-bold outline-none"
              >
                {Object.keys(clientRules).map((client) => <option key={client}>{client}</option>)}
              </select>
              <button onClick={loadSample} className="inline-flex h-10 items-center gap-2 rounded-xl border border-[#dbe2e5] bg-white px-3 text-xs font-bold transition hover:border-[#ef4e3a]">
                <RotateCcw size={14} /> Demo GS1
              </button>
              <div className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#b8d846] px-3 text-xs font-black text-[#233129]">
                <Activity size={14} /> Uptime {metrics.uptime}
              </div>
            </div>
          </header>

          <div className="mt-4 flex items-center gap-2 rounded-xl border border-[#ffd7d1] bg-[#fff7f5] px-4 py-3 text-xs leading-5 text-[#5c3e3a]">
            <ShieldCheck size={17} className="shrink-0 text-[#ef4e3a]" />
            <span><strong>Bezpieczny pilot:</strong> wszystkie akcje tej wersji działają na danych demonstracyjnych w przeglądarce. Integracje powinny być uruchamiane najpierw w trybie dry-run i dopiero po uzgodnieniu z FM IT.</span>
          </div>

          {activeView === "command" && (
            <div className="space-y-5 pt-5">
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                {[
                  ["Palety dopuszczone", metrics.acceptedToday, "dzisiaj", "emerald"],
                  ["Quality Hold", metrics.held, "wymaga QHSE", "rose"],
                  ["FEFO risk", metrics.fefo, "palety do priorytetu", "amber"],
                  ["Wolne lokacje", metrics.free, "w strefach klienta", "blue"],
                  ["ASN / scan latency", "< 1 s", "w trybie edge", "lime"],
                ].map(([label, value, caption, tone]) => (
                  <div key={String(label)} className="relative overflow-hidden rounded-2xl border border-[#dbe2e5] bg-white p-4 shadow-[0_10px_28px_rgba(22,32,43,.06)]">
                    <div className={`absolute -right-7 -top-7 h-24 w-24 rounded-full opacity-20 ${tone === "rose" ? "bg-rose-300" : tone === "amber" ? "bg-amber-300" : tone === "blue" ? "bg-sky-300" : tone === "lime" ? "bg-lime-300" : "bg-emerald-300"}`} />
                    <p className="relative text-[10px] font-black uppercase tracking-[0.12em] text-[#61717d]">{label}</p>
                    <p className="relative mt-3 text-3xl font-black tracking-[-0.06em]">{value}</p>
                    <p className={`relative mt-1 text-[11px] font-bold ${tone === "rose" ? "text-rose-600" : tone === "amber" ? "text-amber-700" : "text-emerald-700"}`}>{caption}</p>
                  </div>
                ))}
              </div>

              <div className="grid gap-5 xl:grid-cols-[1.25fr_.75fr]">
                <article className="overflow-hidden rounded-2xl border border-[#dbe2e5] bg-white shadow-[0_10px_28px_rgba(22,32,43,.06)]">
                  <div className="flex flex-col gap-3 border-b border-[#e6ecee] p-5 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#ef4e3a]">Next best operational action</p>
                      <h2 className="mt-1 text-lg font-black tracking-[-0.035em]">Misja operatora · 12 minut</h2>
                      <p className="mt-1 text-xs leading-5 text-[#61717d]">Łączymy przyjęcie, lokowanie i pobranie FEFO, aby ograniczyć puste przejazdy bez łamania reguł klienta.</p>
                    </div>
                    <div className="rounded-xl bg-[#b8d846] px-3 py-2 text-xs font-black text-[#233129]">M-8041</div>
                  </div>
                  <div className="p-5">
                    {[
                      ["1", "Przyjmij paletę", "Rampa D04 · skan SSCC, batch i expiry", "GS1 Intake"],
                      ["2", "Lokuj po walidacji", "601 A2 · FreshMart Retail · 1 miejsce paletowe", "Putaway"],
                      ["3", "Pobierz FEFO", "601 A1 → strefa PICK-04 · Apple 6×1L", "Replenishment"],
                      ["4", "Dostarcz do wysyłki", "OUT-D06 · fala 11:30 · potwierdzenie SSCC", "Outbound"],
                    ].map(([number, title, detail, label], index) => (
                      <div key={number} className="grid grid-cols-[30px_1fr_auto] items-center gap-3 py-3.5">
                        <span className="grid h-7 w-7 place-items-center rounded-lg bg-[#f4e8e6] text-[11px] font-black text-[#c7352b]">{number}</span>
                        <div>
                          <p className="text-sm font-extrabold">{title}</p>
                          <p className="mt-0.5 text-xs text-[#61717d]">{detail}</p>
                        </div>
                        <span className="hidden rounded-lg border border-[#dbe2e5] px-2 py-1 text-[10px] font-bold text-[#61717d] sm:inline">{label}</span>
                        {index < 3 && <div className="col-start-1 ml-3 h-4 border-l border-dashed border-[#cbd5da]" />}
                      </div>
                    ))}
                    <div className="mt-2 flex flex-wrap gap-2">
                      <button onClick={() => { setActiveView("intake"); setToast("Przejdź przez GS1 Intake Gate, aby rozpocząć misję."); }} className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#ef4e3a] px-4 text-xs font-black text-white shadow-[0_8px_18px_rgba(239,78,58,.2)] transition hover:bg-[#c7352b]">
                        <ScanBarcode size={15} /> Rozpocznij od skanu
                      </button>
                      <button onClick={() => setActiveView("trace")} className="inline-flex h-10 items-center gap-2 rounded-xl border border-[#dbe2e5] bg-white px-4 text-xs font-bold">
                        <PackageSearch size={15} /> Otwórz historię palet
                      </button>
                    </div>
                  </div>
                </article>

                <article className="overflow-hidden rounded-2xl border border-[#dbe2e5] bg-white shadow-[0_10px_28px_rgba(22,32,43,.06)]">
                  <div className="border-b border-[#e6ecee] p-5">
                    <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#61717d]">Digital twin · live state</p>
                    <h2 className="mt-1 text-lg font-black tracking-[-0.035em]">Mapa lokacji PL-01</h2>
                  </div>
                  <div className="p-5">
                    <div className="grid grid-cols-3 gap-3">
                      {["601", "605", "615"].map((aisle) => {
                        const aisleLocations = locations.filter((location) => location.aisle === aisle);
                        return (
                          <div key={aisle} className="rounded-xl border border-[#dbe2e5] bg-[#f9fbfb] p-3">
                            <div className="flex items-center justify-between"><span className="text-xs font-black">Alejka {aisle}</span><MapPin size={13} className="text-[#ef4e3a]" /></div>
                            <div className="mt-3 grid grid-cols-3 gap-1.5">
                              {aisleLocations.map((location) => (
                                <div key={location.code} title={`${location.code} · ${location.status}`} className={`h-7 rounded-md ${statusDot(location.status)} ${location.status === "free" ? "opacity-95" : "opacity-80"}`} />
                              ))}
                            </div>
                            <p className="mt-3 text-[10px] leading-4 text-[#61717d]">{aisleLocations.filter((location) => location.status === "free").length} wolne · {aisleLocations.filter((location) => location.status === "blocked").length} blokady</p>
                          </div>
                        );
                      })}
                    </div>
                    <div className="mt-4 flex flex-wrap gap-3 text-[10px] font-bold text-[#61717d]">
                      {[["free", "Wolne"], ["occupied", "Zajęte"], ["reserved", "Zarezerwowane"], ["blocked", "Zablokowane"]].map(([status, label]) => <span key={status} className="inline-flex items-center gap-1.5"><i className={`h-2 w-2 rounded-full ${statusDot(status as ZoneStatus)}`} />{label}</span>)}
                    </div>
                  </div>
                </article>
              </div>

              <div className="grid gap-5 xl:grid-cols-2">
                <article className="rounded-2xl border border-[#dbe2e5] bg-white shadow-[0_10px_28px_rgba(22,32,43,.06)]">
                  <div className="flex items-center justify-between border-b border-[#e6ecee] p-5"><div><p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#61717d]">Exceptions requiring ownership</p><h2 className="mt-1 text-lg font-black tracking-[-0.035em]">Co wymaga decyzji teraz</h2></div><button onClick={() => setActiveView("exceptions")} className="text-xs font-bold text-[#ef4e3a]">Zobacz wszystko</button></div>
                  <div className="divide-y divide-[#edf1f2] px-5">
                    {exceptions.slice(0, 3).map((exception) => (
                      <div key={exception.id} className="grid grid-cols-[32px_1fr_auto] gap-3 py-4">
                        <span className={`grid h-8 w-8 place-items-center rounded-lg ${exception.level === "critical" ? "bg-rose-50 text-rose-600" : exception.level === "review" ? "bg-amber-50 text-amber-700" : "bg-sky-50 text-sky-700"}`}>
                          {exception.level === "critical" ? <XCircle size={16} /> : <AlertTriangle size={16} />}
                        </span>
                        <div><p className="text-xs font-extrabold">{exception.title}</p><p className="mt-1 text-[11px] leading-4 text-[#61717d]">{exception.detail}</p></div>
                        <span className="text-[10px] font-bold text-[#61717d]">{exception.owner}</span>
                      </div>
                    ))}
                  </div>
                </article>

                <article className="rounded-2xl border border-[#dbe2e5] bg-white shadow-[0_10px_28px_rgba(22,32,43,.06)]">
                  <div className="border-b border-[#e6ecee] p-5"><p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#61717d]">Integration boundary</p><h2 className="mt-1 text-lg font-black tracking-[-0.035em]">Jak działa bez wymiany WMS</h2></div>
                  <div className="grid gap-2 p-5 text-xs">
                    {[
                      ["1", "WMS / ASN", "Pobieramy oczekiwane palety i reguły klienta przez zatwierdzony adapter."],
                      ["2", "FLOW Edge", "Skan, parser GS1, walidacja offline, decyzja oraz audit trail."],
                      ["3", "WMS / QHSE", "Dopiero zatwierdzona transakcja wraca jako putaway, hold lub wyjątek."],
                    ].map(([number, title, detail]) => <div key={number} className="flex gap-3 rounded-xl border border-[#e6ecee] p-3"><span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-[#eef3f4] text-[11px] font-black text-[#ef4e3a]">{number}</span><div><p className="font-extrabold">{title}</p><p className="mt-1 leading-4 text-[#61717d]">{detail}</p></div></div>)}
                  </div>
                </article>
              </div>
            </div>
          )}

          {activeView === "intake" && (
            <div className="grid gap-5 pt-5 xl:grid-cols-[1.1fr_.9fr]">
              <article className="rounded-2xl border border-[#dbe2e5] bg-white p-5 shadow-[0_10px_28px_rgba(22,32,43,.06)]">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div><p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#ef4e3a]">GS1 Intake Gate</p><h2 className="mt-1 text-2xl font-black tracking-[-0.045em]">Czy paleta może wejść?</h2><p className="mt-2 max-w-xl text-sm leading-6 text-[#61717d]">Obsługa GS1-128 / GS1 DataMatrix z AI (00), (01), (10), (15), (17) i (37). Kolektor Zebra, Honeywell lub Datalogic może dostarczać kod jak klawiatura.</p></div><span className="inline-flex items-center gap-1 rounded-lg bg-[#eef5ff] px-2.5 py-1.5 text-[10px] font-black text-sky-700"><Zap size={12} /> EDGE MODE</span></div>
                <label className="mt-5 block text-xs font-extrabold">Surowy odczyt skanera / HRI GS1</label>
                <textarea value={scanInput} onChange={(event) => setScanInput(event.target.value)} placeholder="Przykład: (00)340123... (10)BATCH (17)YYMMDD" className="mt-2 min-h-36 w-full rounded-xl border border-[#dbe2e5] bg-[#fbfcfc] p-3 font-mono text-xs leading-6 outline-none transition focus:border-[#ef4e3a] focus:ring-4 focus:ring-[#ef4e3a]/10" />
                <div className="mt-3 flex flex-wrap gap-2"><button onClick={evaluateScan} className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#ef4e3a] px-4 text-xs font-black text-white shadow-[0_8px_18px_rgba(239,78,58,.2)]"><ScanBarcode size={16} /> Waliduj etykietę</button><button onClick={loadSample} className="inline-flex h-10 items-center gap-2 rounded-xl border border-[#dbe2e5] bg-white px-4 text-xs font-bold"><RotateCcw size={15} /> Wczytaj przykład</button></div>
                <p className="mt-4 rounded-xl bg-[#f6f8f8] p-3 text-[11px] leading-5 text-[#61717d]">Reguła bieżącego klienta: <strong>{selectedClient}</strong> · batch obowiązkowy · expiry / best before obowiązkowe · minimalna pozostała trwałość <strong>{activeRule.minShelfLife} dni</strong> · strefa docelowa: aleja <strong>{activeRule.homeAisle}</strong>.</p>
              </article>

              <article className="rounded-2xl border border-[#dbe2e5] bg-white shadow-[0_10px_28px_rgba(22,32,43,.06)]">
                <div className="border-b border-[#e6ecee] p-5"><p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#61717d]">Decision record</p><h2 className="mt-1 text-lg font-black tracking-[-0.035em]">Wynik bramki walidacyjnej</h2></div>
                <div className="p-5">
                  <div className={`rounded-2xl border p-4 ${decision ? statusClass(decision) : "border-[#dbe2e5] bg-[#f8faf9] text-[#61717d]"}`}>
                    <div className="flex items-start gap-3">
                      {decision === "accepted" ? <CheckCircle2 className="mt-0.5" size={22} /> : decision === "hold" ? <XCircle className="mt-0.5" size={22} /> : <ClipboardCheck className="mt-0.5" size={22} />}
                      <div><p className="text-sm font-black">{decision === "accepted" ? "ZIELONE · przyjmij paletę" : decision === "review" ? "ŻÓŁTE · wymaga decyzji" : decision === "hold" ? "CZERWONE · Quality Hold" : "Oczekiwanie na skan"}</p><p className="mt-1 text-xs leading-5">{decisionText}</p></div>
                    </div>
                  </div>

                  <dl className="mt-4 grid grid-cols-2 gap-2 text-xs">
                    {[
                      ["SSCC · AI (00)", scanResult?.sscc ?? "—", scanResult?.sscc ? validateSscc(scanResult.sscc) ? "OK" : "BŁĄD" : ""],
                      ["GTIN · AI (01)", scanResult?.gtin ?? "—", ""],
                      ["Batch · AI (10)", scanResult?.batch ?? "—", ""],
                      ["Expiry · AI (17)", formatIsoDate(parsedExpiry), remainingDays !== undefined ? `${remainingDays} dni` : ""],
                      ["Best before · AI (15)", scanResult?.bestBefore ?? "—", ""],
                      ["Count · AI (37)", scanResult?.count ?? "—", ""],
                    ].map(([label, value, verdict]) => <div key={label} className="rounded-xl border border-[#e6ecee] bg-[#fbfcfc] p-3"><dt className="text-[9px] font-black uppercase tracking-[0.09em] text-[#61717d]">{label}</dt><dd className="mt-1 break-all text-xs font-extrabold">{value}</dd>{verdict && <span className={`mt-1 inline-block text-[10px] font-black ${verdict === "OK" ? "text-emerald-700" : "text-rose-600"}`}>{verdict}</span>}</div>)}
                  </dl>

                  <button onClick={commitDecision} disabled={!decision} className="mt-5 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#16202b] px-4 text-xs font-black text-white disabled:cursor-not-allowed disabled:opacity-40"><PackageCheck size={16} /> {decision === "accepted" ? "Utwórz zadanie lokowania" : decision === "review" ? "Przekaż do Team Leadera" : decision === "hold" ? "Utwórz Quality Hold" : "Czeka na walidację"}</button>
                </div>
              </article>
            </div>
          )}

          {activeView === "trace" && (
            <div className="space-y-5 pt-5">
              <div className="flex flex-col gap-4 rounded-2xl border border-[#dbe2e5] bg-white p-5 shadow-[0_10px_28px_rgba(22,32,43,.06)] sm:flex-row sm:items-end sm:justify-between"><div><p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#ef4e3a]">Traceability graph · simplified ledger</p><h2 className="mt-1 text-2xl font-black tracking-[-0.045em]">Jedna paleta. Jedna historia. Jedna decyzja.</h2><p className="mt-2 text-sm text-[#61717d]">W produkcji ten widok jest źródłem traceability dla inbound, FEFO, co-packingu, recall i wysyłek.</p></div><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Szukaj SSCC, batch, lokacji..." className="h-10 w-full rounded-xl border border-[#dbe2e5] px-3 text-xs font-medium outline-none sm:w-72" /></div>
              <div className="overflow-hidden rounded-2xl border border-[#dbe2e5] bg-white shadow-[0_10px_28px_rgba(22,32,43,.06)]">
                <div className="hidden grid-cols-[1.4fr_1fr_1fr_.8fr_.8fr_.7fr] gap-3 border-b border-[#e6ecee] bg-[#f8faf9] px-5 py-3 text-[10px] font-black uppercase tracking-[0.1em] text-[#61717d] md:grid"><span>SSCC / batch</span><span>Klient</span><span>Lokacja</span><span>Expiry</span><span>Status</span><span>Historia</span></div>
                <div className="divide-y divide-[#edf1f2]">
                  {filteredPallets.map((pallet) => <div key={pallet.sscc} className="grid gap-2 px-5 py-4 text-xs md:grid-cols-[1.4fr_1fr_1fr_.8fr_.8fr_.7fr] md:items-center md:gap-3"><div><p className="font-mono text-[11px] font-black">{pallet.sscc}</p><p className="mt-1 text-[11px] text-[#61717d]">Batch {pallet.batch} · GTIN {pallet.gtin}</p></div><div className="font-bold">{pallet.client}</div><div className="inline-flex items-center gap-1.5 font-bold"><MapPin size={13} className="text-[#ef4e3a]" />{pallet.location}</div><div><p className="font-bold">{pallet.expiry}</p><p className={`mt-1 text-[10px] font-black ${pallet.remainingDays <= 45 ? "text-amber-700" : "text-emerald-700"}`}>{pallet.remainingDays} dni</p></div><div><span className={`inline-flex rounded-lg px-2 py-1 text-[10px] font-black ${pallet.status === "quality_hold" ? "bg-rose-50 text-rose-700" : pallet.status === "fefo" ? "bg-amber-50 text-amber-700" : "bg-emerald-50 text-emerald-700"}`}>{pallet.status === "quality_hold" ? "HOLD" : pallet.status === "fefo" ? "FEFO" : "AVAILABLE"}</span></div><div className="text-[11px] font-bold text-[#61717d]">{pallet.receivedAt}</div></div>)}
                  {!filteredPallets.length && <div className="p-10 text-center text-sm text-[#61717d]">Brak palet spełniających wyszukiwanie.</div>}
                </div>
              </div>
            </div>
          )}

          {activeView === "exceptions" && (
            <div className="space-y-5 pt-5">
              <div className="rounded-2xl border border-[#dbe2e5] bg-white p-5 shadow-[0_10px_28px_rgba(22,32,43,.06)]"><p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#ef4e3a]">Exception Command Center</p><h2 className="mt-1 text-2xl font-black tracking-[-0.045em]">Nie lista błędów. Kolejka decyzji.</h2><p className="mt-2 max-w-3xl text-sm leading-6 text-[#61717d]">Każdy wyjątek ma właściciela, priorytet, historię i możliwy dalszy ruch. To redukuje ręczne telefony, arkusze i niejawne decyzje na rampie.</p></div>
              <div className="grid gap-4 lg:grid-cols-3">
                {exceptions.map((exception) => <article key={exception.id} className={`rounded-2xl border p-5 shadow-[0_10px_28px_rgba(22,32,43,.06)] ${exception.level === "critical" ? "border-rose-200 bg-rose-50" : exception.level === "review" ? "border-amber-200 bg-amber-50" : "border-sky-200 bg-sky-50"}`}><div className="flex items-center justify-between"><span className="text-[10px] font-black tracking-[0.12em] text-[#61717d]">{exception.id}</span><span className="text-[10px] font-bold text-[#61717d]">{exception.createdAt}</span></div><h3 className="mt-3 text-base font-black tracking-[-0.03em]">{exception.title}</h3><p className="mt-2 text-xs leading-5 text-[#4b5b66]">{exception.detail}</p><div className="mt-4 flex items-center justify-between rounded-xl bg-white/80 px-3 py-2 text-[11px] font-bold"><span>Właściciel: {exception.owner}</span><button onClick={() => setToast(`Otwarto workflow ${exception.id} — w produkcji: QHSE / WMS / klient.`)} className="text-[#ef4e3a]">Otwórz <ArrowRight className="inline" size={12} /></button></div></article>)}
              </div>
            </div>
          )}

          {activeView === "settings" && (
            <div className="grid gap-5 pt-5 xl:grid-cols-[.9fr_1.1fr]">
              <article className="rounded-2xl border border-[#dbe2e5] bg-white p-5 shadow-[0_10px_28px_rgba(22,32,43,.06)]"><p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#ef4e3a]">Pilot scope</p><h2 className="mt-1 text-2xl font-black tracking-[-0.045em]">Pierwsze wdrożenie bez ryzyka.</h2><div className="mt-5 space-y-3">{[["1", "Jedna strefa przyjęć", "2 rampy i 1 proces inbound dla jednego klienta FMCG."], ["2", "Tryb dry-run", "Porównanie decyzji FLOW.OS z działającym procesem i WMS bez automatycznego zapisu."], ["3", "Mierzalne KPI", "Błędy etykiet, czas wyjątku, zgodność ASN oraz czas od skanu do putaway."], ["4", "Kontrolowane write-back", "Dopiero po akceptacji FM IT, QHSE i właściciela procesu."]].map(([number, title, detail]) => <div key={number} className="flex gap-3 rounded-xl border border-[#e6ecee] p-3"><span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-[#f4e8e6] text-[11px] font-black text-[#c7352b]">{number}</span><div><p className="text-sm font-extrabold">{title}</p><p className="mt-1 text-xs leading-5 text-[#61717d]">{detail}</p></div></div>)}</div></article>
              <article className="rounded-2xl border border-[#dbe2e5] bg-white p-5 shadow-[0_10px_28px_rgba(22,32,43,.06)]"><p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#61717d]">Kontrakt i dane referencyjne</p><h2 className="mt-1 text-lg font-black tracking-[-0.035em]">Co trzeba potwierdzić z FM Logistic</h2><div className="mt-5 grid gap-3 sm:grid-cols-2">{[["WMS / API", "Dokładny system, wersja, dostępne API / kolejki zdarzeń, model awizacji ASN."], ["Urządzenia", "Modele kolektorów, konfiguracja DataWedge / SDK i zachowanie FNC1 / GS separator."], ["Reguły klienta", "Minimalny shelf life, batch policy, blokady, separacja stocku, reguły jakości."], ["Quality Hold", "Kto zatwierdza, SLA decyzji, raportowanie do klienta i sposób audytu."], ["Mapa lokacji", "Rzeczywiste alejki, klasy nośności, strefy, blokady, współdzielenie kontraktów."], ["Compliance", "Retencja traceability, role, SSO, uprawnienia, integracja z narzędziami bezpieczeństwa."]].map(([title, detail]) => <div key={title} className="rounded-xl border border-[#e6ecee] bg-[#fbfcfc] p-4"><p className="text-xs font-extrabold">{title}</p><p className="mt-1.5 text-[11px] leading-5 text-[#61717d]">{detail}</p></div>)}</div><button onClick={() => setToast("Lista discovery została przygotowana jako punkt startowy do rozmowy z kierownikiem platformy i FM IT.")} className="mt-5 inline-flex h-10 items-center gap-2 rounded-xl bg-[#16202b] px-4 text-xs font-black text-white"><FileCheck2 size={15} /> Zapisz zakres discovery</button></article>
            </div>
          )}

          <div className="mt-6 rounded-xl border border-[#dbe2e5] bg-white px-4 py-3 text-xs text-[#61717d] shadow-[0_6px_20px_rgba(22,32,43,.04)]"><strong className="text-[#16202b]">Status:</strong> {toast}</div>
        </section>
      </div>
    </main>
  );
}
