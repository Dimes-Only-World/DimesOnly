import React from "react";
import { CalendarDays, Car } from "lucide-react";
import { Link } from "@/lib/router-compat";

/** Phone-only sticky bar with Book and My Rentals. */
const RentalsMobileBar: React.FC = () => (
  <nav
    aria-label="Quick rentals actions"
    className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-2 border-t border-rental-line bg-rental-background/95 font-barlow backdrop-blur sm:hidden"
    style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
  >
    <Link to="/rentals#fleet" className="flex items-center justify-center gap-2 bg-rental-primary py-3.5 text-sm font-semibold uppercase text-rental-primary-foreground">
      <Car className="h-4 w-4" /> Book
    </Link>
    <Link to="/account/my-rentals" className="flex items-center justify-center gap-2 py-3.5 text-sm font-semibold uppercase text-rental-foreground">
      <CalendarDays className="h-4 w-4" /> My Rentals
    </Link>
  </nav>
);

export default RentalsMobileBar;
