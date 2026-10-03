export const RENTAL_PICKUP_WINDOW_DAYS = 28;
export const MONTHLY_RENTAL_MAX_DAYS = 28;
export const LONG_TERM_MIN_MONTHS = 6;
export const RENT_TO_OWN_MONTHS = 48;
export const RENT_TO_OWN_MONTHLY_DISCOUNT = 75;

const roundMoney = (value: number) => Math.round(value * 100) / 100;

export const rentToOwnMonthlyPayment = (monthlyRate?: number | null) =>
  roundMoney(Math.max(0, Number(monthlyRate || 0)));

export const rentToOwnContractTotal = (monthlyRate?: number | null, downPayment?: number | null) =>
  roundMoney(Math.max(0, Number(downPayment || 0)) + Math.max(0, RENT_TO_OWN_MONTHS * rentToOwnMonthlyPayment(monthlyRate) - RENT_TO_OWN_MONTHLY_DISCOUNT));

export const addMonths = (date: Date, months: number) => {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
};

export const addDays = (date: Date, days: number) => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
};

export const monthlyRentalEndIsValid = (start?: string | null, end?: string | null) => {
  if (!start || !end) return false;
  const startTime = new Date(start).getTime();
  const endTime = new Date(end).getTime();
  return Number.isFinite(startTime) && Number.isFinite(endTime) && endTime > startTime && endTime <= startTime + MONTHLY_RENTAL_MAX_DAYS * 86_400_000;
};

export const startOfToday = () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
};

export const lastPickupDay = () => {
  const date = startOfToday();
  date.setDate(date.getDate() + RENTAL_PICKUP_WINDOW_DAYS);
  return date;
};

export const toLocalDateTimeValue = (date: Date, time = "10:00") => {
  const [hours, minutes] = time.split(":").map(Number);
  const local = new Date(date);
  local.setHours(Number.isFinite(hours) ? hours : 10, Number.isFinite(minutes) ? minutes : 0, 0, 0);
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${local.getFullYear()}-${pad(local.getMonth() + 1)}-${pad(local.getDate())}T${pad(local.getHours())}:${pad(local.getMinutes())}`;
};