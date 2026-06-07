"use client";

import { Radio } from "lucide-react";
import { TELEMETRY_STATUSES } from "@/lib/data";

export function TelemetryBar() {
  // Duplicate the list so the marquee loops seamlessly.
  const items = [...TELEMETRY_STATUSES, ...TELEMETRY_STATUSES];

  return (
    <div className="fixed inset-x-0 top-0 z-50 border-b border-[var(--line)] bg-[var(--obsidian)]/92 backdrop-blur">
      <div className="ticker-wrap flex items-center overflow-hidden">
        <div className="z-10 flex shrink-0 items-center gap-2 border-r border-[var(--line)] bg-[var(--obsidian-2)] px-4 py-2">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full rounded-full bg-[var(--ok)] opacity-60 blink" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-[var(--ok)]" />
          </span>
          <Radio className="h-3.5 w-3.5 text-gold" />
          <span className="font-tel text-[0.66rem] font-semibold uppercase tracking-[0.22em] text-gold">
            Live Lab
          </span>
        </div>

        <div className="relative flex-1 overflow-hidden py-2">
          <div className="animate-ticker flex w-max items-center gap-8 pl-8">
            {items.map((status, i) => (
              <span
                key={i}
                className="flex items-center gap-3 whitespace-nowrap font-tel text-[0.72rem] text-titanium"
              >
                <span className="h-1 w-1 rounded-full bg-[var(--copper)]" />
                {status}
              </span>
            ))}
          </div>
          {/* edge fades */}
          <div className="pointer-events-none absolute inset-y-0 left-0 w-10 bg-gradient-to-r from-[var(--obsidian)] to-transparent" />
          <div className="pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-[var(--obsidian)] to-transparent" />
        </div>
      </div>
    </div>
  );
}
