export type RateInput = { day_rate?: unknown; three_day_rate?: unknown; weekly_rate?: unknown; monthly_rate?: unknown };

const n = (v: unknown) => { const x = Number(v); return Number.isFinite(x) && x > 0 ? x : 0; };

/** Plain-language warnings when a car's longer rates cost more than paying day by day, or look reversed. */
export function vehicleRateWarnings(r: RateInput): string[] {
  const day = n(r.day_rate), three = n(r.three_day_rate), week = n(r.weekly_rate), month = n(r.monthly_rate);
  const out: string[] = [];
  if (day && three && three > day) out.push("3+ day rate is higher than the day rate.");
  if (day && week && week > day * 7) out.push(`Weekly rate is more than 7 days at the day rate ($${(day * 7).toFixed(0)}).`);
  if (day && month && month > day * 30) out.push(`Monthly rate is more than 30 days at the day rate ($${(day * 30).toFixed(0)}).`);
  if (week && month && month < week) out.push("Monthly rate is lower than the weekly rate — rates may be reversed.");
  if (day && week && week < day) out.push("Weekly rate is lower than the day rate — rates may be reversed.");
  return out;
}
