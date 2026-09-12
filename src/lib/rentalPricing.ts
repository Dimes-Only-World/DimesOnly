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

  const monthlyRate = Math.max(0, Number(vehicle.monthly_rate || 0));
  const weeklyRate = Math.max(0, Number(vehicle.weekly_rate || 0));
  const discountedDayRate = Math.max(0, Number(vehicle.three_day_rate || 0));
  let remaining = days;
  const lines: RentalPriceLine[] = [];

  if (monthlyRate > 0 && remaining >= 30) {
    const quantity = Math.floor(remaining / 30);
    lines.push({ label: quantity === 1 ? "Month" : "Months", quantity, unitRate: monthlyRate, total: quantity * monthlyRate });
    remaining %= 30;
  }

  if (weeklyRate > 0 && remaining >= 7) {
    const quantity = Math.floor(remaining / 7);
    lines.push({ label: quantity === 1 ? "Week" : "Weeks", quantity, unitRate: weeklyRate, total: quantity * weeklyRate });
    remaining %= 7;
  }

  if (remaining > 0) {
    const useThreeDayRate = remaining >= 3 && discountedDayRate > 0 && (dayRate === 0 || discountedDayRate < dayRate);
    const unitRate = useThreeDayRate ? discountedDayRate : dayRate;
    lines.push({
      label: useThreeDayRate ? "Discounted days" : remaining === 1 ? "Day" : "Days",
      quantity: remaining,
      unitRate,
      total: remaining * unitRate,
    });
  }

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