"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import type { TurboRecord } from "./data";

type SelectionContextValue = {
  selected: TurboRecord | null;
  setSelected: (rec: TurboRecord | null) => void;
};

const SelectionContext = createContext<SelectionContextValue | null>(null);

export function SelectionProvider({ children }: { children: ReactNode }) {
  const [selected, setSelected] = useState<TurboRecord | null>(null);
  return (
    <SelectionContext.Provider value={{ selected, setSelected }}>
      {children}
    </SelectionContext.Provider>
  );
}

export function useSelection() {
  const ctx = useContext(SelectionContext);
  if (!ctx) {
    throw new Error("useSelection must be used within a SelectionProvider");
  }
  return ctx;
}
