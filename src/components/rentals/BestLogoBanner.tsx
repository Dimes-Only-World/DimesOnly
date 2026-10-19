import React from "react";
import bestLogo from "@/assets/rentals/best-logo.png.asset.json";

/**
 * Best Rental Cars wordmark shown at the top of renter-facing pages.
 *
 * The uploaded PNG is a transparent wordmark, so it is painted through a CSS
 * mask: the fill comes from the theme token, which keeps it legible on the
 * light showroom, the dark showroom, and the account pages alike.
 * Phones get the full viewport width; tablets and computers get a centered block.
 */
const BestLogoBanner: React.FC<{ className?: string }> = ({ className = "" }) => (
  <div
    role="img"
    aria-label="Best Rental Cars"
    className={`rentals-logo-banner relative left-1/2 w-screen max-w-none -translate-x-1/2 sm:left-auto sm:w-auto sm:max-w-none sm:translate-x-0 ${className}`}
  >
    <span
      aria-hidden="true"
      className="rentals-logo-mark"
      style={{ "--rentals-logo-src": `url("${bestLogo.url}")` } as React.CSSProperties}
    />
  </div>
);

export default BestLogoBanner;
