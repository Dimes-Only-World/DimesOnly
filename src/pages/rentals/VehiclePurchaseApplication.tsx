import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { z } from "zod";
import { ArrowLeft, BadgeDollarSign, Camera, CheckCircle2, Loader2 } from "lucide-react";
import ReferrerBadge from "@/components/rentals/ReferrerBadge";

const compressImage = (file: File) => new Promise<Blob>((resolve) => { const url = URL.createObjectURL(file); const img = new Image(); img.onload = () => { const scale = Math.min(1, 1024 / Math.max(img.width, img.height)); const c = document.createElement("canvas"); c.width = Math.round(img.width * scale); c.height = Math.round(img.height * scale); c.getContext("2d")?.drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(url); c.toBlob((b) => resolve(b || file), "image/jpeg", 0.85); }; img.onerror = () => { URL.revokeObjectURL(url); resolve(file); }; img.src = url; });
const fileToBase64 = (file: File) => new Promise<string>((resolve, reject) => { const r = new FileReader(); r.onload = () => resolve(String(r.result).split(",")[1] || ""); r.onerror = reject; r.readAsDataURL(file); });
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { getActiveRef } from "@/lib/refCapture";
import { decodeVin, fetchVehicleModels, vehicleStockPhoto, VEHICLE_MAKES, VEHICLE_YEARS } from "@/lib/vehicleOptions";

type Values = Record<string, string>;
const blankPerson: Values = { firstName: "", lastName: "", email: "", cellPhone: "", homePhone: "", dateOfBirth: "", driversLicenseNumber: "", driversLicenseState: "", driversLicenseIssueDate: "", driversLicenseExpiryDate: "" };
const blankResidence: Values = { streetAddress: "", city: "", state: "", zipCode: "", housingType: "", monthlyPayment: "", previousAddress: "" };
const blankEmployment: Values = { employerName: "", title: "", employerPhone: "", monthlyGrossIncome: "", yearsAtJob: "", monthsAtJob: "", previousEmployment: "" };
const blankVehicle: Values = { hasVin: "", vin: "", year: "", make: "", model: "", trim: "", specs: "", vehiclePrice: "", downPayment: "", exteriorColor: "", interiorColor: "" };
const states = ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY","DC"];

const schema = z.object({
  applicant: z.object({ firstName: z.string().trim().min(1).max(80), lastName: z.string().trim().min(1).max(80), email: z.string().trim().email().max(255), cellPhone: z.string().regex(/\d.*\d.*\d.*\d.*\d.*\d.*\d.*\d.*\d.*\d/), dateOfBirth: z.string().min(1) }).passthrough(),
  residence: z.object({ streetAddress: z.string().trim().min(1).max(200), city: z.string().trim().min(1).max(100), state: z.string().length(2), zipCode: z.string().regex(/^\d{5}(?:-\d{4})?$/), housingType: z.string().min(1), monthlyPayment: z.coerce.number().min(0) }).passthrough(),
  employment: z.object({ employerName: z.string().trim().min(1).max(150), title: z.string().trim().min(1).max(100), employerPhone: z.string().regex(/\d.*\d.*\d.*\d.*\d.*\d.*\d.*\d.*\d.*\d/), monthlyGrossIncome: z.coerce.number().min(0), yearsAtJob: z.coerce.number().min(0).max(80), monthsAtJob: z.coerce.number().min(0).max(11) }).passthrough(),
  interestedVehicle: z.object({ vin: z.string().trim().regex(/^([A-HJ-NPR-Z0-9]{17})?$/i), year: z.string().min(1), make: z.string().min(1), model: z.string().min(1) }).passthrough(),
});

