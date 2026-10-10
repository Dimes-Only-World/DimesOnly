// Auto-fill rental rates from what the company pays per month for a car.
// Monthly = payment + $752; Weekly = payment; Daily = payment/30 + $35;
// 3+ day rate = daily rate with a 20% discount.
const round2 = (n: number) => Math.round(n * 100) / 100;

export function ratesFromMonthlyPayment(payment: number) {
  const p = Math.max(0, Number(payment) || 0);
  const day = round2(p / 30 + 35);
  return {
    monthly_rate: round2(p + 752),
    weekly_rate: round2(p),
    day_rate: day,
    three_day_rate: round2(day * 0.8),
  };
}
