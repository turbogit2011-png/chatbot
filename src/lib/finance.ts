/* Pure wealth-projection math: monthly-compounded growth with optional
   annual contribution increases, plus numeric solvers for the three
   "unknowns" people care about — time, required savings, required return. */

export interface PlanInput {
  /** Starting capital. */
  start: number;
  /** Monthly contribution (year 1). */
  monthly: number;
  /** Expected annual return, percent (e.g. 8 = 8%/yr). */
  annualRatePct: number;
  /** Annual increase of the monthly contribution, percent (raises/biz growth). */
  growthPct: number;
  /** Target net worth. */
  target: number;
}

export interface Point {
  month: number;
  /** Total portfolio value. */
  balance: number;
  /** Sum of money actually put in (start + contributions) — the "your money" line. */
  contributed: number;
}

export function monthlyRate(annualRatePct: number): number {
  return Math.pow(1 + annualRatePct / 100, 1 / 12) - 1;
}

/** Month-by-month projection, returning a snapshot for every month 0..months. */
export function simulate(input: PlanInput, months: number): Point[] {
  const rm = monthlyRate(input.annualRatePct);
  let balance = input.start;
  let contributed = input.start;
  let monthly = input.monthly;
  const points: Point[] = [{ month: 0, balance, contributed }];
  for (let m = 1; m <= months; m++) {
    balance = balance * (1 + rm) + monthly;
    contributed += monthly;
    if (m % 12 === 0) monthly *= 1 + input.growthPct / 100;
    points.push({ month: m, balance, contributed });
  }
  return points;
}

/** Final balance after a fixed number of months. */
export function balanceAfterMonths(input: PlanInput, months: number): number {
  const rm = monthlyRate(input.annualRatePct);
  let balance = input.start;
  let monthly = input.monthly;
  for (let m = 1; m <= months; m++) {
    balance = balance * (1 + rm) + monthly;
    if (m % 12 === 0) monthly *= 1 + input.growthPct / 100;
  }
  return balance;
}

/** Whole months needed to reach the target, or Infinity if not within the cap. */
export function monthsToTarget(input: PlanInput, maxMonths = 1200): number {
  if (input.start >= input.target) return 0;
  const rm = monthlyRate(input.annualRatePct);
  let balance = input.start;
  let monthly = input.monthly;
  for (let m = 1; m <= maxMonths; m++) {
    balance = balance * (1 + rm) + monthly;
    if (m % 12 === 0) monthly *= 1 + input.growthPct / 100;
    if (balance >= input.target) return m;
  }
  return Infinity;
}

/** Monthly contribution required to hit `target` in `years`. */
export function requiredMonthly(
  target: number,
  years: number,
  annualRatePct: number,
  start: number,
  growthPct: number
): number {
  const months = Math.round(years * 12);
  if (months <= 0) return Infinity;
  const test = (monthly: number) =>
    balanceAfterMonths({ start, monthly, annualRatePct, growthPct, target }, months);
  if (test(0) >= target) return 0;
  let hi = 1000;
  while (test(hi) < target) {
    hi *= 2;
    if (hi > 1e15) return Infinity;
  }
  let lo = 0;
  for (let i = 0; i < 100; i++) {
    const mid = (lo + hi) / 2;
    if (test(mid) >= target) hi = mid;
    else lo = mid;
  }
  return hi;
}

/** Annual return (percent) required to hit `target` in `years`. */
export function requiredRate(
  target: number,
  years: number,
  monthly: number,
  start: number,
  growthPct: number
): number {
  const months = Math.round(years * 12);
  if (months <= 0) return Infinity;
  const test = (r: number) =>
    balanceAfterMonths(
      { start, monthly, annualRatePct: r, growthPct, target },
      months
    );
  if (test(0) >= target) return 0;
  let hi = 10;
  while (test(hi) < target) {
    hi *= 2;
    if (hi > 1e6) return Infinity;
  }
  let lo = 0;
  for (let i = 0; i < 200; i++) {
    const mid = (lo + hi) / 2;
    if (test(mid) >= target) hi = mid;
    else lo = mid;
  }
  return hi;
}

/* ------------------------------ Formatting ------------------------------- */

export type Currency = "PLN" | "USD" | "EUR";

export function formatMoney(n: number, currency: Currency, compact = false): string {
  if (!isFinite(n)) return "∞";
  const num = new Intl.NumberFormat("pl-PL", {
    notation: compact ? "compact" : "standard",
    maximumFractionDigits: compact ? 1 : 0,
  }).format(Math.round(n));
  if (currency === "USD") return `$${num}`;
  if (currency === "EUR") return `${num} €`;
  return `${num} zł`;
}

export function formatYears(months: number): string {
  if (!isFinite(months)) return "nigdy";
  const years = Math.floor(months / 12);
  const rem = Math.round(months % 12);
  if (years === 0) return `${rem} mies.`;
  if (rem === 0) return `${years} ${plYears(years)}`;
  return `${years} ${plYears(years)} ${rem} mies.`;
}

function plYears(n: number): string {
  if (n === 1) return "rok";
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return "lata";
  return "lat";
}
