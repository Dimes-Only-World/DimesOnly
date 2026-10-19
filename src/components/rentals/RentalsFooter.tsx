import React, { useEffect, useState } from "react";
import { Link } from "@/lib/router-compat";
import { buildAuthUrl } from "@/lib/refCapture";
import { CancellationPolicyDialog } from "@/components/rentals/RentalPolicyDialogs";
import { useAppContext } from "@/contexts/AppContext";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { TERMS_EFFECTIVE_DATE, TERMS_SECTIONS } from "@/lib/termsContent";

const APPLY_FORM_URL =
  "https://forms.zohopublic.com/life1consultingcom/form/BestVehicleApplication1/formperma/NEo9COacNFYLprsXe56MgiJ772zuhzaS416FqnuDaVQ";

const RentalsFooter: React.FC = () => {
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [showCancel, setShowCancel] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const { user, setUser } = useAppContext();
  const [loginUrl, setLoginUrl] = useState("/login?redirect=%2Frentals");
  const [signupUrl, setSignupUrl] = useState("/register?redirect=%2Frentals");

  useEffect(() => {
    setLoginUrl(buildAuthUrl("/login", "/rentals"));
    setSignupUrl(buildAuthUrl("/register", "/rentals"));
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
        { label: "Terms of Service", onClick: () => setShowTerms(true) },
        { label: "Cancellation policy", onClick: () => setShowCancel(true) },
        { label: "Privacy Policy", onClick: () => setShowPrivacy(true) },
      ],
    },
  ];

  return (
    <footer className="border-t border-rental-line bg-rental-surface font-barlow">
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
        <div className="mt-10 border-t border-rental-line pt-6 text-center text-xs text-rental-muted">
          © {new Date().getFullYear()} Best Holdings Enterprise, Inc. All rights reserved.
        </div>
      </div>

      <CancellationPolicyDialog open={showCancel} onOpenChange={setShowCancel} />
      <Dialog open={showTerms} onOpenChange={setShowTerms}>
        <DialogContent className="terms-dialog">
          <DialogHeader>
            <DialogTitle>Terms of Service</DialogTitle>
            <DialogDescription>Effective {TERMS_EFFECTIVE_DATE}</DialogDescription>
          </DialogHeader>
          <div className="space-y-6 text-sm leading-relaxed">
            {TERMS_SECTIONS.map((section) => <section key={section.heading} className="space-y-2">
              <h2 className="font-semibold text-foreground">{section.heading}</h2>
              {section.lines.map((line, index) => <p key={index} className="text-muted-foreground">{line}</p>)}
            </section>)}
          </div>
        </DialogContent>
      </Dialog>

      {showPrivacy && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="relative max-h-[80vh] max-w-2xl overflow-y-auto rounded-lg bg-rental-elevated text-rental-foreground shadow-lg">
            <button
              onClick={() => setShowPrivacy(false)}
              className="absolute right-4 top-2 text-2xl font-bold text-rental-muted transition-colors hover:text-rental-primary"
              aria-label="Close"
            >
              ×
            </button>
            <div className="p-6">
              <h4 className="mb-4 text-xl font-bold">PRIVACY POLICY</h4>
              <div className="space-y-4 text-sm">
                <p>
                  <strong>Effective Date:</strong> March 9, 2025
                </p>
                <p>
                  Dimes Only ("we," "our," or "us") is committed to protecting the privacy of our customers, partners,
                  and website visitors.
                </p>
                <p>For the complete privacy policy and terms, please contact us at:</p>
                <p>
                  <strong>Email:</strong> Talent@DimesOnly.World
                  <br />
                  <strong>Phone:</strong> (929) 336-7634
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </footer>
  );
};

export default RentalsFooter;
