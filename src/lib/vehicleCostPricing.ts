// Auto-fill rental rates from what the company pays per month for a car,
// using percentage markups (defaults reproduce the $500 → $1,252 example).
const round2 = (n: number) => Math.round(n * 100) / 100;

export const DEFAULT_MARKUPS = {
  monthlyPct: 150.4, // monthly = payment × (1 + 150.4%)
  weeklyPct: 0, // weekly = payment × (1 + 0%)
  dailyPct: 210, // daily = (payment ÷ 30) × (1 + 210%)
  threeDayDiscountPct: 20, // 3+ day = daily × (1 − 20%)
};
export type Markups = typeof DEFAULT_MARKUPS;

export function ratesFromMonthlyPayment(payment: number, m: Markups = DEFAULT_MARKUPS) {
  const p = Math.max(0, Number(payment) || 0);
  const day = round2((p / 30) * (1 + (Number(m.dailyPct) || 0) / 100));
  return {
    monthly_rate: round2(p * (1 + (Number(m.monthlyPct) || 0) / 100)),
    weekly_rate: round2(p * (1 + (Number(m.weeklyPct) || 0) / 100)),
    day_rate: day,
    three_day_rate: round2(day * (1 - (Number(m.threeDayDiscountPct) || 0) / 100)),
  };
}
