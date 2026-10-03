import { PDFDocument, StandardFonts, rgb } from "https://esm.sh/pdf-lib@1.17.1";

export type ManualPaymentReceipt = {
  bookingId: string;
  amount: number;
  method: "cash" | "cashapp";
  reference: string;
  paidAt: string;
  vehicleLabel?: string;
};

export const receiptDetails = (input: ManualPaymentReceipt) => ({
  bookingCode: input.bookingId.slice(0, 8).toUpperCase(),
  amount: Math.round(input.amount * 100) / 100,
  methodLabel: input.method === "cashapp" ? "Cash App" : "Cash",
  referenceLabel: input.method === "cashapp" ? "Transaction reference" : "Collected by",
  reference: input.reference.trim() || "Not provided",
});

export const buildManualPaymentReceiptPdf = async (input: ManualPaymentReceipt) => {
  const details = receiptDetails(input);
  const document = await PDFDocument.create();
  const page = document.addPage([612, 792]);
  const regular = await document.embedFont(StandardFonts.Helvetica);
  const bold = await document.embedFont(StandardFonts.HelveticaBold);
  const navy = rgb(0.06, 0.12, 0.2);
  const red = rgb(0.82, 0.08, 0.1);
  const gold = rgb(0.78, 0.58, 0.12);
  const muted = rgb(0.36, 0.4, 0.46);
  const pale = rgb(0.96, 0.97, 0.98);
  const border = rgb(0.82, 0.84, 0.87);
  const paidDate = new Intl.DateTimeFormat("en-US", {
    month: "long", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit",
    timeZone: "America/Los_Angeles", timeZoneName: "short",
  }).format(new Date(input.paidAt));

  page.drawRectangle({ x: 0, y: 730, width: 612, height: 62, color: navy });
  page.drawRectangle({ x: 0, y: 724, width: 612, height: 6, color: red });
  page.drawText("BEST RENTAL CAR SERVICE", { x: 44, y: 758, size: 18, font: bold, color: rgb(1, 1, 1) });
  page.drawText("PAYMENT RECEIPT", { x: 44, y: 686, size: 22, font: bold, color: navy });
  page.drawText("PAID", { x: 496, y: 688, size: 13, font: bold, color: red });

  page.drawRectangle({ x: 44, y: 438, width: 524, height: 210, color: pale, borderColor: border, borderWidth: 1 });
  const rows = [
    ["BOOKING CODE", details.bookingCode],
    ["AMOUNT RECEIVED", `$${details.amount.toFixed(2)}`],
    ["PAYMENT METHOD", details.methodLabel],
    [details.referenceLabel.toUpperCase(), details.reference],
    ["DATE RECEIVED", paidDate],
    ["VEHICLE", input.vehicleLabel?.trim() || "Vehicle rental"],
  ];
  rows.forEach(([label, value], index) => {
    const y = 616 - index * 32;
    page.drawText(label, { x: 60, y, size: 8, font: bold, color: muted });
    page.drawText(value, { x: 230, y: y - 1, size: 11, font: index === 1 ? bold : regular, color: navy });
  });

  page.drawText("Payment received", { x: 44, y: 390, size: 10, font: bold, color: muted });
  page.drawText("Best Holdings Enterprises, Inc.", { x: 44, y: 360, size: 14, font: bold, color: navy });
  page.drawText("Best Rental Car Service", { x: 44, y: 340, size: 10, font: regular, color: muted });
  page.drawText("RECEIPT", { x: 452, y: 340, size: 22, font: bold, color: gold });

  page.drawLine({ start: { x: 44, y: 70 }, end: { x: 568, y: 70 }, thickness: 0.7, color: border });
  page.drawText("Keep this receipt for your records.", { x: 44, y: 50, size: 8, font: regular, color: muted });
  page.drawText(`Receipt ${details.bookingCode}`, { x: 470, y: 50, size: 8, font: bold, color: navy });
  return await document.save();
};