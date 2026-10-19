import React from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { CarFront, FileText, Home, LogOut, UserRound } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const items = [
  { to: "/account", label: "Account", icon: Home },
  { to: "/account/my-rentals", label: "My Rentals", icon: CarFront },
  { to: "/account/my-purchases", label: "My Purchases", icon: FileText },
  { to: "/account/profile", label: "Profile", icon: UserRound },
] as const;

export async function signOutEverywhere() {
  for (const k of ["authToken"]) localStorage.removeItem(k);
  for (const k of ["userData", "currentUser", "dimesPushAuthToken"]) sessionStorage.removeItem(k);
  await supabase.auth.signOut().catch(() => {});
}

/** Shared menu shown at the top of every /account page. */
const AccountMenu: React.FC = () => {
  const navigate = useNavigate();
  const logOut = async () => {
    await signOutEverywhere();
    navigate({ to: "/rentals", replace: true });
  };
  return (
    <nav aria-label="Account" className="mx-auto mb-6 flex w-full max-w-5xl flex-wrap gap-px border-y border-rental-line bg-rental-line font-barlow sm:border-x">
      {items.map(({ to, label, icon: Icon }) => (
        <Link
          key={to}
          to={to}
          activeOptions={{ exact: true }}
          activeProps={{ className: "bg-rental-primary text-rental-primary-foreground" }}
          inactiveProps={{ className: "bg-rental-surface text-rental-foreground hover:text-rental-primary" }}
          className="flex flex-1 basis-[45%] items-center justify-center gap-2 px-3 py-3 text-sm font-semibold uppercase sm:basis-0"
        >
          <Icon className="h-4 w-4" /> {label}
        </Link>
      ))}
      <button type="button" onClick={logOut} className="flex flex-1 basis-full items-center justify-center gap-2 bg-rental-surface px-3 py-3 text-sm font-semibold uppercase text-rental-primary hover:bg-rental-elevated sm:basis-0">
        <LogOut className="h-4 w-4" /> Log out
      </button>
    </nav>
  );
};

export default AccountMenu;
