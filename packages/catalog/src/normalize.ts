// Normalizacja numerów (OE / turbo / MPN). Ignoruje spacje, myślniki, kropki, ukośniki i wielkość liter.
// Ta sama funkcja musi być używana przy indeksowaniu i przy wyszukiwaniu — inaczej dobór jest zawodny.

/** Zredukuj numer do postaci porównywalnej: UPPER, bez [spacja - . / \]. */
export function normalizeNumber(input: string): string {
  return (input || "").toUpperCase().replace(/[\s\-./\\]+/g, "");
}

/** Czy zapytanie pasuje do któregokolwiek z numerów (po normalizacji, dopasowanie fragmentu). */
export function numberMatches(query: string, candidates: string[]): boolean {
  const q = normalizeNumber(query);
  if (q.length < 3) return false;
  return candidates.some((c) => normalizeNumber(c).includes(q));
}

/** Tokenizacja zapytania tekstowego (marka/model/silnik). */
export function tokens(input: string): string[] {
  return (input || "")
    .toLowerCase()
    .split(/[\s,;|]+/)
    .map((t) => t.trim())
    .filter((t) => t.length >= 2);
}