const Field = ({ label, value, onChange, required, type = "text", maxLength = 200, placeholder }: { label: string; value: string; onChange: (value: string) => void; required?: boolean; type?: string; maxLength?: number; placeholder?: string }) => <div className="space-y-1.5"><Label>{label}{required && " *"}</Label><Input value={value} onChange={(event) => onChange(type === "number" ? event.target.value.replace(/[^0-9.]/g, "") : event.target.value)} required={required} type={type === "number" ? "text" : type} inputMode={type === "number" ? "decimal" : type === "tel" ? "tel" : undefined} autoComplete={AUTO[label]} autoCapitalize={type === "email" ? "none" : undefined} maxLength={maxLength} placeholder={placeholder} className="rounded-none border-rental-line bg-rental-surface text-base text-rental-foreground" /></div>;
const NativeSelect = ({ value, onChange, options, placeholder, disabled, autoComplete }: { value: string; onChange: (value: string) => void; options: string[]; placeholder: string; disabled?: boolean; autoComplete?: string }) => <select value={value} onChange={(e) => { if (e.target.value) onChange(e.target.value); }} disabled={disabled} autoComplete={autoComplete} className="flex h-10 w-full appearance-auto rounded-none border border-rental-line bg-rental-surface px-3 text-base text-rental-foreground disabled:opacity-50"><option value="" disabled>{placeholder}</option>{options.map((o) => <option key={o} value={o}>{o}</option>)}</select>;
const AUTO: Record<string, string> = { "First Name": "given-name", "Last Name": "family-name", Email: "email", "Cell Phone": "tel", "Home Phone": "tel", "Date of Birth": "bday", "Street Address": "street-address", City: "address-level2", "Zip Code": "postal-code", "Employer Name": "organization", "Title/Position": "organization-title" };
const StateField = ({ label, value, onChange, required }: { label: string; value: string; onChange: (value: string) => void; required?: boolean }) => <div className="space-y-1.5"><Label>{label}{required && " *"}</Label><NativeSelect value={value} onChange={onChange} options={states} placeholder="State" /></div>;

const PersonFields = ({ values, setValues, prefix }: { values: Values; setValues: React.Dispatch<React.SetStateAction<Values>>; prefix: string }) => {
  const set = (name: string) => (value: string) => setValues((current) => ({ ...current, [name]: value }));
  return <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
    <Field label="First Name" value={values.firstName} onChange={set("firstName")} required /><Field label="Last Name" value={values.lastName} onChange={set("lastName")} required />
    <Field label="Email" value={values.email} onChange={set("email")} required type="email" /><Field label="Cell Phone" value={values.cellPhone} onChange={set("cellPhone")} required type="tel" />
    <Field label="Home Phone" value={values.homePhone} onChange={set("homePhone")} type="tel" /><Field label="Date of Birth" value={values.dateOfBirth} onChange={set("dateOfBirth")} required type="date" />
    <Field label="Driver's License Number" value={values.driversLicenseNumber} onChange={set("driversLicenseNumber")} maxLength={80} /><StateField label="Driver's License State" value={values.driversLicenseState} onChange={set("driversLicenseState")} />
    <Field label="License Issue Date" value={values.driversLicenseIssueDate} onChange={set("driversLicenseIssueDate")} type="date" /><Field label="License Expiry Date" value={values.driversLicenseExpiryDate} onChange={set("driversLicenseExpiryDate")} type="date" />
    {prefix === "buyer" && <div className="sm:col-span-2 lg:col-span-3 border-l-2 border-rental-primary pl-3 text-sm text-rental-muted">For your security, Social Security numbers are not collected here. A lender may request yours later through its secure process.</div>}
  </div>;
};

const ResidenceFields = ({ values, setValues }: { values: Values; setValues: React.Dispatch<React.SetStateAction<Values>> }) => {
  const set = (name: string) => (value: string) => setValues((current) => ({ ...current, [name]: value }));
  return <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"><Field label="Street Address" value={values.streetAddress} onChange={set("streetAddress")} required /><Field label="City" value={values.city} onChange={set("city")} required /><StateField label="State" value={values.state} onChange={set("state")} required /><Field label="Zip Code" value={values.zipCode} onChange={set("zipCode")} required maxLength={10} /><div className="space-y-1.5"><Label>Housing Type *</Label><NativeSelect value={values.housingType} onChange={set("housingType")} options={["Own", "Rent", "Live with family", "Other"]} placeholder="Select" /></div><Field label="Monthly Rent/Mortgage Amount" value={values.monthlyPayment} onChange={set("monthlyPayment")} required type="number" /><div className="sm:col-span-2 lg:col-span-3 space-y-1.5"><Label>Previous Address</Label><Textarea value={values.previousAddress} onChange={(event) => set("previousAddress")(event.target.value)} maxLength={300} className="rounded-none border-rental-line bg-rental-surface" /></div></div>;
};

