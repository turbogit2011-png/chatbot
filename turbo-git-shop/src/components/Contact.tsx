"use client";
import { useRef, useState } from "react";
import { motion, useInView } from "framer-motion";
import { Phone, Mail, MapPin, Clock, Send, CheckCircle } from "lucide-react";

const info = [
  { icon: Phone, label: "Telefon", value: "+48 694 706 140", href: "tel:+48694706140" },
  { icon: Phone, label: "Telefon 2", value: "+48 512 572 647", href: "tel:+48512572647" },
  { icon: Mail, label: "Email", value: "sklep@turbo-git.com", href: "mailto:sklep@turbo-git.com" },
  { icon: MapPin, label: "Adres", value: "ul. Wrocławska 7, 55-095 Januszkowice", href: null },
  { icon: Clock, label: "Godziny", value: "Pn–Pt 8:00–17:00 / Sob 9:00–13:00", href: null },
];

export default function Contact() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ name: "", phone: "", email: "", brand: "", oem: "", message: "" });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true);
    await new Promise(r => setTimeout(r, 1400));
    setLoading(false); setSent(true);
  };

  return (
    <section id="kontakt" className="py-24 sm:py-32 relative overflow-hidden">
      <div className="absolute inset-0 bg-[#06080D]" />
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/8 to-transparent" />
      <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse 80% 60% at 50% 100%, rgba(255,122,0,0.05), transparent 70%)" }} />

      <div ref={ref} className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={inView ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.6 }}
          className="text-center mb-16">
          <div className="section-label mx-auto justify-center mb-4"><span>Kontakt</span></div>
          <h2 className="font-display text-[clamp(2.5rem,5vw,4.5rem)] text-white leading-none mb-4 tracking-wide">
            MASZ PYTANIA?<br /><span className="text-gradient">NAPISZ DO NAS</span>
          </h2>
          <p className="text-[#94A3B8] text-lg max-w-xl mx-auto">
            Pomożemy dobrać właściwą turbosprężarkę do Twojego pojazdu. Podaj markę, model i numer OEM.
          </p>
        </motion.div>

        <div className="grid lg:grid-cols-5 gap-10">
          {/* Info */}
          <motion.div initial={{ opacity: 0, x: -30 }} animate={inView ? { opacity: 1, x: 0 } : {}} transition={{ delay: 0.1 }}
            className="lg:col-span-2 flex flex-col gap-3">
            {info.map((item, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 15 }} animate={inView ? { opacity: 1, y: 0 } : {}} transition={{ delay: 0.2 + i * 0.07 }}>
                {item.href ? (
                  <a href={item.href} className="flex items-start gap-4 bg-[#131B2A] rounded-xl p-4 border border-white/5 hover:border-[#FF7A00]/20 transition-all group">
                    <div className="w-9 h-9 rounded-lg bg-[#FF7A00]/10 flex items-center justify-center flex-shrink-0 group-hover:bg-[#FF7A00]/20 transition-colors">
                      <item.icon className="w-4 h-4 text-[#FF7A00]" />
                    </div>
                    <div><div className="text-xs text-[#4A6080] mb-0.5 uppercase tracking-wider">{item.label}</div><div className="text-white text-sm font-medium">{item.value}</div></div>
                  </a>
                ) : (
                  <div className="flex items-start gap-4 bg-[#131B2A] rounded-xl p-4 border border-white/5">
                    <div className="w-9 h-9 rounded-lg bg-[#FF7A00]/10 flex items-center justify-center flex-shrink-0"><item.icon className="w-4 h-4 text-[#FF7A00]" /></div>
                    <div><div className="text-xs text-[#4A6080] mb-0.5 uppercase tracking-wider">{item.label}</div><div className="text-white text-sm font-medium">{item.value}</div></div>
                  </div>
                )}
              </motion.div>
            ))}
            <div className="glass-warm rounded-xl p-5 mt-1">
              <p className="text-sm text-[#FF9A30] font-semibold mb-1">NIP: 8961447143</p>
              <p className="text-xs text-[#94A3B8]">Faktura VAT wystawiana automatycznie po zakupie. Program B2B z odroczoną płatnością.</p>
            </div>
          </motion.div>

          {/* Form */}
          <motion.div initial={{ opacity: 0, x: 30 }} animate={inView ? { opacity: 1, x: 0 } : {}} transition={{ delay: 0.2 }}
            className="lg:col-span-3">
            <div className="bg-[#131B2A] rounded-2xl border border-white/5 p-7 sm:p-9">
              {sent ? (
                <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center py-10">
                  <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-4">
                    <CheckCircle className="w-8 h-8 text-green-400" />
                  </div>
                  <h3 className="font-display text-2xl text-white tracking-wide mb-2">WYSŁANO!</h3>
                  <p className="text-[#94A3B8]">Odpiszemy w ciągu 30 minut w godzinach pracy.</p>
                </motion.div>
              ) : (
                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div><label className="block text-xs font-semibold text-[#94A3B8] mb-1.5 uppercase tracking-wider">Imię i nazwisko *</label>
                      <input name="name" value={form.name} onChange={e => setForm({...form, name: e.target.value})} required placeholder="Jan Kowalski" className="input-field" /></div>
                    <div><label className="block text-xs font-semibold text-[#94A3B8] mb-1.5 uppercase tracking-wider">Telefon *</label>
                      <input name="phone" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} required type="tel" placeholder="+48 694 706 140" className="input-field" /></div>
                  </div>
                  <div><label className="block text-xs font-semibold text-[#94A3B8] mb-1.5 uppercase tracking-wider">Email</label>
                    <input name="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} type="email" placeholder="jan@example.pl" className="input-field" /></div>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div><label className="block text-xs font-semibold text-[#94A3B8] mb-1.5 uppercase tracking-wider">Marka pojazdu</label>
                      <input name="brand" value={form.brand} onChange={e => setForm({...form, brand: e.target.value})} placeholder="Audi A4 2.0 TDI" className="input-field" /></div>
                    <div><label className="block text-xs font-semibold text-[#94A3B8] mb-1.5 uppercase tracking-wider">Numer OEM</label>
                      <input name="oem" value={form.oem} onChange={e => setForm({...form, oem: e.target.value})} placeholder="03G253014H" className="input-field font-mono" /></div>
                  </div>
                  <div><label className="block text-xs font-semibold text-[#94A3B8] mb-1.5 uppercase tracking-wider">Wiadomość *</label>
                    <textarea name="message" value={form.message} onChange={e => setForm({...form, message: e.target.value})} required rows={4} placeholder="Opisz problem lub zapytaj o dostępność..." className="input-field resize-none" /></div>
                  <button type="submit" disabled={loading} className="btn-primary justify-center disabled:opacity-60">
                    {loading ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Wysyłanie...</> : <><Send className="w-4 h-4" />Wyślij wiadomość</>}
                  </button>
                </form>
              )}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
