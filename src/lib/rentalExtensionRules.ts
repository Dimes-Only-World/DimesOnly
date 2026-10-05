const HOUR = 3_600_000;
const round = (n: number) => Math.round(n * 100) / 100;

export const MAX_EXTENSION_DAYS = 28;

export const rentalIsActiveForExtension = (status: string | null | undefined) =>
  ["active", "in_progress", "picked_up"].includes(String(status || "").toLowerCase());

export const mileageIsValid = (reported: number, previous: number) =>
  Number.isInteger(reported) && reported > previous;

const laDay = (ms: number) => new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/Los_Angeles", year: "numeric", month: "2-digit", day: "2-digit",
}).format(new Date(ms));

/** Late fee state at `nowMs` for a rental due at `dueMs`. */
export const lateFeeStatus = (dueMs: number, nowMs: number, dailyRate: number) => {
  const hourlyRate = dailyRate / 24;
  const graceEnd = dueMs + 2 * HOUR;
  const isLate = nowMs > graceEnd;
  if (!isLate) return { isLate: false, hoursLate: 0, hourlyRate, lateFee: 0, waived: false };
  const hoursLate = Math.floor((nowMs - graceEnd) / HOUR);
  const lateFee = round(100 + hoursLate * hourlyRate);
  const waived = laDay(nowMs) === laDay(dueMs) && nowMs - dueMs < 12 * HOUR;
  return { isLate: true, hoursLate, hourlyRate, lateFee, waived };
};

/** Pay order: unpaid late fee (after deposit), then extension price, then 4.5% + $1.27 on the amount charged. */
export const extensionCharge = (opts: {
  days: number; dailyRate: number; dueMs: number; nowMs: number; depositAvailable: number; useDeposit: boolean;
}) => {
  const late = lateFeeStatus(opts.dueMs, opts.nowMs, opts.dailyRate);
  const lateFeeOwed = late.isLate && !late.waived ? late.lateFee : 0;
  const depositApplied = opts.useDeposit ? round(Math.min(Math.max(0, opts.depositAvailable), lateFeeOwed)) : 0;
  const lateFeeRemainder = round(lateFeeOwed - depositApplied);
  const extensionPrice = round(opts.days * opts.dailyRate);
  const charged = round(lateFeeRemainder + extensionPrice);
  const transactionFee = charged > 0 ? round(charged * 0.045 + 1.27) : 0;
  return {
    ...late, lateFeeOwed, depositApplied, lateFeeRemainder, extensionPrice, transactionFee,
    totalCharged: round(charged + transactionFee),
  };
};

/** Kept for compatibility: extension-only amounts. */
export const extensionAmounts = (days: number, dailyRate: number) => {
  const c = extensionCharge({ days, dailyRate, dueMs: 0, nowMs: 0, depositAvailable: 0, useDeposit: false });
  return { extensionPrice: c.extensionPrice, transactionFee: c.transactionFee, totalCharged: c.totalCharged };
};
