"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Link } from "next-view-transitions";
import { ArrowRight, CheckCircle2, Crown, Loader2 } from "lucide-react";
import { DEMO_KEY, IS_CONFIGURED, usePro, verifyLicense } from "@/lib/pro";

type State = "idle" | "verifying" | "ok" | "fail";

export function ThankYou() {
  const params = useSearchParams();
  const urlKey =
    params.get("key") || params.get("license") || params.get("license_key") || "";
  const [, setPro] = usePro();
  const [state, setState] = useState<State>("idle");
  const [manual, setManual] = useState("");

  useEffect(() => {
    if (!urlKey) return;
    let cancelled = false;
    verifyLicense(urlKey).then((ok) => {
      if (cancelled) return;
      if (ok) {
        setPro({ licensed: true, key: urlKey });
        setState("ok");
      } else {
        setState("fail");
      }
    });
    return () => {
      cancelled = true;
    };
  }, [urlKey, setPro]);

  // Auto-verification from the URL shows the spinner without a setState-in-effect.
  const verifying = state === "verifying" || (Boolean(urlKey) && state === "idle");

  async function activate() {
    if (!manual.trim()) return;
    setState("verifying");
    const ok = await verifyLicense(manual);
    if (ok) {
      setPro({ licensed: true, key: manual.trim() });
      setState("ok");
    } else {
      setState("fail");
    }
  }

  return (
    <div className="card card-glow p-8 max-w-md w-full text-center">
      <span
        className="inline-flex w-14 h-14 rounded-2xl items-center justify-center mb-4"
        style={{ background: "var(--grad-brand)", boxShadow: "0 0 28px rgba(139,92,246,0.5)" }}
      >
        <Crown size={26} className="text-white" />
      </span>

      {state === "ok" ? (
        <>
          <h1 className="text-2xl font-bold mb-2 flex items-center justify-center gap-2">
            <CheckCircle2 size={22} className="text-[var(--emerald)]" /> Aura Pro aktywna!
          </h1>
          <p className="text-[var(--text-muted)] mb-6">
            Dziękujemy za wsparcie. Wszystkie modele, nieograniczone rozmowy i persony
            są już odblokowane na tym urządzeniu.
          </p>
          <Link href="/ai" className="btn btn-primary w-full">
            Przejdź do Aury <ArrowRight size={16} />
          </Link>
        </>
      ) : verifying ? (
        <>
          <h1 className="text-2xl font-bold mb-2">Aktywuję Pro…</h1>
          <div className="flex items-center justify-center gap-2 text-[var(--text-muted)] py-4">
            <Loader2 size={18} className="animate-spin" /> Weryfikuję klucz licencyjny
          </div>
        </>
      ) : (
        <>
          <h1 className="text-2xl font-bold mb-2">Dziękujemy za zakup 🎉</h1>
          <p className="text-[var(--text-muted)] mb-5">
            Wklej klucz licencyjny z e-maila, aby odblokować Aura Pro na tym urządzeniu.
          </p>
          <div className="flex gap-2">
            <input
              value={manual}
              onChange={(e) => setManual(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && activate()}
              placeholder="Klucz licencyjny"
              className="input-field"
            />
            <button onClick={activate} className="btn btn-primary !px-4">
              Aktywuj
            </button>
          </div>
          {state === "fail" && (
            <p className="text-xs text-[var(--rose)] mt-2">Nieprawidłowy klucz licencyjny.</p>
          )}
          {!IS_CONFIGURED && (
            <p className="text-[11px] text-[var(--text-subtle)] mt-4">
              Tryb demo — klucz do podglądu Pro:{" "}
              <code className="inline-code">{DEMO_KEY}</code>
            </p>
          )}
          <Link
            href="/aura"
            className="text-xs text-[var(--text-muted)] hover:text-[var(--text)] mt-5 inline-block"
          >
            ← Wróć do strony Aury
          </Link>
        </>
      )}
    </div>
  );
}
