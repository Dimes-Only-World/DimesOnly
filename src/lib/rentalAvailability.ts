// Shared availability rule (mirrored in supabase/functions/rental-booking/availability.ts).
// From 3 days before a scheduled (paid) pickup, the car is unavailable to everyone else
// until that rental ends. Back-to-back rentals that start within 3 days of the previous
// return extend the blocked period. New bookings may never overlap a scheduled rental.
export const HOLD_BLOCK_DAYS = 3;
const DAY = 86_400_000;

export type BookedRange = { start_date: string; end_date: string | null };

const ranges = (bookings: BookedRange[]) =>
  bookings
    .map((b) => ({ s: new Date(b.start_date).getTime(), e: new Date(b.end_date || b.start_date).getTime() }))
    .filter((r) => Number.isFinite(r.s) && Number.isFinite(r.e))
    .sort((a, b) => a.s - b.s);

/** Timestamp the car stays unavailable until, or null when it can be booked now. */
export function blockedUntil(bookings: BookedRange[], now: number): number | null {
  const list = ranges(bookings);
  let until: number | null = null;
  for (const r of list) {
    const blocks = until === null ? now >= r.s - HOLD_BLOCK_DAYS * DAY && now <= r.e : r.s - HOLD_BLOCK_DAYS * DAY <= until;
    if (blocks && (until === null || r.e > until)) until = r.e;
  }
  return until;
}

/** First calendar day (local midnight) a Notify Me hold can start. */
export function nextAvailableDate(bookings: BookedRange[], now: number): Date {
  const until = blockedUntil(bookings, now) ?? now;
  const d = new Date(until);
  d.setHours(0, 0, 0, 0);
  if (until !== now) d.setDate(d.getDate() + 1);
  return d;
}

/** Error message when a requested trip can't be booked, otherwise null. */
export function bookingConflict(bookings: BookedRange[], start: number, end: number, now: number): string | null {
  const until = blockedUntil(bookings, now);
  if (until !== null && start <= until) return "This car is reserved for another renter. Use Notify Me to hold the next available dates.";
  for (const r of ranges(bookings)) {
    if (start < r.e && end > r.s) return "Those dates overlap another renter's trip.";
  }
  return null;
}
