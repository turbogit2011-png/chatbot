"use client";

import { Link } from "next-view-transitions";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Check,
  Code2,
  Crown,
  Gauge,
  Lock,
  MessagesSquare,
  ShieldCheck,
  Sparkles,
  WifiOff,
} from "lucide-react";
import { CHECKOUT_URL, PRICE, PRO_FEATURES } from "@/lib/pro";

const FEATURES = [
  {
    icon: <Lock size={20} />,
    title: "100% prywatność",
    desc: "Model działa w Twojej przeglądarce. Żadne słowo nie trafia na serwer — bo serwera nie ma.",
  },
  {
    icon: <WifiOff size={20} />,
    title: "Działa offline",
    desc: "Po jednorazowym pobraniu modelu Aura działa bez internetu. Twoja AI w samolocie i w lesie.",
  },
  {
    icon: <Sparkles size={20} />,
    title: "Zero opłat za API",
    desc: "Brak limitów tokenów, brak subskrypcji za zapytania. Płacisz 0 zł za każdą rozmowę.",
  },
  {
    icon: <Code2 size={20} />,
    title: "Markdown i kod",
    desc: "Pełne formatowanie z podświetlaniem składni i kopiowaniem bloków kodu jednym kliknięciem.",
  },
  {
    icon: <MessagesSquare size={20} />,
    title: "Wiele rozmów",
    desc: "Osobne wątki z auto-tytułami, eksportem do Markdown i pełną historią na urządzeniu.",
  },
  {
    icon: <Gauge size={20} />,
    title: "Szybkie i Twoje",
    desc: "Licznik tokenów/s, stop i regeneracja, własne persony. Pełna kontrola nad asystentem.",
  },
];

const STEPS = [
  { n: "1", t: "Otwórz Aurę", d: "Bez rejestracji, bez konta, bez karty." },
  { n: "2", t: "Pobierz model raz", d: "Otwarty Qwen / Llama ląduje w cache przeglądarki." },
  { n: "3", t: "Rozmawiaj prywatnie", d: "Wszystko dzieje się lokalnie — na zawsze." },
];

