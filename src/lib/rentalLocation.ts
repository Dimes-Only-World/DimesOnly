// Shared display helpers for rental cards and pages.

/** Every rental car is picked up in the LA area; show one consistent location label. */
export function formatRentalLocation(_raw?: string | null): string {
  return "Los Angeles, CA";
}

/** Human label for a stored rental option, e.g. "rent_to_own" -> "rent-to-own". */
export function rentalOptionLabel(option: string): string {
  if (option === "rent_to_own") return "rent-to-own";
  if (option === "long_term") return "long term";
  if (option === "purchase") return "Purchase";
  return option.replace(/_/g, " ");
}
