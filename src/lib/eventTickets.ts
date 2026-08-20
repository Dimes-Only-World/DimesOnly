import { resolveMembership } from "@/lib/membership";

/**
 * Shared ticketing logic for events.
 *
 * Admins configure free spots in three mutually-exclusive layers:
 *  - Plus layer:   Free Plus (all Plus members) OR Free Silver/Diamond/Elite Plus
 *  - Grouped layer: Free Dimes (replaces Strippers + Exotics), Free Normals (replaces Males + Females)
 *  - Detail layer:  Free Strippers / Free Exotics / Free Males / Free Females
 *
 * Every public surface resolves the viewer's bucket through `resolveFreeAllocation`
 * so labels and remaining counts stay identical across pages.
 */

export interface EventTicketConfig {
  price?: number | null;
  general_admission_price?: number | null;
  males_price?: number | null;
  females_price?: number | null;
  free_spots_strippers?: number | null;
  free_spots_exotics?: number | null;
  free_spots_males?: number | null;
  free_spots_females?: number | null;
  free_spots_dimes?: number | null;
  free_spots_normals?: number | null;
  free_spots_silver_plus?: number | null;
  free_spots_diamond_plus?: number | null;
  free_spots_elite_plus?: number | null;
  free_spots_plus?: number | null;
  plus_ticket_mode?: string | null;
  plus_discount_percent?: number | null;
}

export interface UsedFreeSpots {
  strippers?: number;
  exotics?: number;
  normal?: number;
  males?: number;
  females?: number;
  dimes?: number;
  normals?: number;
  plus?: number;
}

export type FreeBucketKey =
  | "plus"
  | "silver_plus"
  | "diamond_plus"
  | "elite_plus"
  | "dimes"
  | "normals"
  | "strippers"
  | "exotics"
  | "males"
  | "females"
  | "none";

export interface FreeAllocation {
  key: FreeBucketKey;
  /** e.g. "Free Normals" — pages append ": {remaining}" */
  label: string;
  total: number;
  used: number;
  remaining: number;
  /** true when the viewer qualifies through a Plus-member allocation */
  isPlus: boolean;
}

const num = (v: unknown) => {
  const n = Number(v ?? 0);
  return Number.isFinite(n) ? n : 0;
};

export const PLUS_KEYS = ["silver_plus", "diamond_plus", "elite_plus"] as const;

export const isPlusMember = (user: any): boolean => {
  if (!user) return false;
  const key = resolveMembership(user).key;
  return (PLUS_KEYS as readonly string[]).includes(key);
};

export const getPlusTierKey = (user: any): string | null => {
  if (!user) return null;
  const key = resolveMembership(user).key;
  return (PLUS_KEYS as readonly string[]).includes(key) ? key : null;
};

/** Normalizes an entertainer/normal category from a user_type string. */
export const getViewerCategory = (
  userType?: string | null,
  gender?: string | null,
): "stripper" | "exotic" | "female" | "male" => {
  const t = String(userType ?? "").toLowerCase();
  if (t === "stripper") return "stripper";
  if (t === "exotic") return "exotic";
  return String(gender ?? "").toLowerCase() === "female" ? "female" : "male";
};

const bucket = (
  key: FreeBucketKey,
  label: string,
  total: number,
  used: number,
  isPlus = false,
): FreeAllocation => ({
  key,
  label,
  total,
  used,
  remaining: Math.max(0, total - used),
  isPlus,
});

/**
 * Resolves which free bucket applies to the viewer, in priority order:
 * Plus allocations -> grouped (Dimes / Normals) -> per-type.
 */
