"use client";

import { useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Boxes,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  Clock3,
  LayoutDashboard,
  MapPin,
  PackageCheck,
  PackageSearch,
  RefreshCw,
  ScanBarcode,
  Settings,
  ShieldCheck,
  Truck,
  XCircle,
} from "lucide-react";

type View = "command" | "intake" | "trace" | "exceptions" | "setup";
type Decision = "accepted" | "review" | "hold";
type LocationStatus = "free" | "occupied" | "reserved" | "blocked";

type ParsedGs1 = {
  raw: string;
  sscc?: string;
  gtin?: string;
  batch?: string;
  bestBefore?: string;
  expiry?: string;
  count?: string;
};

type Pallet = {
  sscc: string;
  gtin: string;
  batch: string;
  expiry: string;
  days: number;
  client: string;
  location: string;
  state: "AVAILABLE" | "FEFO" | "QUALITY HOLD";
  receivedAt: string;
};

type Exception = {
  id: string;
  level: "critical" | "review" | "info";
  title: string;
  details: string;
  owner: string;
  time: string;
};

type Location = {
  code: string;
  aisle: string;
  status: LocationStatus;
  client: string;
  rank: number;
};

const GS = String.fromCharCode(29);
const sampleLabel = "(00)123456789012345675(01)05901234123457(10)ORANGE-2407(17)270930(37)48";

const clients = {
  "FreshMart Retail": { minShelfLife: 21, homeAisle: "601", description: "FMCG · ambient" },
  "Healthy Choice": { minShelfLife: 45, homeAisle: "605", description: "FMCG · strict FEFO" },
  "Beauty Partner": { minShelfLife: 90, homeAisle: "615", description: "beauty · sensitive stock" },
} as const;

type Client = keyof typeof clients;

const initialLocations: Location[] = [
  { code: "601 A1", aisle: "601", status: "occupied", client: "FreshMart Retail", rank: 10 },
  { code: "601 A2", aisle: "601", status: "free", client: "FreshMart Retail", rank: 12 },
  { code: "601 A3", aisle: "601", status: "reserved", client: "FreshMart Retail", rank: 14 },
  { code: "601 B1", aisle: "601", status: "free", client: "FreshMart Retail", rank: 17 },
  { code: "601 B2", aisle: "601", status: "free", client: "FreshMart Retail", rank: 20 },
  { code: "601 B3", aisle: "601", status: "occupied", client: "FreshMart Retail", rank: 23 },
  { code: "605 A1", aisle: "605", status: "occupied", client: "Healthy Choice", rank: 31 },
  { code: "605 A2", aisle: "605", status: "free", client: "Healthy Choice", rank: 34 },
  { code: "605 A3", aisle: "605", status: "blocked", client: "Shared", rank: 38 },
  { code: "605 B1", aisle: "605", status: "free", client: "Healthy Choice", rank: 41 },
  { code: "605 B2", aisle: "605", status: "reserved", client: "Healthy Choice", rank: 44 },
  { code: "605 B3", aisle: "605", status: "free", client: "Healthy Choice", rank: 47 },
  { code: "615 A1", aisle: "615", status: "occupied", client: "Beauty Partner", rank: 55 },
  { code: "615 A2", aisle: "615", status: "free", client: "Beauty Partner", rank: 58 },
  { code: "615 A3", aisle: "615", status: "free", client: "Beauty Partner", rank: 61 },
  { code: "615 B1", aisle: "615", status: "occupied", client: "Beauty Partner", rank: 65 },
  { code: "615 B2", aisle: "615", status: "free", client: "Beauty Partner", rank: 68 },
  { code: "615 B3", aisle: "615", status: "free", client: "Beauty Partner", rank: 71 },
];

const initialPallets: Pallet[] = [
  { sscc: "340123450000000000", gtin: "05901234123457", batch: "APPLE-2406", expiry: "2026-08-22", days: 48, client: "FreshMart Retail", location: "601 A1", state: "AVAILABLE", receivedAt: "05.07.2026, 09:16" },
  { sscc: "003400123456789019", gtin: "05901234123457", batch: "ENERGY-2407", expiry: "2026-08-03", days: 29, client: "Healthy Choice", location: "605 A1", state: "FEFO", receivedAt: "05.07.2026, 09:42" },
  { sscc: "036000291452000000", gtin: "05901234123457", batch: "CARE-2406", expiry: "2027-01-12", days: 191, client: "Beauty Partner", location: "615 A1", state: "AVAILABLE", receivedAt: "05.07.2026, 08:58" },
];

