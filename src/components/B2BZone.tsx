"use client";

import { useState, type FormEvent } from "react";
import { motion } from "framer-motion";
import { Building2, CheckCircle2, AlertCircle } from "lucide-react";
import { B2B_PERKS } from "@/lib/data";
import { Icon } from "@/components/Icon";
import { SectionHeader } from "@/components/Reveal";

type Fields = { name: string; nip: string; email: string; phone: string };
type Errors = Partial<Record<keyof Fields, string>>;

const empty: Fields = { name: "", nip: "", email: "", phone: "" };

function validate(f: Fields): Errors {
  const e: Errors = {};
  if (f.name.trim().length < 2) e.name = "Podaj nazwę firmy / warsztatu.";
  const nipDigits = f.nip.replace(/[\s-]/g, "");
  if (!/^\d{10}$/.test(nipDigits)) e.nip = "NIP musi składać się z 10 cyfr.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email)) e.email = "Podaj poprawny adres e-mail.";
  const phoneDigits = f.phone.replace(/[\s+()-]/g, "");
  if (phoneDigits.length < 9) e.phone = "Podaj poprawny numer telefonu.";
  return e;
}

export function B2BZone() {
  const [fields, setFields] = useState<Fields>(empty);
  const [errors, setErrors] = useState<Errors>({});
  const [sent, setSent] = useState(false);

  const set = (k: keyof Fields) => (v: string) => {
    setFields((f) => ({ ...f, [k]: v }));
    if (errors[k]) setErrors((e) => ({ ...e, [k]: undefined }));
  };

  const submit = (ev: FormEvent) => {
    ev.preventDefault();
    const e = validate(fields);
    setErrors(e);
    if (Object.keys(e).length === 0) {
      setSent(true);
      setFields(empty);
    }
  };

  return (
    <section id="b2b" className="section-pad relative bg-[var(--obsidian-2)]">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-64 bg-halo" />
      <div className="container-pro relative">
        <SectionHeader
          eyebrow="Garage Trade Program"
          title={
            <>
              Strefa <span className="text-gold-grad">B2B dla warsztatów</span>
            </>
          }
          intro="Dołącz do sieci partnerskiej TURBO-GIT i regeneruj turbo na warunkach hurtowych — z dostępem do narzędzi laboratoryjnych."
        />

        <div className="mt-10 grid gap-6 lg:grid-cols-2">
          {/* Perks */}
          <div className="space-y-4">
            {B2B_PERKS.map((p, i) => (
              <motion.div
                key={p.title}
                initial={{ opacity: 0, x: -18 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.08 }}
                className="flex items-start gap-4 panel p-5 transition-colors hover:border-[var(--line-strong)]"
              >
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bezel">
                  <Icon name={p.icon} className="h-6 w-6 text-gold" />
                </span>
                <div>
                  <h3 className="text-base font-bold text-ink">{p.title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-titanium">{p.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Registration form */}
          <div className="panel p-6 sm:p-8">
            <span className="flex items-center gap-2 font-tel text-xs uppercase tracking-[0.2em] text-titanium">
              <Building2 className="h-4 w-4 text-gold" /> Rejestracja partnera
            </span>

            {sent ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                className="mt-6 grid place-items-center rounded-xl border border-[var(--line-strong)] bg-[rgba(95,210,154,0.06)] py-12 text-center"
              >
                <CheckCircle2 className="h-12 w-12 text-[var(--ok)]" />
                <h3 className="mt-4 text-lg font-bold text-ink">Zgłoszenie przyjęte</h3>
                <p className="mt-2 max-w-xs text-sm text-titanium">
                  Dziękujemy. Nasz opiekun B2B skontaktuje się w ciągu 24h, aby aktywować konto
                  Garage Trade i dostęp do AI Core Scanner.
                </p>
                <button onClick={() => setSent(false)} className="btn-ghost mt-6 text-sm">
                  Wyślij kolejne zgłoszenie
                </button>
              </motion.div>
            ) : (
              <form className="mt-6 space-y-4" onSubmit={submit} noValidate>
                <FormField
                  label="Nazwa firmy / warsztatu"
                  placeholder="Auto Serwis Kowalski sp. z o.o."
                  value={fields.name}
                  onChange={set("name")}
                  error={errors.name}
                />
                <FormField
                  label="NIP"
                  placeholder="123-456-78-90"
                  value={fields.nip}
                  onChange={set("nip")}
                  error={errors.nip}
                />
                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField
                    label="E-mail"
                    type="email"
                    placeholder="biuro@warsztat.pl"
                    value={fields.email}
                    onChange={set("email")}
                    error={errors.email}
                  />
                  <FormField
                    label="Telefon"
                    type="tel"
                    placeholder="+48 600 000 000"
                    value={fields.phone}
                    onChange={set("phone")}
                    error={errors.phone}
                  />
                </div>
                <button type="submit" className="btn-gold mt-2 w-full">
                  Załóż konto Garage Trade
                </button>
                <p className="text-center text-xs text-titanium">
                  10% rabatu · 30 dni odroczenia · AI Core Scanner
                </p>
              </form>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function FormField({
  label,
  value,
  onChange,
  error,
  placeholder,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
  placeholder?: string;
  type?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block font-tel text-[0.68rem] uppercase tracking-[0.16em] text-titanium">
        {label}
      </span>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="field"
        style={error ? { borderColor: "var(--danger)" } : undefined}
        aria-invalid={!!error}
      />
      {error && (
        <span className="mt-1.5 flex items-center gap-1.5 text-xs text-[var(--danger)]">
          <AlertCircle className="h-3.5 w-3.5" /> {error}
        </span>
      )}
    </label>
  );
}