export const resolveFreeAllocation = (
  event: EventTicketConfig | null | undefined,
  viewer: { user_type?: string | null; gender?: string | null } & Record<string, any>,
  used: UsedFreeSpots = {},
): FreeAllocation => {
  if (!event) return bucket("none", "Free", 0, 0);

  const category = getViewerCategory(
    viewer?.user_type ?? viewer?.userType,
    viewer?.gender,
  );
  const plusTier = getPlusTierKey(viewer);
  const usedPlus = num(used.plus);

  // 1) Plus layer
  if (plusTier) {
    const allPlus = num(event.free_spots_plus);
    if (allPlus > 0) {
      return bucket("plus", "Free Plus", allPlus, usedPlus, true);
    }
    const tierTotals: Record<string, { total: number; label: string; key: FreeBucketKey }> = {
      silver_plus: {
        total: num(event.free_spots_silver_plus),
        label: "Free Silver Plus",
        key: "silver_plus",
      },
      diamond_plus: {
        total: num(event.free_spots_diamond_plus),
        label: "Free Diamond Plus",
        key: "diamond_plus",
      },
      elite_plus: {
        total: num(event.free_spots_elite_plus),
        label: "Free Elite Plus",
        key: "elite_plus",
      },
    };
    const tier = tierTotals[plusTier];
    if (tier && tier.total > 0) {
      return bucket(tier.key, tier.label, tier.total, usedPlus, true);
    }
  }

  const isEntertainer = category === "stripper" || category === "exotic";

  // 2) Grouped layer
  if (isEntertainer) {
    const dimes = num(event.free_spots_dimes);
    if (dimes > 0) {
      const usedDimes =
        used.dimes !== undefined
          ? num(used.dimes)
          : num(used.strippers) + num(used.exotics);
      return bucket("dimes", "Free Dimes", dimes, usedDimes);
    }
  } else {
    const normals = num(event.free_spots_normals);
    if (normals > 0) {
      const usedNormals =
        used.normals !== undefined
          ? num(used.normals)
          : num(used.males) + num(used.females);
      return bucket("normals", "Free Normals", normals, usedNormals);
    }
  }

  // 3) Per-type layer
  switch (category) {
    case "stripper":
      return bucket(
        "strippers",
        "Free Stripper",
        num(event.free_spots_strippers),
        num(used.strippers),
      );
    case "exotic":
      return bucket(
        "exotics",
        "Free Exotic",
        num(event.free_spots_exotics),
        num(used.exotics),
      );
    case "female":
      return bucket(
        "females",
        "Free Females",
        num(event.free_spots_females),
        num(used.females),
      );
    default:
      return bucket("males", "Free Males", num(event.free_spots_males), num(used.males));
  }
};

/** Label shown on tiles/banners, e.g. "Free Normals: 300". */
export const getFreeBadgeLabel = (allocation: FreeAllocation) =>
  `${allocation.label}: ${allocation.remaining}`;

/**
 * General Admission price. When admins set a General Admission price it wins;
 * otherwise the legacy gender-specific price (then legacy `price`) is used.
 */
export const getGeneralAdmissionPrice = (
  event: EventTicketConfig | null | undefined,
  gender?: string | null,
): number => {
  if (!event) return 0;
  const general = num(event.general_admission_price);
  if (general > 0) return general;
  const genderPrice =
    String(gender ?? "").toLowerCase() === "female"
      ? num(event.females_price)
      : num(event.males_price);
  if (genderPrice > 0) return genderPrice;
  return num(event.price);
};

export interface PlusPricing {
  mode: "free" | "discount";
  percent: number;
  /** price a Plus member pays for general admission */
  price: number;
  basePrice: number;
}

export const getPlusPricing = (
  event: EventTicketConfig | null | undefined,
  gender?: string | null,
): PlusPricing => {
  const basePrice = getGeneralAdmissionPrice(event, gender);
  const mode = String(event?.plus_ticket_mode ?? "free").toLowerCase() === "discount"
    ? "discount"
    : "free";
  const percent = Math.min(100, Math.max(0, num(event?.plus_discount_percent)));
  const price =
    mode === "discount"
      ? Math.max(0, Math.round(basePrice * (1 - percent / 100) * 100) / 100)
      : 0;
  return { mode, percent, price, basePrice };
};
