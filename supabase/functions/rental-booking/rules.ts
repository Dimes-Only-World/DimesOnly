export const RENTAL_PICKUP_WINDOW_DAYS = 28;
export const LONG_TERM_MIN_MONTHS = 6;
export const RENT_TO_OWN_MONTHS = 48;
export const RENT_TO_OWN_MONTHLY_DISCOUNT = 75;

export const rentToOwnMonthlyPayment = (monthlyRate: number) =>
  Math.round(Math.max(0, monthlyRate - RENT_TO_OWN_MONTHLY_DISCOUNT) * 100) / 100;

export const allowedPickupDate = (start: string, now = new Date()) => {
  const pickup = new Date(start);
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const last = new Date(today);
  last.setDate(last.getDate() + RENTAL_PICKUP_WINDOW_DAYS);
  return Number.isFinite(pickup.getTime()) && pickup >= today && pickup <= new Date(last.getTime() + 86_399_999);
};

export const minimumEndDate = (start: string, rentalType: string) => {
  const result = new Date(start);
  if (!Number.isFinite(result.getTime())) return null;
  result.setMonth(result.getMonth() + (rentalType === "rent_to_own" ? RENT_TO_OWN_MONTHS : LONG_TERM_MIN_MONTHS));
  return result;
};