import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { HOST_AGREEMENT_SECTIONS_A, HOST_AGREEMENT_SECTIONS_B } from "@/lib/hostAgreementText";

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
  make: "", model: "", year: "", color: "", vin: "", license_plate: "", mileage: "",
  earnings_plan: "", payout_method: "ach",
  bank_recipient: "", bank_name: "", routing: "", account: "", account_type: "checking", bank_address: "",
  zelle_contact: "", zelle_name: "",
  signed_name: "",
};

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

const HostApplication: React.FC = () => {
  const { toast } = useToast();
  const [f, setF] = useState<Form>(initial);
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

  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext("2d")!;
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#111";
  }, [done]);

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

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!f.earnings_plan) return toast({ title: "Choose Earn 50% or 60%", variant: "destructive" });
    if (!dl || !reg) return toast({ title: "Upload your driver's license and registration", variant: "destructive" });
    if (!/^[A-HJ-NPR-Z0-9]{11,17}$/i.test(f.vin.trim())) return toast({ title: "Enter a valid VIN", variant: "destructive" });
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
      const payout_details =
        f.payout_method === "ach"
          ? { recipient: f.bank_recipient, bank_name: f.bank_name, routing: f.routing, account: f.account, account_type: f.account_type, bank_address: f.bank_address }
          : { contact: f.zelle_contact, registered_name: f.zelle_name };
      const { error } = await supabase.from("host_applications").insert({
        full_name: f.full_name.trim(), email: f.email.trim(), phone: f.phone.trim(), address: f.address.trim(),
        city_state_zip: f.city_state_zip.trim(), drivers_license_no: f.drivers_license_no.trim(),
        make: f.make.trim(), model: f.model.trim(), year: f.year.trim(), color: f.color.trim(), vin: f.vin.trim().toUpperCase(),
        license_plate: f.license_plate.trim(), mileage: f.mileage.trim(), earnings_plan: f.earnings_plan,
        payout_method: f.payout_method, payout_details,
        drivers_license_path: dlPath, registration_path: regPath, signature_path: sigPath,
        signed_name: f.signed_name.trim(),
      });
      if (error) throw error;
      setDone(true);
      window.scrollTo({ top: 0 });
    } catch (err: any) {
      toast({ title: "Could not submit", description: err?.message || "Please try again.", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  if (done) {
    return (
      <div className="rentals-showroom min-h-screen bg-rental-background px-4 py-24 text-center text-rental-foreground">
        <h1 className="font-barlow text-3xl font-bold uppercase">Application received</h1>
        <p className="mx-auto mt-3 max-w-md text-rental-muted">
          Thanks, {f.full_name.split(" ")[0]}. Your signed Co-Host Agreement and vehicle details were sent to our team. We'll contact you at {f.email} about the ${DEPOSIT} refundable deposit and next steps.
        </p>
        <Button asChild className="mt-6 rounded-none bg-rental-primary text-rental-primary-foreground">
          <Link to="/rentals">Back to Rentals</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="rentals-showroom min-h-screen bg-rental-background text-rental-foreground">
      <div className="mx-auto max-w-3xl space-y-6 px-4 py-10">
        <Link to="/rentals/host" className="text-sm text-rental-muted hover:text-rental-foreground">← Back</Link>
        <header>
          <h1 className="font-barlow text-3xl font-bold uppercase">Become a Host</h1>
          <p className="text-rental-muted">Add your vehicle and sign the Co-Host Agreement.</p>
        </header>

        <form onSubmit={submit} className="space-y-6">
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

          <Section title="2. Vehicle">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Make" name="make" value={f.make} onChange={set} required />
              <Field label="Model" name="model" value={f.model} onChange={set} required />
              <Field label="Year" name="year" value={f.year} onChange={set} required />
              <Field label="Color" name="color" value={f.color} onChange={set} />
              <Field label="VIN" name="vin" value={f.vin} onChange={set} required />
              <Field label="License plate" name="license_plate" value={f.license_plate} onChange={set} />
              <Field label="Current mileage" name="mileage" value={f.mileage} onChange={set} />
            </div>
            <p className="text-xs text-rental-muted">Clean title required.</p>
          </Section>

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
              <p className="mb-1 font-bold">2. VEHICLE</p>
              <Row k="Make / Model" v={[f.make, f.model].filter(Boolean).join(" ")} />
              <Row k="Year / Color" v={[f.year, f.color].filter(Boolean).join(" · ")} />
              <Row k="VIN" v={f.vin.toUpperCase()} />
              <Row k="License plate" v={f.license_plate} />
              <Row k="Current mileage" v={f.mileage} />
              <Row k="Title status" v="Clean title required" />
            </div>
            <div className="max-h-[420px] space-y-3 overflow-y-auto whitespace-pre-wrap border p-3 text-sm">
              {HOST_AGREEMENT_SECTIONS_A}
              {"\n\n"}5. EARNINGS AND PAYMENTS{"\n\n"}
              Selected plan: {f.earnings_plan ? `Earn ${f.earnings_plan}% of the Trip Price* · ${f.earnings_plan === "50" ? "$500" : "$1,500"} deductible` : "(not selected)"}
              {"\n\n"}*The trip price includes trip rate, unlimited mileage extras, late return fees, and additional usage fees. A processing fee of 3.5% is deducted from the trip price. The trip price does not include cleaning fee, smoking fee, trip fee, delivery fee, and other extras provided to guests.
              {"\n\n"}Owner’s monthly statement will be available on the 10th of each month, and the payout will be made within 3–5 business days after the statement is received, via: {f.payout_method === "ach" ? "Bank account (ACH)" : "Zelle"}.
              {"\n\n"}5A. REFUNDABLE DEPOSIT{"\n\n"}
              Owner agrees to pay a ${DEPOSIT} refundable deposit when the Vehicle is placed with the Company. The deposit is refunded to Owner after the Vehicle has remained in Company service for at least 30 days. If Owner removes the Vehicle before 30 days have passed, Owner forfeits the ${DEPOSIT} deposit and it will not be refunded.
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
                I have read and agree to this Co-Host Agreement, including the ${DEPOSIT} refundable deposit terms, and guarantee the Vehicle has a clean title.
              </label>
            </div>
          </section>

          <Button type="submit" disabled={submitting} size="lg" className="w-full rounded-none bg-rental-primary font-barlow font-semibold uppercase tracking-wide text-rental-primary-foreground hover:bg-rental-primary/90">
            {submitting ? "Submitting…" : "Sign & Submit"}
          </Button>
        </form>
      </div>
    </div>
  );
};

export default HostApplication;
