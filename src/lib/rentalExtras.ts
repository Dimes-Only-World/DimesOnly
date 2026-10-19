// Mileage + protection add-ons for every rental length. Mirrored in
// supabase/functions/rental-booking/extras.ts — keep both identical.
export const INCLUDED_MILES_PER_DAY = 200;
export const PROTECTION_RATES = { standard: 34, minimum: 27, own: 0 } as const;
export type ProtectionPlan = keyof typeof PROTECTION_RATES;
export type MileagePlan = "limited" | "unlimited";

const r2 = (n: number) => Math.round(n * 100) / 100;

export const extrasDays = (rentalType: string, days: number) =>
  Math.max(rentalType === "weekly" ? 7 : 1, Math.ceil(days || 1));

export function rentalExtras(
  vehicle: { unlimited_mileage_rate?: number | null },
  mileage: MileagePlan,
  protection: ProtectionPlan,
  days: number,
) {
  const d = Math.max(1, Math.ceil(days));
  const unlimitedRate = Math.max(0, Number(vehicle.unlimited_mileage_rate || 0));
  const mileageTotal = mileage === "unlimited" ? r2(d * unlimitedRate) : 0;
  const protectionRate = PROTECTION_RATES[protection] ?? 0;
  const protectionTotal = r2(d * protectionRate);
  return { days: d, mileageTotal, protectionRate, protectionTotal, total: r2(mileageTotal + protectionTotal) };
}
