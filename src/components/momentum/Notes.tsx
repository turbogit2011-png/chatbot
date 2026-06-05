"use client";

import { useEffect, useState } from "react";
import { Check, NotebookPen } from "lucide-react";

export default function Notes({
  notes,
  setNotes,
}: {
  notes: string;
  setNotes: React.Dispatch<React.SetStateAction<string>>;
}) {
  const [saved, setSaved] = useState(false);

  // Flash a "saved" indicator shortly after edits settle.
  useEffect(() => {
    if (notes === "") return;
    const id = window.setTimeout(() => {
      setSaved(true);
      window.setTimeout(() => setSaved(false), 1200);
    }, 500);
    return () => window.clearTimeout(id);
  }, [notes]);

  const words = notes.trim() ? notes.trim().split(/\s+/).length : 0;

  return (
    <div className="card p-6 flex flex-col h-full">
      <div className="flex items-center justify-between mb-4">
        <span className="section-label">
          <NotebookPen size={14} /> Notatnik
        </span>
        <span className="text-xs flex items-center gap-1 text-[var(--text-subtle)]">
          {saved ? (
            <span className="flex items-center gap-1 text-[var(--emerald)]">
              <Check size={13} /> zapisano
            </span>
          ) : (
            `${words} ${words === 1 ? "słowo" : "słów"}`
          )}
        </span>
      </div>
      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Zapisz myśl, pomysł lub plan na dziś… Wszystko zostaje na tym urządzeniu."
        className="input-field flex-1 resize-none min-h-[160px] leading-relaxed"
      />
    </div>
  );
}
