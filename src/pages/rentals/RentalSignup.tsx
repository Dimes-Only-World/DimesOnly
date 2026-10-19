import React, { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Loader2, Car, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import DateOfBirthSelect, { calculateAge } from "@/components/DateOfBirthSelect";
import RentalsFooter from "@/components/rentals/RentalsFooter";
import { supabase, SUPABASE_URL, SUPABASE_ANON_KEY } from "@/lib/supabase";
import { getActiveRef, buildAuthUrl } from "@/lib/refCapture";
import { useAppContext } from "@/contexts/AppContext";

const REGISTER_ENDPOINT = `${SUPABASE_URL}/functions/v1/register-user`;

type Form = {
  firstName: string; lastName: string; dateOfBirth: string; gender: string;
  email: string; mobileNumber: string; address: string; city: string; state: string; zip: string;
  username: string; password: string; confirmPassword: string;
};

const empty: Form = {
  firstName: "", lastName: "", dateOfBirth: "", gender: "", email: "", mobileNumber: "",
  address: "", city: "", state: "", zip: "", username: "", password: "", confirmPassword: "",
};

const titleCase = (v: string) => v.replace(/\s+/g, " ").split(" ").map((w) => (w ? w.charAt(0).toUpperCase() + w.slice(1).toLowerCase() : "")).join(" ");
const formatPhone = (v: string) => {
  const d = v.replace(/\D/g, "").slice(0, 10);
  if (d.length > 6) return `(${d.slice(0, 3)})${d.slice(3, 6)}-${d.slice(6)}`;
  if (d.length > 3) return `(${d.slice(0, 3)})${d.slice(3)}`;
  return d ? `(${d}` : "";
};

/** Checks the rental signup form and returns a plain list of what still needs to be filled in. */
export function rentalSignupMissing(f: Form): string[] {
  const m: string[] = [];
  if (!f.firstName.trim()) m.push("First name");
  if (!f.lastName.trim()) m.push("Last name");
  if (!f.dateOfBirth) m.push("Date of birth");
  else if ((calculateAge(f.dateOfBirth) ?? 0) < 18) m.push("You must be at least 18 years old");
  if (!f.gender) m.push("Gender");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email.trim())) m.push("A valid email");
  if (f.mobileNumber.replace(/\D/g, "").length !== 10) m.push("A 10-digit mobile number");
  if (!f.address.trim()) m.push("Street address");
  if (!f.city.trim()) m.push("City");
  if (!f.state.trim()) m.push("State");
  if (!/^\d{5}$/.test(f.zip.trim())) m.push("5-digit ZIP code");
  if (!/^[A-Za-z0-9_.-]{2,40}$/.test(f.username.trim())) m.push("Username (letters, numbers, . _ - only)");
  if (f.password.length < 6) m.push("Password (at least 6 characters)");
  else if (f.password !== f.confirmPassword) m.push("Passwords must match");
  return m;
}

