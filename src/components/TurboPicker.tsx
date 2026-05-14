"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  Hash,
  Tag,
  Fingerprint,
  Cog,
  Wrench,
  ArrowRight,
  Phone,
} from "lucide-react";
import { CONTACT } from "@/lib/brand";

type PathKey = "oem" | "plate" | "vin" | "engine" | "regen";

type PathDef = {
  key: PathKey;
  icon: typeof Hash;
  title: string;
  hint: string;
  placeholder: string;
  cta: string;
  inputMode?: "text" | "numeric";
  maxLength?: number;
};

const paths: PathDef[] = [
  {
    key: "oem",
    icon: Hash,
    title: "Mam numer OEM",
    hint: "Numer producenta auta — z faktury lub katalogu części",
    placeholder: "np. 03L253056T",
    cta: "Sprawdź dostępność",
  },
  {
    key: "plate",
    icon: Tag,
    title: "Mam numer z tabliczki turbo",
    hint: "Numer wybity na obudowie turbosprężarki",
    placeholder: "np. 53039880139",
    cta: "Dobierz turbinę",
  },
  {
    key: "vin",
    icon: Fingerprint,
    title: "Mam numer VIN",
    hint: "17 znaków z dowodu rejestracyjnego",
    placeholder: "WAUZZZ8K8AA000000",
    cta: "Wyślij VIN",
    maxLength: 17,
  },
  {
    key: "engine",
    icon: Cog,
    title: "Znam kod silnika",
    hint: "np. CAGA, BKD, BMP, R9M",
    placeholder: "np. BKD",
    cta: "Znajdź turbo",
  },
  {
    key: "regen",
    icon: Wrench,
    title: "Chcę regenerację swojej turbiny",
    hint: "Wyślij turbo do nas — regeneracja w 5–7 dni",
    placeholder: "",
    cta: "Umów regenerację",
  },
];

export default function TurboPicker() {
  const [active, setActive] = useState<PathKey>("oem");
  const [value, setValue] = useState("");

  const activeDef = paths.find((p) => p.key === active)!;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const url = new URL(`${window.location.origin}/sklep`);
    url.searchParams.set("ref", active);
    if (value) url.searchParams.set("q", value);
    if (active === "regen") {
      document.querySelector("#kontakt")?.scrollIntoView({ behavior: "smooth" });
      return;
    }
    window.location.href = url.toString();
  };

  return (
    <section
      id="dobor-turbo"
      className="relative py-20 sm:py-24 bg-[var(--bg-primary)]"
    >
      <div className="absolute inset-0 bg-grid opacity-50 pointer-events-none" />
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-12 max-w-3xl mx-auto">
          <span className="hud-label text-[var(--orange)] block mb-3">
            Dobór turbo · 30 sekund
          </span>
          <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl text-white leading-tight mb-4">
            Powiedz nam jedną z czterech rzeczy —{" "}
            <span className="text-gradient">dobierzemy resztę.</span>
          </h2>
          <p className="text-[var(--text-muted)] text-base sm:text-lg">
            Numer OEM. Numer z tabliczki turbo. VIN. Kod silnika. Wystarczy
            jedna informacja, a my znajdziemy dokładnie tę turbinę, której
            potrzebujesz — z gwarancją dopasowania.
          </p>
        </div>

        {/* Path tabs */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 mb-8">
          {paths.map((p) => {
            const isActive = p.key === active;
            return (
              <button
                key={p.key}
                onClick={() => {
                  setActive(p.key);
                  setValue("");
                }}
                className={`group text-left p-4 rounded-sm border transition-all ${
                  isActive
                    ? "border-[var(--orange)]/60 bg-[var(--orange)]/10"
                    : "border-[var(--steel)] bg-[var(--bg-card)] hover:border-[var(--orange)]/30 hover:bg-[var(--bg-card-hover)]"
                }`}
                aria-pressed={isActive}
              >
                <p.icon
                  className={`w-5 h-5 mb-3 transition-colors ${
                    isActive
                      ? "text-[var(--orange)]"
                      : "text-[var(--text-muted)] group-hover:text-[var(--orange)]"
                  }`}
                />
                <div className="font-medium text-sm text-white leading-snug">
                  {p.title}
                </div>
              </button>
            );
          })}
        </div>

        {/* Active form */}
        <motion.div
          key={active}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="card-premium p-6 sm:p-8"
        >
          <div className="flex flex-col lg:flex-row lg:items-end gap-5 lg:gap-6">
            <div className="flex-1">
              <label
                htmlFor="picker-input"
                className="block text-sm font-medium text-white mb-1.5"
              >
                {activeDef.title}
              </label>
              <p className="text-xs text-[var(--text-muted)] mb-3">
                {activeDef.hint}
              </p>
              {active !== "regen" && (
                <form onSubmit={handleSubmit}>
                  <input
                    id="picker-input"
                    type="text"
                    inputMode={activeDef.inputMode}
                    maxLength={activeDef.maxLength}
                    placeholder={activeDef.placeholder}
                    value={value}
                    onChange={(e) => setValue(e.target.value.toUpperCase())}
                    className="input-field font-mono-tech text-base"
                    autoComplete="off"
                  />
                </form>
              )}
            </div>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={handleSubmit}
                className="btn-primary scanline inline-flex items-center gap-2"
              >
                {activeDef.cta}
                <ArrowRight className="w-4 h-4" />
              </button>
              <a
                href={CONTACT.phoneTel}
                className="btn-secondary inline-flex items-center gap-2"
              >
                <Phone className="w-4 h-4 text-[var(--orange)]" />
                Zadzwoń
              </a>
            </div>
          </div>

          <div className="mt-5 pt-5 border-t border-white/5 flex flex-wrap gap-x-6 gap-y-2 text-xs text-[var(--text-muted)]">
            <span>
              <span className="text-[var(--green)] font-medium">●</span>{" "}
              Dopasowanie 100% lub zwrot pieniędzy
            </span>
            <span>
              <span className="text-[var(--green)] font-medium">●</span>{" "}
              Oddzwaniamy w 30 minut w godzinach pracy
            </span>
            <span>
              <span className="text-[var(--green)] font-medium">●</span>{" "}
              {CONTACT.hours.full}
            </span>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
