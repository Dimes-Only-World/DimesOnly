import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { PDFDocument, StandardFonts, rgb } from "npm:pdf-lib@1.17.1";
import { z } from "https://esm.sh/zod@3.23.8";
import { getCallerId } from "../_shared/caller.ts";
import { extensionCharge, mileageIsValid, MAX_EXTENSION_DAYS } from "./rules.ts";

const RequestSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("list") }),
  z.object({
    action: z.literal("createPayment"),
    bookingId: z.string().uuid(),
    extraDays: z.coerce.number().int().min(1).max(MAX_EXTENSION_DAYS),
    useDeposit: z.boolean().optional().default(true),
    reportedMileage: z.coerce.number().int().min(1).max(10_000_000),
    returnUrl: z.string().url(),
    cancelUrl: z.string().url(),
  }),
  z.object({
    action: z.literal("capturePayment"),
    extensionId: z.string().uuid(),
    paypalOrderId: z.string().min(1).max(120),
  }),
  z.object({ action: z.literal("downloadStatement"), extensionId: z.string().uuid() }),
  z.object({ action: z.literal("downloadBookingStatement"), bookingId: z.string().uuid() }),
]);

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...corsHeaders, "Content-Type": "application/json" },
});

const paypalBase = () => (Deno.env.get("PAYPAL_ENVIRONMENT") || "sandbox") === "live"
  ? "https://api-m.paypal.com"
  : "https://api-m.sandbox.paypal.com";

