import { shortTermLines } from "./rentalShortTerm";

export type RentalRateSource = {
  day_rate?: number | null;
  three_day_rate?: number | null;
  weekly_rate?: number | null;
  monthly_rate?: number | null;
  down_payment?: number | null;
};

export type RentalPriceLine = {
  label: string;
  quantity: number;
  unitRate: number;
  total: number;
};

export type RentalPriceBreakdown = {
  days: number;
  lines: RentalPriceLine[];
  total: number;
  standardDailyTotal: number;
  savings: number;
};

export const rentalDaysBetween = (start?: string | null, end?: string | null) => {
  if (!start || !end) return 1;
  const startTime = new Date(start).getTime();
  const endTime = new Date(end).getTime();
  if (!Number.isFinite(startTime) || !Number.isFinite(endTime) || endTime <= startTime) return 1;
  return Math.max(1, Math.ceil((endTime - startTime) / 86_400_000));
};

export const calculateRentalPricing = (
  vehicle: RentalRateSource,
  rentalType: string,
  start?: string | null,
  end?: string | null,
): RentalPriceBreakdown => {
  const days = rentalDaysBetween(start, end);
  const dayRate = Math.max(0, Number(vehicle.day_rate || 0));

  if (rentalType === "long_term" || rentalType === "rent_to_own") {
    const amount = Math.max(0, Number(vehicle.down_payment || 0));
    return {
      days,
      lines: [{ label: "Down payment", quantity: 1, unitRate: amount, total: amount }],
      total: amount,
      standardDailyTotal: amount,
      savings: 0,
    };
  }

  const minimumDays = rentalType === "weekly" ? 7 : 1;
  const lines: RentalPriceLine[] = shortTermLines(vehicle, Math.max(days, minimumDays));

  const total = lines.reduce((sum, line) => sum + line.total, 0);
  const standardDailyTotal = dayRate > 0 ? days * dayRate : total;
  return {
    days,
    lines,
    total,
    standardDailyTotal,
    savings: Math.max(0, standardDailyTotal - total),
  };
};