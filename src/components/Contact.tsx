"use client";

import { useRef, useState } from "react";
import { motion, useInView } from "framer-motion";
import { Phone, Mail, MapPin, Clock, Send, CheckCircle } from "lucide-react";

const contactInfo = [
  { icon: Phone, label: "Telefon", value: "+48 000 000 000", href: "tel:+48000000000" },
  { icon: Mail, label: "Email", value: "kontakt@turbodiesel.cc", href: "mailto:kontakt@turbodiesel.cc" },
  { icon: MapPin, label: "Adres", value: "ul. Przykładowa 1, 00-000 Miasto", href: "#" },
  { icon: Clock, label: "Godziny pracy", value: "Pn–Pt: 8:00–18:00 / Sob: 9:00–13:00", href: null },
];

type FormState = "idle" | "loading" | "success" | "error";

export default function Contact() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  const [formState, setFormState] = useState<FormState>("idle");
  const [form, setForm] = useState({ name: "", phone: "", email: "", message: "" });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormState("loading");
    await new Promise((r) => setTimeout(r, 1500));
    setFormState("success");
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  return (
    <section id="kontakt" className="py-24 sm:py-32 relative overflow-hidden">
      <div className="absolute inset-0 bg-[#07090E]" />
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/8 to-transparent" />
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: "radial-gradient(ellipse 80% 60% at 50% 100%, rgba(255,107,26,0.06), transparent 70%)" }}
      />

      <div ref={ref} className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <div className="section-label mx-auto justify-center mb-4">
            <span>Skontaktuj się</span>
          </div>
          <h2 className="font-display text-[clamp(2.5rem,5vw,4.5rem)] text-white leading-none mb-4 tracking-wide">
            BEZPŁATNA
            <br />
            <span className="text-gradient">WYCENA</span>
          </h2>
          <p className="text-[#8A9BB0] text-lg max-w-xl mx-auto">
            Opisz problem i model pojazdu — oddzwonimy lub odpiszemy w ciągu 30 minut
            w godzinach pracy z bezpłatną wyceną.
          </p>
        </motion.div>

        <div className="grid lg:grid-cols-5 gap-10 items-start">
          {/* Contact info */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={inView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="lg:col-span-2 flex flex-col gap-4"
          >
            {contactInfo.map((info, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 15 }}
                animate={inView ? { opacity: 1, y: 0 } : {}}
                transition={{ delay: 0.2 + i * 0.1 }}
              >
                {info.href && info.href !== "#" ? (
                  <a
                    href={info.href}
                    className="flex items-start gap-4 bg-[#111827] rounded-xl p-5 border border-white/5 hover:border-[#FF6B1A]/20 transition-all group"
                  >
                    <div className="w-10 h-10 rounded-lg bg-[#FF6B1A]/10 flex items-center justify-center flex-shrink-0 group-hover:bg-[#FF6B1A]/20 transition-colors">
                      <info.icon className="w-5 h-5 text-[#FF6B1A]" />
                    </div>
                    <div>
                      <div className="text-xs text-[#4A5568] mb-1 font-medium uppercase tracking-wider">{info.label}</div>
                      <div className="text-white font-medium text-sm">{info.value}</div>
                    </div>
                  </a>
                ) : (
                  <div className="flex items-start gap-4 bg-[#111827] rounded-xl p-5 border border-white/5">
                    <div className="w-10 h-10 rounded-lg bg-[#FF6B1A]/10 flex items-center justify-center flex-shrink-0">
                      <info.icon className="w-5 h-5 text-[#FF6B1A]" />
                    </div>
                    <div>
                      <div className="text-xs text-[#4A5568] mb-1 font-medium uppercase tracking-wider">{info.label}</div>
                      <div className="text-white font-medium text-sm">{info.value}</div>
                    </div>
                  </div>
                )}
              </motion.div>
            ))}

            {/* Quick note */}
            <div className="glass-orange rounded-xl p-5 mt-2">
              <p className="text-sm text-[#FF8C3A] font-medium mb-1">Szybka obsługa gwarantowana</p>
              <p className="text-xs text-[#8A9BB0] leading-relaxed">
                Odpowiadamy na wszystkie zapytania w ciągu 30 minut w godzinach pracy.
                Wycena bezpłatna i niezobowiązująca.
              </p>
            </div>
          </motion.div>

          {/* Form */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={inView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="lg:col-span-3"
          >
            <div className="bg-[#111827] rounded-2xl border border-white/5 p-7 sm:p-10 relative overflow-hidden">
              {/* Corner accent */}
              <div className="absolute top-0 right-0 w-32 h-32 opacity-20 pointer-events-none"
                style={{ background: "radial-gradient(circle at 100% 0%, rgba(255,107,26,0.4), transparent 70%)" }}
              />

              {formState === "success" ? (
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="text-center py-10"
                >
                  <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-4">
                    <CheckCircle className="w-8 h-8 text-green-400" />
                  </div>
                  <h3 className="font-display text-2xl text-white mb-2 tracking-wide">WYSŁANO!</h3>
                  <p className="text-[#8A9BB0]">
                    Dziękujemy za wiadomość. Skontaktujemy się z Tobą w ciągu 30 minut.
                  </p>
                </motion.div>
              ) : (
                <form onSubmit={handleSubmit} className="flex flex-col gap-5 relative z-10">
                  <div className="grid sm:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-xs font-medium text-[#8A9BB0] mb-2 uppercase tracking-wider">
                        Imię i nazwisko *
                      </label>
                      <input
                        name="name"
                        value={form.name}
                        onChange={handleChange}
                        required
                        placeholder="Jan Kowalski"
                        className="input-field"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-[#8A9BB0] mb-2 uppercase tracking-wider">
                        Telefon *
                      </label>
                      <input
                        name="phone"
                        value={form.phone}
                        onChange={handleChange}
                        required
                        type="tel"
                        placeholder="+48 000 000 000"
                        className="input-field"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[#8A9BB0] mb-2 uppercase tracking-wider">
                      Email
                    </label>
                    <input
                      name="email"
                      value={form.email}
                      onChange={handleChange}
                      type="email"
                      placeholder="jan@kowalski.pl"
                      className="input-field"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[#8A9BB0] mb-2 uppercase tracking-wider">
                      Opis problemu i marka pojazdu *
                    </label>
                    <textarea
                      name="message"
                      value={form.message}
                      onChange={handleChange}
                      required
                      rows={5}
                      placeholder="Opisz swój problem – model pojazdu, rok produkcji, objawy usterki..."
                      className="input-field resize-none"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={formState === "loading"}
                    className="btn-primary flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {formState === "loading" ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Wysyłanie...
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        Wyślij zapytanie
                      </>
                    )}
                  </button>

                  <p className="text-xs text-[#4A5568] text-center">
                    Wysyłając formularz wyrażasz zgodę na kontakt w sprawie wyceny.
                    Twoje dane są bezpieczne.
                  </p>
                </form>
              )}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