const EmploymentFields = ({ values, setValues }: { values: Values; setValues: React.Dispatch<React.SetStateAction<Values>> }) => {
  const set = (name: string) => (value: string) => setValues((current) => ({ ...current, [name]: value }));
  return <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"><Field label="Employer Name" value={values.employerName} onChange={set("employerName")} required /><Field label="Title/Position" value={values.title} onChange={set("title")} required /><Field label="Employer Phone Number" value={values.employerPhone} onChange={set("employerPhone")} required type="tel" /><Field label="Monthly Gross Income" value={values.monthlyGrossIncome} onChange={set("monthlyGrossIncome")} required type="number" /><Field label="Years at Job" value={values.yearsAtJob} onChange={set("yearsAtJob")} required type="number" /><Field label="Additional Months" value={values.monthsAtJob} onChange={set("monthsAtJob")} required type="number" /><div className="sm:col-span-2 lg:col-span-3 space-y-1.5"><Label>Previous Employment</Label><Textarea value={values.previousEmployment} onChange={(event) => set("previousEmployment")(event.target.value)} maxLength={400} className="rounded-none border-rental-line bg-rental-surface" /></div></div>;
};

const VehiclePreview = ({ values }: { values: Values }) => {
  const [failed, setFailed] = useState(false);
  const src = vehicleStockPhoto(values.make, values.model, values.year, values.exteriorColor);
  useEffect(() => setFailed(false), [src]);
  if (!values.year || !values.make || !values.model) return null;
  let specs: Array<[string, string]> = []; try { specs = values.specs ? JSON.parse(values.specs) : []; } catch { specs = []; }
  return <div className="sm:col-span-2 lg:col-span-3 grid gap-4 border border-rental-line bg-rental-surface p-4 md:grid-cols-2">
    <div className="flex items-center justify-center bg-white">{src && !failed ? <img src={src} alt={`${values.year} ${values.make} ${values.model}`} onError={() => setFailed(true)} className="h-auto w-full max-w-md object-contain" /> : <p className="p-8 text-sm text-neutral-500">Photo not available</p>}</div>
    <div><p className="rentals-wordmark text-2xl text-rental-foreground">{values.year} {values.make} {values.model}{values.trim ? ` ${values.trim}` : ""}</p>
      <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
        {specs.map(([k, v]) => <div key={k}><dt className="text-xs text-rental-muted">{k}</dt><dd className="text-rental-foreground">{v}</dd></div>)}
        {values.vehiclePrice && <div><dt className="text-xs text-rental-muted">Price</dt><dd>${Number(values.vehiclePrice).toLocaleString()}</dd></div>}
        {values.downPayment && <div><dt className="text-xs text-rental-muted">Down</dt><dd>${Number(values.downPayment).toLocaleString()}</dd></div>}
        {values.exteriorColor && <div><dt className="text-xs text-rental-muted">Exterior</dt><dd>{values.exteriorColor}</dd></div>}
        {values.interiorColor && <div><dt className="text-xs text-rental-muted">Interior</dt><dd>{values.interiorColor}</dd></div>}
      </dl>
      <p className="mt-3 text-xs text-rental-muted">Stock photo for illustration; actual vehicle may differ.</p></div>
  </div>;
};

