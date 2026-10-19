import cyber from "@/assets/rentals/cybertrucks.png.asset.json";
import fleet from "@/assets/rentals/fleet-maxima.png.asset.json";

/** One slide in the rentals "updates" carousel (managed in Admin → Rentals → Updates). */
export interface RentalUpdate {
  id: string;
  title: string;
  body: string;
  /** Private storage path in vehicle-media (admin uploads). */
  path?: string | null;
  /** Bundled/default image URL. */
  image_url?: string | null;
}

export const DEFAULT_RENTAL_UPDATES: RentalUpdate[] = [
  { id: "default-1", title: "New Bullet-Proof CyberTrucks coming soon", body: "", image_url: cyber.url },
  { id: "default-2", title: "Buy a fleet of cars and make money with Best", body: "From economy to luxury click Purchase below", image_url: fleet.url },
];

export function parseRentalUpdates(value: unknown): RentalUpdate[] {
  const items = (value as any)?.items;
  if (!Array.isArray(items)) return DEFAULT_RENTAL_UPDATES;
  return items.filter((x: any) => x && typeof x.id === "string");
}
