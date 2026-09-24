import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { HOST_AGREEMENT_SECTIONS_A, HOST_AGREEMENT_SECTIONS_B } from "@/lib/hostAgreementText";
import { buildAuthUrl } from "@/lib/refCapture";

const COMPANY = {
  name: "Best Holdings Enterprises, Inc.",
  address: "12100 Wilshire Blvd #800",
  phone: "213-707-1661",
  email: "Talent@DimesOnly.World",
  web: "www.DimesOnly.World/rentals",
};

const DEPOSIT = 250;

type Form = Record<string, string>;
const initial: Form = {
  full_name: "", email: "", phone: "", address: "", city_state_zip: "", drivers_license_no: "",
  earnings_plan: "", payout_method: "ach",
  bank_recipient: "", bank_name: "", routing: "", account: "", account_type: "checking", bank_address: "",
  zelle_contact: "", zelle_name: "",
  signed_name: "",
};

type Vehicle = { make: string; model: string; year: string; color: string; vin: string; license_plate: string; mileage: string; photo: File | null };
const emptyVehicle = (): Vehicle => ({ make: "", model: "", year: "", color: "", vin: "", license_plate: "", mileage: "", photo: null });

const Field: React.FC<{ label: string; name: string; value: string; onChange: (n: string, v: string) => void; required?: boolean; type?: string }> = ({ label, name, value, onChange, required, type }) => (
  <label className="block space-y-1">
    <span className="text-xs font-semibold uppercase tracking-wide text-rental-muted">{label}{required && " *"}</span>
    <Input type={type || "text"} value={value} required={required} onChange={(e) => onChange(name, e.target.value)} maxLength={200}
      className="rounded-none border-rental-line bg-rental-surface text-rental-foreground" />
  </label>
);

const Row: React.FC<{ k: string; v?: string }> = ({ k, v }) => (
  <div className="grid grid-cols-[160px_1fr] border-b border-rental-line py-1 text-sm">
    <span className="text-rental-muted">{k}</span>
    <span className="font-semibold">{v || "—"}</span>
  </div>
);

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <section className="space-y-4 border border-rental-line bg-rental-surface/40 p-5">
    <h2 className="font-barlow text-lg font-bold uppercase tracking-wide text-rental-primary">{title}</h2>
    {children}
  </section>
);

const money = (n: number) => n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

