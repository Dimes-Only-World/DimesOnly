export const RENTAL_PICKUP_WINDOW_DAYS = 28;
export const MONTHLY_RENTAL_MAX_DAYS = 30;
export const LONG_TERM_MIN_MONTHS = 6;
export const RENT_TO_OWN_MONTHS = 48;
export const RENT_TO_OWN_MONTHLY_DISCOUNT = 75;

export const rentToOwnMonthlyPayment = (monthlyRate: number) =>
  Math.round(Math.max(0, monthlyRate) * 100) / 100;

export const rentToOwnContractTotal = (monthlyRate: number, downPayment: number) =>
  Math.round((Math.max(0, downPayment) + Math.max(0, RENT_TO_OWN_MONTHS * rentToOwnMonthlyPayment(monthlyRate) - RENT_TO_OWN_MONTHLY_DISCOUNT)) * 100) / 100;

export const monthlyRentalPrice = (monthlyRate: number) =>
  Math.round(Math.max(0, monthlyRate) * 100) / 100;

const laDay = (d: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Los_Angeles", year: "numeric", month: "2-digit", day: "2-digit" }).format(d);

// Pickup strings are naive local (business = Los Angeles) date-times; compare calendar days only.
export const allowedPickupDate = (start: string, now = new Date()) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(start ?? "");
  if (!m) return false;
  const pickupDay = Date.UTC(+m[1], +m[2] - 1, +m[3]);
  const [y, mo, d] = laDay(now).split("-").map(Number);
  const today = Date.UTC(y, mo - 1, d);
  return pickupDay >= today && pickupDay <= today + RENTAL_PICKUP_WINDOW_DAYS * 86_400_000;
};

export const minimumEndDate = (start: string, rentalType: string) => {
  const result = new Date(start);
  if (!Number.isFinite(result.getTime())) return null;
  result.setMonth(result.getMonth() + (rentalType === "rent_to_own" ? RENT_TO_OWN_MONTHS : LONG_TERM_MIN_MONTHS));
  return result;
};

export const monthlyRentalEndIsValid = (start: string, end: string) => {
  const startTime = new Date(start).getTime();
  const endTime = new Date(end).getTime();
  return Number.isFinite(startTime) && Number.isFinite(endTime) && endTime > startTime && endTime <= startTime + MONTHLY_RENTAL_MAX_DAYS * 86_400_000;
};