const initialExceptions: Exception[] = [
  { id: "EX-1093", level: "critical", title: "Quality Hold · termin po dacie", details: "SSCC 590123412345678909 został zatrzymany przed utworzeniem ruchu magazynowego.", owner: "QHSE", time: "09:56" },
  { id: "EX-1094", level: "review", title: "ASN mismatch · wymaga decyzji", details: "Różnica batchu względem awizacji ASN-PL01-240703-018.", owner: "Team Leader", time: "10:04" },
  { id: "EX-1095", level: "info", title: "Blokada lokacji 605 A3", details: "Pozycja wykluczona z silnika slottingu do czasu inspekcji regału.", owner: "Maintenance", time: "10:11" },
];

function toDate(value?: string) {
  if (!value || !/^\d{6}$/.test(value)) return undefined;
  const year = 2000 + Number(value.slice(0, 2));
  const month = Number(value.slice(2, 4));
  const day = Number(value.slice(4, 6));
  if (!month || month > 12 || day > 31) return undefined;
  return day === 0 ? new Date(year, month, 0) : new Date(year, month - 1, day);
}

function isoDate(date?: Date) {
  return date ? date.toISOString().slice(0, 10) : "—";
}

function remainingDays(date?: Date) {
  if (!date) return undefined;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.ceil((date.getTime() - today.getTime()) / 86_400_000);
}

function ssccIsValid(value?: string) {
  if (!value || !/^\d{18}$/.test(value)) return false;
  const check = Number(value[value.length - 1]);
  const total = [...value.slice(0, -1)].reverse().reduce((sum, digit, index) => sum + Number(digit) * (index % 2 === 0 ? 3 : 1), 0);
  return (10 - (total % 10)) % 10 === check;
}

function parseGs1(input: string): ParsedGs1 {
  const raw = input.trim().replace(/^\][A-Za-z0-9]{2}/, "");
  const result: ParsedGs1 = { raw: input };

  if (raw.includes("(")) {
    const pattern = /\((\d{2,4})\)([^\(\u001d]*)/g;
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(raw))) {
      const [_, ai, data] = match;
      const value = data.trim();
      if (ai === "00") result.sscc = value;
      if (ai === "01") result.gtin = value;
      if (ai === "10") result.batch = value;
      if (ai === "15") result.bestBefore = value;
      if (ai === "17") result.expiry = value;
      if (ai === "37") result.count = value;
    }
    return result;
  }

  const fixedLength: Record<string, number> = { "00": 18, "01": 14, "15": 6, "17": 6 };
  let index = 0;
  while (index < raw.length) {
    if (raw[index] === GS) {
      index += 1;
      continue;
    }
    const ai = raw.slice(index, index + 2);
    if (!fixedLength[ai] && ai !== "10" && ai !== "37") break;
    index += 2;
    const end = fixedLength[ai] ? index + fixedLength[ai] : (() => {
      const separator = raw.indexOf(GS, index);
      return separator === -1 ? raw.length : separator;
    })();
    const value = raw.slice(index, end);
    index = fixedLength[ai] ? end : end + 1;
    if (ai === "00") result.sscc = value;
    if (ai === "01") result.gtin = value;
    if (ai === "10") result.batch = value;
    if (ai === "15") result.bestBefore = value;
    if (ai === "17") result.expiry = value;
    if (ai === "37") result.count = value;
  }
  return result;
}

function decisionStyle(decision: Decision | null) {
  if (decision === "accepted") return "border-emerald-200 bg-emerald-50 text-emerald-900";
  if (decision === "review") return "border-amber-200 bg-amber-50 text-amber-900";
  if (decision === "hold") return "border-rose-200 bg-rose-50 text-rose-900";
  return "border-[#dbe2e5] bg-[#f8faf9] text-[#61717d]";
}

function locationColor(status: LocationStatus) {
  if (status === "free") return "bg-lime-400";
  if (status === "occupied") return "bg-slate-500";
  if (status === "reserved") return "bg-amber-400";
  return "bg-rose-400";
}

