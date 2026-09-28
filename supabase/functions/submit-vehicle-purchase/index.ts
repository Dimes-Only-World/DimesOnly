import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCallerId, AUTH_HEADERS } from "../_shared/caller.ts";
import { resolveReferralChain } from "../_shared/saleCommission.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": AUTH_HEADERS,
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const text = (value: unknown, max = 200) => typeof value === "string" ? value.trim().slice(0, max) : "";
const emailOk = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
const phoneOk = (value: string) => value.replace(/\D/g, "").length >= 10;
const dateOk = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value);
const vinOk = (value: string) => /^[A-HJ-NPR-Z0-9]{17}$/i.test(value);
const money = (value: unknown) => {
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 && n <= 100_000_000 ? n : null;
};

function validatePerson(value: unknown, label: string) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return `${label} information is required.`;
  const p = value as Record<string, unknown>;
  if (!text(p.firstName, 80) || !text(p.lastName, 80)) return `${label} first and last name are required.`;
  if (!emailOk(text(p.email, 255))) return `${label} email is invalid.`;
  if (!phoneOk(text(p.cellPhone, 30))) return `${label} cell phone is invalid.`;
  if (!dateOk(text(p.dateOfBirth, 10))) return `${label} date of birth is required.`;
  return null;
}

function cleanPerson(value: Record<string, unknown>) {
  return {
    firstName: text(value.firstName, 80), lastName: text(value.lastName, 80),
    email: text(value.email, 255).toLowerCase(), cellPhone: text(value.cellPhone, 30),
    homePhone: text(value.homePhone, 30) || null, dateOfBirth: text(value.dateOfBirth, 10),
    driversLicenseNumber: text(value.driversLicenseNumber, 80) || null,
    driversLicenseState: text(value.driversLicenseState, 2).toUpperCase() || null,
    driversLicenseIssueDate: text(value.driversLicenseIssueDate, 10) || null,
    driversLicenseExpiryDate: text(value.driversLicenseExpiryDate, 10) || null,
  };
}

function cleanResidence(value: Record<string, unknown>) {
  return {
    streetAddress: text(value.streetAddress, 200), city: text(value.city, 100), state: text(value.state, 2).toUpperCase(),
    zipCode: text(value.zipCode, 10), housingType: text(value.housingType, 30), monthlyPayment: money(value.monthlyPayment),
    previousAddress: text(value.previousAddress, 300) || null,
  };
}

function cleanEmployment(value: Record<string, unknown>) {
  return {
    employerName: text(value.employerName, 150), title: text(value.title, 100), employerPhone: text(value.employerPhone, 30),
    monthlyGrossIncome: money(value.monthlyGrossIncome), yearsAtJob: Number(value.yearsAtJob) || 0,
    monthsAtJob: Number(value.monthsAtJob) || 0, previousEmployment: text(value.previousEmployment, 400) || null,
  };
}

function validateResidence(value: unknown, label: string) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return `${label} residential information is required.`;
  const r = value as Record<string, unknown>;
  if (![r.streetAddress, r.city, r.state, r.zipCode, r.housingType].every((v) => text(v))) return `Complete all required ${label.toLowerCase()} residential fields.`;
  if (!/^[A-Z]{2}$/i.test(text(r.state, 2)) || !/^\d{5}(?:-\d{4})?$/.test(text(r.zipCode, 10)) || money(r.monthlyPayment) === null) return `${label} residential information is invalid.`;
  return null;
}