const VehicleFields = ({ values, setValues, tradeIn = false }: { values: Values; setValues: React.Dispatch<React.SetStateAction<Values>>; tradeIn?: boolean }) => {
  const [models, setModels] = useState<string[]>([]); const [loading, setLoading] = useState(false); const [decoding, setDecoding] = useState(false); const [vinMsg, setVinMsg] = useState("");
  const set = (name: string) => (value: string) => setValues((current) => ({ ...current, [name]: value }));
  useEffect(() => { let live = true; if (!values.make || !values.year) { setModels([]); return; } setLoading(true); fetchVehicleModels(values.make, values.year).then((items) => { if (live) setModels(items); }).finally(() => { if (live) setLoading(false); }); return () => { live = false; }; }, [values.make, values.year]);
  useEffect(() => {
    if (tradeIn || values.hasVin !== "yes" || !/^[A-HJ-NPR-Z0-9]{17}$/i.test(values.vin || "")) { setVinMsg(""); return; }
    let live = true; setDecoding(true); setVinMsg("");
    decodeVin(values.vin).then((d) => { if (!live) return; if (!d) { setVinMsg("We couldn't look up this VIN. Please choose the year, make and model below."); return; } setValues((c) => ({ ...c, year: d.year, make: d.make, model: d.model, trim: d.trim, specs: JSON.stringify(d.specs) })); setVinMsg("Vehicle details found."); }).finally(() => { if (live) setDecoding(false); });
    return () => { live = false; };
  }, [values.vin, values.hasVin, tradeIn]);
  const showVin = tradeIn || values.hasVin === "yes";
  const showDetails = tradeIn || values.hasVin === "no" || values.hasVin === "yes";
  return <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
    {!tradeIn && <div className="sm:col-span-2 lg:col-span-3 space-y-2"><Label>Do you already have the VIN number? *</Label><div className="flex gap-2">{[["yes", "Yes"], ["no", "No"]].map(([v, l]) => <Button key={v} type="button" variant={values.hasVin === v ? "default" : "outline"} className="rounded-none" onClick={() => setValues((c) => ({ ...c, hasVin: v, ...(v === "no" ? { vin: "", specs: "", trim: "" } : {}) }))}>{l}</Button>)}</div></div>}
    {showVin && <div className="space-y-1.5"><Field label="VIN Number" value={values.vin} onChange={(value) => set("vin")(value.toUpperCase())} required maxLength={17} placeholder="17 characters" />{decoding ? <p className="flex items-center gap-1 text-xs text-rental-muted"><Loader2 className="h-3 w-3 animate-spin" /> Looking up vehicle…</p> : vinMsg && <p className="text-xs text-rental-muted">{vinMsg}</p>}</div>}
    {tradeIn && <Field label="Mileage" value={values.mileage || ""} onChange={set("mileage")} required type="number" />}
    {showDetails && <>
    <div className="space-y-1.5"><Label>Year *</Label><NativeSelect value={values.year} onChange={(year) => setValues((current) => current.year === year ? current : ({ ...current, year, model: "" }))} options={[...new Set([values.year, ...VEHICLE_YEARS].filter(Boolean))]} placeholder="Year" /></div>
    <div className="space-y-1.5"><Label>Make *</Label><NativeSelect value={values.make} onChange={(make) => setValues((current) => current.make === make ? current : ({ ...current, make, model: "" }))} options={[...new Set([values.make, ...VEHICLE_MAKES].filter(Boolean))]} placeholder="Make" /></div>
    <div className="space-y-1.5"><Label>Model *</Label><NativeSelect value={values.model} onChange={set("model")} disabled={!values.make || !values.year || loading} options={[...new Set([values.model, ...models].filter(Boolean))]} placeholder={loading ? "Loading models…" : "Model"} /></div>
    {!tradeIn && <><Field label="Vehicle Price" value={values.vehiclePrice} onChange={set("vehiclePrice")} type="number" /><Field label="Down Payment" value={values.downPayment} onChange={set("downPayment")} type="number" /><Field label="Exterior Color" value={values.exteriorColor} onChange={set("exteriorColor")} /><Field label="Interior Color" value={values.interiorColor} onChange={set("interiorColor")} /><VehiclePreview values={values} /></>}
    </>}
  </div>;
};