const HostApplication: React.FC = () => {
  const { toast } = useToast();
  const [f, setF] = useState<Form>(initial);
  const [countInput, setCountInput] = useState("");
  const [vehicleCount, setVehicleCount] = useState<number | null>(null);
  const [vehicles, setVehicles] = useState<Vehicle[]>([emptyVehicle()]);
  const [vIdx, setVIdx] = useState(0);
  const [dl, setDl] = useState<File | null>(null);
  const [reg, setReg] = useState<File | null>(null);
  const [agree, setAgree] = useState(false);
  const [signed, setSigned] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);

  const set = (n: string, v: string) => setF((p) => ({ ...p, [n]: v }));
  const today = new Date().toLocaleDateString();
  const isLastVehicle = vIdx === vehicles.length - 1;
  const totalDeposit = DEPOSIT * (vehicleCount || 1);

  const [authChecked, setAuthChecked] = useState(false);
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSignedIn(!!session);
      if (session?.user?.email) setF((p) => ({ ...p, email: p.email || session.user.email! }));
      setAuthChecked(true);
    });
  }, []);

  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext("2d")!;
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#111";
  }, [done, vIdx]);

  const setVehicleField = (n: keyof Vehicle, v: string) =>
    setVehicles((prev) => prev.map((veh, i) => (i === vIdx ? { ...veh, [n]: v } : veh)));
  const setVehiclePhoto = (file: File | null) =>
    setVehicles((prev) => prev.map((veh, i) => (i === vIdx ? { ...veh, photo: file } : veh)));

  const pos = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    return { x: ((e.clientX - r.left) * e.currentTarget.width) / r.width, y: ((e.clientY - r.top) * e.currentTarget.height) / r.height };
  };
  const down = (e: React.PointerEvent<HTMLCanvasElement>) => {
    drawing.current = true;
    e.currentTarget.setPointerCapture(e.pointerId);
    const ctx = e.currentTarget.getContext("2d")!;
    const p = pos(e);
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
  };
  const move = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current) return;
    const ctx = e.currentTarget.getContext("2d")!;
    const p = pos(e);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    setSigned(true);
  };
  const clearSig = () => {
    const c = canvasRef.current;
    c?.getContext("2d")?.clearRect(0, 0, c.width, c.height);
    setSigned(false);
  };

  const upload = async (file: Blob, folder: string, ext: string, type: string) => {
    const path = `${folder}/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from("host-documents").upload(path, file, { contentType: type });
    if (error) throw error;
    return path;
  };

  const validVin = (vin: string) => /^[A-HJ-NPR-Z0-9]{11,17}$/i.test(vin.trim());

  const validateVehicle = (v: Vehicle): string | null => {
    if (!v.make.trim() || !v.model.trim() || !v.year.trim()) return "Fill in the vehicle make, model and year";
    if (!validVin(v.vin)) return "Enter a valid VIN";
    if (!v.photo) return "Upload a photo of this vehicle";
    return null;
  };

  const nextVehicle = () => {
    const err = validateVehicle(vehicles[vIdx]);
    if (err) return toast({ title: err, variant: "destructive" });
    setVIdx((i) => i + 1);
    window.scrollTo({ top: 0 });
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLastVehicle) return nextVehicle();
    const vErr = validateVehicle(vehicles[vIdx]);
    if (vErr) return toast({ title: vErr, variant: "destructive" });
    if (!f.earnings_plan) return toast({ title: "Choose Earn 50% or 60%", variant: "destructive" });
    if (!dl || !reg) return toast({ title: "Upload your driver's license and registration", variant: "destructive" });
    if (!agree || !signed || !f.signed_name.trim()) return toast({ title: "Sign the agreement to finish", variant: "destructive" });

    setSubmitting(true);
    try {
      const ext = (file: File) => (file.name.split(".").pop() || "bin").toLowerCase().slice(0, 5);
      const sigBlob: Blob = await new Promise((res) => canvasRef.current!.toBlob((b) => res(b!), "image/png"));
      const [dlPath, regPath, sigPath] = await Promise.all([
        upload(dl, "licenses", ext(dl), dl.type || "application/octet-stream"),
        upload(reg, "registrations", ext(reg), reg.type || "application/octet-stream"),
        upload(sigBlob, "signatures", "png", "image/png"),
      ]);
      const photoPaths = await Promise.all(
        vehicles.map((v) => upload(v.photo!, "vehicle-photos", ext(v.photo!), v.photo!.type || "image/jpeg"))
      );
      const payout_details =
        f.payout_method === "ach"
          ? { recipient: f.bank_recipient, bank_name: f.bank_name, routing: f.routing, account: f.account, account_type: f.account_type, bank_address: f.bank_address }
          : { contact: f.zelle_contact, registered_name: f.zelle_name };
      const rows = vehicles.map((v, i) => ({
        full_name: f.full_name.trim(), email: f.email.trim(), phone: f.phone.trim(), address: f.address.trim(),
        city_state_zip: f.city_state_zip.trim(), drivers_license_no: f.drivers_license_no.trim(),
        make: v.make.trim(), model: v.model.trim(), year: v.year.trim(), color: v.color.trim(), vin: v.vin.trim().toUpperCase(),
        license_plate: v.license_plate.trim(), mileage: v.mileage.trim(), earnings_plan: f.earnings_plan,
        payout_method: f.payout_method, payout_details,
        drivers_license_path: dlPath, registration_path: regPath, signature_path: sigPath, vehicle_photo_path: photoPaths[i],
        signed_name: f.signed_name.trim(),
      }));
      const { error } = await supabase.from("host_applications").insert(rows);
      if (error) throw error;
      setDone(true);
      window.scrollTo({ top: 0 });
    } catch (err: any) {
      toast({ title: "Could not submit", description: err?.message || "Please try again.", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  if (authChecked && !signedIn) {
    return (
      <div className="rentals-showroom min-h-screen bg-rental-background px-4 py-24 text-center text-rental-foreground">
        <h1 className="font-barlow text-3xl font-bold uppercase">Log in to list your vehicle</h1>
        <p className="mx-auto mt-3 max-w-md text-rental-muted">
          You need a free Dimes Only account to become a host. Your vehicle, agreement and earnings will be attached to your account so you can track them in My Fleet.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Button asChild className="rounded-none bg-rental-primary px-8 text-rental-primary-foreground">
            <Link to={buildAuthUrl("/login", "/rentals/host/apply")}>Log in</Link>
          </Button>
          <Button asChild variant="outline" className="rounded-none border-rental-primary px-8 text-rental-primary">
            <Link to={buildAuthUrl("/register", "/rentals/host/apply")}>Create account</Link>
          </Button>
        </div>
      </div>
    );
  }

  if (done) {
    return (
      <div className="rentals-showroom min-h-screen bg-rental-background px-4 py-24 text-center text-rental-foreground">
        <h1 className="font-barlow text-3xl font-bold uppercase">Application received</h1>
        <p className="mx-auto mt-3 max-w-md text-rental-muted">
          Thanks, {f.full_name.split(" ")[0]}. Your signed Co-Host Agreement and {vehicles.length > 1 ? `${vehicles.length} vehicles` : "vehicle"} were sent to our team. We'll contact you at {f.email} about the {money(totalDeposit)} refundable deposit and next steps.
        </p>
        <Button asChild className="mt-6 rounded-none bg-rental-primary text-rental-primary-foreground">
          <Link to="/rentals">Back to Rentals</Link>
        </Button>
      </div>
    );
  }

  const parsedCount = Math.max(0, Math.min(20, parseInt(countInput, 10) || 0));

  if (vehicleCount === null) {
    return (
      <div className="rentals-showroom min-h-screen bg-rental-background text-rental-foreground">
        <div className="mx-auto max-w-3xl space-y-6 px-4 py-10">
          <Link to="/rentals/host" className="text-sm text-rental-muted hover:text-rental-foreground">← Back</Link>
          <header>
            <h1 className="font-barlow text-3xl font-bold uppercase">Become a Host</h1>
            <p className="text-rental-muted">Add your vehicle and sign the Co-Host Agreement.</p>
          </header>
          <Section title="How many vehicles are you submitting?">
            <div className="flex flex-wrap items-center gap-3">
              <Input
                type="number" min={1} max={20} value={countInput}
                onChange={(e) => setCountInput(e.target.value)}
                placeholder="1"
                className="w-28 rounded-none border-rental-line bg-rental-surface text-rental-foreground"
              />
              {parsedCount > 0 && (
                <p className="text-sm text-rental-muted">
                  Deposit needed: <span className="font-bold text-rental-foreground">${DEPOSIT} × {parsedCount} = {money(DEPOSIT * parsedCount)}</span>
                </p>
              )}
            </div>
            <p className="text-xs text-rental-muted">Each vehicle requires a ${DEPOSIT} refundable deposit.</p>
            <Button
              type="button"
              disabled={parsedCount < 1}
              onClick={() => { setVehicleCount(parsedCount); setVehicles(Array.from({ length: parsedCount }, emptyVehicle)); setVIdx(0); }}
              className="rounded-none bg-rental-primary px-8 font-barlow font-semibold uppercase text-rental-primary-foreground"
            >
              Continue
            </Button>
          </Section>
        </div>
      </div>
    );
  }

  const v = vehicles[vIdx];

  return (
    <div className="rentals-showroom min-h-screen bg-rental-background text-rental-foreground">
      <div className="mx-auto max-w-3xl space-y-6 px-4 py-10">
        <Link to="/rentals/host" className="text-sm text-rental-muted hover:text-rental-foreground">← Back</Link>
        <header>
          <h1 className="font-barlow text-3xl font-bold uppercase">Become a Host</h1>
          <p className="text-rental-muted">Add your vehicle and sign the Co-Host Agreement.</p>
          <p className="mt-2 text-sm font-semibold text-rental-primary">
            {vehicleCount > 1
              ? `Vehicle ${vIdx + 1} of ${vehicleCount} · Total deposit: ${money(totalDeposit)} ($${DEPOSIT} × ${vehicleCount})`
              : `Deposit: ${money(totalDeposit)}`}
          </p>
        </header>

        <form onSubmit={submit} className="space-y-6">
          {vIdx === 0 && (
            <Section title="1. Owner">
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Full legal name" name="full_name" value={f.full_name} onChange={set} required />
                <Field label="Driver's license no." name="drivers_license_no" value={f.drivers_license_no} onChange={set} required />
                <Field label="Phone" name="phone" type="tel" value={f.phone} onChange={set} required />
                <Field label="Email" name="email" type="email" value={f.email} onChange={set} required />
                <Field label="Address" name="address" value={f.address} onChange={set} required />
                <Field label="City / State / ZIP" name="city_state_zip" value={f.city_state_zip} onChange={set} required />
              </div>
            </Section>
          )}

          <Section title={vehicleCount > 1 ? `2. Vehicle ${vIdx + 1} of ${vehicleCount}` : "2. Vehicle"}>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Make" name="make" value={v.make} onChange={(n, val) => setVehicleField("make", val)} required />
              <Field label="Model" name="model" value={v.model} onChange={(n, val) => setVehicleField("model", val)} required />
              <Field label="Year" name="year" value={v.year} onChange={(n, val) => setVehicleField("year", val)} required />
              <Field label="Color" name="color" value={v.color} onChange={(n, val) => setVehicleField("color", val)} />
              <Field label="VIN" name="vin" value={v.vin} onChange={(n, val) => setVehicleField("vin", val)} required />
              <Field label="License plate" name="license_plate" value={v.license_plate} onChange={(n, val) => setVehicleField("license_plate", val)} />
              <Field label="Current mileage" name="mileage" value={v.mileage} onChange={(n, val) => setVehicleField("mileage", val)} />
            </div>
            <p className="text-xs text-rental-muted">Clean title required.</p>
            <label className="block space-y-1">
              <span className="text-xs font-semibold uppercase tracking-wide text-rental-muted">Upload vehicle photo *</span>
              <input type="file" accept="image/*" onChange={(e) => setVehiclePhoto(e.target.files?.[0] || null)} className="block w-full text-sm" />
              {v.photo && <img src={URL.createObjectURL(v.photo)} alt="Vehicle" className="mt-2 h-32 w-auto object-cover" />}
            </label>
          </Section>

          {isLastVehicle && (
            <>
              <Section title="Documents">
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="block space-y-1">
                    <span className="text-xs font-semibold uppercase tracking-wide text-rental-muted">Upload driver's license *</span>
                    <input type="file" accept="image/*,application/pdf" onChange={(e) => setDl(e.target.files?.[0] || null)} className="block w-full text-sm" />
                  </label>
                  <label className="block space-y-1">
                    <span className="text-xs font-semibold uppercase tracking-wide text-rental-muted">Upload registration *</span>
                    <input type="file" accept="image/*,application/pdf" onChange={(e) => setReg(e.target.files?.[0] || null)} className="block w-full text-sm" />
                  </label>
                </div>
              </Section>

              <Section title="Earnings plan">
                <div className="grid gap-3 sm:grid-cols-2">
                  {[
                    { v: "50", t: "Earn 50%", d: "of the Trip Price · $500 deductible" },
                    { v: "60", t: "Earn 60%", d: "of the Trip Price · $1,500 deductible" },
                  ].map((o) => (
                    <button type="button" key={o.v} onClick={() => set("earnings_plan", o.v)}
                      className={`border p-4 text-left ${f.earnings_plan === o.v ? "border-rental-primary bg-rental-primary/10" : "border-rental-line"}`}>
                      <p className="font-barlow text-xl font-bold">{o.t}</p>
                      <p className="text-sm text-rental-muted">{o.d}</p>
                    </button>
                  ))}
                </div>
              </Section>

              <Section title="Payout method">
                <div className="flex gap-4 text-sm">
                  {["ach", "zelle"].map((m) => (
                    <label key={m} className="flex items-center gap-2">
                      <input type="radio" checked={f.payout_method === m} onChange={() => set("payout_method", m)} />
                      {m === "ach" ? "Bank account (ACH)" : "Zelle"}
                    </label>
                  ))}
                </div>
                {f.payout_method === "ach" ? (
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field label="Name of recipient" name="bank_recipient" value={f.bank_recipient} onChange={set} />
                    <Field label="Bank name" name="bank_name" value={f.bank_name} onChange={set} />
                    <Field label="Routing number" name="routing" value={f.routing} onChange={set} />
                    <Field label="Account number" name="account" value={f.account} onChange={set} />
                    <label className="block space-y-1">
                      <span className="text-xs font-semibold uppercase tracking-wide text-rental-muted">Account type</span>
                      <select value={f.account_type} onChange={(e) => set("account_type", e.target.value)} className="h-10 w-full border border-rental-line bg-rental-surface px-2">
                        <option value="checking">Checking</option>
                        <option value="savings">Savings</option>
                      </select>
                    </label>
                    <Field label="Bank address" name="bank_address" value={f.bank_address} onChange={set} />
                  </div>
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field label="Phone or email" name="zelle_contact" value={f.zelle_contact} onChange={set} />
                    <Field label="Registered name" name="zelle_name" value={f.zelle_name} onChange={set} />
                  </div>
                )}
              </Section>

              {/* Agreement preview with the owner's details filled in */}
              <section className="space-y-4 bg-white p-6 text-slate-900">
                <div className="text-center">
                  <p className="text-lg font-black uppercase">{COMPANY.name}</p>
                  <p className="font-bold uppercase">Co-Host Agreement — Vehicle Management Services</p>
                </div>
                <div>
                  <p className="mb-1 font-bold">COMPANY INFORMATION</p>
                  <Row k="Legal name" v={COMPANY.name} />
                  <Row k="Address" v={COMPANY.address} />
                  <Row k="Phone" v={COMPANY.phone} />
                  <Row k="Email" v={COMPANY.email} />
                  <Row k="Website" v={COMPANY.web} />
                </div>
                <p className="text-sm">
                  This Co-Host Agreement (the “Agreement”) is effective as of the date of the last signature below (the “Effective Date”) and is made by and between {COMPANY.name} (the “Company”) and the vehicle owner identified below (“Owner”). Owner agrees to transfer the vehicle described below (the “Vehicle”) to the Company for management services.
                </p>
                <div>
                  <p className="mb-1 font-bold">1. OWNER</p>
                  <Row k="Full legal name" v={f.full_name} />
                  <Row k="Driver's license no." v={f.drivers_license_no} />
                  <Row k="Phone" v={f.phone} />
                  <Row k="Email" v={f.email} />
                  <Row k="Address" v={f.address} />
                  <Row k="City / State / ZIP" v={f.city_state_zip} />
                </div>
                <div>
                  <p className="mb-1 font-bold">2. VEHICLE{vehicles.length > 1 ? `S (${vehicles.length})` : ""}</p>
                  {vehicles.map((veh, i) => (
                    <div key={i} className={i > 0 ? "mt-2 border-t border-slate-200 pt-2" : ""}>
                      {vehicles.length > 1 && <p className="text-xs font-bold uppercase text-slate-500">Vehicle {i + 1}</p>}
                      <Row k="Make / Model" v={[veh.make, veh.model].filter(Boolean).join(" ")} />
                      <Row k="Year / Color" v={[veh.year, veh.color].filter(Boolean).join(" · ")} />
                      <Row k="VIN" v={veh.vin.toUpperCase()} />
                      <Row k="License plate" v={veh.license_plate} />
                      <Row k="Current mileage" v={veh.mileage} />
                    </div>
                  ))}
                  <Row k="Title status" v="Clean title required" />
                </div>
                <div className="max-h-[420px] space-y-3 overflow-y-auto whitespace-pre-wrap border p-3 text-sm">
                  {HOST_AGREEMENT_SECTIONS_A}
                  {"\n\n"}5. EARNINGS AND PAYMENTS{"\n\n"}
                  Selected plan: {f.earnings_plan ? `Earn ${f.earnings_plan}% of the Trip Price* · ${f.earnings_plan === "50" ? "$500" : "$1,500"} deductible` : "(not selected)"}
                  {"\n\n"}*The trip price includes trip rate, unlimited mileage extras, late return fees, and additional usage fees. A processing fee of 3.5% is deducted from the trip price. The trip price does not include cleaning fee, smoking fee, trip fee, delivery fee, and other extras provided to guests.
                  {"\n\n"}Owner’s monthly statement will be available on the 10th of each month, and the payout will be made within 3–5 business days after the statement is received, via: {f.payout_method === "ach" ? "Bank account (ACH)" : "Zelle"}.
                  {"\n\n"}5A. REFUNDABLE DEPOSIT{"\n\n"}
                  Owner agrees to pay a ${DEPOSIT} refundable deposit per Vehicle when the Vehicle is placed with the Company
                  {vehicles.length > 1 ? ` — ${vehicles.length} Vehicles × $${DEPOSIT} = ${money(totalDeposit)} total` : ""}.
                  The deposit is refunded to Owner after each Vehicle has remained in Company service for at least 30 days. If Owner removes a Vehicle before 30 days have passed, Owner forfeits the ${DEPOSIT} deposit for that Vehicle and it will not be refunded.
                  {"\n\n"}
                  {HOST_AGREEMENT_SECTIONS_B}
                </div>
                <div className="space-y-3">
                  <p className="font-bold">14. SIGNATURES</p>
                  <p className="text-sm">COMPANY: {COMPANY.name} — countersigned upon approval.</p>
                  <p className="text-sm font-semibold">OWNER signature *</p>
                  <canvas ref={canvasRef} width={600} height={160} onPointerDown={down} onPointerMove={move}
                    onPointerUp={() => (drawing.current = false)} onPointerLeave={() => (drawing.current = false)}
                    className="w-full touch-none border-2 border-dashed border-slate-400 bg-slate-50" />
                  <button type="button" onClick={clearSig} className="text-xs underline">Clear signature</button>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="block text-sm">
                      Print name *
                      <input value={f.signed_name} onChange={(e) => set("signed_name", e.target.value)} maxLength={120}
                        className="mt-1 h-10 w-full border border-slate-300 px-2" />
                    </label>
                    <label className="block text-sm">
                      Date
                      <input value={today} readOnly className="mt-1 h-10 w-full border border-slate-300 bg-slate-100 px-2" />
                    </label>
                  </div>
                  <label className="flex items-start gap-2 text-sm">
                    <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} className="mt-1" />
                    I have read and agree to this Co-Host Agreement, including the {money(totalDeposit)} refundable deposit terms ({`$${DEPOSIT} per vehicle`}), and guarantee {vehicles.length > 1 ? "the Vehicles have" : "the Vehicle has"} a clean title.
                  </label>
                </div>
              </section>
            </>
          )}

          <Button type="submit" disabled={submitting} size="lg" className="w-full rounded-none bg-rental-primary font-barlow font-semibold uppercase tracking-wide text-rental-primary-foreground hover:bg-rental-primary/90">
            {submitting ? "Submitting…" : isLastVehicle ? `Sign, Submit & Pay ${money(totalDeposit)} Deposit` : `Next Vehicle (${vIdx + 2} of ${vehicleCount})`}
          </Button>
        </form>
      </div>
    </div>
  );
};

export default HostApplication;
