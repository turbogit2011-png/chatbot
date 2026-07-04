"use client";

import { useState } from "react";
import { Check, Crown, ExternalLink, Loader2, X } from "lucide-react";
import {
  CHECKOUT_URL,
  DEMO_KEY,
  IS_CONFIGURED,
  PRICE,
  PRO_FEATURES,
  verifyLicense,
} from "@/lib/pro";

export default function ProModal({
  onActivate,
  onClose,
}: {
  onActivate: (key: string) => void;
  onClose: () => void;
}) {
  const [key, setKey] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState("");

  async function activate() {
    setVerifying(true);
    setError("");
    const ok = await verifyLicense(key);
    setVerifying(false);
    if (ok) onActivate(key.trim());
    else setError("Nieprawidłowy klucz licencyjny.");
  }

  function buy() {
    if (CHECKOUT_URL) window.open(CHECKOUT_URL, "_blank", "noopener");
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button className="absolute inset-0 bg-black/60" onClick={onClose} aria-label="Zamknij" />
      <div className="card relative z-10 w-full max-w-md p-6 max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-1">
          <span
            className="inline-flex items-center gap-2 font-display text-2xl tracking-wide"
            style={{ color: "var(--amber)" }}
          >
            <Crown size={20} /> Aura Pro
          </span>
          <button onClick={onClose} className="btn btn-ghost !p-2" aria-label="Zamknij">
            <X size={16} />
          </button>
        </div>
        <p className="text-sm text-[var(--text-muted)] mb-4">
          Odblokuj pełną moc prywatnej AI. Jedna płatność, dożywotni dostęp.
        </p>

        <div className="flex items-end gap-2 mb-5">
          <span className="font-display text-5xl text-gradient leading-none">{PRICE}</span>
          <span className="text-xs text-[var(--text-subtle)] mb-1">jednorazowo</span>
        </div>

        <ul className="space-y-2 mb-6">
          {PRO_FEATURES.map((f) => (
            <li key={f} className="flex items-start gap-2 text-sm">
              <Check size={16} className="text-[var(--emerald)] shrink-0 mt-0.5" />
              <span className="text-[var(--text-muted)]">{f}</span>
            </li>
          ))}
        </ul>

        <button
          onClick={buy}
          disabled={!CHECKOUT_URL}
          className="btn btn-primary w-full mb-2 disabled:opacity-50"
        >
          <Crown size={16} /> Kup Aura Pro
          {CHECKOUT_URL && <ExternalLink size={14} />}
        </button>
        {!CHECKOUT_URL && (
          <p className="text-[11px] text-[var(--text-subtle)] mb-2 text-center">
            Link do płatności nie jest jeszcze skonfigurowany
            (NEXT_PUBLIC_CHECKOUT_URL).
          </p>
        )}

        <div className="my-4 flex items-center gap-3 text-[11px] text-[var(--text-subtle)]">
          <span className="flex-1 h-px bg-[var(--border)]" />
          masz już klucz?
          <span className="flex-1 h-px bg-[var(--border)]" />
        </div>

        <div className="flex gap-2">
          <input
            value={key}
            onChange={(e) => setKey(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && activate()}
            placeholder="Wklej klucz licencyjny"
            className="input-field"
          />
          <button
            onClick={activate}
            disabled={verifying || !key.trim()}
            className="btn btn-ghost !px-4 disabled:opacity-50"
          >
            {verifying ? <Loader2 size={16} className="animate-spin" /> : "Aktywuj"}
          </button>
        </div>
        {error && <p className="text-xs text-[var(--rose)] mt-2">{error}</p>}

        {!IS_CONFIGURED && (
          <p className="text-[11px] text-[var(--text-subtle)] mt-4 text-center">
            Tryb demo (brak skonfigurowanego sprzedawcy). Klucz do podglądu Pro:{" "}
            <code className="inline-code">{DEMO_KEY}</code>
          </p>
        )}
      </div>
    </div>
  );
}
