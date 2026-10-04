export const PAYROLL_THRESHOLD = 250;

export const PAYOUT_METHODS: Record<string, string> = {
  paypal: "PayPal",
  venmo: "Venmo",
  wire: "Wire Transfer",
  direct_deposit: "ACH/Direct Deposit",
  check: "Check",
};

export const payoutMethodLabel = (m: string) => PAYOUT_METHODS[m] || m;

export const PAYOUT_STATUS_LABELS: Record<string, string> = {
  pending: "Pending",
  processing: "Approved",
  completed: "Paid",
  failed: "Rejected",
  cancelled: "Cancelled",
  refunded: "Refunded",
};

export const BREAKDOWN_LABELS: Record<string, string> = {
  tips: "Tips received",
  referrals: "Referral commissions",
  rentals: "Rental commissions",
  clothing: "Clothing commissions",
  vehicle_sales: "Vehicle sale commissions",
  flameflix: "FlameFlix earnings",
};

export const breakdownEntries = (b: unknown) => {
  if (!b || typeof b !== "object") return [] as [string, number][];
  return Object.entries(b as Record<string, unknown>)
    .filter(([k, v]) => k in BREAKDOWN_LABELS && Number(v) > 0)
    .map(([k, v]) => [BREAKDOWN_LABELS[k], Number(v)] as [string, number]);
};

export const sumAmounts = (rows: { amount: number | string }[]) =>
  Math.round(rows.reduce((s, r) => s + Number(r.amount || 0), 0) * 100) / 100;

export const payrollBand = (amount: number, band: "all" | "under" | "over") =>
  band === "all" ? true : band === "under" ? amount < PAYROLL_THRESHOLD : amount >= PAYROLL_THRESHOLD;

const cell = (v: unknown) => {
  const raw = String(v ?? "");
  const safe = /^[=+\-@\t\r]/.test(raw) ? `'${raw}` : raw;
  return `"${safe.replace(/"/g, '""')}"`;
};

export const toCsv = (headers: string[], rows: unknown[][]) =>
  [headers, ...rows].map((r) => r.map(cell).join(",")).join("\n");

export const fmtDate = (v?: string | null) => (v ? new Date(v).toLocaleDateString() : "—");
