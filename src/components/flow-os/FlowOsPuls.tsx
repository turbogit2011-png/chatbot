"use client";

import { useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ChevronRight,
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
  Truck,
  XCircle,
} from "lucide-react";

type Widok = "pulpit" | "brama" | "paszport" | "radar" | "laboratorium";
type Decyzja = "dopuszcz" | "eskaluj" | "kwarantanna";
type Klient = "Sieć detaliczna Alfa" | "Marka zdrowej żywności" | "Marka kosmetyczna";
type Dowody = { asn: boolean; zdjecie: boolean; waga: boolean; lokalizacja: boolean };
type Paleta = { sscc: string; batch: string; data: string; dni: number; klient: Klient; lokacja: string; pewnosc: number; stan: "Dostępna" | "Priorytet FEFO" | "Kwarantanna"; historia: string[]; dowody: Dowody };

const GS = String.fromCharCode(29);
const DEMO = "(00)123456789012345675(01)05901234123457(10)POMARANCZA-2407(17)270930(37)48";
const kontrakty: Record<Klient, { minimum: number; aleja: string; opis: string }> = {
  "Sieć detaliczna Alfa": { minimum: 21, aleja: "601", opis: "FMCG · towar ambient" },
  "Marka zdrowej żywności": { minimum: 45, aleja: "605", opis: "FMCG · zaostrzone FEFO" },
  "Marka kosmetyczna": { minimum: 90, aleja: "615", opis: "kosmetyki · zapas wrażliwy" },
};
const startowePalety: Paleta[] = [
  { sscc: "340123450000000000", batch: "JABLKO-2406", data: "2026-08-22", dni: 48, klient: "Sieć detaliczna Alfa", lokacja: "601 A1", pewnosc: 96, stan: "Dostępna", dowody: { asn: true, zdjecie: true, waga: true, lokalizacja: true }, historia: ["09:16 · skan GS1 potwierdzony", "09:16 · zgodność z ASN", "09:17 · waga kontrolna zgodna", "09:18 · skan lokacji 601 A1"] },
  { sscc: "003400123456789019", batch: "ENERGIA-2407", data: "2026-08-03", dni: 29, klient: "Marka zdrowej żywności", lokacja: "605 A1", pewnosc: 88, stan: "Priorytet FEFO", dowody: { asn: true, zdjecie: true, waga: false, lokalizacja: true }, historia: ["09:42 · skan GS1 potwierdzony", "09:42 · reguła FEFO podniosła priorytet", "09:44 · brak drugiego źródła wagi"] },
  { sscc: "036000291452000000", batch: "PIELEGNACJA-2406", data: "2027-01-12", dni: 191, klient: "Marka kosmetyczna", lokacja: "615 A1", pewnosc: 91, stan: "Dostępna", dowody: { asn: true, zdjecie: true, waga: false, lokalizacja: true }, historia: ["08:58 · skan GS1 potwierdzony", "08:59 · zgodność z kontraktem", "09:03 · skan lokacji 615 A1"] },
];

function dataGs1(value?: string) {
  if (!value || !/^\d{6}$/.test(value)) return undefined;
  const rok = 2000 + Number(value.slice(0, 2));
  const miesiac = Number(value.slice(2, 4));
  const dzien = Number(value.slice(4, 6));
  if (miesiac < 1 || miesiac > 12 || dzien > 31) return undefined;
  return new Date(rok, miesiac - 1, dzien || 1);
}
function dniDoTerminu(data?: Date) {
  if (!data) return undefined;
  const dzis = new Date();
  dzis.setHours(0, 0, 0, 0);
  return Math.ceil((data.getTime() - dzis.getTime()) / 86400000);
}
function poprawnySscc(sscc?: string) {
  if (!sscc || !/^\d{18}$/.test(sscc)) return false;
  const suma = [...sscc.slice(0, -1)].reverse().reduce((wynik, cyfra, i) => wynik + Number(cyfra) * (i % 2 === 0 ? 3 : 1), 0);
  return (10 - (suma % 10)) % 10 === Number(sscc[17]);
}
function odczytaj(tekst: string) {
  const raw = tekst.trim().replace(/^\][A-Za-z0-9]{2}/, "");
  const wynik: Record<string, string> = {};
  if (raw.includes("(")) {
    const regex = /\((\d{2,4})\)([^\(]*)/g;
    let m: RegExpExecArray | null;
    while ((m = regex.exec(raw)) !== null) wynik[m[1]] = m[2].trim();
  } else {
    let i = 0;
    const stale: Record<string, number> = { "00": 18, "01": 14, "15": 6, "17": 6 };
    while (i < raw.length) {
      if (raw[i] === GS) { i++; continue; }
      const ai = raw.slice(i, i + 2);
      if (!stale[ai] && ai !== "10" && ai !== "37") break;
      i += 2;
      const koniec = stale[ai] ? i + stale[ai] : (() => { const x = raw.indexOf(GS, i); return x === -1 ? raw.length : x; })();
      wynik[ai] = raw.slice(i, koniec);
      i = stale[ai] ? koniec : koniec + 1;
    }
  }
  return { sscc: wynik["00"], gtin: wynik["01"], batch: wynik["10"], data: wynik["17"] || wynik["15"], ilosc: wynik["37"] };
}
function klasaPewnosci(punkty: number) { return punkty >= 90 ? "border-emerald-200 bg-emerald-50 text-emerald-800" : punkty >= 70 ? "border-amber-200 bg-amber-50 text-amber-800" : "border-rose-200 bg-rose-50 text-rose-800"; }

