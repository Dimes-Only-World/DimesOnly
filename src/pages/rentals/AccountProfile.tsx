import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import BestLogoBanner from "@/components/rentals/BestLogoBanner";
import AccountMenu from "@/components/rentals/AccountMenu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";

type Profile = {
  first_name: string; last_name: string; phone_number: string; email: string;
  drivers_license_no: string; drivers_license_state: string;
};
const EMPTY: Profile = { first_name: "", last_name: "", phone_number: "", email: "", drivers_license_no: "", drivers_license_state: "" };

const FIELDS: { key: keyof Profile; label: string; type?: string; auto?: string }[] = [
  { key: "first_name", label: "First name", auto: "given-name" },
  { key: "last_name", label: "Last name", auto: "family-name" },
  { key: "phone_number", label: "Phone", type: "tel", auto: "tel" },
  { key: "email", label: "Email", type: "email", auto: "email" },
  { key: "drivers_license_no", label: "Driver's license number" },
  { key: "drivers_license_state", label: "Driver's License State" },
];

const field = "h-12 rounded-none border-rental-line bg-rental-elevated text-rental-foreground";

const AccountProfile: React.FC = () => {
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string | null>(null);
  const [form, setForm] = useState<Profile>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [pw, setPw] = useState({ current: "", next: "", confirm: "" });
  const [pwSaving, setPwSaving] = useState(false);

  const call = async (body: Record<string, unknown>) => {
    const { data, error } = await supabase.functions.invoke("rental-booking", { body: { userId, ...body } });
    if (error || (data as any)?.error) throw new Error((data as any)?.error || "Please try again.");
    return (data as any).data;
  };

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      const id = data.session?.user.id;
      if (!id) { navigate({ to: "/login", search: { redirect: "/account/profile" } as any, replace: true }); return; }
      setUserId(id);
      const { data: res } = await supabase.functions.invoke("rental-booking", { body: { action: "getProfile", userId: id } });
      const p = (res as any)?.data;
      if (p) setForm({ ...EMPTY, ...Object.fromEntries(Object.entries(p).map(([k, v]) => [k, v ?? ""])) } as Profile);
    });
  }, [navigate]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.email.trim()) { toast({ title: "Email is required", variant: "destructive" }); return; }
    setSaving(true);
    try {
      const { username: _u, ...profile } = form as any;
      await call({ action: "updateProfile", profile });
      toast({ title: "Profile saved" });
    } catch (err: any) { toast({ title: "Could not save", description: err.message, variant: "destructive" }); }
    finally { setSaving(false); }
  };

  const changePw = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pw.next.length < 8) { toast({ title: "New password must be at least 8 characters", variant: "destructive" }); return; }
    if (pw.next !== pw.confirm) { toast({ title: "New passwords don't match", variant: "destructive" }); return; }
    setPwSaving(true);
    try {
      await call({ action: "changePassword", currentPassword: pw.current, newPassword: pw.next });
      setPw({ current: "", next: "", confirm: "" });
      toast({ title: "Password changed" });
    } catch (err: any) { toast({ title: "Could not change password", description: err.message, variant: "destructive" }); }
    finally { setPwSaving(false); }
  };

  return (
    <div className="rentals-showroom flex min-h-screen flex-col bg-rental-background text-rental-foreground">
      <BestLogoBanner />
      <AccountMenu />
      <main className="mobile-wall mx-auto w-full max-w-3xl flex-1 space-y-6 px-4 pb-10 sm:px-8">
        <h1 className="rentals-wordmark text-5xl leading-none sm:text-6xl">PROFILE</h1>
        <form onSubmit={save} className="space-y-4 border border-rental-line bg-rental-surface p-5 max-lg:-mx-4 max-lg:border-x-0">
          <div className="grid gap-4 sm:grid-cols-2">
            {FIELDS.map((f) => (
              <div key={f.key} className="space-y-1.5">
                <Label htmlFor={f.key} className="text-rental-foreground">{f.label}</Label>
                <Input id={f.key} type={f.type || "text"} autoComplete={f.auto} value={form[f.key]} disabled={!userId}
                  onChange={(e) => setForm((p) => ({ ...p, [f.key]: e.target.value }))} className={field} />
              </div>
            ))}
          </div>
          <Button type="submit" size="lg" disabled={saving || !userId} className="w-full rounded-none bg-rental-primary font-semibold text-rental-primary-foreground hover:bg-rental-primary/90">
            {saving ? "Saving…" : "Save profile"}
          </Button>
        </form>
        <form onSubmit={changePw} className="space-y-4 border border-rental-line bg-rental-surface p-5 max-lg:-mx-4 max-lg:border-x-0">
          <h2 className="text-xl font-semibold">Change password</h2>
          {([["current", "Current password", "current-password"], ["next", "New password", "new-password"], ["confirm", "Confirm new password", "new-password"]] as const).map(([k, label, auto]) => (
            <div key={k} className="space-y-1.5">
              <Label htmlFor={`pw-${k}`} className="text-rental-foreground">{label}</Label>
              <Input id={`pw-${k}`} type="password" autoComplete={auto} value={pw[k]} onChange={(e) => setPw((p) => ({ ...p, [k]: e.target.value }))} className={field} />
            </div>
          ))}
          <Button type="submit" size="lg" disabled={pwSaving || !userId} className="w-full rounded-none bg-rental-primary font-semibold text-rental-primary-foreground hover:bg-rental-primary/90">
            {pwSaving ? "Changing…" : "Change password"}
          </Button>
        </form>
      </main>
      <div className="mb-10 flex justify-center">
        <Button asChild size="lg" className="gap-2 rounded-none bg-rental-primary text-rental-primary-foreground hover:bg-rental-primary/90">
          <Link to="/rentals"><ArrowLeft className="h-5 w-5" /> Back to Rentals</Link>
        </Button>
      </div>
    </div>
  );
};

export default AccountProfile;