export default function FlowOsTraceCommand() {
  const [view, setView] = useState<View>("command");
  const [client, setClient] = useState<Client>("FreshMart Retail");
  const [labelInput, setLabelInput] = useState(sampleLabel);
  const [parsed, setParsed] = useState<ParsedGs1 | null>(null);
  const [decision, setDecision] = useState<Decision | null>(null);
  const [decisionMessage, setDecisionMessage] = useState("Wczytaj dane z kolektora i uruchom bramkę walidacyjną.");
  const [pallets, setPallets] = useState<Pallet[]>(initialPallets);
  const [locations, setLocations] = useState<Location[]>(initialLocations);
  const [exceptions, setExceptions] = useState<Exception[]>(initialExceptions);
  const [query, setQuery] = useState("");
  const [notice, setNotice] = useState("System gotowy · lokalny pilot demonstracyjny · bez połączenia z WMS.");

  const rule = clients[client];
  const parsedDate = toDate(parsed?.expiry ?? parsed?.bestBefore);
  const parsedDays = remainingDays(parsedDate);

  const stats = useMemo(() => ({
    accepted: 146 + pallets.length,
    holds: exceptions.filter((item) => item.level === "critical").length,
    fefo: pallets.filter((item) => item.days <= 45 && item.state !== "QUALITY HOLD").length,
    free: locations.filter((item) => item.status === "free").length,
  }), [exceptions, locations, pallets]);

  const filteredPallets = pallets.filter((pallet) => [pallet.sscc, pallet.batch, pallet.gtin, pallet.client, pallet.location].join(" ").toLowerCase().includes(query.toLowerCase()));

  function evaluateLabel() {
    const next = parseGs1(labelInput);
    const date = toDate(next.expiry ?? next.bestBefore);
    const days = remainingDays(date);
    const duplicate = pallets.some((pallet) => pallet.sscc === next.sscc);
    setParsed(next);

    if (!next.sscc || !next.batch || !(next.expiry || next.bestBefore)) {
      setDecision("hold");
      setDecisionMessage("Brak danych obowiązkowych. SSCC, batch oraz expiry / best before muszą być obecne przed ruchem.");
      return;
    }
    if (!ssccIsValid(next.sscc)) {
      setDecision("hold");
      setDecisionMessage("Niepoprawny SSCC: wymagane jest 18 cyfr i zgodna cyfra kontrolna GS1.");
      return;
    }
    if (duplicate) {
      setDecision("hold");
      setDecisionMessage("Duplikat SSCC. Paleta istnieje już w historii fizycznej magazynu.");
      return;
    }
    if (!date || days === undefined || days < 0) {
      setDecision("hold");
      setDecisionMessage("Data jest po terminie lub nie może być zinterpretowana. Kierunek: Quality Hold / QHSE.");
      return;
    }
    if (days < rule.minShelfLife) {
      setDecision("review");
      setDecisionMessage(`Pozostało ${days} dni trwałości. Kontrakt ${client} wymaga minimum ${rule.minShelfLife} dni — decyzja Team Leadera.`);
      return;
    }
    setDecision("accepted");
    setDecisionMessage("Zgodne SSCC, batch, data i reguła klienta. FLOW.OS może utworzyć kontrolowane zadanie lokowania.");
  }

  function addException(level: Exception["level"], title: string, details: string, owner: string) {
    setExceptions((current) => [{ id: `EX-${1100 + current.length}`, level, title, details, owner, time: new Date().toLocaleTimeString("pl-PL", { hour: "2-digit", minute: "2-digit" }) }, ...current]);
  }

  function submitDecision() {
    if (!parsed || !decision) {
      setNotice("Najpierw należy uruchomić walidację GS1.");
      return;
    }
    if (decision === "hold") {
      addException("critical", "Quality Hold · GS1 Intake", decisionMessage, "QHSE");
      setNotice("Paleta zatrzymana: utworzono Quality Hold wraz z wpisem audytowym.");
      setView("exceptions");
      return;
    }
    if (decision === "review") {
      addException("review", "Decyzja Team Leadera", decisionMessage, "Team Leader");
      setNotice("Utworzono wyjątek. Paleta czeka na świadomą decyzję operacyjną.");
      setView("exceptions");
      return;
    }

    const target = locations.filter((location) => location.status === "free" && location.aisle === rule.homeAisle).sort((a, b) => a.rank - b.rank)[0];
    if (!target || !parsed.sscc || !parsed.batch) {
      addException("review", "Brak zgodnej wolnej lokacji", "Silnik nie znalazł wolnej lokacji w strefie kontraktu klienta.", "Team Leader");
      setNotice("Nie znaleziono zgodnej lokacji. Przekazano do Team Leadera.");
      return;
    }

    const date = toDate(parsed.expiry ?? parsed.bestBefore);
    const days = remainingDays(date) ?? 0;
    setPallets((current) => [{ sscc: parsed.sscc!, gtin: parsed.gtin ?? "—", batch: parsed.batch!, expiry: isoDate(date), days, client, location: target.code, state: days <= 45 ? "FEFO" : "AVAILABLE", receivedAt: new Date().toLocaleString("pl-PL", { dateStyle: "short", timeStyle: "short" }) }, ...current]);
    setLocations((current) => current.map((location) => location.code === target.code ? { ...location, status: "occupied" } : location));
    setLabelInput("");
    setParsed(null);
    setDecision(null);
    setDecisionMessage("Paleta przyjęta. Zeskanuj kolejną etykietę, aby uruchomić następny przebieg.");
    setNotice(`Utworzono zadanie putaway: SSCC ${parsed.sscc} → ${target.code}.`);
    setView("command");
  }

  const nav: { id: View; label: string; icon: typeof LayoutDashboard }[] = [
    { id: "command", label: "Trace Command", icon: LayoutDashboard },
    { id: "intake", label: "GS1 Intake Gate", icon: ScanBarcode },
    { id: "trace", label: "Trace Ledger", icon: PackageSearch },
    { id: "exceptions", label: "Exception Center", icon: AlertTriangle },
    { id: "setup", label: "Pilot setup", icon: Settings },
  ];

  return (
    <main className="min-h-screen bg-[#f4f6f5] text-[#16202b]">
      <div className="mx-auto flex min-h-screen max-w-[1600px] flex-col xl:flex-row">
        <aside className="w-full bg-[#16202b] px-4 py-5 text-white xl:sticky xl:top-0 xl:h-screen xl:w-72 xl:shrink-0 xl:px-5">
          <div className="flex items-center gap-3 px-2"><div className="grid h-11 w-11 place-items-center rounded-2xl bg-[#ef4e3a] text-sm font-black tracking-[-.13em] shadow-[0_10px_24px_rgba(239,78,58,.3)]">FM</div><div><p className="text-sm font-black tracking-wide">FLOW.OS</p><p className="mt-0.5 text-[10px] font-bold tracking-[.18em] text-slate-400">TRACE COMMAND</p></div></div>
          <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-3.5"><div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[.13em] text-slate-400"><i className="h-2 w-2 rounded-full bg-lime-300 shadow-[0_0_0_5px_rgba(190,242,100,.12)]" />PL-01 · pilot</div><p className="mt-2 text-sm font-extrabold">FM LOGISTIC · 3PL / FMCG</p><p className="mt-1.5 text-xs leading-5 text-slate-300">Bramka prawdy fizycznej dla SSCC, batch, dat i wyjątków operacyjnych.</p></div>
          <nav className="mt-6 flex gap-1 overflow-x-auto xl:flex-col xl:overflow-visible">{nav.map((item) => { const Icon = item.icon; return <button key={item.id} onClick={() => setView(item.id)} className={`flex shrink-0 items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-bold transition ${view === item.id ? "bg-[#ef4e3a]/20 text-white shadow-[inset_3px_0_0_#ef4e3a]" : "text-slate-300 hover:bg-white/5 hover:text-white"}`}><Icon size={17} />{item.label}</button>; })}</nav>
          <div className="mt-8 hidden border-t border-white/10 px-2 pt-5 xl:block"><p className="text-xs font-bold">Bezpieczny model integracji</p><p className="mt-1 text-[11px] leading-5 text-slate-400">Najpierw dry-run i audyt decyzji. Dopiero potem zatwierdzony write-back do WMS.</p></div>
        </aside>

        <section className="min-w-0 flex-1 px-4 py-6 sm:px-7 lg:px-9">
          <header className="flex flex-col gap-4 border-b border-[#dbe2e5] pb-5 lg:flex-row lg:items-start lg:justify-between"><div><div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[.15em] text-[#61717d]"><span>FM Logistic</span><ChevronRight size={12} /><span className="text-[#ef4e3a]">PL-01</span><ChevronRight size={12} /><span>{nav.find((item) => item.id === view)?.label}</span></div><h1 className="mt-2 text-3xl font-black tracking-[-.055em] sm:text-4xl">Prawda fizyczna magazynu.</h1><p className="mt-2 max-w-3xl text-sm leading-6 text-[#61717d]">FLOW.OS waliduje paletę przed ruchem. Nie zastępuje rdzenia WMS — tworzy kontrolowaną warstwę decyzji, FEFO i traceability.</p></div><div className="flex flex-wrap items-center gap-2"><select value={client} onChange={(event) => setClient(event.target.value as Client)} className="h-10 rounded-xl border border-[#dbe2e5] bg-white px-3 text-xs font-bold outline-none">{Object.keys(clients).map((name) => <option key={name}>{name}</option>)}</select><button onClick={() => { setLabelInput(sampleLabel); setParsed(null); setDecision(null); setNotice("Wczytano poprawną etykietę demonstracyjną."); }} className="inline-flex h-10 items-center gap-2 rounded-xl border border-[#dbe2e5] bg-white px-3 text-xs font-bold"><RefreshCw size={14} />Demo GS1</button><span className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#b8d846] px-3 text-xs font-black text-[#233129]"><Activity size={14} />Edge online</span></div></header>
          <div className="mt-4 flex items-start gap-2 rounded-xl border border-[#ffd7d1] bg-[#fff7f5] px-4 py-3 text-xs leading-5 text-[#60433e]"><ShieldCheck size={17} className="mt-0.5 shrink-0 text-[#ef4e3a]" /><span><strong>Pilot demonstracyjny:</strong> dane i decyzje pozostają w przeglądarce. Integracje z WMS, My-SCM, QHSE i automatyką wymagają formalnego discovery, zatwierdzonych interfejsów oraz kontroli uprawnień.</span></div>

          {view === "command" && <div className="space-y-5 pt-5">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{[["Palety dopuszczone", stats.accepted, "dzisiaj", "text-emerald-700"], ["Quality Hold", stats.holds, "wymaga QHSE", "text-rose-600"], ["FEFO risk", stats.fefo, "priorytet wydania", "text-amber-700"], ["Wolne lokacje", stats.free, "w strefach klienta", "text-sky-700"]].map(([label, value, note, tone]) => <div key={String(label)} className="relative overflow-hidden rounded-2xl border border-[#dbe2e5] bg-white p-4 shadow-[0_10px_28px_rgba(22,32,43,.06)]"><div className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-[#ef4e3a]/10" /><p className="relative text-[10px] font-black uppercase tracking-[.12em] text-[#61717d]">{label}</p><p className="relative mt-3 text-3xl font-black tracking-[-.06em]">{value}</p><p className={`relative mt-1 text-[11px] font-bold ${tone}`}>{note}</p></div>)}</div>
            <div className="grid gap-5 xl:grid-cols-[1.25fr_.75fr]">
              <article className="overflow-hidden rounded-2xl border border-[#dbe2e5] bg-white shadow-[0_10px_28px_rgba(22,32,43,.06)]"><div className="flex flex-col gap-3 border-b border-[#e6ecee] p-5 sm:flex-row sm:items-start sm:justify-between"><div><p className="text-[10px] font-black uppercase tracking-[.14em] text-[#ef4e3a]">Next best operational action</p><h2 className="mt-1 text-xl font-black tracking-[-.04em]">Misja operatora · 12 min</h2><p className="mt-1 text-xs leading-5 text-[#61717d]">Przyjęcie, lokowanie i pobranie FEFO połączone w jedną kontrolowaną trasę.</p></div><span className="rounded-xl bg-[#b8d846] px-3 py-2 text-xs font-black text-[#233129]">M-8041</span></div><div className="p-5">{[["1", "Skan etykiety", "Rampa D04 · SSCC, batch, expiry", "GS1 Intake"], ["2", "Lokowanie", "601 A2 · zgodna strefa FreshMart", "Putaway"], ["3", "Pobranie FEFO", "601 A1 → PICK-04 · Apple 6×1L", "Replenishment"], ["4", "Outbound", "OUT-D06 · potwierdzenie SSCC", "Wysyłka"]].map(([number, title, detail, tag]) => <div key={number} className="grid grid-cols-[31px_1fr_auto] items-center gap-3 border-b border-dashed border-[#e6ecee] py-3 last:border-b-0"><span className="grid h-7 w-7 place-items-center rounded-lg bg-[#f4e8e6] text-[11px] font-black text-[#c7352b]">{number}</span><div><p className="text-sm font-extrabold">{title}</p><p className="mt-0.5 text-xs text-[#61717d]">{detail}</p></div><span className="hidden rounded-lg border border-[#dbe2e5] px-2 py-1 text-[10px] font-bold text-[#61717d] sm:block">{tag}</span></div>)}<div className="mt-4 flex flex-wrap gap-2"><button onClick={() => setView("intake")} className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#ef4e3a] px-4 text-xs font-black text-white shadow-[0_8px_18px_rgba(239,78,58,.2)]"><ScanBarcode size={15} />Rozpocznij od skanu</button><button onClick={() => setView("trace")} className="inline-flex h-10 items-center gap-2 rounded-xl border border-[#dbe2e5] bg-white px-4 text-xs font-bold"><PackageSearch size={15} />Historia palet</button></div></div></article>
              <article className="rounded-2xl border border-[#dbe2e5] bg-white shadow-[0_10px_28px_rgba(22,32,43,.06)]"><div className="border-b border-[#e6ecee] p-5"><p className="text-[10px] font-black uppercase tracking-[.14em] text-[#61717d]">Digital twin · live state</p><h2 className="mt-1 text-xl font-black tracking-[-.04em]">Mapa lokacji PL-01</h2></div><div className="p-5"><div className="grid grid-cols-3 gap-3">{["601", "605", "615"].map((aisle) => { const group = locations.filter((item) => item.aisle === aisle); return <div key={aisle} className="rounded-xl border border-[#dbe2e5] bg-[#fbfcfc] p-3"><div className="flex items-center justify-between"><span className="text-xs font-black">Alejka {aisle}</span><MapPin size={13} className="text-[#ef4e3a]" /></div><div className="mt-3 grid grid-cols-3 gap-1.5">{group.map((location) => <span key={location.code} title={`${location.code}: ${location.status}`} className={`h-7 rounded-md ${locationColor(location.status)}`} />)}</div><p className="mt-3 text-[10px] text-[#61717d]">{group.filter((item) => item.status === "free").length} wolne · {group.filter((item) => item.status === "blocked").length} blokady</p></div>; })}</div><div className="mt-4 flex flex-wrap gap-3 text-[10px] font-bold text-[#61717d]">{[["free", "Wolne"], ["occupied", "Zajęte"], ["reserved", "Rezerwacja"], ["blocked", "Blokada"]].map(([status, label]) => <span key={status} className="inline-flex items-center gap-1.5"><i className={`h-2 w-2 rounded-full ${locationColor(status as LocationStatus)}`} />{label}</span>)}</div></div></article>
            </div>
          </div>}

          {view === "intake" && <div className="grid gap-5 pt-5 xl:grid-cols-[1.1fr_.9fr]">
            <article className="rounded-2xl border border-[#dbe2e5] bg-white p-5 shadow-[0_10px_28px_rgba(22,32,43,.06)]"><div className="flex flex-col gap-3 sm:flex-row sm:justify-between"><div><p className="text-[10px] font-black uppercase tracking-[.14em] text-[#ef4e3a]">GS1 Intake Gate</p><h2 className="mt-1 text-2xl font-black tracking-[-.045em]">Czy ta paleta może wejść?</h2><p className="mt-2 max-w-xl text-sm leading-6 text-[#61717d]">Aplikacja odczytuje GS1-128 / GS1 DataMatrix: SSCC AI (00), GTIN AI (01), batch AI (10), best before AI (15), expiry AI (17) oraz count AI (37).</p></div><span className="h-fit rounded-lg bg-[#eef5ff] px-2.5 py-1.5 text-[10px] font-black text-sky-700">EDGE MODE</span></div><label className="mt-5 block text-xs font-extrabold">Odczyt skanera / HRI GS1</label><textarea value={labelInput} onChange={(event) => setLabelInput(event.target.value)} placeholder="(00)SSCC(01)GTIN(10)BATCH(17)YYMMDD" className="mt-2 min-h-40 w-full rounded-xl border border-[#dbe2e5] bg-[#fbfcfc] p-3 font-mono text-xs leading-6 outline-none focus:border-[#ef4e3a] focus:ring-4 focus:ring-[#ef4e3a]/10" /><div className="mt-3 flex flex-wrap gap-2"><button onClick={evaluateLabel} className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#ef4e3a] px-4 text-xs font-black text-white"><ScanBarcode size={16} />Waliduj etykietę</button><button onClick={() => { setLabelInput(sampleLabel); setParsed(null); setDecision(null); setNotice("Wczytano poprawną próbkę GS1."); }} className="inline-flex h-10 items-center gap-2 rounded-xl border border-[#dbe2e5] bg-white px-4 text-xs font-bold"><RefreshCw size={15} />Przykład</button></div><div className="mt-4 rounded-xl bg-[#f6f8f8] p-3 text-[11px] leading-5 text-[#61717d]">Aktywny kontrakt: <strong>{client}</strong> · {rule.description} · wymagane minimum shelf life: <strong>{rule.minShelfLife} dni</strong> · strefa docelowa: <strong>alejka {rule.homeAisle}</strong>.</div></article>
            <article className="rounded-2xl border border-[#dbe2e5] bg-white shadow-[0_10px_28px_rgba(22,32,43,.06)]"><div className="border-b border-[#e6ecee] p-5"><p className="text-[10px] font-black uppercase tracking-[.14em] text-[#61717d]">Decision record</p><h2 className="mt-1 text-xl font-black tracking-[-.04em]">Wynik bramki</h2></div><div className="p-5"><div className={`rounded-2xl border p-4 ${decisionStyle(decision)}`}><div className="flex items-start gap-3">{decision === "accepted" ? <CheckCircle2 className="mt-0.5" size={22} /> : decision === "hold" ? <XCircle className="mt-0.5" size={22} /> : <ClipboardCheck className="mt-0.5" size={22} />}<div><p className="text-sm font-black">{decision === "accepted" ? "ZIELONE · przyjmij" : decision === "review" ? "ŻÓŁTE · decyzja" : decision === "hold" ? "CZERWONE · Quality Hold" : "Oczekiwanie na skan"}</p><p className="mt-1 text-xs leading-5">{decisionMessage}</p></div></div></div><dl className="mt-4 grid grid-cols-2 gap-2">{[["SSCC · AI (00)", parsed?.sscc ?? "—", parsed?.sscc ? ssccIsValid(parsed.sscc) ? "OK" : "BŁĄD" : ""], ["GTIN · AI (01)", parsed?.gtin ?? "—", ""], ["Batch · AI (10)", parsed?.batch ?? "—", ""], ["Expiry · AI (17)", isoDate(parsedDate), parsedDays !== undefined ? `${parsedDays} dni` : ""], ["Best before · AI (15)", parsed?.bestBefore ?? "—", ""], ["Count · AI (37)", parsed?.count ?? "—", ""]].map(([label, value, state]) => <div key={label} className="rounded-xl border border-[#e6ecee] bg-[#fbfcfc] p-3"><dt className="text-[9px] font-black uppercase tracking-[.09em] text-[#61717d]">{label}</dt><dd className="mt-1 break-all text-xs font-extrabold">{value}</dd>{state && <span className={`mt-1 block text-[10px] font-black ${state === "OK" ? "text-emerald-700" : "text-rose-600"}`}>{state}</span>}</div>)}</dl><button disabled={!decision} onClick={submitDecision} className="mt-5 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#16202b] px-4 text-xs font-black text-white disabled:cursor-not-allowed disabled:opacity-40"><PackageCheck size={16} />{decision === "accepted" ? "Utwórz zadanie lokowania" : decision === "review" ? "Przekaż do Team Leadera" : decision === "hold" ? "Utwórz Quality Hold" : "Czeka na walidację"}</button></div></article>
          </div>}

          {view === "trace" && <div className="space-y-5 pt-5"><div className="flex flex-col gap-4 rounded-2xl border border-[#dbe2e5] bg-white p-5 shadow-[0_10px_28px_rgba(22,32,43,.06)] sm:flex-row sm:items-end sm:justify-between"><div><p className="text-[10px] font-black uppercase tracking-[.14em] text-[#ef4e3a]">Traceability ledger</p><h2 className="mt-1 text-2xl font-black tracking-[-.045em]">Jedna paleta. Jedna historia.</h2><p className="mt-2 text-sm text-[#61717d]">Widok pomocny w FEFO, co-packingu, recall i kontroli jakości.</p></div><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="SSCC, batch, lokacja..." className="h-10 w-full rounded-xl border border-[#dbe2e5] px-3 text-xs font-medium outline-none sm:w-72" /></div><article className="overflow-hidden rounded-2xl border border-[#dbe2e5] bg-white shadow-[0_10px_28px_rgba(22,32,43,.06)]"><div className="hidden grid-cols-[1.35fr_1fr_.75fr_.75fr_.7fr_.8fr] gap-3 border-b border-[#e6ecee] bg-[#f8faf9] px-5 py-3 text-[10px] font-black uppercase tracking-[.1em] text-[#61717d] md:grid"><span>SSCC / batch</span><span>Klient</span><span>Lokacja</span><span>Expiry</span><span>Status</span><span>Przyjęcie</span></div><div className="divide-y divide-[#edf1f2]">{filteredPallets.map((pallet) => <div key={pallet.sscc} className="grid gap-2 px-5 py-4 text-xs md:grid-cols-[1.35fr_1fr_.75fr_.75fr_.7fr_.8fr] md:items-center md:gap-3"><div><p className="font-mono text-[11px] font-black">{pallet.sscc}</p><p className="mt-1 text-[11px] text-[#61717d]">Batch {pallet.batch} · GTIN {pallet.gtin}</p></div><span className="font-bold">{pallet.client}</span><span className="inline-flex items-center gap-1.5 font-bold"><MapPin size={13} className="text-[#ef4e3a]" />{pallet.location}</span><div><p className="font-bold">{pallet.expiry}</p><p className={`mt-1 text-[10px] font-black ${pallet.days <= 45 ? "text-amber-700" : "text-emerald-700"}`}>{pallet.days} dni</p></div><span className={`w-fit rounded-lg px-2 py-1 text-[10px] font-black ${pallet.state === "QUALITY HOLD" ? "bg-rose-50 text-rose-700" : pallet.state === "FEFO" ? "bg-amber-50 text-amber-700" : "bg-emerald-50 text-emerald-700"}`}>{pallet.state}</span><span className="text-[11px] font-bold text-[#61717d]">{pallet.receivedAt}</span></div>)}{!filteredPallets.length && <p className="p-10 text-center text-sm text-[#61717d]">Nie znaleziono palet.</p>}</div></article></div>}

          {view === "exceptions" && <div className="space-y-5 pt-5"><article className="rounded-2xl border border-[#dbe2e5] bg-white p-5 shadow-[0_10px_28px_rgba(22,32,43,.06)]"><p className="text-[10px] font-black uppercase tracking-[.14em] text-[#ef4e3a]">Exception Command Center</p><h2 className="mt-1 text-2xl font-black tracking-[-.045em]">Nie lista błędów. Kolejka decyzji.</h2><p className="mt-2 max-w-3xl text-sm leading-6 text-[#61717d]">Każdy wyjątek ma właściciela, poziom, historię i następny krok. To ogranicza telefony, e-maile, arkusze oraz niejawne decyzje na rampie.</p></article><div className="grid gap-4 lg:grid-cols-3">{exceptions.map((item) => <article key={item.id} className={`rounded-2xl border p-5 shadow-[0_10px_28px_rgba(22,32,43,.06)] ${item.level === "critical" ? "border-rose-200 bg-rose-50" : item.level === "review" ? "border-amber-200 bg-amber-50" : "border-sky-200 bg-sky-50"}`}><div className="flex items-center justify-between"><span className="text-[10px] font-black tracking-[.12em] text-[#61717d]">{item.id}</span><span className="text-[10px] font-bold text-[#61717d]">{item.time}</span></div><h3 className="mt-3 text-base font-black tracking-[-.03em]">{item.title}</h3><p className="mt-2 text-xs leading-5 text-[#4b5b66]">{item.details}</p><div className="mt-4 flex items-center justify-between rounded-xl bg-white/80 px-3 py-2 text-[11px] font-bold"><span>{item.owner}</span><button onClick={() => setNotice(`Otworzono workflow ${item.id}. Produkcyjnie: QHSE / Team Leader / klient.`)} className="text-[#ef4e3a]">Otwórz <ArrowRight className="inline" size={12} /></button></div></article>)}</div></div>}

          {view === "setup" && <div className="grid gap-5 pt-5 xl:grid-cols-[.9fr_1.1fr]"><article className="rounded-2xl border border-[#dbe2e5] bg-white p-5 shadow-[0_10px_28px_rgba(22,32,43,.06)]"><p className="text-[10px] font-black uppercase tracking-[.14em] text-[#ef4e3a]">Pilot scope</p><h2 className="mt-1 text-2xl font-black tracking-[-.045em]">Wdrożenie bez zatrzymania magazynu.</h2><div className="mt-5 space-y-3">{[["1", "Jedna strefa przyjęć", "Dwie rampy, jeden klient FMCG, pełna ścieżka GS1 + ASN + Quality Hold."], ["2", "Dry-run", "FLOW.OS podejmuje decyzję równolegle z obecnym procesem, ale jeszcze nie zapisuje ruchu."], ["3", "KPI", "Mierzymy błędy skanu, czas wyjątków, zgodność ASN i czas skan → putaway."], ["4", "Write-back", "Automatyczny zapis dopiero po akceptacji FM IT, QHSE i właściciela procesu."]].map(([number, title, details]) => <div key={number} className="flex gap-3 rounded-xl border border-[#e6ecee] p-3"><span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-[#f4e8e6] text-[11px] font-black text-[#c7352b]">{number}</span><div><p className="text-sm font-extrabold">{title}</p><p className="mt-1 text-xs leading-5 text-[#61717d]">{details}</p></div></div>)}</div></article><article className="rounded-2xl border border-[#dbe2e5] bg-white p-5 shadow-[0_10px_28px_rgba(22,32,43,.06)]"><p className="text-[10px] font-black uppercase tracking-[.14em] text-[#61717d]">Discovery checklist</p><h2 className="mt-1 text-xl font-black tracking-[-.04em]">Co trzeba potwierdzić z FM IT i platformą</h2><div className="mt-5 grid gap-3 sm:grid-cols-2">{[["WMS i ASN", "Wersja, API, kolejki zdarzeń, model oczekiwanych SSCC i transakcji inbound."], ["Skanery", "Zebra / Honeywell / Datalogic, DataWedge / SDK, FNC1 oraz GS separator."], ["Reguły klienta", "Shelf life, batch policy, separacja stocku, statusy jakościowe i FEFO."], ["Quality Hold", "SLA, role, decyzje, komunikacja z klientem i pełny audyt."], ["Mapa platformy", "Rzeczywiste lokacje, nośności, strefy, blokady i automatyka."], ["Security", "SSO, uprawnienia, retencja danych, procedury dostępu i monitoring."]].map(([title, details]) => <div key={title} className="rounded-xl border border-[#e6ecee] bg-[#fbfcfc] p-4"><p className="text-xs font-extrabold">{title}</p><p className="mt-1.5 text-[11px] leading-5 text-[#61717d]">{details}</p></div>)}</div></article></div>}

          <footer className="mt-6 rounded-xl border border-[#dbe2e5] bg-white px-4 py-3 text-xs text-[#61717d] shadow-[0_6px_20px_rgba(22,32,43,.04)]"><strong className="text-[#16202b]">Status:</strong> {notice}</footer>
        </section>
      </div>
    </main>
  );
}