export default function FlowOsPuls() {
  const [widok, setWidok] = useState<Widok>("pulpit");
  const [klient, setKlient] = useState<Klient>("Sieć detaliczna Alfa");
  const [tekst, setTekst] = useState(DEMO);
  const [dowody, setDowody] = useState<Dowody>({ asn: true, zdjecie: true, waga: true, lokalizacja: true });
  const [wynik, setWynik] = useState<ReturnType<typeof odczytaj> | null>(null);
  const [decyzja, setDecyzja] = useState<Decyzja | null>(null);
  const [opis, setOpis] = useState("Brama Prawdy czeka na skan oraz dowody fizyczne.");
  const [palety, setPalety] = useState<Paleta[]>(startowePalety);
  const [wybrana, setWybrana] = useState(startowePalety[0].sscc);
  const [wariant, setWariant] = useState<"dopuszcz" | "kwarantanna" | "eskaluj">("dopuszcz");
  const [komunikat, setKomunikat] = useState("Wersja demonstracyjna. Dane działają tylko w tej przeglądarce.");

  const reguly = kontrakty[klient];
  const data = dataGs1(wynik?.data);
  const dni = dniDoTerminu(data);
  const duplikat = Boolean(wynik?.sscc && palety.some((paleta) => paleta.sscc === wynik.sscc));
  const pewnosc = wynik ? Math.max(0, (poprawnySscc(wynik.sscc) ? 25 : 0) + (wynik.gtin ? 8 : 0) + (wynik.batch ? 12 : 0) + (wynik.data ? 15 : 0) + (wynik.ilosc ? 4 : 0) + (dowody.asn ? 13 : 0) + (dowody.zdjecie ? 8 : 0) + (dowody.waga ? 8 : 0) + (dowody.lokalizacja ? 7 : 0) - (duplikat ? 70 : 0)) : 0;
  const paszport = palety.find((paleta) => paleta.sscc === wybrana) ?? palety[0];
  const statystyki = useMemo(() => ({
    srednia: Math.round(palety.reduce((suma, paleta) => suma + paleta.pewnosc, 0) / palety.length),
    fefo: palety.filter((paleta) => paleta.stan === "Priorytet FEFO").length,
    slabe: palety.filter((paleta) => paleta.pewnosc < 90).length,
    wolne: 9 - palety.length,
  }), [palety]);

  function sprawdz() {
    const odczyt = odczytaj(tekst);
    const termin = dataGs1(odczyt.data);
    const pozostalo = dniDoTerminu(termin);
    const istnieje = Boolean(odczyt.sscc && palety.some((paleta) => paleta.sscc === odczyt.sscc));
    const score = Math.max(0, (poprawnySscc(odczyt.sscc) ? 25 : 0) + (odczyt.gtin ? 8 : 0) + (odczyt.batch ? 12 : 0) + (odczyt.data ? 15 : 0) + (odczyt.ilosc ? 4 : 0) + (dowody.asn ? 13 : 0) + (dowody.zdjecie ? 8 : 0) + (dowody.waga ? 8 : 0) + (dowody.lokalizacja ? 7 : 0) - (istnieje ? 70 : 0));
    setWynik(odczyt);
    if (!odczyt.sscc || !odczyt.batch || !odczyt.data || !poprawnySscc(odczyt.sscc) || istnieje || !termin || pozostalo === undefined || pozostalo < 0) {
      setDecyzja("kwarantanna");
      setOpis(istnieje ? "Ten SSCC już występuje w historii. System zatrzymuje potencjalny podwójny ruch." : "Brak danych krytycznych, niepoprawny SSCC albo termin po dacie. Paleta nie może wejść do zapasu.");
    } else if (pozostalo < reguly.minimum || score < 80) {
      setDecyzja("eskaluj");
      setOpis(pozostalo < reguly.minimum ? `Pozostało ${pozostalo} dni, a kontrakt wymaga minimum ${reguly.minimum}.` : `Pewność operacyjna wynosi ${score}/100: brakuje niezależnych dowodów.`);
    } else {
      setDecyzja("dopuszcz");
      setOpis(`Paleta ma pewność ${score}/100, dane GS1 i reguły kontraktu są spójne. Można przygotować kontrolowane lokowanie.`);
    }
  }

  function zatwierdz() {
    if (!wynik || !decyzja) return setKomunikat("Najpierw uruchom Bramę Prawdy.");
    if (decyzja !== "dopuszcz") { setKomunikat(decyzja === "kwarantanna" ? "Utworzono kwarantannę jakościową z pełnym powodem zatrzymania." : "Przekazano przypadek do lidera zmiany wraz z pełnym kontekstem decyzji."); setWidok("radar"); return; }
    if (!wynik.sscc || !wynik.batch || !data || dni === undefined) return;
    const lokacja = `${reguly.aleja} A2`;
    const nowa: Paleta = { sscc: wynik.sscc, batch: wynik.batch, data: data.toISOString().slice(0, 10), dni, klient, lokacja, pewnosc, stan: dni <= 45 ? "Priorytet FEFO" : "Dostępna", dowody, historia: ["teraz · skan GS1 potwierdzony", `teraz · pewność operacyjna ${pewnosc}/100`, `teraz · rekomendacja lokowania ${lokacja}`] };
    setPalety((obecne) => [nowa, ...obecne]); setWybrana(nowa.sscc); setKomunikat(`Utworzono cyfrowy paszport i rekomendację lokowania ${lokacja}.`); setWidok("paszport"); setTekst(""); setWynik(null); setDecyzja(null);
  }

  const menu: { id: Widok; etykieta: string; ikona: typeof Activity }[] = [
    { id: "pulpit", etykieta: "Pulpit decyzyjny", ikona: Activity },
    { id: "brama", etykieta: "Brama Prawdy", ikona: ScanBarcode },
    { id: "paszport", etykieta: "Paszport palety", ikona: Fingerprint },
    { id: "radar", etykieta: "Radar ryzyka", ikona: Gauge },
    { id: "laboratorium", etykieta: "Laboratorium decyzji", ikona: Sparkles },
  ];
  const skutki = {
    dopuszcz: ["Tworzy cyfrowy paszport palety przed ruchem.", "Dopuszcza lokowanie tylko w zgodnej strefie kontraktu.", "Zachowuje dowody do FEFO, recall i kontroli batchu."],
    kwarantanna: ["Zatrzymuje błąd zanim wejdzie do zapasu i fali wydania.", "Przekazuje komplet danych do jakości / QHSE.", "Chroni SLA i historię palety przed rozbieżnością."],
    eskaluj: ["Nie udaje pewności: przekazuje kontekst osobie uprawnionej.", "Łączy GS1, dowody, termin i regułę kontraktu w jednym miejscu.", "Zapisuje uzasadnienie decyzji zamiast niejawnego obejścia."],
  }[wariant];

  return <main className="min-h-screen bg-[#f4f6f5] text-[#16202b]"><div className="mx-auto flex min-h-screen max-w-[1640px] flex-col xl:flex-row">
    <aside className="w-full bg-[#16202b] px-4 py-5 text-white xl:sticky xl:top-0 xl:h-screen xl:w-80 xl:shrink-0 xl:px-5"><div className="flex items-center gap-3 px-2"><div className="grid h-12 w-12 place-items-center rounded-2xl bg-[#ef4e3a] text-xs font-black tracking-[-.12em]">FM</div><div><p className="text-sm font-black tracking-wide">FLOW.OS</p><p className="mt-0.5 text-[10px] font-bold tracking-[.16em] text-slate-400">PULS PRAWDY FIZYCZNEJ</p></div></div><div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-4"><p className="text-[10px] font-black uppercase tracking-[.12em] text-slate-400">Platforma PL-01 · pilotaż</p><p className="mt-2 text-sm font-extrabold">FM LOGISTIC · 3PL / FMCG</p><p className="mt-1.5 text-xs leading-5 text-slate-300">Nie kolejny WMS. System dowodów, pewności i decyzji przed ruchem fizycznym.</p></div><nav className="mt-6 flex gap-1 overflow-x-auto xl:flex-col xl:overflow-visible">{menu.map((pozycja) => { const Ikona = pozycja.ikona; return <button key={pozycja.id} onClick={() => setWidok(pozycja.id)} className={`flex shrink-0 items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-bold transition ${widok === pozycja.id ? "bg-[#ef4e3a]/20 text-white shadow-[inset_3px_0_0_#ef4e3a]" : "text-slate-300 hover:bg-white/5"}`}><Ikona size={17} />{pozycja.etykieta}</button>; })}</nav><p className="mt-8 hidden border-t border-white/10 px-2 pt-5 text-[11px] leading-5 text-slate-400 xl:block">Najpierw dowody i symulacja skutku. Dopiero potem kontrolowany zapis do WMS.</p></aside>
    <section className="min-w-0 flex-1 px-4 py-6 sm:px-7 lg:px-9"><header className="flex flex-col gap-4 border-b border-[#dbe2e5] pb-5 lg:flex-row lg:items-start lg:justify-between"><div><div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[.14em] text-[#61717d]"><span>FM Logistic</span><ChevronRight size={12} /><span className="text-[#ef4e3a]">PL-01</span><ChevronRight size={12} /><span>{menu.find((x) => x.id === widok)?.etykieta}</span></div><h1 className="mt-2 text-3xl font-black tracking-[-.055em] sm:text-4xl">Nie zarządzaj tabelą. Zarządzaj pewnością.</h1><p className="mt-2 max-w-4xl text-sm leading-6 text-[#61717d]">WMS pokazuje stan deklarowany. FLOW.OS buduje stan potwierdzony: konkretną paletę, komplet dowodów i skutki decyzji.</p></div><div className="flex flex-wrap gap-2"><select value={klient} onChange={(e) => setKlient(e.target.value as Klient)} className="h-10 rounded-xl border border-[#dbe2e5] bg-white px-3 text-xs font-bold"><option>Sieć detaliczna Alfa</option><option>Marka zdrowej żywności</option><option>Marka kosmetyczna</option></select><button onClick={() => { setTekst(DEMO); setWynik(null); setDecyzja(null); }} className="inline-flex h-10 items-center gap-2 rounded-xl border border-[#dbe2e5] bg-white px-3 text-xs font-bold"><RefreshCw size={14} />Demo GS1</button></div></header>
    <div className="mt-4 flex items-start gap-2 rounded-xl border border-[#ffd7d1] bg-[#fff7f5] px-4 py-3 text-xs leading-5 text-[#5d3f3a]"><ShieldCheck size={17} className="mt-0.5 shrink-0 text-[#ef4e3a]" /><span><strong>Bezpieczny prototyp:</strong> aplikacja nie łączy się z prywatnymi systemami, serwerami ani danymi FM Logistic. Pokazuje model działania do pilotażu typu dry-run.</span></div>

    {widok === "pulpit" && <div className="space-y-5 pt-5"><article className="overflow-hidden rounded-2xl border border-[#dbe2e5] bg-white shadow-[0_10px_28px_rgba(22,32,43,.06)]"><div className="grid lg:grid-cols-[1.2fr_.8fr]"><div className="p-6"><p className="text-[10px] font-black uppercase tracking-[.14em] text-[#ef4e3a]">System nowej kategorii</p><h2 className="mt-2 text-2xl font-black tracking-[-.05em]">FLOW.OS nie zastępuje WMS. Chroni go przed błędną rzeczywistością.</h2><p className="mt-3 text-sm leading-6 text-[#61717d]">Nie tworzymy kolejnej listy zadań. Tworzymy cyfrowy paszport palety: dowody z etykiety, awizacji, wagi, zdjęcia i lokalizacji. System mówi, kiedy można zaufać ruchowi, a kiedy trzeba go zatrzymać.</p><div className="mt-5 grid gap-3 sm:grid-cols-3">{[["1", "Stan deklarowany", "WMS, ASN, kontrakt"], ["2", "Dowody fizyczne", "GS1, waga, zdjęcie, lokacja"], ["3", "Pewna decyzja", "dopuść, zatrzymaj, eskaluj"]].map(([n,t,o]) => <div key={n} className="rounded-xl border border-[#e5ebed] bg-[#fbfcfc] p-3"><span className="grid h-7 w-7 place-items-center rounded-lg bg-[#f4e8e6] text-[11px] font-black text-[#c7352b]">{n}</span><p className="mt-3 text-xs font-black">{t}</p><p className="mt-1 text-[11px] leading-5 text-[#61717d]">{o}</p></div>)}</div><button onClick={() => setWidok("brama")} className="mt-5 inline-flex h-10 items-center gap-2 rounded-xl bg-[#ef4e3a] px-4 text-xs font-black text-white"><ScanBarcode size={15} />Uruchom Bramę Prawdy</button></div><div className="bg-[#16202b] p-6 text-white"><p className="text-[10px] font-black uppercase tracking-[.14em] text-slate-400]">Pytanie systemu</p><p className="mt-4 text-2xl font-black leading-tight tracking-[-.05em]">„Czy ta paleta jest wystarczająco udowodniona, aby wykonać kolejny ruch?”</p><div className="mt-6 space-y-3">{[["SSCC", "czy nie ma duplikatu?"], ["Batch + data", "czy spełnia regułę kontraktu?"], ["Dowody", "czy skan ma potwierdzenie fizyczne?"], ["Skutek", "co ryzykujemy po błędnej decyzji?"]].map(([a,b]) => <div key={a} className="flex gap-3 rounded-xl border border-white/10 bg-white/5 p-3"><span className="text-xs font-black text-[#b8d846]">{a}</span><span className="text-xs leading-5 text-slate-300">{b}</span></div>)}</div></div></div></article><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{[["Średnia pewność", `${statystyki.srednia}/100`, "aktywnych paszportów"], ["Palety FEFO", statystyki.fefo, "priorytet wydania"], ["Słabe dowody", statystyki.slabe, "wymagają obserwacji"], ["Wolne lokacje", statystyki.wolne, "po odjęciu blokad"]].map(([a,b,c]) => <article key={String(a)} className="rounded-2xl border border-[#dbe2e5] bg-white p-4 shadow-[0_10px_28px_rgba(22,32,43,.06)]"><p className="text-[10px] font-black uppercase tracking-[.11em] text-[#61717d]">{a}</p><p className="mt-3 text-3xl font-black tracking-[-.06em]">{b}</p><p className="mt-1 text-[11px] font-bold text-[#61717d]">{c}</p></article>)}</div></div>}

    {widok === "brama" && <div className="grid gap-5 pt-5 xl:grid-cols-[1.1fr_.9fr]"><article className="rounded-2xl border border-[#dbe2e5] bg-white p-5 shadow-[0_10px_28px_rgba(22,32,43,.06)]"><p className="text-[10px] font-black uppercase tracking-[.14em] text-[#ef4e3a]">Brama Prawdy</p><h2 className="mt-1 text-2xl font-black tracking-[-.045em]">Zanim paleta dostanie ruch</h2><p className="mt-2 text-sm leading-6 text-[#61717d]">GS1-128 / GS1 DataMatrix: SSCC AI (00), GTIN AI (01), batch AI (10), data AI (15)/(17), ilość AI (37).</p><label className="mt-5 block text-xs font-extrabold">Odczyt kolektora / HRI GS1</label><textarea value={tekst} onChange={(e) => setTekst(e.target.value)} className="mt-2 min-h-36 w-full rounded-xl border border-[#dbe2e5] bg-[#fbfcfc] p-3 font-mono text-xs leading-6 outline-none focus:border-[#ef4e3a]" /><div className="mt-3 flex gap-2"><button onClick={sprawdz} className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#ef4e3a] px-4 text-xs font-black text-white"><ScanBarcode size={16} />Sprawdź paletę</button><button onClick={() => setTekst(DEMO)} className="inline-flex h-10 items-center gap-2 rounded-xl border border-[#dbe2e5] bg-white px-4 text-xs font-bold"><RefreshCw size={15} />Przykład</button></div><div className="mt-5 rounded-2xl border border-[#e1e8ea] bg-[#fbfcfc] p-4"><div className="flex items-center gap-2"><Eye size={16} className="text-[#ef4e3a]" /><h3 className="text-sm font-black">Niezależne dowody</h3></div><div className="mt-4 grid gap-2 sm:grid-cols-2">{[["asn","Zgodność z ASN"],["zdjecie","Zdjęcie etykiety"],["waga","Waga kontrolna"],["lokalizacja","Skan lokalizacji"]].map(([k,n]) => <label key={k} className="flex cursor-pointer items-center gap-3 rounded-xl border border-[#e1e8ea] bg-white p-3"><input type="checkbox" checked={dowody[k as keyof Dowody]} onChange={(e) => setDowody((x) => ({...x,[k]:e.target.checked}))} className="h-4 w-4 accent-[#ef4e3a]" /><span className="text-xs font-bold">{n}</span></label>)}</div><p className="mt-3 text-[11px] leading-5 text-[#61717d]">W prototypie przełączniki symulują źródła. W pilotażu dowody muszą pochodzić z zatwierdzonych urządzeń i integracji.</p></div></article><article className="rounded-2xl border border-[#dbe2e5] bg-white shadow-[0_10px_28px_rgba(22,32,43,.06)]"><div className="border-b border-[#e6ecee] p-5"><p className="text-[10px] font-black uppercase tracking-[.12em] text-[#61717d]">Karta decyzji</p><h2 className="mt-1 text-xl font-black">Czy ruch jest uzasadniony?</h2></div><div className="p-5"><div className={`rounded-2xl border p-4 ${decyzja === "dopuszcz" ? "border-emerald-200 bg-emerald-50" : decyzja === "eskaluj" ? "border-amber-200 bg-amber-50" : decyzja === "kwarantanna" ? "border-rose-200 bg-rose-50" : "border-[#dbe2e5] bg-[#f8faf9]"}`}><div className="flex gap-3">{decyzja === "dopuszcz" ? <CheckCircle2 className="text-emerald-700" /> : decyzja === "kwarantanna" ? <XCircle className="text-rose-700" /> : <ClipboardCheck className="text-amber-700" />}<div><p className="text-sm font-black">{decyzja === "dopuszcz" ? "DOPUŚĆ" : decyzja === "eskaluj" ? "ESKALUJ" : decyzja === "kwarantanna" ? "ZATRZYMAJ" : "OCZEKIWANIE"}</p><p className="mt-1 text-xs leading-5 text-[#61717d]">{opis}</p></div></div></div><div className="mt-4 grid grid-cols-2 gap-2">{[["SSCC",wynik?.sscc ?? "—"],["GTIN",wynik?.gtin ?? "—"],["Batch",wynik?.batch ?? "—"],["Data",data ? data.toISOString().slice(0,10) : "—"],["Ilość",wynik?.ilosc ?? "—"],["Termin",dni !== undefined ? `${dni} dni` : "—"]].map(([a,b]) => <div key={a} className="rounded-xl border border-[#e6ecee] bg-[#fbfcfc] p-3"><p className="text-[9px] font-black uppercase tracking-[.09em] text-[#61717d]">{a}</p><p className="mt-1 break-all text-xs font-extrabold">{b}</p></div>)}</div><div className={`mt-4 rounded-2xl border p-4 ${klasaPewnosci(pewnosc)}`}><div className="flex items-center justify-between"><div><p className="text-[10px] font-black uppercase tracking-[.1em]">Pewność operacyjna</p><p className="mt-1 text-sm font-black">{pewnosc >= 90 ? "silna" : pewnosc >= 70 ? "warunkowa" : "słaba"}</p></div><p className="text-3xl font-black">{wynik ? pewnosc : "—"}<small className="text-sm">/100</small></p></div></div><button disabled={!decyzja} onClick={zatwierdz} className="mt-5 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#16202b] text-xs font-black text-white disabled:opacity-40"><PackageCheck size={16} />{decyzja === "dopuszcz" ? "Utwórz kontrolowane lokowanie" : decyzja === "eskaluj" ? "Przekaż do lidera zmiany" : decyzja === "kwarantanna" ? "Utwórz kwarantannę jakościową" : "Czeka na sprawdzenie"}</button></div></article></div>}

    {widok === "paszport" && <div className="space-y-5 pt-5"><article className="flex flex-col gap-4 rounded-2xl border border-[#dbe2e5] bg-white p-5 shadow-[0_10px_28px_rgba(22,32,43,.06)] lg:flex-row lg:items-end lg:justify-between"><div><p className="text-[10px] font-black uppercase tracking-[.14em] text-[#ef4e3a]">Cyfrowy paszport palety</p><h2 className="mt-1 text-2xl font-black tracking-[-.045em]">Nie wpis o zapasie. Łańcuch udowodnionej historii.</h2><p className="mt-2 text-sm leading-6 text-[#61717d]">Paszport pokazuje tożsamość, dowody, ruchy i ograniczenia konkretnej jednostki logistycznej.</p></div><select value={wybrana} onChange={(e) => setWybrana(e.target.value)} className="h-10 rounded-xl border border-[#dbe2e5] px-3 font-mono text-xs font-bold">{palety.map((p) => <option key={p.sscc} value={p.sscc}>{p.sscc} · {p.batch}</option>)}</select></article><div className="grid gap-5 xl:grid-cols-[.85fr_1.15fr]"><article className="rounded-2xl border border-[#dbe2e5] bg-white p-5 shadow-[0_10px_28px_rgba(22,32,43,.06)]"><div className="flex justify-between gap-4"><div><p className="text-[10px] font-black uppercase tracking-[.1em] text-[#61717d]">Tożsamość fizyczna</p><p className="mt-2 break-all font-mono text-sm font-black">{paszport.sscc}</p></div><span className={`h-fit rounded-xl border px-3 py-2 text-sm font-black ${klasaPewnosci(paszport.pewnosc)}`}>{paszport.pewnosc}/100</span></div><div className="mt-5 grid grid-cols-2 gap-2">{[["Klient",paszport.klient],["Lokacja",paszport.lokacja],["Batch",paszport.batch],["Data",paszport.data],["Termin",`${paszport.dni} dni`],["Stan",paszport.stan]].map(([a,b]) => <div key={a} className="rounded-xl border border-[#e6ecee] bg-[#fbfcfc] p-3"><p className="text-[9px] font-black uppercase tracking-[.09em] text-[#61717d]">{a}</p><p className="mt-1 text-xs font-extrabold">{b}</p></div>)}</div><div className="mt-4 rounded-xl border border-[#e4eaec] p-3"><p className="text-[10px] font-black uppercase tracking-[.1em] text-[#61717d]">Łańcuch dowodowy</p><p className="mt-2 text-xs leading-5 text-[#61717d]">ASN: {paszport.dowody.asn ? "potwierdzone" : "brak"} · zdjęcie: {paszport.dowody.zdjecie ? "potwierdzone" : "brak"} · waga: {paszport.dowody.waga ? "potwierdzona" : "brak"} · lokacja: {paszport.dowody.lokalizacja ? "potwierdzona" : "brak"}</p></div></article><article className="rounded-2xl border border-[#dbe2e5] bg-white p-5 shadow-[0_10px_28px_rgba(22,32,43,.06)]"><p className="text-[10px] font-black uppercase tracking-[.12em] text-[#61717d]">Czarna skrzynka decyzji</p><h3 className="mt-1 text-xl font-black">Historia palety</h3><div className="mt-5 space-y-3">{paszport.historia.map((x,i) => <div key={x} className="grid grid-cols-[30px_1fr] gap-3"><span className="grid h-7 w-7 place-items-center rounded-lg bg-emerald-50 text-emerald-700"><CheckCircle2 size={15}/></span><div className="border-b border-dashed border-[#dbe2e5] pb-3 last:border-0"><p className="text-xs font-extrabold">{x}</p><p className="mt-1 text-[11px] text-[#61717d]">Zdarzenie {i+1} jest elementem audytowalnego łańcucha tej palety.</p></div></div>)}</div></article></div></div>}

    {widok === "radar" && <div className="space-y-5 pt-5"><article className="rounded-2xl border border-[#dbe2e5] bg-white p-5 shadow-[0_10px_28px_rgba(22,32,43,.06)]"><p className="text-[10px] font-black uppercase tracking-[.14em] text-[#ef4e3a]">Radar ryzyka zmiany</p><h2 className="mt-1 text-2xl font-black tracking-[-.045em]">Szukaj sygnałów, zanim staną się błędem zapasu.</h2><p className="mt-2 max-w-3xl text-sm leading-6 text-[#61717d]">Radar nie czeka na raport po zmianie. Łączy słabe dowody, FEFO, terminy i wyjątki, żeby wskazać właściciela decyzji przed wysyłką lub co-packingiem.</p></article><div className="grid gap-4 lg:grid-cols-3">{[["Słaba pewność",statystyki.slabe,"brakuje co najmniej jednego dowodu"],["Priorytet FEFO",statystyki.fefo,"kolejność wydania musi uwzględniać datę"],["Otwarte ryzyka",2,"wymagają decyzji, a nie obejścia"]].map(([a,b,c]) => <article key={String(a)} className="rounded-2xl border border-[#dbe2e5] bg-white p-5 shadow-[0_10px_28px_rgba(22,32,43,.06)]"><p className="text-[10px] font-black uppercase tracking-[.1em] text-[#61717d]">{a}</p><p className="mt-3 text-4xl font-black tracking-[-.07em]">{b}</p><p className="mt-2 text-xs leading-5 text-[#61717d]">{c}</p></article>)}</div><article className="rounded-2xl border border-[#dbe2e5] bg-white shadow-[0_10px_28px_rgba(22,32,43,.06)]"><div className="border-b border-[#e6ecee] p-5"><p className="text-[10px] font-black uppercase tracking-[.12em] text-[#61717d]">Kolejność działania</p><h3 className="mt-1 text-xl font-black">Co wymaga reakcji teraz</h3></div><div className="divide-y divide-[#edf1f2]">{[{l:"krytyczne",t:"Kwarantanna jakościowa · termin po dacie",o:"Jakość / QHSE",w:"Paleta nie tworzy fałszywego stanu zapasu."},{l:"uwaga",t:"Różnica batchu względem awizacji",o:"Lider zmiany",w:"Brak domyślnego lokowania bez świadomej decyzji."},{l:"informacja",t:"Lokacja 605 A3 jest zablokowana",o:"Utrzymanie obiektu",w:"Silnik omija lokalizację i przelicza kolejną opcję."}].map((x) => <div key={x.t} className="grid gap-3 px-5 py-4 sm:grid-cols-[32px_1fr_auto]"><span className={`grid h-8 w-8 place-items-center rounded-lg ${x.l === "krytyczne" ? "bg-rose-50 text-rose-700" : x.l === "uwaga" ? "bg-amber-50 text-amber-700" : "bg-sky-50 text-sky-700"}`}><AlertTriangle size={16}/></span><div><p className="text-sm font-extrabold">{x.t}</p><p className="mt-1 text-xs leading-5 text-[#61717d]">{x.w}</p></div><span className="text-[10px] font-bold text-[#61717d]">{x.o}</span></div>)}</div></article></div>}

    {widok === "laboratorium" && <div className="grid gap-5 pt-5 xl:grid-cols-[.9fr_1.1fr]"><article className="rounded-2xl border border-[#dbe2e5] bg-white p-5 shadow-[0_10px_28px_rgba(22,32,43,.06)]"><p className="text-[10px] font-black uppercase tracking-[.14em] text-[#ef4e3a]">Laboratorium decyzji</p><h2 className="mt-1 text-2xl font-black tracking-[-.045em]">Pokaż skutek zanim podejmiesz decyzję.</h2><p className="mt-2 text-sm leading-6 text-[#61717d]">Klasyczny WMS mówi „wykonaj zadanie”. FLOW.OS ma wyświetlić: „co stanie się z jakością, SLA, historią batchu i odpowiedzialnością, kiedy klikniesz decyzję”.</p><div className="mt-5 space-y-2">{[["dopuszcz","Dopuść warunkowo"],["kwarantanna","Zatrzymaj w kwarantannie"],["eskaluj","Przekaż do lidera zmiany"]].map(([id,nazwa]) => <button key={id} onClick={() => setWariant(id as typeof wariant)} className={`w-full rounded-xl border p-4 text-left ${wariant === id ? "border-[#ef4e3a] bg-[#fff7f5]" : "border-[#e1e8ea] bg-white"}`}><p className="text-sm font-black">{nazwa}</p></button>)}</div></article><article className="rounded-2xl border border-[#dbe2e5] bg-white p-5 shadow-[0_10px_28px_rgba(22,32,43,.06)]"><p className="text-[10px] font-black uppercase tracking-[.12em] text-[#61717d]">Symulowany skutek</p><h3 className="mt-1 text-2xl font-black">{wariant === "dopuszcz" ? "Dopuść warunkowo" : wariant === "kwarantanna" ? "Zatrzymaj w kwarantannie" : "Eskaluj do lidera"}</h3><div className="mt-5 space-y-3">{skutki.map((s,i) => <div key={s} className="flex gap-3 rounded-xl border border-[#e5ebed] bg-[#fbfcfc] p-3"><span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-[#16202b] text-[11px] font-black text-white">{i+1}</span><p className="text-xs font-bold leading-5">{s}</p></div>)}</div><div className="mt-5 rounded-xl bg-[#16202b] p-4 text-white"><p className="text-[10px] font-black uppercase tracking-[.1em] text-slate-400">Różnica wobec WMS</p><p className="mt-2 text-sm font-black">Nie „przesuń paletę”. Tylko: „przesuń ją pod warunkiem, że wiesz dlaczego i kto bierze odpowiedzialność za ryzyko”.</p></div><button onClick={() => setWidok("brama")} className="mt-5 inline-flex h-10 items-center gap-2 rounded-xl bg-[#ef4e3a] px-4 text-xs font-black text-white"><ArrowRight size={15}/>Przejdź do Bramy Prawdy</button></article></div>}
    <footer className="mt-6 flex flex-col gap-2 rounded-xl border border-[#dbe2e5] bg-white px-4 py-3 text-xs text-[#61717d] shadow-[0_6px_20px_rgba(22,32,43,.04)] sm:flex-row sm:items-center sm:justify-between"><span><strong className="text-[#16202b]">Status:</strong> {komunikat}</span><span className="inline-flex items-center gap-1.5 font-bold"><Truck size={13} className="text-[#ef4e3a]"/>FLOW.OS · prototyp decyzyjny</span></footer>
    </section></div></main>;
}