export default function Landing() {
  return (
    <div className="relative min-h-screen overflow-hidden">
      <main className="max-w-5xl mx-auto px-4 sm:px-6">
        {/* Nav */}
        <nav className="flex items-center justify-between py-6">
          <div className="flex items-center gap-2">
            <span
              className="w-8 h-8 rounded-xl flex items-center justify-center"
              style={{ background: "var(--grad-brand)", boxShadow: "0 0 20px rgba(139,92,246,0.5)" }}
            >
              <Sparkles size={16} className="text-white" />
            </span>
            <span className="font-display text-2xl tracking-wide">Aura</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/" className="text-sm text-[var(--text-muted)] hover:text-[var(--text)]">
              Momentum
            </Link>
            <Link href="/ai" className="btn btn-primary text-sm">
              Otwórz aplikację
            </Link>
          </div>
        </nav>

        {/* Hero */}
        <section className="py-16 sm:py-24 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <span className="chip mx-auto mb-6" style={{ color: "var(--emerald)" }}>
              <ShieldCheck size={13} /> Twoje rozmowy nie opuszczają urządzenia
            </span>
            <h1 className="text-4xl sm:text-6xl font-bold leading-[1.05] mb-6">
              Twoja własna AI.
              <br />
              <span className="text-gradient">Bez chmury. Bez podsłuchu.</span>
            </h1>
            <p className="text-lg text-[var(--text-muted)] max-w-2xl mx-auto mb-9">
              Aura to asystent AI, który uruchamia prawdziwy model językowy w 100% w
              Twojej przeglądarce. Żadnego serwera, żadnego API, żadnych opłat — i
              żadnej firmy czytającej Twoje rozmowy.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <Link href="/ai" className="btn btn-primary text-base !px-7 !py-3.5">
                Uruchom za darmo <ArrowRight size={18} />
              </Link>
              <a href="#pricing" className="btn btn-ghost text-base !px-7 !py-3.5">
                Zobacz Pro
              </a>
            </div>
            <p className="text-xs text-[var(--text-subtle)] mt-4">
              Wymaga przeglądarki z WebGPU (Chrome / Edge). Bez instalacji.
            </p>
          </motion.div>

          {/* Floating product preview */}
          <motion.div
            initial={{ opacity: 0, y: 40, rotateX: 8 }}
            animate={{ opacity: 1, y: 0, rotateX: 0 }}
            transition={{ duration: 0.7, delay: 0.2, ease: "easeOut" }}
            className="relative mx-auto max-w-2xl mt-16"
            style={{ perspective: 1200 }}
          >
            <div
              className="absolute -inset-6 -z-10 blur-3xl opacity-60"
              style={{ background: "radial-gradient(60% 50% at 50% 0%, rgba(139,92,246,0.5), transparent 70%)" }}
              aria-hidden
            />
            <div className="card card-glow overflow-hidden text-left">
              <div
                className="flex items-center gap-2 px-4 py-2.5"
                style={{ borderBottom: "1px solid var(--border)" }}
              >
                <span className="w-3 h-3 rounded-full" style={{ background: "#fb7185" }} />
                <span className="w-3 h-3 rounded-full" style={{ background: "#fbbf24" }} />
                <span className="w-3 h-3 rounded-full" style={{ background: "#34d399" }} />
                <span className="ml-2 text-xs text-[var(--text-subtle)] flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--emerald)]" /> Aura · lokalnie
                </span>
              </div>
              <div className="p-4 space-y-3">
                <div className="flex justify-end">
                  <div
                    className="rounded-2xl px-4 py-2 text-sm"
                    style={{ background: "var(--grad-brand)", color: "#fff" }}
                  >
                    Napisz funkcję odwracającą tekst w JS
                  </div>
                </div>
                <div className="flex justify-start">
                  <div
                    className="rounded-2xl px-4 py-3 text-sm max-w-[85%]"
                    style={{ background: "rgba(255,255,255,0.04)", border: "1px solid var(--border)" }}
                  >
                    <p className="mb-2 text-[var(--text-muted)]">Proszę bardzo 👇</p>
                    <div className="codeblock !my-0">
                      <div className="codeblock-bar">
                        <span className="codeblock-lang">js</span>
                        <span className="codeblock-copy">kopiuj</span>
                      </div>
                      <pre className="!py-2.5">
                        <code>
                          <span className="hljs-keyword">const</span>{" "}
                          <span className="hljs-title">rev</span> = (s) =&gt;{"\n"}
                          {"  "}s.<span className="hljs-title">split</span>(
                          <span className="hljs-string">&quot;&quot;</span>).
                          <span className="hljs-title">reverse</span>().
                          <span className="hljs-title">join</span>(
                          <span className="hljs-string">&quot;&quot;</span>);
                        </code>
                      </pre>
                    </div>
                  </div>
                </div>
              </div>
              <div className="px-4 pb-4">
                <div
                  className="flex items-center gap-2 rounded-xl px-3 py-2.5"
                  style={{ background: "rgba(255,255,255,0.04)", border: "1px solid var(--border)" }}
                >
                  <span className="text-sm text-[var(--text-subtle)] flex-1">
                    Zapytaj o cokolwiek — prywatnie…
                  </span>
                  <span
                    className="w-8 h-8 rounded-lg flex items-center justify-center"
                    style={{ background: "var(--grad-brand)" }}
                  >
                    <Sparkles size={15} className="text-white" />
                  </span>
                </div>
              </div>
            </div>
          </motion.div>
        </section>

        {/* Features */}
        <section className="py-12">
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {FEATURES.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.15 + i * 0.06 }}
                className="card card-glow p-5"
              >
                <span
                  className="inline-flex w-10 h-10 rounded-xl items-center justify-center mb-3"
                  style={{ background: "rgba(139,92,246,0.12)", color: "var(--violet)" }}
                >
                  {f.icon}
                </span>
                <h3 className="font-semibold mb-1.5">{f.title}</h3>
                <p className="text-sm text-[var(--text-muted)] leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </section>

        {/* How it works */}
        <section className="py-16">
          <h2 className="text-3xl font-bold text-center mb-12">Jak to działa</h2>
          <div className="grid sm:grid-cols-3 gap-5">
            {STEPS.map((s) => (
              <div key={s.n} className="text-center">
                <div
                  className="w-12 h-12 rounded-2xl mx-auto mb-4 flex items-center justify-center font-display text-2xl"
                  style={{ background: "var(--grad-brand)", color: "#fff" }}
                >
                  {s.n}
                </div>
                <h3 className="font-semibold mb-1">{s.t}</h3>
                <p className="text-sm text-[var(--text-muted)]">{s.d}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Pricing */}
        <section id="pricing" className="py-16">
          <h2 className="text-3xl font-bold text-center mb-3">Prosty cennik</h2>
          <p className="text-center text-[var(--text-muted)] mb-12">
            Zacznij za darmo. Ulepsz, gdy zechcesz więcej mocy.
          </p>
          <div className="grid md:grid-cols-2 gap-5 max-w-3xl mx-auto">
            {/* Free */}
            <div className="card p-7">
              <h3 className="font-display text-2xl mb-1">Free</h3>
              <div className="font-display text-5xl mb-5">0 zł</div>
              <ul className="space-y-2.5 mb-7">
                {[
                  "Model Qwen 0.5B, lokalnie",
                  "Do 3 rozmów",
                  "Markdown + podświetlanie kodu",
                  "Pełna prywatność i offline",
                ].map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-[var(--text-muted)]">
                    <Check size={16} className="text-[var(--emerald)] shrink-0 mt-0.5" /> {f}
                  </li>
                ))}
              </ul>
              <Link href="/ai" className="btn btn-ghost w-full">
                Zacznij za darmo
              </Link>
            </div>

            {/* Pro */}
            <div className="card card-glow p-7 relative" style={{ borderColor: "rgba(251,191,36,0.4)" }}>
              <span
                className="absolute top-5 right-5 chip"
                style={{ color: "var(--amber)", borderColor: "rgba(251,191,36,0.4)" }}
              >
                <Crown size={12} /> Najlepszy wybór
              </span>
              <h3 className="font-display text-2xl mb-1 flex items-center gap-2">
                Pro
              </h3>
              <div className="font-display text-5xl mb-1 text-gradient">{PRICE}</div>
              <div className="text-xs text-[var(--text-subtle)] mb-5">
                jednorazowo · dożywotni dostęp
              </div>
              <ul className="space-y-2.5 mb-7">
                {PRO_FEATURES.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-[var(--text-muted)]">
                    <Check size={16} className="text-[var(--emerald)] shrink-0 mt-0.5" /> {f}
                  </li>
                ))}
              </ul>
              {CHECKOUT_URL ? (
                <a
                  href={CHECKOUT_URL}
                  target="_blank"
                  rel="noopener"
                  className="btn btn-primary w-full"
                >
                  <Crown size={16} /> Kup Aura Pro
                </a>
              ) : (
                <Link href="/ai" className="btn btn-primary w-full">
                  <Crown size={16} /> Wypróbuj Pro
                </Link>
              )}
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="py-16 max-w-2xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-10">Częste pytania</h2>
          <div className="space-y-4">
            {[
              {
                q: "Czy to naprawdę prywatne?",
                a: "Tak. Model językowy pobiera się raz i działa wyłącznie w Twojej przeglądarce przez WebGPU. Twoje wiadomości nigdy nie są wysyłane na żaden serwer.",
              },
              {
                q: "Czego potrzebuję?",
                a: "Nowoczesnej przeglądarki z WebGPU (Chrome lub Edge na desktopie, albo Chrome na Androidzie) i jednorazowego pobrania modelu (~0,5–2,3 GB).",
              },
              {
                q: "Czy muszę zakładać konto?",
                a: "Nie. Brak kont, brak e-maili, brak śledzenia. Otwierasz i używasz.",
              },
              {
                q: "Co daje Pro?",
                a: "Mądrzejsze modele (Llama 1B i 3B), nieograniczoną liczbę rozmów, własne persony i eksport — w jednej płatności na zawsze.",
              },
            ].map((item) => (
              <div key={item.q} className="card p-5">
                <h3 className="font-semibold mb-1.5">{item.q}</h3>
                <p className="text-sm text-[var(--text-muted)] leading-relaxed">{item.a}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Final CTA */}
        <section className="py-16 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold mb-5">
            Odzyskaj swoją prywatność. <span className="text-gradient">Dziś.</span>
          </h2>
          <Link href="/ai" className="btn btn-primary text-base !px-8 !py-4 inline-flex">
            Uruchom Aurę za darmo <ArrowRight size={18} />
          </Link>
        </section>

        <footer className="py-10 text-center text-xs text-[var(--text-subtle)]">
          Aura · prywatna AI w przeglądarce · część pakietu{" "}
          <Link href="/" className="underline hover:text-[var(--text)]">
            Momentum
          </Link>
        </footer>
      </main>
    </div>
  );
}
