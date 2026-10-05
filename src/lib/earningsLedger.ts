export const MIN_PAYOUT = 250;

type Req = { amount: number | string | null; request_status: string | null };

const r2 = (n: number) => Math.round(n * 100) / 100;

/** Statuses that hold money out of the Available balance. */
export const IN_PROCESSING = ["pending", "processing"];
export const PAID = ["completed"];

/**
 * Available = Total Earned - (Pending + Approved + Paid requests).
 * Rejected, cancelled and refunded requests release funds back to Available.
 * `legacyPaid` covers payouts recorded before payout requests existed.
 */
export function computeLedger(totalEarned: number, requests: Req[], legacyPaid = 0) {
  const sum = (statuses: string[]) =>
    r2(requests.filter((r) => statuses.includes(r.request_status || "")).reduce((s, r) => s + Number(r.amount || 0), 0));
  const inProcessing = sum(IN_PROCESSING);
  const paid = Math.max(sum(PAID), r2(legacyPaid));
  const available = Math.max(0, r2(totalEarned - inProcessing - paid));
  return { totalEarned: r2(totalEarned), inProcessing, paid, available };
}

export const canRequestPayout = (available: number, requests: Req[]) =>
  available >= MIN_PAYOUT && !requests.some((r) => IN_PROCESSING.includes(r.request_status || ""));

/** Semi-monthly period key: 1st–14th → "YYYY-MM-A", 15th–end → "YYYY-MM-B". */
export function payPeriodOf(dateIso: string) {
  const d = new Date(dateIso);
  if (isNaN(d.getTime())) return null;
  const y = d.getFullYear();
  const m = d.getMonth();
  const first = d.getDate() < 15;
  const start = new Date(y, m, first ? 1 : 15);
  const end = first ? new Date(y, m, 14) : new Date(y, m + 1, 0);
  return { key: `${y}-${String(m + 1).padStart(2, "0")}-${first ? "A" : "B"}`, start, end };
}
