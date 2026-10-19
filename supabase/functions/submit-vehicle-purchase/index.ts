import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCallerId, AUTH_HEADERS } from "../_shared/caller.ts";
import { resolveReferralChain } from "../_shared/saleCommission.ts";
import { encryptSsn, ssnDigits, ssnValid } from "../_shared/ssnCrypto.ts";

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
  if (!text(p.driversLicenseNumber, 80) || !/^[A-Z]{2}$/i.test(text(p.driversLicenseState, 2)) || !dateOk(text(p.driversLicenseIssueDate, 10)) || !dateOk(text(p.driversLicenseExpiryDate, 10))) return `${label} driver's license number, state, issue date, and expiry date are required.`;
  if (!ssnValid(ssnDigits(p.ssn))) return `${label} Social Security number is invalid.`;
  return null;
}

async function cleanPerson(value: Record<string, unknown>) {
  const ssn = ssnDigits(value.ssn);
  return {
    firstName: text(value.firstName, 80), lastName: text(value.lastName, 80),
    email: text(value.email, 255).toLowerCase(), cellPhone: text(value.cellPhone, 30),
    homePhone: text(value.homePhone, 30) || null, dateOfBirth: text(value.dateOfBirth, 10),
    driversLicenseNumber: text(value.driversLicenseNumber, 80) || null,
    driversLicenseState: text(value.driversLicenseState, 2).toUpperCase() || null,
    driversLicenseIssueDate: text(value.driversLicenseIssueDate, 10) || null,
    driversLicenseExpiryDate: text(value.driversLicenseExpiryDate, 10) || null,
    ssnLast4: ssn.slice(-4), ssnEncrypted: await encryptSsn(ssn),
  };
}

function cleanResidence(value: Record<string, unknown>) {
  return {
    streetAddress: text(value.streetAddress, 200), city: text(value.city, 100), state: text(value.state, 2).toUpperCase(),
    zipCode: text(value.zipCode, 10), housingType: text(value.housingType, 30), monthlyPayment: money(value.monthlyPayment),
    yearsAtAddress: Number(value.yearsAtAddress) || 0, monthsAtAddress: Number(value.monthsAtAddress) || 0,
    previousAddress: text(value.previousAddress, 300) || null,
    previousResidence: (Number(value.yearsAtAddress) || 0) + (Number(value.monthsAtAddress) || 0) / 12 < 2 && text(value.prev_streetAddress) ? {
      streetAddress: text(value.prev_streetAddress, 200), city: text(value.prev_city, 100), state: text(value.prev_state, 2).toUpperCase(), zipCode: text(value.prev_zipCode, 10),
      housingType: text(value.prev_housingType, 30), monthlyPayment: money(value.prev_monthlyPayment), yearsAtAddress: Number(value.prev_yearsAtAddress) || 0, monthsAtAddress: Number(value.prev_monthsAtAddress) || 0,
    } : null,
  };
}
const cleanTrade = (t: any) => ({ vin: text(t.vin, 17).toUpperCase(), mileage: money(t.mileage), year: Number(t.year), make: text(t.make, 80), model: text(t.model, 100) });

function cleanJob(value: Record<string, unknown>) {
  const self = value.selfEmployed === "yes";
  const job: Record<string, unknown> = {
    selfEmployed: self ? "Yes" : "No", employmentType: text(value.employmentType, 60) || null,
    employerName: text(value.employerName, 150), title: text(value.title, 100), employerPhone: text(value.employerPhone, 30),
    employerAddress: text(value.employerAddress, 250) || null,
    monthlyGrossIncome: money(value.monthlyGrossIncome), yearsAtJob: Number(value.yearsAtJob) || 0, monthsAtJob: Number(value.monthsAtJob) || 0,
  };
  if (self) Object.assign(job, {
    dba: text(value.dba, 150) || null, businessType: text(value.businessType, 40) || null,
    einLast4: /^\d{2}-\d{7}$/.test(text(value.ein, 10)) ? text(value.ein, 10).slice(-4) : null,
    industry: text(value.industry, 150) || null, ownershipPercent: Math.min(100, Math.max(0, Number(value.ownershipPercent) || 0)),
    businessStartDate: text(value.businessStartDate, 20) || null, businessLicense: text(value.businessLicense, 80) || null,
    netMonthlyIncome: money(value.netMonthlyIncome), annualRevenue: money(value.annualRevenue),
  });
  return job;
}

