// Shared cancellation rule (mirrored in supabase/functions/rental-booking/cancellation.ts).
// Free: up to 24h before start; or, if booked within 24h of start, within 1 hour of booking.
// Late cancel: trips > 3 days keep 1 day's cost, shorter trips keep ½ day's cost.
// No-show (after start time): trips > 3 days keep 2 days' cost, shorter trips keep 1 day's cost.
// Day's cost = daily rent + trip fee. Half of any delivery fee is always added to a fee.
const HOUR = 3_600_000;
const DAY = 24 * HOUR;

export type CancellationInput = {
  now: number;
  bookedAt: number;
  startAt: number;
  endAt: number | null;
  dailyRent: number;
  tripFeePerDay?: number;
  deliveryFee?: number;
  amountPaid: number;
};

export type CancellationQuote = {
  kind: "free" | "late" | "no_show";
  tripDays: number;
  daysCharged: number;
  fee: number;
  refund: number;
  explanation: string;
};

const money = (n: number) => `$${n.toFixed(2)}`;
const round = (n: number) => Math.round(n * 100) / 100;

export function cancellationQuote(i: CancellationInput): CancellationQuote {
  const tripDays = i.endAt ? Math.max(1, Math.ceil((i.endAt - i.startAt) / DAY)) : 1;
  const paid = Math.max(0, i.amountPaid);
  const bookedLate = i.startAt - i.bookedAt < DAY;
  const free = i.now <= i.startAt - DAY || (bookedLate && i.now <= i.bookedAt + HOUR && i.now < i.startAt);
  if (free) {
    return { kind: "free", tripDays, daysCharged: 0, fee: 0, refund: round(paid),
      explanation: `Free cancellation — nothing is kept. ${money(paid)} refunded.` };
  }
  const noShow = i.now >= i.startAt;
  const long = tripDays > 3;
  const daysCharged = noShow ? (long ? 2 : 1) : (long ? 1 : 0.5);
  const dayCost = Math.max(0, i.dailyRent) + Math.max(0, i.tripFeePerDay || 0);
  const halfDelivery = Math.max(0, i.deliveryFee || 0) / 2;
  const fee = round(Math.min(paid, dayCost * daysCharged + halfDelivery));
  const refund = round(paid - fee);
  const dayLabel = daysCharged === 0.5 ? "½ day's" : daysCharged === 1 ? "1 day's" : `${daysCharged} days'`;
  const parts = [`${dayLabel} rent + trip fee`];
  if (halfDelivery > 0) parts.push("½ delivery");
  const why = noShow ? "No-show (trip already started)" : "Cancelled within 24 hours of trip start";
  return { kind: noShow ? "no_show" : "late", tripDays, daysCharged, fee, refund,
    explanation: `${why}: ${parts.join(" + ")} = ${money(fee)} kept, ${money(refund)} refunded.` };
}
