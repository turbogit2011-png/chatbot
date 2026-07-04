"use client";

import { usePersistentState } from "@/lib/store";

/* -------------------------------------------------------------------------
   Monetisation config.

   This is a STATIC site (no backend), so payments use a hosted checkout
   (Gumroad / Lemon Squeezy / Stripe Payment Link) and licenses are verified
   client-side. To go live, set these env vars at build time:

     NEXT_PUBLIC_CHECKOUT_URL        – hosted checkout / "buy" link
     NEXT_PUBLIC_GUMROAD_PRODUCT_ID  – enables real Gumroad license verification

   Until a product id is configured, a documented DEMO key unlocks Pro so the
   flow can be previewed end-to-end.
------------------------------------------------------------------------- */

export const CHECKOUT_URL = process.env.NEXT_PUBLIC_CHECKOUT_URL || "";
const GUMROAD_PRODUCT_ID = process.env.NEXT_PUBLIC_GUMROAD_PRODUCT_ID || "";

export const IS_CONFIGURED = Boolean(GUMROAD_PRODUCT_ID);
export const DEMO_KEY = "AURA-PRO-DEMO-2026";

export const PRICE = "49 zł"; // jednorazowo, na zawsze

export const FREE_CONVERSATION_LIMIT = 3;
export const FREE_MODEL_ID = "Qwen2.5-0.5B-Instruct-q4f16_1-MLC";

export const PRO_FEATURES = [
  "Wszystkie modele — Llama 1B i 3B (mądrzejsze odpowiedzi)",
  "Nieograniczona liczba rozmów",
  "Własny prompt systemowy (własne persony)",
  "Eksport rozmów do Markdown",
  "Dożywotni dostęp, jedna płatność",
];

export interface ProState {
  licensed: boolean;
  key: string;
}

const DEFAULT_PRO: ProState = { licensed: false, key: "" };

export function usePro() {
  return usePersistentState<ProState>("aura.pro", DEFAULT_PRO);
}

/** Verifies a license key. Uses Gumroad's public API when configured,
 *  otherwise accepts the documented demo key for previewing Pro. */
export async function verifyLicense(key: string): Promise<boolean> {
  const k = key.trim();
  if (!k) return false;

  if (GUMROAD_PRODUCT_ID) {
    try {
      const res = await fetch("https://api.gumroad.com/v2/licenses/verify", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          product_id: GUMROAD_PRODUCT_ID,
          license_key: k,
          increment_uses_count: "false",
        }).toString(),
      });
      const data = await res.json();
      return Boolean(data?.success);
    } catch {
      return false;
    }
  }

  return k.toUpperCase() === DEMO_KEY;
}
