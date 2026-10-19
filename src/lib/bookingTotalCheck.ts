import { calculateRentalPricing, type RentalRateSource } from "./rentalPricing";

const r2 = (n: number) => Math.round(n * 100) / 100;
const num = (v: unknown) => Math.max(0, Number(v || 0) || 0);

export type BookingForCheck = {
  rental_type: string;
  start_date: string | null;
  end_date: string | null;
  total_price: number | string | null;
  mileage_total?: number | string | null;
  protection_total?: number | string | null;
  discount_amount?: number | string | null;
  hold_credit?: number | string | null;
  security_deposit?: number | string | null;
  booking_addons?: { name_snapshot?: string | null; price_snapshot: number | string }[] | null;
};

export type TotalCheck = {
  lines: { label: string; amount: number }[];
  expected: number;
  saved: number;
  difference: number;
  matches: boolean;
};

/** Rebuild a short-term booking's total from the car's rates; null for lease / rent-to-own. */
export function checkBookingTotal(b: BookingForCheck, vehicle: RentalRateSource & { security_deposit?: number | null }): TotalCheck | null {
  if (["long_term", "rent_to_own", "purchase"].includes(b.rental_type)) return null;
  const rent = calculateRentalPricing(vehicle, b.rental_type, b.start_date, b.end_date);
  const lines: { label: string; amount: number }[] = rent.lines.map((l) => ({ label: `${l.label} × ${l.quantity} @ $${l.unitRate}`, amount: l.total }));
  for (const a of b.booking_addons || []) lines.push({ label: a.name_snapshot || "Add-on", amount: num(a.price_snapshot) });
  if (num(b.mileage_total)) lines.push({ label: "Mileage plan", amount: num(b.mileage_total) });
  if (num(b.protection_total)) lines.push({ label: "Protection plan", amount: num(b.protection_total) });
  if (num(b.discount_amount)) lines.push({ label: "Promo discount", amount: -num(b.discount_amount) });
  if (num(b.hold_credit)) lines.push({ label: "Notify Me deposit credit", amount: -num(b.hold_credit) });
  const deposit = b.security_deposit != null ? num(b.security_deposit) : num(vehicle.security_deposit);
  if (deposit) lines.push({ label: "Security deposit", amount: deposit });
  const expected = r2(lines.reduce((s, l) => s + l.amount, 0));
  const saved = r2(num(b.total_price));
  const difference = r2(saved - expected);
  return { lines, expected, saved, difference, matches: Math.abs(difference) <= 1 };
}
