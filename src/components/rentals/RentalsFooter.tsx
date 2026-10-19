import React, { useEffect, useState } from "react";
import { Link } from "@/lib/router-compat";
import { buildAuthUrl } from "@/lib/refCapture";
import RentalsMobileBar from "@/components/rentals/RentalsMobileBar";
import { RENTALS_HOURS, RENTALS_PHONE_DISPLAY, RENTALS_PHONE_TEL } from "@/lib/rentalsContact";
import { useAppContext } from "@/contexts/AppContext";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";

const APPLY_FORM_URL =
  "https://forms.zohopublic.com/life1consultingcom/form/BestVehicleApplication1/formperma/NEo9COacNFYLprsXe56MgiJ772zuhzaS416FqnuDaVQ";

const RentalsFooter: React.FC = () => {
  const { user, setUser } = useAppContext();
  const [loginUrl, setLoginUrl] = useState("/login?redirect=%2Frentals");
  const [signupUrl, setSignupUrl] = useState("/rentals/signup?redirect=%2Frentals");

  useEffect(() => {
    setLoginUrl(buildAuthUrl("/login", "/rentals"));
    setSignupUrl(buildAuthUrl("/rentals/signup", "/rentals"));
  }, []);

  const logout = async () => {
    localStorage.removeItem("authToken");
    sessionStorage.removeItem("userData");
    sessionStorage.removeItem("currentUser");
    sessionStorage.removeItem("dimesPushAuthToken");
    setUser(null);
    await supabase.auth.signOut().catch(() => {});
    window.location.assign("/rentals");
  };

  const columns: { heading: string; links: { label: string; to?: string; href?: string; onClick?: () => void }[] }[] = [
    {
      heading: "Product",
      links: [
        { label: "Book a car", to: "/rentals" },
        { label: "List a car", to: "/rentals/list" },
        { label: "Become a Host", to: "/rentals/host/apply" },
        { label: "My Fleet", to: "/rentals/my-fleet" },
        { label: "Purchase", to: "/rentals/purchase" },
      ],
    },
    {
      heading: "Account",
      links: [
        { label: "My Rentals", to: "/account/my-rentals" },
        { label: "My Purchases", to: "/account/my-purchases" },
        ...(user
          ? [{ label: "Log out", onClick: logout }]
          : [
              { label: "Log in", to: loginUrl },
              { label: "Sign up", to: signupUrl },
            ]),
      ],
    },
    {
      heading: "Company",
      links: [
        { label: "Terms of Service", to: "/terms" },
        { label: "Cancellation policy", to: "/cancellation" },
        { label: "Privacy Policy", to: "/privacy" },
      ],
    },
  ];

  return (
    <footer className="border-t border-rental-line bg-rental-surface pb-14 font-barlow sm:pb-0">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 text-center sm:grid-cols-3 sm:text-left">
          {columns.map((col) => (
            <div key={col.heading}>
              <h4 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-rental-muted">
                {col.heading}
              </h4>
              <ul className="mt-3 space-y-2 text-sm">
                {col.links.map((link) => (
                  <li key={link.label}>
                    {link.to ? (
                      <Link to={link.to} className="text-rental-foreground/80 transition-colors hover:text-rental-primary">
                        {link.label}
                      </Link>
                    ) : link.href ? (
                      <a
                        href={link.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-rental-foreground/80 transition-colors hover:text-rental-primary"
                      >
                        {link.label}
                      </a>
                    ) : (
                      <Button
                        type="button"
                        variant="link"
                        onClick={link.onClick}
                        className="h-auto p-0 font-normal text-rental-foreground/80 transition-colors hover:text-rental-primary"
                      >
                        {link.label}
                      </Button>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-8 text-center text-sm text-rental-foreground/80">
          Call or text <a href={`tel:${RENTALS_PHONE_TEL}`} className="font-semibold text-rental-primary">{RENTALS_PHONE_DISPLAY}</a>
          <span className="block text-xs text-rental-muted sm:inline sm:before:content-['_·_']">{RENTALS_HOURS}</span>
        </div>
        <div className="mt-6 border-t border-rental-line pt-6 text-center text-xs text-rental-muted">
          © {new Date().getFullYear()} Best Holdings Enterprise, Inc. All rights reserved.
        </div>
      </div>

      <RentalsMobileBar />
    </footer>
  );
};

export default RentalsFooter;
