// Short-term booking price (up to 30 days), shared rule:
// 28–30 days = the monthly rate (28 days + up to 2 days free);
// otherwise whole weeks at the weekly rate plus leftover days at the daily rate.
// Six-month lease = daily rate × 156 days. Over 30 days must be 6 months or lease to own.
export const SHORT_TERM_MAX_DAYS = 30;
export const MONTH_BLOCK_DAYS = 28;
export const SIX_MONTH_BILLED_DAYS = 156;

export const WIRE_INSTRUCTIONS = {
  bank: "Chase Bank",
  accountName: "Best Rental Car Service, Inc.",
  routing: "021000021",
  account: "581036905",
};

const r2 = (n: number) => Math.round(n * 100) / 100;

export type ShortTermRates = { day_rate?: number | null; weekly_rate?: number | null; monthly_rate?: number | null; three_day_rate?: number | null };

export function shortTermLines(v: ShortTermRates, days: number) {
  const day = Math.max(0, Number(v.day_rate || 0));
  const week = Math.max(0, Number(v.weekly_rate || 0));
  const month = Math.max(0, Number(v.monthly_rate || 0));
  const d = Math.max(1, Math.ceil(days));
  if (d >= MONTH_BLOCK_DAYS && month > 0) {
    const free = d - MONTH_BLOCK_DAYS;
    return [{ label: free > 0 ? `28 days + ${free} day${free > 1 ? "s" : ""} free` : "28 days", quantity: 1, unitRate: month, total: r2(month) }];
  }
  const lines: { label: string; quantity: number; unitRate: number; total: number }[] = [];
  let rem = d;
  if (week > 0 && rem >= 7) {
    const q = Math.floor(rem / 7);
    lines.push({ label: q === 1 ? "Week" : "Weeks", quantity: q, unitRate: week, total: r2(q * week) });
    rem %= 7;
  }
  if (rem > 0) {
    const rate = day > 0 ? day : 0;
    if (rate > 0) lines.push({ label: rem === 1 ? "Day" : "Days", quantity: rem, unitRate: rate, total: r2(rem * rate) });
    else if (week > 0) lines.push({ label: "Week", quantity: 1, unitRate: week, total: r2(week) });
  }
  return lines;
}

export const shortTermTotal = (v: ShortTermRates, days: number) =>
  r2(shortTermLines(v, days).reduce((s, l) => s + l.total, 0));

export const sixMonthLeaseTotal = (v: ShortTermRates) => r2(Math.max(0, Number(v.day_rate || 0)) * SIX_MONTH_BILLED_DAYS);