const Section = ({ number, title, children }: { number: string; title: string; children: React.ReactNode }) => <section className="border-t border-rental-line py-8"><div className="mb-5 flex items-center gap-3"><span className="rentals-wordmark text-4xl text-rental-primary">{number}</span><h2 className="rentals-wordmark text-3xl text-rental-foreground sm:text-4xl">{title}</h2></div>{children}</section>;

const VehiclePurchaseApplication: React.FC = () => {
  const { vehicleId } = useParams<{ vehicleId: string }>(); const [vehicle, setVehicle] = useState<any>(null);
  const [applicant, setApplicant] = useState({ ...blankPerson }); const [residence, setResidence] = useState({ ...blankResidence }); const [employment, setEmployment] = useState({ ...blankEmployment });
  const [hasCoBuyer, setHasCoBuyer] = useState(false); const [coBuyer, setCoBuyer] = useState({ ...blankPerson, relationship: "" }); const [coResidence, setCoResidence] = useState({ ...blankResidence }); const [coEmployment, setCoEmployment] = useState({ ...blankEmployment });
  const [interested, setInterested] = useState({ ...blankVehicle }); const [hasTradeIn, setHasTradeIn] = useState(false); const [tradeIn, setTradeIn] = useState({ vin: "", mileage: "", year: "", make: "", model: "" });
  const [marketing, setMarketing] = useState(false); const [serviceMessages, setServiceMessages] = useState(false); const [creditConsent, setCreditConsent] = useState(false); const [privacyConsent, setPrivacyConsent] = useState(false); const [submitting, setSubmitting] = useState(false); const [submittedId, setSubmittedId] = useState("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null); const [avatarPreview, setAvatarPreview] = useState(""); const navigate = useNavigate();
  const [loggedIn, setLoggedIn] = useState<boolean | null>(null); const [username, setUsername] = useState("");
  const [idCheck, setIdCheck] = useState<{ usernameAvailable?: boolean; emailMatch?: { username: string; avatar: string | null } | null; phoneMatch?: boolean }>({});
  useEffect(() => { supabase.auth.getSession().then(({ data }) => setLoggedIn(!!data.session)); }, []);
  useEffect(() => {
    if (loggedIn !== false) return;
    const t = setTimeout(() => { supabase.functions.invoke("submit-vehicle-purchase", { body: { action: "check", username: username.trim(), email: applicant.email.trim(), phone: applicant.cellPhone } }).then(({ data }) => { if (data) setIdCheck(data as any); }); }, 500);
    return () => clearTimeout(t);
  }, [loggedIn, username, applicant.email, applicant.cellPhone]);
  const loginHref = `/login?redirect=${encodeURIComponent(window.location.pathname)}`;
  useEffect(() => { if (!vehicleId) return; (supabase as any).from("vehicles").select("id,year,make,model,vin,down_payment,rental_options,is_active").eq("id", vehicleId).maybeSingle().then(({ data }: any) => { if (!data?.is_active || !data.rental_options?.includes("purchase")) return; setVehicle(data); setInterested((current) => ({ ...current, hasVin: data.vin ? "yes" : "no", vin: data.vin || "", year: String(data.year || ""), make: data.make || "", model: data.model || "", downPayment: String(data.down_payment || "") })); }); }, [vehicleId]);
  const vehicleName = useMemo(() => vehicle ? `${vehicle.year} ${vehicle.make} ${vehicle.model}` : "Vehicle purchase", [vehicle]);
  const submit = async (event: React.FormEvent) => { event.preventDefault(); const payload: any = { vehicleId: vehicle?.id || null, applicant, residence, employment, hasCoBuyer, coBuyer: hasCoBuyer ? { ...coBuyer, residence: coResidence, employment: coEmployment } : null, interestedVehicle: interested, hasTradeIn, tradeIn: hasTradeIn ? tradeIn : null, marketingSmsConsent: marketing, serviceSmsConsent: serviceMessages, creditAuthorizationConsent: creditConsent, privacyPolicyConsent: privacyConsent, referrerUsername: getActiveRef() || null };
    const parsed = schema.safeParse(payload); if (!parsed.success || (hasCoBuyer && !schema.pick({ applicant: true, residence: true, employment: true }).safeParse({ applicant: coBuyer, residence: coResidence, employment: coEmployment }).success)) { const issue = !parsed.success ? parsed.error.issues[0] : null; const labels: Record<string, string> = { firstName: "First Name", lastName: "Last Name", email: "Email", cellPhone: "Cell Phone (10 digits)", dateOfBirth: "Date of Birth", streetAddress: "Street Address", city: "City", state: "State", zipCode: "Zip Code (5 digits)", housingType: "Housing Type", monthlyPayment: "Monthly Rent/Mortgage", employerName: "Employer Name", title: "Title/Position", employerPhone: "Employer Phone (10 digits)", monthlyGrossIncome: "Monthly Gross Income", yearsAtJob: "Years at Job", monthsAtJob: "Additional Months (0-11)", vin: "VIN Number", year: "Vehicle Year", make: "Vehicle Make", model: "Vehicle Model" }; const key = String(issue?.path[issue.path.length - 1] ?? ""); toast({ title: "Check required fields", description: issue ? `Please fix: ${labels[key] || key}${issue.path[0] === "interestedVehicle" ? " (Interested Vehicle)" : ""}` : "Complete every required co-buyer field.", variant: "destructive" }); return; }
    if (hasTradeIn && (!/^[A-HJ-NPR-Z0-9]{17}$/i.test(tradeIn.vin) || !tradeIn.mileage || !tradeIn.year || !tradeIn.make || !tradeIn.model)) { toast({ title: "Complete trade-in details", description: "VIN, mileage, year, make, and model are required.", variant: "destructive" }); return; }
    if (!creditConsent || !privacyConsent) { toast({ title: "Consent required", description: "Accept the credit authorization and Privacy Policy to submit.", variant: "destructive" }); return; }
    if (!loggedIn) { if (!/^[A-Za-z0-9_]{3,30}$/.test(username.trim()) || idCheck.usernameAvailable === false) { toast({ title: "Choose an available username", description: "3–30 letters, numbers, or underscores.", variant: "destructive" }); return; } payload.requestedUsername = username.trim(); }
    if (!loggedIn && avatarFile) { payload.buyerAvatar = { contentType: avatarFile.type, base64: await fileToBase64(avatarFile) }; }
    setSubmitting(true); try { const { data, error } = await supabase.functions.invoke("submit-vehicle-purchase", { body: payload }); if (error) throw error; if ((data as any)?.error) throw new Error((data as any).error); setSubmittedId((data as any)?.data?.id || "received"); window.scrollTo({ top: 0, behavior: "smooth" }); } catch (error: any) { toast({ title: "Application not submitted", description: error.message || "Please try again.", variant: "destructive" }); } finally { setSubmitting(false); }
  };
  const goRegister = () => {
    try { sessionStorage.setItem("ageGatePrefill", JSON.stringify({ username: username.trim() || undefined, fullName: `${applicant.firstName} ${applicant.lastName}`.trim(), phone: applicant.cellPhone, dateOfBirth: applicant.dateOfBirth })); } catch { /* ignore */ }
    const ref = getActiveRef();
    navigate(ref && ref.toLowerCase() !== "company" ? `/register?ref=${encodeURIComponent(ref)}` : "/register");
  };
  if (submittedId) return <main className="rentals-showroom flex min-h-screen items-center justify-center bg-rental-background px-4"><div className="max-w-xl text-center"><CheckCircle2 className="mx-auto h-14 w-14 text-rental-success" /><h1 className="rentals-wordmark mt-5 text-5xl text-rental-foreground">APPLICATION RECEIVED</h1><p className="mt-3 font-barlow text-lg text-rental-foreground">One of our representatives will be in contact with you shortly.</p><p className="mt-6 font-barlow text-rental-muted">If you would like to make money referring people, click here now.</p><div className="mt-4 flex flex-col justify-center gap-3 sm:flex-row"><Button onClick={goRegister} className="rounded-none bg-rental-primary font-semibold text-rental-primary-foreground">Make money referring people</Button><Button asChild variant="outline" className="rounded-none"><Link to="/rentals">Return to vehicles</Link></Button></div></div></main>;
  return <main className="purchase-application rentals-showroom min-h-screen bg-rental-background text-rental-foreground"><header className="border-b border-rental-line bg-rental-surface"><div className="mx-auto max-w-6xl px-4 py-5 sm:px-8"><div className="flex items-center justify-between gap-3"><Link to={vehicleId ? `/rentals/${vehicleId}` : "/rentals"} className="inline-flex items-center gap-2 font-barlow text-sm text-rental-muted hover:text-rental-primary"><ArrowLeft className="h-4 w-4" /> Back to vehicle</Link><ReferrerBadge /></div><div className="mt-8 max-w-3xl pb-6"><p className="font-barlow text-xs font-semibold uppercase text-rental-primary">Best Car Rental Services</p><h1 className="rentals-wordmark mt-2 text-5xl leading-none sm:text-7xl">BUYER APPLICATION</h1><p className="mt-4 font-barlow text-rental-muted">Apply for {vehicleName}. Fields marked * are required.<br />Why buy retail when you can buy wholesale? Save thousand!</p></div></div></header>
    <form onSubmit={submit} noValidate className="mx-auto max-w-6xl px-4 pb-16 sm:px-8">
      <Section number="01" title="PERSONAL INFORMATION">
        {loggedIn === false && <>
        <div className="mb-6 flex items-center gap-4">
          {avatarPreview ? <img src={avatarPreview} alt="Your photo" className="h-20 w-20 rounded-full border border-rental-primary object-cover" /> : <div className="flex h-20 w-20 items-center justify-center rounded-full border border-rental-line bg-rental-surface"><Camera className="h-7 w-7 text-rental-muted" /></div>}
          <div className="space-y-1.5"><Label>Profile photo</Label><Input type="file" accept="image/*" onChange={async (e) => { const raw = e.target.files?.[0] || null; if (!raw) { setAvatarFile(null); setAvatarPreview(""); return; } const blob = await compressImage(raw); if (blob.size > 5 * 1024 * 1024 || !/^image\/(jpeg|png|webp)$/.test(blob.type)) { toast({ title: "Photo not supported", description: "Please choose a different photo.", variant: "destructive" }); return; } const f = new File([blob], "photo.jpg", { type: blob.type }); setAvatarFile(f); setAvatarPreview(URL.createObjectURL(f)); }} className="rounded-none border-rental-line bg-rental-surface" /><p className="text-xs text-rental-muted">Optional. Any photo from your phone.</p></div>
        </div>
        <div className="mb-6 max-w-md space-y-1.5"><Label htmlFor="buyer-username">Username *</Label><Input id="buyer-username" value={username} onChange={(e) => setUsername(e.target.value.replace(/[^A-Za-z0-9_]/g, "").slice(0, 30))} placeholder="Choose your Dimes Only username" className="rounded-none border-rental-line bg-rental-surface" />
          {username.trim().length >= 3 && idCheck.usernameAvailable !== undefined && <p className={`text-sm font-semibold ${idCheck.usernameAvailable ? "text-rental-success" : "text-destructive"}`}>{idCheck.usernameAvailable ? "✓ Username available" : "✗ Username not available"}</p>}
        </div></>}
        <PersonFields values={applicant} setValues={setApplicant} prefix="buyer" />
        {loggedIn === false && (idCheck.emailMatch || idCheck.phoneMatch) && <div role="alert" className="mt-5 flex flex-col gap-4 border border-rental-primary bg-rental-surface p-4 sm:flex-row sm:items-center">
          {idCheck.emailMatch && (idCheck.emailMatch.avatar ? <img src={idCheck.emailMatch.avatar} alt={idCheck.emailMatch.username} className="h-14 w-14 rounded-full border border-rental-primary object-cover" /> : <div className="flex h-14 w-14 items-center justify-center rounded-full border border-rental-line"><Camera className="h-6 w-6 text-rental-muted" /></div>)}
          <div className="flex-1"><p className="font-semibold text-rental-foreground">This information is already in our system.</p><p className="text-sm text-rental-muted">{idCheck.emailMatch ? <>This email belongs to <span className="font-semibold text-rental-foreground">@{idCheck.emailMatch.username}</span>. </> : "This phone number matches an existing account. "}Please log in to continue your application.</p></div>
          <Button asChild className="rounded-none bg-rental-primary font-semibold text-rental-primary-foreground"><Link to={loginHref}>Log in</Link></Button>
        </div>}
      </Section>
      <Section number="02" title="RESIDENTIAL INFORMATION"><ResidenceFields values={residence} setValues={setResidence} /></Section>
      <Section number="03" title="EMPLOYMENT INFORMATION"><EmploymentFields values={employment} setValues={setEmployment} /></Section>
      <Section number="04" title="INTERESTED VEHICLE"><VehicleFields values={interested} setValues={setInterested} /></Section>
      <Section number="05" title="TRADE-IN"><label className="mb-5 flex items-center gap-3"><Checkbox checked={hasTradeIn} onCheckedChange={(checked) => setHasTradeIn(checked === true)} /><span>Add a trade-in</span></label>{hasTradeIn && <VehicleFields values={tradeIn} setValues={setTradeIn} tradeIn />}</Section>
      <Section number="06" title="CO-BUYER"><label className="mb-5 flex items-center gap-3"><Checkbox checked={hasCoBuyer} onCheckedChange={(checked) => setHasCoBuyer(checked === true)} /><span>Add a co-buyer</span></label>{hasCoBuyer && <div className="space-y-8"><Field label="Relationship to Buyer" value={coBuyer.relationship} onChange={(relationship) => setCoBuyer((current) => ({ ...current, relationship }))} required /><PersonFields values={coBuyer} setValues={setCoBuyer} prefix="co" /><div><h3 className="mb-4 font-semibold">Co-buyer residence</h3><ResidenceFields values={coResidence} setValues={setCoResidence} /></div><div><h3 className="mb-4 font-semibold">Co-buyer employment</h3><EmploymentFields values={coEmployment} setValues={setCoEmployment} /></div></div>}</Section>
      <Section number="07" title="AUTHORIZATION"><div className="space-y-4 font-barlow text-sm text-rental-muted"><label className="flex items-start gap-3"><Checkbox checked={marketing} onCheckedChange={(v) => setMarketing(v === true)} /><span>I want to receive marketing text messages at the phone number provided. Message frequency varies; message and data rates may apply. Reply STOP to opt out.</span></label><label className="flex items-start gap-3"><Checkbox checked={serviceMessages} onCheckedChange={(v) => setServiceMessages(v === true)} /><span>I want to receive non-marketing messages, including application updates and news.</span></label><label className="flex items-start gap-3"><Checkbox checked={creditConsent} onCheckedChange={(v) => setCreditConsent(v === true)} /><span>I certify this application is correct and authorize Best Car Rental Services and relevant financial institutions to obtain consumer credit reports and verify employment for financing purposes. *</span></label><label className="flex items-start gap-3"><Checkbox checked={privacyConsent} onCheckedChange={(v) => setPrivacyConsent(v === true)} /><span>By submitting this request, I accept the Privacy Policy. *</span></label></div></Section>
      <div className="flex flex-col items-start justify-between gap-5 border-t border-rental-line pt-7 sm:flex-row sm:items-center"><div className="flex items-center gap-3 text-sm text-rental-muted"><BadgeDollarSign className="h-5 w-5 text-rental-primary" /><span>No payment is collected with this application.</span></div><Button type="submit" size="lg" disabled={submitting} className="w-full rounded-none bg-rental-primary font-barlow font-semibold text-rental-primary-foreground sm:w-auto">{submitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Submitting…</> : "Submit application"}</Button></div>
    </form></main>;
};

export default VehiclePurchaseApplication;