function validateEmployment(value: unknown, label: string) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return `${label} employment information is required.`;
  const e = value as Record<string, unknown>;
  if (![e.employerName, e.title, e.employerPhone].every((v) => text(v)) || !phoneOk(text(e.employerPhone))) return `Complete all required ${label.toLowerCase()} employment fields.`;
  const income = money(e.monthlyGrossIncome); const years = Number(e.yearsAtJob); const months = Number(e.monthsAtJob);
  if (income === null || !Number.isInteger(years) || years < 0 || years > 80 || !Number.isInteger(months) || months < 0 || months > 11) return `${label} employment information is invalid.`;
  return null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  try {
    const url = Deno.env.get("SUPABASE_URL");
    const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!url || !key) return json({ error: "Server configuration missing." }, 500);
    const body = await req.json().catch(() => null) as Record<string, any> | null;
    if (!body) return json({ error: "Invalid request." }, 400);
    const applicantError = validatePerson(body.applicant, "Applicant");
    if (applicantError) return json({ error: applicantError }, 400);
    if (body.hasCoBuyer) {
      const coBuyerError = validatePerson(body.coBuyer, "Co-buyer");
      if (coBuyerError) return json({ error: coBuyerError }, 400);
      if (!text(body.coBuyer?.relationship, 60)) return json({ error: "Co-buyer relationship is required." }, 400);
      const coResidenceError = validateResidence(body.coBuyer?.residence, "Co-buyer");
      if (coResidenceError) return json({ error: coResidenceError }, 400);
      const coEmploymentError = validateEmployment(body.coBuyer?.employment, "Co-buyer");
      if (coEmploymentError) return json({ error: coEmploymentError }, 400);
    }
    const residence = body.residence || {};
    const residenceError = validateResidence(residence, "Applicant");
    if (residenceError) return json({ error: residenceError }, 400);
    const employment = body.employment || {};
    const employmentError = validateEmployment(employment, "Applicant");
    if (employmentError) return json({ error: employmentError }, 400);
    const interested = body.interestedVehicle || {};
    const iVin = text(interested.vin, 17);
    if ((iVin && !vinOk(iVin)) || !text(interested.year) || !text(interested.make) || !text(interested.model)) return json({ error: "Interested vehicle requires a year, make, and model (and a valid 17-character VIN if provided)." }, 400);
    if (body.hasTradeIn) {
      const trade = body.tradeIn || {};
      if (!vinOk(text(trade.vin, 17)) || money(trade.mileage) === null || !text(trade.year) || !text(trade.make) || !text(trade.model)) return json({ error: "Trade-in requires a valid VIN, mileage, year, make, and model." }, 400);
    }
    if (body.creditAuthorizationConsent !== true || body.privacyPolicyConsent !== true) return json({ error: "Credit authorization and Privacy Policy acceptance are required." }, 400);

    const admin = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
    const vehicleId = text(body.vehicleId, 36) || null;
    if (vehicleId) {
      const { data: vehicle } = await admin.from("vehicles").select("id,rental_options,is_active").eq("id", vehicleId).maybeSingle();
      if (!vehicle?.is_active || !vehicle.rental_options?.includes("purchase")) return json({ error: "This vehicle is not currently available for purchase applications." }, 400);
    }
    const callerId = await getCallerId(req);

    // Referrer: a signed-in buyer's stored referrer wins over the link ref.
    let refName = text(body.referrerUsername, 100) || null;
    if (callerId) {
      const { data: me } = await admin.from("users").select("referred_by").eq("id", callerId).maybeSingle();
      if (me?.referred_by) refName = String(me.referred_by);
    }
    const chain = await resolveReferralChain(admin, refName);

    // Optional buyer photo
    let avatarPath: string | null = null;
    const av = body.buyerAvatar;
    if (av && typeof av.base64 === "string" && ["image/jpeg", "image/png", "image/webp"].includes(av.contentType)) {
      if (av.base64.length > 7 * 1024 * 1024) return json({ error: "Photo is too large (max 5 MB)." }, 400);
      const ext = av.contentType === "image/png" ? "png" : av.contentType === "image/webp" ? "webp" : "jpg";
      const path = `${crypto.randomUUID()}.${ext}`;
      const bytes = Uint8Array.from(atob(av.base64), (c) => c.charCodeAt(0));
      const { error: upErr } = await admin.storage.from("credit-app-avatars").upload(path, bytes, { contentType: av.contentType });
      if (!upErr) avatarPath = path;
    }

    const { data, error } = await admin.from("vehicle_purchase_applications").insert({
      vehicle_id: vehicleId, user_id: callerId,
      applicant: cleanPerson(body.applicant), residence: cleanResidence(residence), employment: cleanEmployment(employment),
      co_buyer: body.hasCoBuyer ? { relationship: text(body.coBuyer.relationship, 60), ...cleanPerson(body.coBuyer), residence: cleanResidence(body.coBuyer.residence || {}), employment: cleanEmployment(body.coBuyer.employment || {}) } : null,
      interested_vehicle: { vin: iVin.toUpperCase() || null, year: Number(interested.year), make: text(interested.make, 80), model: text(interested.model, 100), vin_provided: !!iVin, trim: text(interested.trim, 120) || null,
        specs: (() => { try { const a = JSON.parse(text(interested.specs, 3000) || "[]"); return Array.isArray(a) ? Object.fromEntries(a.slice(0, 15).filter((x: unknown) => Array.isArray(x)).map(([k, v]: any) => [String(k).slice(0, 40), String(v).slice(0, 120)])) : null; } catch { return null; } })(), vehiclePrice: money(interested.vehiclePrice), downPayment: money(interested.downPayment), exteriorColor: text(interested.exteriorColor, 60) || null, interiorColor: text(interested.interiorColor, 60) || null },
      trade_in: body.hasTradeIn ? { vin: text(body.tradeIn.vin, 17).toUpperCase(), mileage: money(body.tradeIn.mileage), year: Number(body.tradeIn.year), make: text(body.tradeIn.make, 80), model: text(body.tradeIn.model, 100) } : null,
      marketing_sms_consent: body.marketingSmsConsent === true, service_sms_consent: body.serviceSmsConsent === true,
      credit_authorization_consent: true, privacy_policy_consent: true,
      referrer_username: chain.referrerUsername,
      referrer_user_id: chain.referrerId, upline_user_id: chain.uplineId,
      buyer_avatar_path: avatarPath,
    }).select("id").single();
    if (error) throw error;
    return json({ data: { id: data.id }, message: "Application received." });
  } catch (error) {
    console.error("submit-vehicle-purchase", error);
    return new Response(JSON.stringify({ error: "We could not submit your application. Please try again." }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});