function cleanEmployment(value: Record<string, unknown>) {
  const main = cleanJob(value);
  const prev = value.previousJob && typeof value.previousJob === "object" ? cleanJob(value.previousJob as Record<string, unknown>) : null;
  const extra = Array.isArray(value.additionalJobs) ? value.additionalJobs.slice(0, 3).filter((j) => j && typeof j === "object").map((j) => cleanJob(j as Record<string, unknown>)) : [];
  const out: Record<string, unknown> = { ...main, previousEmployment: text(value.previousEmployment, 400) || null };
  if (prev && (Number(value.yearsAtJob) || 0) + (Number(value.monthsAtJob) || 0) / 12 < 2) out.previousJob = prev;
  extra.forEach((j, i) => { out[`additionalJob${i + 1}`] = j; });
  return out;
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

const USERNAME_RE = /^[A-Za-z0-9_]{3,30}$/;
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

// ---- Applicant self-service (My Purchases) ----
const DOC_TYPES: Record<string, string> = {
  drivers_license: "Driver's License", insurance_card: "Insurance Card", paystub: "Pay Stub",
  proof_of_residence: "Proof of Residence", proof_of_income: "Proof of Income", other: "Other Document",
};
const DOC_MIME: Record<string, string> = { "application/pdf": "pdf", "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/heic": "heic", "image/heif": "heif" };
async function sha256(value: string) {
  const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(d)).map((b) => b.toString(16).padStart(2, "0")).join("");
}
const statusLabel = (s: string) => s === "approved" ? "Approved" : s === "declined" ? "Denied" : s === "closed" ? "Closed" : "Pending";
async function ownedApps(admin: any, req: Request, keys: Array<{ id: string; key: string }>) {
  const callerId = await getCallerId(req);
  const found = new Map<string, any>();
  const cols = "id, submitted_at, status, sale_status, sold_at, applicant, interested_vehicle, trade_in, co_buyer, documents, requested_items, user_id, access_key_hash, vehicles(year,make,model)";
  if (callerId) {
    const { data: me } = await admin.from("users").select("email").eq("id", callerId).maybeSingle();
    const { data: byId } = await admin.from("vehicle_purchase_applications").select(cols).eq("user_id", callerId);
    (byId || []).forEach((r: any) => found.set(r.id, r));
    const email = String(me?.email || "").trim().toLowerCase();
    if (email) { const { data: byEmail } = await admin.from("vehicle_purchase_applications").select(cols).eq("applicant->>email", email); (byEmail || []).forEach((r: any) => found.set(r.id, r)); }
  }
  for (const k of (Array.isArray(keys) ? keys : []).slice(0, 20)) {
    if (!/^[0-9a-f-]{36}$/i.test(String(k?.id)) || typeof k?.key !== "string" || found.has(k.id)) continue;
    const { data } = await admin.from("vehicle_purchase_applications").select(cols).eq("id", k.id).maybeSingle();
    if (data?.access_key_hash && data.access_key_hash === await sha256(k.key)) found.set(data.id, data);
  }
  return [...found.values()];
}
async function ownerAction(admin: any, req: Request, body: Record<string, any>) {
  const apps = await ownedApps(admin, req, body.accessKeys);
  if (body.action === "listMine") {
    return json({ data: apps.sort((a, b) => String(b.submitted_at).localeCompare(String(a.submitted_at))).map((a) => {
      const p = a.applicant || {};
      return {
        id: a.id, submitted_at: a.submitted_at, status: statusLabel(a.status), sold: a.sale_status === "sold", sold_at: a.sold_at,
        requested_items: a.requested_items || null, documents: (a.documents || []).map((d: any) => ({ id: d.id, type: d.type, label: d.label, name: d.name, uploaded_at: d.uploaded_at })),
        applicant: { firstName: p.firstName, lastName: p.lastName, email: p.email, cellPhone: p.cellPhone, ssnLast4: p.ssnLast4 },
        vehicle: a.vehicles ? { year: a.vehicles.year, make: a.vehicles.make, model: a.vehicles.model } : { year: a.interested_vehicle?.year, make: a.interested_vehicle?.make, model: a.interested_vehicle?.model },
        interested_vehicle: { ...(a.interested_vehicle || {}), specs: undefined }, trade_in: a.trade_in, has_co_buyer: !!a.co_buyer,
      };
    }) });
  }
  const app = apps.find((a) => a.id === body.applicationId);
  if (!app) return json({ error: "Application not found." }, 404);
  if (body.action === "signDoc") {
    const doc = (app.documents || []).find((d: any) => d.id === body.documentId);
    if (!doc) return json({ error: "Document not found." }, 404);
    const { data, error } = await admin.storage.from("credit-app-docs").createSignedUrl(doc.path, 300);
    if (error) throw error;
    return json({ url: data.signedUrl });
  }
  // uploadDoc
  const type = String(body.docType || "");
  if (!DOC_TYPES[type]) return json({ error: "Choose a document type." }, 400);
  const ext = DOC_MIME[String(body.contentType || "")];
  if (!ext || typeof body.base64 !== "string") return json({ error: "Upload a PDF, JPG, PNG, WEBP or HEIC file." }, 400);
  if (body.base64.length > 14 * 1024 * 1024) return json({ error: "File is too large (max 10 MB)." }, 400);
  if ((app.documents || []).length >= 40) return json({ error: "Document limit reached for this application." }, 400);
  const id = crypto.randomUUID();
  const path = `${app.id}/${type}/${id}.${ext}`;
  const bytes = Uint8Array.from(atob(body.base64), (c) => c.charCodeAt(0));
  const { error: upErr } = await admin.storage.from("credit-app-docs").upload(path, bytes, { contentType: body.contentType });
  if (upErr) throw upErr;
  const entry = { id, type, label: DOC_TYPES[type], name: text(body.fileName, 120) || `${type}.${ext}`, path, contentType: body.contentType, size: bytes.length, uploaded_at: new Date().toISOString() };
  const { data: fresh } = await admin.from("vehicle_purchase_applications").select("documents").eq("id", app.id).single();
  const { error } = await admin.from("vehicle_purchase_applications").update({ documents: [...(fresh?.documents || []), entry] }).eq("id", app.id);
  if (error) throw error;
  return json({ data: { id, type, label: entry.label, name: entry.name, uploaded_at: entry.uploaded_at } });
}
async function usernameAvailable(admin: any, name: string) {
  const { data: u } = await admin.from("users").select("id").ilike("username", name.replace(/_/g, "\\_")).limit(1);
  if (u?.length) return false;
  const { data: apps } = await admin.from("vehicle_purchase_applications").select("id")
    .ilike("applicant->>requestedUsername", name.replace(/_/g, "\\_")).in("status", ["new", "reviewing", "contacted"]).limit(1);
  return !apps?.length;
}
async function checkIdentity(admin: any, body: Record<string, any>) {
  const out: Record<string, unknown> = {};
  const name = text(body.username, 30);
  if (name) out.usernameAvailable = USERNAME_RE.test(name) ? await usernameAvailable(admin, name) : false;
  const email = text(body.email, 255).toLowerCase();
  if (emailOk(email)) {
    const { data } = await admin.from("users").select("username, profile_photo, front_page_photo").ilike("email", email).limit(1);
    const u = data?.[0];
    out.emailMatch = u ? { username: u.username, avatar: u.front_page_photo || u.profile_photo || null } : null;
  }
  const digits = text(body.phone, 30).replace(/\D/g, "").slice(-10);
  if (digits.length === 10) {
    const { data } = await admin.from("users").select("id, phone_number").ilike("phone_number", `%${digits.slice(-4)}%`).limit(200);
    out.phoneMatch = !!data?.some((u: any) => String(u.phone_number || "").replace(/\D/g, "").slice(-10) === digits);
  }
  return out;
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
    const admin0 = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
    if (body.action === "check") return json(await checkIdentity(admin0, body));
    if (body.action === "listMine" || body.action === "uploadDoc" || body.action === "signDoc") return await ownerAction(admin0, req, body);
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
      for (const t of [trade, trade.secondVehicle].filter(Boolean)) if (!vinOk(text(t.vin, 17)) || money(t.mileage) === null || !text(t.year) || !text(t.make) || !text(t.model)) return json({ error: "Trade-in requires a valid VIN, mileage, year, make, and model." }, 400);
    }
    const callerId0 = await getCallerId(req);
    let requestedUsername: string | null = null;
    if (!callerId0) {
      requestedUsername = text(body.requestedUsername, 30);
      if (!USERNAME_RE.test(requestedUsername)) return json({ error: "Choose a username (3–30 letters, numbers, or underscores)." }, 400);
      if (!(await usernameAvailable(admin0, requestedUsername))) return json({ error: "That username is not available." }, 400);
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

    const accessKey = crypto.randomUUID() + crypto.randomUUID();
    const { data, error } = await admin.from("vehicle_purchase_applications").insert({
      vehicle_id: vehicleId, user_id: callerId,
      applicant: { ...(await cleanPerson(body.applicant)), requestedUsername, ...Object.fromEntries((Array.isArray(body.references) ? body.references : []).slice(0, 5).filter((r: any) => r && text(r.name)).map((r: any, i: number) => [`reference${i + 1}`, { name: text(r.name, 120), phone: text(r.phone, 30), address: text(r.address, 250) }])) }, residence: cleanResidence(residence), employment: cleanEmployment(employment),
      co_buyer: body.hasCoBuyer ? { relationship: text(body.coBuyer.relationship, 60), ...(await cleanPerson(body.coBuyer)), residence: cleanResidence(body.coBuyer.residence || {}), employment: cleanEmployment(body.coBuyer.employment || {}) } : null,
      interested_vehicle: { vin: iVin.toUpperCase() || null, year: Number(interested.year), make: text(interested.make, 80), model: text(interested.model, 100), vin_provided: !!iVin, trim: text(interested.trim, 120) || null,
        specs: (() => { try { const a = JSON.parse(text(interested.specs, 3000) || "[]"); return Array.isArray(a) ? Object.fromEntries(a.slice(0, 15).filter((x: unknown) => Array.isArray(x)).map(([k, v]: any) => [String(k).slice(0, 40), String(v).slice(0, 120)])) : null; } catch { return null; } })(), vehiclePrice: money(interested.vehiclePrice), downPayment: money(interested.downPayment), exteriorColor: text(interested.exteriorColor, 60) || null, interiorColor: text(interested.interiorColor, 60) || null },
      trade_in: body.hasTradeIn ? { ...cleanTrade(body.tradeIn), secondVehicle: body.tradeIn.secondVehicle ? cleanTrade(body.tradeIn.secondVehicle) : null } : null,
      marketing_sms_consent: body.marketingSmsConsent === true, service_sms_consent: body.serviceSmsConsent === true,
      credit_authorization_consent: true, privacy_policy_consent: true,
      referrer_username: chain.referrerUsername,
      referrer_user_id: chain.referrerId, upline_user_id: chain.uplineId,
      buyer_avatar_path: avatarPath,
      access_key_hash: await sha256(accessKey),
    }).select("id").single();
    if (error) throw error;
    return json({ data: { id: data.id, accessKey }, message: "Application received." });
  } catch (error) {
    console.error("submit-vehicle-purchase", error);
    return new Response(JSON.stringify({ error: "We could not submit your application. Please try again." }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});