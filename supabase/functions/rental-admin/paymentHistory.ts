export type PaymentMethod = "paypal" | "cash" | "cashapp";

export type PaymentHistoryRow = {
  id: string;
  booking_id: string;
  payment_type: "booking" | "extension";
  paid_at: string;
  payment_method: PaymentMethod;
  amount: number;
  payment_reference: string | null;
  receipt_path: string | null;
  renter_username: string | null;
  vehicle_label: string;
};

export const paymentMethodLabel = (method: PaymentMethod) => method === "cashapp" ? "Cash App" : method === "cash" ? "Cash" : "PayPal";

export const summarizePayments = (rows: PaymentHistoryRow[]) => rows.reduce((totals, row) => {
  totals.count += 1;
  totals.total = Number((totals.total + row.amount).toFixed(2));
  totals[row.payment_method] = Number((totals[row.payment_method] + row.amount).toFixed(2));
  return totals;
}, { count: 0, total: 0, paypal: 0, cash: 0, cashapp: 0 });

export const validPaymentDate = (value: unknown) => typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);

export const validPaymentMethod = (value: unknown): value is PaymentMethod => ["paypal", "cash", "cashapp"].includes(String(value));

const csvCell = (value: unknown) => {
  const raw = String(value ?? "");
  const safe = /^[=+\-@\t\r]/.test(raw) ? `'${raw}` : raw;
  return `"${safe.replace(/"/g, '""')}"`;
};

export const paymentHistoryCsv = (rows: PaymentHistoryRow[]) => {
  const headers = ["Paid date", "Booking code", "Renter", "Vehicle", "Payment type", "Method", "Amount", "Reference"];
  const body = rows.map((row) => [row.paid_at, row.booking_id.slice(0, 8).toUpperCase(), row.renter_username || "", row.vehicle_label, row.payment_type, paymentMethodLabel(row.payment_method), row.amount.toFixed(2), row.payment_reference || ""]);
  return [headers, ...body].map((line) => line.map(csvCell).join(",")).join("\n");
};