import React, { useState } from "react";
import { Link } from "react-router-dom";
import { normalizeRefParam } from "@/lib/utils";
import { CancellationPolicyDialog } from "@/components/rentals/RentalPolicyDialogs";

const APPLY_FORM_URL =
  "https://forms.zohopublic.com/life1consultingcom/form/BestVehicleApplication1/formperma/NEo9COacNFYLprsXe56MgiJ772zuhzaS416FqnuDaVQ";

const RentalsFooter: React.FC = () => {
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [showCancel, setShowCancel] = useState(false);

  const withRef = (path: string) => {
    const ref = normalizeRefParam(new URLSearchParams(window.location.search).get("ref"));
    return ref ? `${path}?ref=${encodeURIComponent(ref)}` : path;
  };

  const columns: { heading: string; links: { label: string; to?: string; href?: string; onClick?: () => void }[] }[] = [
    {
      heading: "Product",
      links: [
        { label: "Book a car", to: "/rentals" },
        { label: "List a car", href: APPLY_FORM_URL },
        { label: "Become a Host", href: APPLY_FORM_URL },
      ],
    },
    {
      heading: "Account",
      links: [
        { label: "Log in", to: withRef("/login") },
        { label: "Sign up", to: withRef("/?signup=1") },
      ],
    },
    {
      heading: "Company",
      links: [
        { label: "Terms of Service", to: "/clothes/terms" },
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
                      <button
                        type="button"
                        onClick={link.onClick}
                        className="text-rental-foreground/80 transition-colors hover:text-rental-primary"
                      >
                        {link.label}
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-10 border-t border-rental-line pt-6 text-center text-xs text-rental-muted">
          © {new Date().getFullYear()} Dimes Only. All rights reserved.
        </div>
      </div>

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
