export const extensionAmounts = (days: number, dailyRate: number) => {
  const extensionPrice = Math.round(days * dailyRate * 100) / 100;
  const transactionFee = Math.round((extensionPrice * 0.045 + 1.27) * 100) / 100;
  return { extensionPrice, transactionFee, totalCharged: Math.round((extensionPrice + transactionFee) * 100) / 100 };
};

export const mileageIsValid = (reported: number, previous: number) =>
  Number.isInteger(reported) && reported > previous;
