"use client";

import { useState } from "react";
import { Link } from "next-view-transitions";
import { ArrowLeft, Check, ShoppingCart } from "lucide-react";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { useCart } from "@/lib/shop/cart";
import { formatPLN } from "@/lib/shop/catalog";

const SHOP_EMAIL = "kontakt@turbo-git.com";

export default function OrderPage() {
  const cart = useCart();
  const [form, setForm] = useState({ name: "", email: "", phone: "", note: "", b2b: false });
  const [sent, setSent] = useState(false);

  const submit = () => {
    const lines = cart.detailed
      .map((x) => `- ${x.qty}x ${x.product.name} [${x.product.oemNumber}] — ${formatPLN(x.product.price * x.qty)}`)
      .join("\n");
    const total = form.b2b ? cart.b2bSubtotal : cart.subtotal;
    const body = [
      `Zamówienie ze sklepu TURBO-GIT`,
      ``,
      `Klient: ${form.name}`,
      `E-mail: ${form.email}`,
      `Telefon: ${form.phone}`,
      `Typ ceny: ${form.b2b ? "B2B netto" : "detal brutto"}`,
      ``,
      `Produkty:`,
      lines,
      ``,
      `Razem: ${formatPLN(total)}`,
      form.note ? `\nUwagi: ${form.note}` : "",
    ].join("\n");
    const href = `mailto:${SHOP_EMAIL}?subject=${encodeURIComponent("Zamówienie TURBO-GIT")}&body=${encodeURIComponent(body)}`;
    window.location.assign(href);
    setSent(true);
  };

  const valid = form.name.trim() && /.+@.+\..+/.test(form.email) && cart.detailed.length > 0;

  return (
    <>
      <Navigation />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 pt-28 pb-20">
        <Link href="/" className="inline-flex items-center gap-1.5 text-xs text-[var(--text-3)] hover:text-[var(--orange-2)] mb-6">
          <ArrowLeft className="w-4 h-4" /> Wróć do sklepu
        </Link>
        <h1 className="text-2xl sm:text-3xl font-bold text-white mb-6">Twoje zamówienie</h1>

        {!cart.hydrated ? (
          <div className="h-64 rounded-2xl animate-pulse" style={{ background: "rgba(255,255,255,0.03)" }} />
        ) : cart.detailed.length === 0 ? (
          <div className="text-center text-[var(--text-3)] py-20">
            <ShoppingCart className="w-10 h-10 mx-auto mb-3 opacity-40" />
            Koszyk jest pusty.{" "}
            <Link href="/" className="text-[var(--orange-2)] underline">Przejdź do sklepu</Link>
          </div>
        ) : (
          <div className="grid lg:grid-cols-[1fr_360px] gap-6 items-start">
            {/* Form */}
            <div className="card p-6 space-y-4" style={{ background: "var(--gradient-card)", border: "1px solid var(--border)", borderRadius: "1rem" }}>
              <h2 className="font-semibold text-white">Dane do zamówienia</h2>
              {(["name", "email", "phone"] as const).map((f) => (
                <input
                  key={f}
                  value={form[f]}
                  onChange={(e) => setForm({ ...form, [f]: e.target.value })}
                  placeholder={f === "name" ? "Imię i nazwisko / firma" : f === "email" ? "E-mail" : "Telefon"}
                  className="input-field w-full px-4 py-2.5 text-sm"
                />
              ))}
              <textarea
                value={form.note}
                onChange={(e) => setForm({ ...form, note: e.target.value })}
                placeholder="Uwagi, nr VIN, dane do faktury…"
                rows={3}
                className="input-field w-full px-4 py-2.5 text-sm resize-none"
              />
              <label className="flex items-center gap-2 text-sm text-[var(--text-2)]">
                <input
                  type="checkbox"
                  checked={form.b2b}
                  onChange={(e) => setForm({ ...form, b2b: e.target.checked })}
                  className="accent-[var(--orange)]"
                />
                Jestem warsztatem / kupuję B2B (ceny netto)
              </label>

              <button
                onClick={submit}
                disabled={!valid}
                className="btn-primary w-full font-bold py-3 rounded-xl disabled:opacity-40"
              >
                {sent ? "Wyślij ponownie" : "Złóż zamówienie"}
              </button>
              {sent && (
                <p className="text-xs text-[#4ade80] flex items-center gap-1.5">
                  <Check className="w-4 h-4" /> Otwarto wiadomość z zamówieniem — wyślij ją, a odezwiemy się z potwierdzeniem i płatnością.
                </p>
              )}
              <p className="text-[11px] text-[var(--text-3)]">
                Zamówienie trafia mailowo; płatność online (Przelewy24/BLIK) uruchamiamy po
                podłączeniu WooCommerce.
              </p>
            </div>

            {/* Summary */}
            <div className="card p-5" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid var(--border)", borderRadius: "1rem" }}>
              <h2 className="font-semibold text-white mb-3">Podsumowanie</h2>
              <div className="space-y-2 mb-4">
                {cart.detailed.map(({ product, qty }) => (
                  <div key={product.id} className="flex justify-between gap-2 text-sm">
                    <span className="text-[var(--text-2)] line-clamp-1">{qty}× {product.name}</span>
                    <span className="text-white shrink-0">{formatPLN(product.price * qty)}</span>
                  </div>
                ))}
              </div>
              <div className="flex justify-between border-t border-[var(--border)] pt-3">
                <span className="text-[var(--text-2)]">Razem brutto</span>
                <span className="text-xl font-display text-white">{formatPLN(cart.subtotal)}</span>
              </div>
              <div className="flex justify-between text-xs text-[var(--text-3)] mt-1">
                <span>B2B netto</span>
                <span className="text-[var(--orange-2)]">{formatPLN(cart.b2bSubtotal)}</span>
              </div>
            </div>
          </div>
        )}
      </main>
      <Footer />
    </>
  );
}