const RentalSignup: React.FC = () => {
  const { setUser } = useAppContext();
  const [form, setForm] = useState<Form>(empty);
  const [missing, setMissing] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [ref, setRef] = useState("");
  const [redirect, setRedirect] = useState("/rentals");

  useEffect(() => {
    setRef(getActiveRef());
    const rd = new URLSearchParams(window.location.search).get("redirect");
    if (rd && rd.startsWith("/") && !rd.startsWith("//")) setRedirect(rd);
  }, []);

  const set = (k: keyof Form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const m = rentalSignupMissing(form);
    if (m.length) { setMissing(m); return; }
    setLoading(true);
    try {
      const res = await fetch(REGISTER_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: SUPABASE_ANON_KEY },
        body: JSON.stringify({
          firstName: titleCase(form.firstName.trim()),
          lastName: titleCase(form.lastName.trim()),
          username: form.username.trim(),
          email: form.email.trim().toLowerCase(),
          password: form.password,
          confirmPassword: form.confirmPassword,
          mobileNumber: form.mobileNumber,
          address: titleCase(form.address.trim()),
          city: titleCase(form.city.trim()),
          state: form.state.trim().toUpperCase(),
          zip: form.zip.trim(),
          gender: form.gender,
          userType: "normal",
          referredBy: ref && ref.toLowerCase() !== "company" ? ref : "Company",
          dateOfBirth: form.dateOfBirth,
          videoUrls: [],
          videoMeta: [],
        }),
      });
      const result = await res.json().catch(() => ({}));
      if (!res.ok || !result.success || !result.user) throw new Error(result.error || "We couldn't create your account. Please try again.");

      const { data: signIn, error: signInError } = await supabase.auth.signInWithPassword({
        email: form.email.trim().toLowerCase(), password: form.password,
      });
      if (signInError) {
        window.location.href = buildAuthUrl("/login", redirect);
        return;
      }
      const userData = {
        id: result.user.id, username: result.user.username, email: form.email.trim().toLowerCase(),
        created_at: result.user.created_at || new Date().toISOString(),
        createdAt: result.user.created_at || new Date().toISOString(),
        firstName: form.firstName, lastName: form.lastName, userType: "normal",
        membershipType: result.user.membership_tier || "silver", membershipTier: result.user.membership_tier || "silver",
        gender: form.gender, mobileNumber: form.mobileNumber, address: form.address,
        city: form.city, state: form.state, zip: form.zip,
      };
      sessionStorage.setItem("userData", JSON.stringify(userData));
      sessionStorage.setItem("currentUser", result.user.username);
      localStorage.setItem("authToken", signIn.session?.access_token || result.user.id);
      setUser(userData as any);
      window.location.href = redirect;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  const field = (k: keyof Form, label: string, props: React.InputHTMLAttributes<HTMLInputElement> = {}, onChange?: (v: string) => string) => (
    <div className="space-y-1.5">
      <Label htmlFor={`rs-${k}`} className="text-sm font-semibold text-rental-foreground">{label}</Label>
      <Input
        id={`rs-${k}`}
        value={form[k]}
        onChange={onChange ? (e) => setForm((f) => ({ ...f, [k]: onChange(e.target.value) })) : set(k)}
        className="rounded-none border-rental-line bg-rental-elevated text-rental-foreground placeholder:text-rental-muted"
        {...props}
      />
    </div>
  );

  return (
    <div className="rentals-showroom flex min-h-screen flex-col bg-rental-background font-barlow text-rental-foreground">
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-10">
        <Link to="/rentals" className="text-sm text-rental-muted hover:text-rental-primary">← Back to rentals</Link>
        <div className="mt-4 flex items-center gap-3">
          <Car className="h-8 w-8 text-rental-success" />
          <h1 className="text-3xl font-bold uppercase tracking-wide">Create your rentals account</h1>
        </div>
        <p className="mt-2 text-rental-muted">
          Just the details we need to book cars, track My Rentals and My Purchases. No photos or videos needed.
        </p>
        {ref && ref.toLowerCase() !== "company" && (
          <p className="mt-3 border border-rental-line bg-rental-surface px-3 py-2 text-sm">
            Referred by <span className="font-semibold text-rental-success">{ref}</span>
          </p>
        )}

        <form onSubmit={submit} noValidate className="mt-6 space-y-8">
          <section className="space-y-4">
            <h2 className="border-b border-rental-line pb-2 text-lg font-bold uppercase">About you</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {field("firstName", "First name", { autoComplete: "given-name" })}
              {field("lastName", "Last name", { autoComplete: "family-name" })}
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-semibold text-rental-foreground">Date of birth</Label>
              <DateOfBirthSelect value={form.dateOfBirth} onChange={(v) => setForm((f) => ({ ...f, dateOfBirth: v }))} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-semibold text-rental-foreground">Gender</Label>
              <div className="flex gap-2">
                {([["male", "Male"], ["female", "Female"]] as const).map(([v, l]) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, gender: v }))}
                    className={`flex-1 border px-4 py-2 font-semibold ${form.gender === v ? "border-rental-success bg-rental-success text-rental-background" : "border-rental-line bg-rental-elevated text-rental-foreground"}`}
                  >
                    {l}
                  </button>
                ))}
              </div>
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="border-b border-rental-line pb-2 text-lg font-bold uppercase">Contact & address</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {field("email", "Email", { type: "email", autoComplete: "email" })}
              {field("mobileNumber", "Mobile number", { type: "tel", autoComplete: "tel", placeholder: "(555)555-5555" }, formatPhone)}
            </div>
            {field("address", "Street address", { autoComplete: "street-address" })}
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              {field("city", "City", { autoComplete: "address-level2" })}
              {field("state", "State", { autoComplete: "address-level1", maxLength: 2, placeholder: "AZ" })}
              {field("zip", "ZIP", { inputMode: "numeric", autoComplete: "postal-code", maxLength: 5 }, (v) => v.replace(/\D/g, "").slice(0, 5))}
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="border-b border-rental-line pb-2 text-lg font-bold uppercase">Sign-in details</h2>
            {field("username", "Username", { autoComplete: "username" }, (v) => v.replace(/\s/g, ""))}
            <div className="grid gap-4 sm:grid-cols-2">
              {field("password", "Password", { type: "password", autoComplete: "new-password" })}
              {field("confirmPassword", "Confirm password", { type: "password", autoComplete: "new-password" })}
            </div>
          </section>

          {error && <p className="border border-rental-primary bg-rental-surface px-3 py-2 text-sm text-rental-primary">{error}</p>}

          <Button type="submit" disabled={loading} className="h-12 w-full rounded-none bg-rental-success text-base font-bold uppercase text-rental-background hover:bg-rental-success/90">
            {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Create account & continue"}
          </Button>
          <p className="text-center text-sm text-rental-muted">
            Already have an account? <a href={buildAuthUrl("/login", redirect)} className="font-semibold text-rental-success underline">Sign in</a>
          </p>
        </form>
      </main>

      <Dialog open={missing.length > 0} onOpenChange={(o) => !o && setMissing([])}>
        <DialogContent className="rounded-none border-rental-line bg-rental-surface font-barlow text-rental-foreground">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-rental-foreground"><AlertCircle className="h-5 w-5 text-rental-warning" />Please complete these</DialogTitle>
            <DialogDescription className="text-rental-muted">Fill in the items below to create your account.</DialogDescription>
          </DialogHeader>
          <ul className="space-y-1.5">
            {missing.map((m) => <li key={m} className="border border-rental-line bg-rental-elevated px-3 py-1.5 text-sm">{m}</li>)}
          </ul>
          <Button onClick={() => setMissing([])} className="rounded-none bg-rental-success font-semibold text-rental-background hover:bg-rental-success/90">Got it</Button>
        </DialogContent>
      </Dialog>
      <RentalsFooter />
    </div>
  );
};

export default RentalSignup;