const paypalToken = async () => {
  const id = Deno.env.get("PAYPAL_CLIENT_ID");
  const secret = Deno.env.get("PAYPAL_CLIENT_SECRET");
  if (!id || !secret) throw new Error("PayPal credentials missing");
  const response = await fetch(`${paypalBase()}/v1/oauth2/token`, {
    method: "POST",
    headers: { Authorization: `Basic ${btoa(`${id}:${secret}`)}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: "grant_type=client_credentials",
  });
  const body = await response.json();
  if (!response.ok || !body.access_token) throw new Error("PayPal authentication failed");
  return String(body.access_token);
};

const serviceClient = () => {
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) throw new Error("Rental service is unavailable");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
};

const dateOnly = (value: string) => new Intl.DateTimeFormat("en-US", {
  month: "2-digit", day: "2-digit", year: "numeric", timeZone: "America/Los_Angeles",
}).format(new Date(value));

const safeText = (value: unknown, fallback = "Not provided") => {
  const text = String(value ?? "").trim();
  return text || fallback;
};

const wrap = (text: string, font: any, size: number, maxWidth: number) => {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (font.widthOfTextAtSize(candidate, size) <= maxWidth) line = candidate;
    else { if (line) lines.push(line); line = word; }
  }
  if (line) lines.push(line);
  return lines;
};

export const buildStatementPdf = async (input: any) => {
  const doc = await PDFDocument.create();
  const page = doc.addPage([612, 792]);
  const regular = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const italic = await doc.embedFont(StandardFonts.HelveticaOblique);
  const navy = rgb(0.06, 0.12, 0.2);
  const red = rgb(0.82, 0.08, 0.1);
  const gold = rgb(0.78, 0.58, 0.12);
  const muted = rgb(0.36, 0.4, 0.46);
  const pale = rgb(0.96, 0.97, 0.98);
  const border = rgb(0.82, 0.84, 0.87);
  const margin = 44;
  const width = 524;

  page.drawRectangle({ x: 0, y: 744, width: 612, height: 48, color: navy });
  page.drawRectangle({ x: 0, y: 738, width: 612, height: 6, color: red });
  page.drawText("BEST RENTAL CAR SERVICE", { x: margin, y: 762, size: 17, font: bold, color: rgb(1, 1, 1) });
  page.drawText("STATEMENT OF PERMISSIVE MEMBER", { x: margin, y: 716, size: 15, font: bold, color: red });
  page.drawText(`Document ID  ${String(input.extensionId).slice(0, 8).toUpperCase()}`, { x: 422, y: 718, size: 8, font: regular, color: muted });

  let y = 684;
  const statement = `This statement acknowledges that ${input.memberName}, designated as the “Permissive Member,” is authorized and entitled to use the motor vehicle described below, which is registered to the Registered Owner. Permission is granted by Best Rental Car Services and solidified by Power of Attorney of the Registered Owner. Permission runs from ${dateOnly(input.previousEndDate)} through ${dateOnly(input.newEndDate)}. Not to exceed 200 miles a day.`;
  for (const line of wrap(statement, regular, 10.2, width - 18)) {
    page.drawText(line, { x: margin + 9, y, size: 10.2, font: regular, color: navy });
    y -= 14;
  }

  const section = (title: string, top: number) => {
    page.drawRectangle({ x: margin, y: top - 22, width, height: 22, color: navy });
    page.drawText(title, { x: margin + 10, y: top - 15, size: 10, font: bold, color: rgb(1, 1, 1) });
  };
  section("VEHICLE INFORMATION", y - 10);
  y -= 50;
  page.drawRectangle({ x: margin, y: y - 132, width, height: 138, color: pale, borderColor: border, borderWidth: 1 });
  const fields = [
    ["YEAR / MAKE / MODEL", `${safeText(input.year)} ${safeText(input.make)} ${safeText(input.model)}`],
    ["VIN", safeText(input.vin)],
    ["ODOMETER", `${Number(input.odometer).toLocaleString("en-US")} miles`],
    ["REGISTRATION STATE", safeText(input.registrationState)],
    ["LICENSE PLATE", safeText(input.licensePlate)],
    ["PLATE EXPIRATION", input.plateExpiration ? dateOnly(input.plateExpiration) : "Not provided"],
    ["BODY STYLE", safeText(input.bodyStyle)],
    ["COLOR", safeText(input.color)],
  ];
  fields.forEach(([label, value], index) => {
    const column = index % 2;
    const row = Math.floor(index / 2);
    const x = margin + 14 + column * 255;
    const fy = y - row * 31;
    page.drawText(label, { x, y: fy, size: 7.2, font: bold, color: muted });
    page.drawText(value, { x, y: fy - 13, size: 10.5, font: regular, color: navy });
  });
  y -= 166;

  section("PERMISSIVE MEMBER", y);
  y -= 48;
  page.drawText("FULL LEGAL NAME", { x: margin + 10, y, size: 7.2, font: bold, color: muted });
  page.drawText(safeText(input.memberName), { x: margin + 10, y: y - 17, size: 13, font: bold, color: navy });
  page.drawLine({ start: { x: margin + 10, y: y - 61 }, end: { x: margin + 285, y: y - 61 }, thickness: 0.8, color: navy });
  page.drawText("Permissive member signature", { x: margin + 10, y: y - 73, size: 7.5, font: italic, color: muted });
  y -= 104;

  section("COMPANY AUTHORIZATION", y);
  y -= 48;
  page.drawText("Best Holdings Enterprises, Inc.", { x: margin + 10, y, size: 12, font: bold, color: navy });
  page.drawText("Authorized signer", { x: margin + 10, y: y - 20, size: 7.2, font: bold, color: muted });
  page.drawText("Joseph Weaver", { x: margin + 10, y: y - 36, size: 11, font: regular, color: navy });
  page.drawText("EXTENSION DATES", { x: 320, y: y - 1, size: 7.2, font: bold, color: muted });
  page.drawText(`${dateOnly(input.previousEndDate)} – ${dateOnly(input.newEndDate)}`, { x: 320, y: y - 17, size: 10.5, font: regular, color: navy });
  page.drawText("PAID DATE", { x: 320, y: y - 38, size: 7.2, font: bold, color: muted });
  page.drawText(dateOnly(input.paidAt), { x: 320, y: y - 54, size: 10.5, font: regular, color: navy });
  page.drawText("Joseph Weaver", { x: margin + 10, y: y - 76, size: 18, font: italic, color: gold });
  page.drawLine({ start: { x: margin + 10, y: y - 82 }, end: { x: margin + 220, y: y - 82 }, thickness: 0.8, color: navy });
  page.drawText("Authorized signature", { x: margin + 10, y: y - 94, size: 7.5, font: italic, color: muted });

  page.drawLine({ start: { x: margin, y: 48 }, end: { x: margin + width, y: 48 }, thickness: 0.7, color: border });
  page.drawText("Keep this statement with the vehicle during the authorized extension period.", { x: margin, y: 31, size: 8, font: regular, color: muted });
  page.drawText("BEST RENTAL", { x: 498, y: 31, size: 8, font: bold, color: red });
  return await doc.save();
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  try {
    const callerId = await getCallerId(req);
    if (!callerId) return json({ error: "Please sign in again to continue." }, 401);
    const parsed = RequestSchema.safeParse(await req.json());
    if (!parsed.success) return json({ error: "Invalid request", fields: parsed.error.flatten().fieldErrors }, 400);
    const admin = serviceClient();
    const body = parsed.data;

    if (body.action === "list") {
      const { data, error } = await admin.from("rental_extensions")
        .select("id, booking_id, previous_end_date, new_end_date, extra_days, reported_mileage, extension_price, transaction_fee, total_charged, status, paid_at, statement_path, deposit_applied, late_fee, late_fee_waived")
        .eq("renter_user_id", callerId).eq("status", "paid").order("paid_at", { ascending: false });
      if (error) throw error;
      return json({ data: data || [] });
    }

    if (body.action === "downloadStatement") {
      const { data: extension } = await admin.from("rental_extensions")
        .select("statement_path, status").eq("id", body.extensionId).eq("renter_user_id", callerId).maybeSingle();
      if (!extension || extension.status !== "paid" || !extension.statement_path) return json({ error: "Statement not found" }, 404);
      const { data, error } = await admin.storage.from("rental-documents").createSignedUrl(extension.statement_path, 300);
      if (error || !data?.signedUrl) return json({ error: "Could not prepare statement" }, 500);
      return json({ data: { url: data.signedUrl } });
    }

    if (body.action === "downloadBookingStatement") {
      const { data: booking } = await admin.from("rental_bookings")
        .select("id, renter_user_id, status, start_date, end_date, paid_at, pickup_mileage, vehicles(year, make, model, vin, mileage, registration_state, license_plate, plate_expiration, body_style, color)")
        .eq("id", body.bookingId).maybeSingle();
      if (!booking || booking.renter_user_id !== callerId) return json({ error: "Rental not found" }, 404);
      if (!["paid", "active", "completed", "returned"].includes(String(booking.status || "").toLowerCase())) {
        return json({ error: "The statement is available once the rental is paid" }, 400);
      }
      const { data: member } = await admin.from("users").select("first_name, last_name, username").eq("id", callerId).maybeSingle();
      const vehicle: any = Array.isArray(booking.vehicles) ? booking.vehicles[0] : booking.vehicles;
      const paidAt = booking.paid_at || booking.start_date;
      const pdf = await buildStatementPdf({
        extensionId: booking.id,
        memberName: [member?.first_name, member?.last_name].filter(Boolean).join(" ") || safeText(member?.username),
        previousEndDate: booking.start_date, newEndDate: booking.end_date, paidAt,
        odometer: Number(booking.pickup_mileage ?? vehicle?.mileage ?? 0),
        year: vehicle?.year, make: vehicle?.make, model: vehicle?.model, vin: vehicle?.vin,
        registrationState: vehicle?.registration_state, licensePlate: vehicle?.license_plate,
        plateExpiration: vehicle?.plate_expiration, bodyStyle: vehicle?.body_style, color: vehicle?.color,
      });
      const filename = `permissive-member-${booking.id}-${String(paidAt).slice(0, 10)}.pdf`;
      const path = `${callerId}/${booking.id}/rental/${filename}`;
      const { error: uploadError } = await admin.storage.from("rental-documents").upload(path, pdf, { contentType: "application/pdf", upsert: true });
      if (uploadError) throw new Error(`Statement generation failed: ${uploadError.message}`);
      const { data, error } = await admin.storage.from("rental-documents").createSignedUrl(path, 300, { download: filename });
      if (error || !data?.signedUrl) return json({ error: "Could not prepare statement" }, 500);
      return json({ data: { url: data.signedUrl } });
    }

    if (body.action === "createPayment") {
      const { data: booking } = await admin.from("rental_bookings")
        .select("id, renter_user_id, status, end_date, security_deposit, pickup_mileage, latest_reported_mileage, vehicle_id, vehicles(day_rate, mileage)")
        .eq("id", body.bookingId).maybeSingle();
      if (!booking || booking.renter_user_id !== callerId) return json({ error: "Rental not found" }, 404);
      const status = String(booking.status || "").toLowerCase();
      const endMs = booking.end_date ? new Date(booking.end_date).getTime() : 0;
      if (!booking.end_date || ["completed", "returned", "cancelled", "canceled", "rejected"].includes(status) || (endMs <= Date.now() && status !== "active")) {
        return json({ error: "Past rentals cannot be extended" }, 400);
      }
      const vehicle = Array.isArray(booking.vehicles) ? booking.vehicles[0] : booking.vehicles;
      const dailyRate = Number(vehicle?.day_rate || 0);
      if (dailyRate <= 0) return json({ error: "This rental has no daily extension rate" }, 400);
      const previousMileage = Number(booking.latest_reported_mileage ?? booking.pickup_mileage ?? vehicle?.mileage ?? 0);
      if (!mileageIsValid(body.reportedMileage, previousMileage)) {
        return json({ error: `Mileage must be a whole number greater than ${previousMileage.toLocaleString("en-US")}` }, 400);
      }
      const { data: prior } = await admin.from("rental_extensions").select("deposit_applied").eq("booking_id", booking.id).eq("status", "paid");
      const depositUsed = (prior || []).reduce((t: number, e: any) => t + Number(e.deposit_applied || 0), 0);
      const amounts = extensionCharge({
        days: body.extraDays, dailyRate, dueMs: endMs, nowMs: Date.now(),
        depositAvailable: Math.max(0, Number(booking.security_deposit || 0) - depositUsed), useDeposit: body.useDeposit,
      });
      // If the rental is already past due, the extension starts today (late hours are covered by the late fee).
      const startMs = Math.max(endMs, Date.now());
      const newEndDate = new Date(startMs + body.extraDays * 86_400_000).toISOString();
      const { data: extension, error: insertError } = await admin.from("rental_extensions").insert({
        booking_id: booking.id, renter_user_id: callerId, previous_end_date: booking.end_date,
        new_end_date: newEndDate, extra_days: body.extraDays, reported_mileage: body.reportedMileage,
        extension_price: amounts.extensionPrice, transaction_fee: amounts.transactionFee,
        total_charged: amounts.totalCharged, status: "pending",
        late_fee: amounts.lateFeeOwed, late_fee_waived: amounts.isLate && amounts.waived, deposit_applied: amounts.depositApplied,
      }).select("id").single();
      if (insertError || !extension) throw insertError || new Error("Could not start extension");
      const token = await paypalToken();
      const separator = body.returnUrl.includes("?") ? "&" : "?";
      const response = await fetch(`${paypalBase()}/v2/checkout/orders`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          intent: "CAPTURE",
          purchase_units: [{ custom_id: `rental_extension_${extension.id}`, description: `Rental extension — ${body.extraDays} day${body.extraDays === 1 ? "" : "s"}`, amount: { currency_code: "USD", value: amounts.totalCharged.toFixed(2) } }],
          application_context: { brand_name: "Best Rental Car Service", user_action: "PAY_NOW", shipping_preference: "NO_SHIPPING", return_url: `${body.returnUrl}${separator}extension=${extension.id}`, cancel_url: body.cancelUrl },
        }),
      });
      const order = await response.json();
      if (!response.ok || !order.id) {
        await admin.from("rental_extensions").update({ status: "failed" }).eq("id", extension.id);
        return json({ error: "Could not start PayPal checkout" }, 400);
      }
      await admin.from("rental_extensions").update({ paypal_order_id: order.id }).eq("id", extension.id);
      const approveUrl = (order.links || []).find((link: any) => link.rel === "approve")?.href;
      return json({ data: { extensionId: extension.id, approveUrl } });
    }

    const { data: extension } = await admin.from("rental_extensions")
      .select("*, rental_bookings!inner(id, renter_user_id, vehicle_id, end_date, total_price, vehicles(year, make, model, vin, mileage, registration_state, license_plate, plate_expiration, body_style, color))")
      .eq("id", body.extensionId).maybeSingle();
    if (!extension || extension.renter_user_id !== callerId) return json({ error: "Extension not found" }, 404);
    if (extension.paypal_order_id !== body.paypalOrderId) return json({ error: "Payment reference mismatch" }, 400);
    if (extension.status === "paid") {
      return json({ data: { status: "paid", extensionId: extension.id, statementReady: Boolean(extension.statement_path) } });
    }
    const token = await paypalToken();
    const response = await fetch(`${paypalBase()}/v2/checkout/orders/${body.paypalOrderId}/capture`, { method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } });
    const captured = await response.json();
    const capture = captured?.purchase_units?.[0]?.payments?.captures?.[0];
    if (!response.ok || (captured.status !== "COMPLETED" && capture?.status !== "COMPLETED")) {
      return json({ error: "PayPal payment was not completed" }, 400);
    }
    const paidAt = new Date().toISOString();
    const { data: member } = await admin.from("users").select("first_name, last_name, username").eq("id", callerId).maybeSingle();
    const booking = extension.rental_bookings;
    const vehicle = Array.isArray(booking?.vehicles) ? booking.vehicles[0] : booking?.vehicles;
    const memberName = [member?.first_name, member?.last_name].filter(Boolean).join(" ") || safeText(member?.username);
    const pdf = await buildStatementPdf({
      extensionId: extension.id, memberName,
      previousEndDate: new Date(Math.max(new Date(extension.previous_end_date).getTime(), new Date(extension.new_end_date).getTime() - Number(extension.extra_days || 0) * 86_400_000)).toISOString(),
      newEndDate: extension.new_end_date, paidAt, odometer: extension.reported_mileage,
      year: vehicle?.year, make: vehicle?.make, model: vehicle?.model, vin: vehicle?.vin,
      registrationState: vehicle?.registration_state, licensePlate: vehicle?.license_plate,
      plateExpiration: vehicle?.plate_expiration, bodyStyle: vehicle?.body_style, color: vehicle?.color,
    });
    const paidDate = paidAt.slice(0, 10);
    const filename = `permissive-member-${booking.id}-${paidDate}.pdf`;
    const path = `${callerId}/${booking.id}/${extension.id}/${filename}`;
    const { error: uploadError } = await admin.storage.from("rental-documents").upload(path, pdf, { contentType: "application/pdf", upsert: false });
    if (uploadError) throw new Error(`Statement generation failed: ${uploadError.message}`);
    const { data: finalized, error: finalizeError } = await admin.rpc("finalize_rental_extension", {
      p_extension_id: extension.id, p_capture_id: capture?.id || body.paypalOrderId,
      p_paid_at: paidAt, p_statement_path: path,
    });
    if (finalizeError || finalized !== true) throw finalizeError || new Error("Could not finalize extension");
    return json({ data: { status: "paid", extensionId: extension.id, filename, statementReady: true } });
  } catch (error) {
    console.error("rental-extension", error);
    return json({ error: error instanceof Error ? error.message : "Rental extension failed" }, 500);
  }
});
