// Semi-monthly pay periods: 1st–15th and 16th–end of month (UTC dates).
export type PayPeriod = { key: string; start: string; end: string; label: string };

const pad = (n: number) => String(n).padStart(2, "0");

export const periodOf = (value?: string | null): PayPeriod | null => {
  if (!value) return null;
  const d = new Date(value.length === 10 ? `${value}T12:00:00Z` : value);
  if (Number.isNaN(d.getTime())) return null;
  const y = d.getUTCFullYear();
  const m = d.getUTCMonth();
  const first = d.getUTCDate() <= 15;
  const lastDay = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
  const start = `${y}-${pad(m + 1)}-${first ? "01" : "16"}`;
  const end = `${y}-${pad(m + 1)}-${first ? "15" : pad(lastDay)}`;
  return { key: start, start, end, label: formatRange(start, end) };
};

export const formatRange = (start: string, end: string) => {
  const f = (s: string) =>
    new Date(`${s}T12:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
  return `${f(start)} – ${f(end)}`;
};

export const inPeriod = (value: string | null | undefined, p: PayPeriod | null) => {
  if (!p) return true;
  return periodOf(value)?.key === p.key;
};

export const buildPeriods = (dates: Array<string | null | undefined>): PayPeriod[] => {
  const map = new Map<string, PayPeriod>();
  const now = periodOf(new Date().toISOString());
  if (now) map.set(now.key, now);
  dates.forEach((d) => {
    const p = periodOf(d);
    if (p) map.set(p.key, p);
  });
  return [...map.values()].sort((a, b) => (a.key < b.key ? 1 : -1));
};
