"use client";

import { Phone, Wrench, ShoppingBag, MessageCircle } from "lucide-react";
import { CONTACT } from "@/lib/brand";

/**
 * Sticky bottom bar — visible only on mobile (<lg).
 * 4 fixed CTAs: Call, Picker, Shop, WhatsApp.
 * Adds bottom padding to body via spacer to avoid covering content.
 */
export default function MobileStickyBar() {
  return (
    <>
      {/* Spacer so fixed bar doesn't cover footer content */}
      <div aria-hidden className="lg:hidden h-[68px] safe-bottom" />
      <nav
        aria-label="Szybkie akcje"
        className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-[var(--bg-primary)]/95 backdrop-blur-xl border-t border-[var(--orange)]/30 safe-bottom"
        style={{ boxShadow: "0 -10px 30px rgba(0,0,0,0.45)" }}
      >
        <ul className="grid grid-cols-4 h-[68px]">
          <li>
            <a
              href={CONTACT.phoneTel}
              className="h-full flex flex-col items-center justify-center gap-1 text-white relative"
              aria-label={`Zadzwoń ${CONTACT.phoneDisplay}`}
            >
              <span className="absolute top-0 inset-x-2 h-[2px] bg-[var(--orange)] rounded-b-sm" />
              <Phone className="w-5 h-5 text-[var(--orange)]" />
              <span className="text-[10px] font-semibold tracking-wide uppercase">
                Zadzwoń
              </span>
            </a>
          </li>
          <li>
            <a
              href="#dobor-turbo"
              className="h-full flex flex-col items-center justify-center gap-1 text-[var(--text-muted)]"
            >
              <Wrench className="w-5 h-5" />
              <span className="text-[10px] font-semibold tracking-wide uppercase">
                Dobierz
              </span>
            </a>
          </li>
          <li>
            <a
              href="/sklep"
              className="h-full flex flex-col items-center justify-center gap-1 text-[var(--text-muted)]"
            >
              <ShoppingBag className="w-5 h-5" />
              <span className="text-[10px] font-semibold tracking-wide uppercase">
                Sklep
              </span>
            </a>
          </li>
          <li>
            <a
              href={CONTACT.whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="h-full flex flex-col items-center justify-center gap-1 text-[var(--text-muted)]"
              aria-label="Napisz na WhatsApp"
            >
              <MessageCircle className="w-5 h-5 text-[var(--green)]" />
              <span className="text-[10px] font-semibold tracking-wide uppercase">
                WhatsApp
              </span>
            </a>
          </li>
        </ul>
      </nav>
    </>
  );
}
