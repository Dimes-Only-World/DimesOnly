import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, CarFront, FileText, LogOut, UserRound } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import BestLogoBanner from "@/components/rentals/BestLogoBanner";
import AccountMenu, { signOutEverywhere } from "@/components/rentals/AccountMenu";
import { Button } from "@/components/ui/button";

const cards = [
  { to: "/account/my-rentals", title: "My Rentals", text: "Bookings, payments, extensions and Notify Me holds.", icon: CarFront },
  { to: "/account/my-purchases", title: "My Purchases", text: "Buyer applications, status and documents.", icon: FileText },
  { to: "/account/profile", title: "Profile", text: "Name, phone, email, driver's license and password.", icon: UserRound },
] as const;

const AccountHome: React.FC = () => {
  const navigate = useNavigate();
  const [name, setName] = useState<string>("");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) { navigate({ to: "/login", search: { redirect: "/account" } as any, replace: true }); return; }
      const m = data.session.user.user_metadata || {};
      setName(m.first_name || m.username || data.session.user.email || "");
      setReady(true);
    });
  }, [navigate]);

  const logOut = async () => { await signOutEverywhere(); navigate({ to: "/rentals", replace: true }); };

  return (
    <div className="rentals-showroom flex min-h-screen flex-col bg-rental-background text-rental-foreground">
      <BestLogoBanner />
      <AccountMenu />
      <main className="mobile-wall mx-auto w-full max-w-5xl flex-1 px-4 pb-10 sm:px-8">
        <p className="text-xs font-semibold uppercase text-rental-primary">Best Car Rental Services</p>
        <h1 className="rentals-wordmark text-5xl leading-none sm:text-6xl">MY ACCOUNT</h1>
        {ready && name && <p className="mt-2 text-rental-muted">Welcome back, {name}.</p>}
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          {cards.map(({ to, title, text, icon: Icon }) => (
            <Link key={to} to={to} className="group flex flex-col gap-3 border border-rental-line bg-rental-surface p-5 transition-colors hover:border-rental-primary max-lg:-mx-4 max-lg:border-x-0">
              <Icon className="h-6 w-6 text-rental-primary" />
              <p className="text-xl font-semibold">{title}</p>
              <p className="text-sm text-rental-muted">{text}</p>
              <span className="mt-auto inline-flex items-center gap-1 text-sm font-semibold text-rental-primary">Open <ArrowRight className="h-4 w-4" /></span>
            </Link>
          ))}
        </div>
        <button type="button" onClick={logOut} className="mt-6 inline-flex items-center gap-2 border border-rental-line bg-rental-surface px-5 py-3 font-semibold text-rental-primary hover:border-rental-primary">
          <LogOut className="h-4 w-4" /> Log out
        </button>
      </main>
      <div className="mb-10 flex justify-center">
        <Button asChild size="lg" className="gap-2 rounded-none bg-rental-primary text-rental-primary-foreground hover:bg-rental-primary/90">
          <Link to="/rentals"><ArrowLeft className="h-5 w-5" /> Back to Rentals</Link>
        </Button>
      </div>
    </div>
  );
};

export default AccountHome;
