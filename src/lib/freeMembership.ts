import { supabase } from "@/integrations/supabase/client";

export const FREE_MEMBERSHIP_YEARS = 3;

export type FreeTier = "silver" | "diamond";

export interface PlusUpgradeTarget {
  key: "silver_plus" | "diamond_plus" | "elite_plus";
  label: string;
  href: string;
}

const normalize = (v: unknown) => String(v ?? "").trim().toLowerCase();

export const isEntertainer = (user: any) =>
  ["exotic", "stripper"].includes(normalize(user?.user_type ?? user?.userType));

export const isBusinessOwner = (user: any) =>
  Boolean(user?.is_business_owner) ||
  ["business_owner", "businessowner"].includes(normalize(user?.user_type ?? user?.userType));

/** The free 3-year tier a member is granted at registration. */
export const getFreeTier = (user: any): FreeTier => {
  const stored = normalize(user?.free_membership_tier);
  if (stored === "diamond" || stored === "silver") return stored;
  return isEntertainer(user) ? "diamond" : "silver";
};

export const getFreeTierLabel = (user: any) =>
  getFreeTier(user) === "diamond" ? "Free Diamond Membership" : "Free Silver Membership";

/** Lifetime "Plus" upgrade available to this member right now. */
export const getPlusUpgradeTarget = (user: any): PlusUpgradeTarget => {
  if (isBusinessOwner(user)) {
    return { key: "elite_plus", label: "Lifetime Elite Plus", href: "/elite-plus" };
  }
  if (isEntertainer(user)) {
    return { key: "diamond_plus", label: "Lifetime Diamond Plus", href: "/upgrade-diamond" };
  }
  return { key: "silver_plus", label: "Lifetime Silver Plus", href: "/upgrade-silver-plus" };
};

/** Reads the public app launch date. Null means the app has not launched yet. */
export const fetchAppLaunchDate = async (): Promise<Date | null> => {
  try {
    const { data } = await supabase
      .from("app_settings" as any)
      .select("value")
      .eq("key", "app_public_launch_at")
      .maybeSingle();
    const raw = (data as any)?.value?.value;
    if (!raw) return null;
    const d = new Date(raw);
    return Number.isNaN(d.getTime()) ? null : d;
  } catch {
    return null;
  }
};

export interface FreeMembershipStatus {
  tier: FreeTier;
  label: string;
  launched: boolean;
  launchDate: Date | null;
  /** End of the 3 free years, or null while the app has not launched. */
  expiresAt: Date | null;
  daysRemaining: number | null;
  /** True when the current tier comes from the free promo (not a paid upgrade). */
  onFreePromo: boolean;
}

export const buildFreeMembershipStatus = (
  user: any,
  launchDate: Date | null,
): FreeMembershipStatus => {
  const tier = getFreeTier(user);
  let expiresAt: Date | null = null;
  if (launchDate) {
    expiresAt = new Date(launchDate);
    expiresAt.setFullYear(expiresAt.getFullYear() + FREE_MEMBERSHIP_YEARS);
  }
  const daysRemaining = expiresAt
    ? Math.max(0, Math.ceil((expiresAt.getTime() - Date.now()) / 86_400_000))
    : null;

  return {
    tier,
    label: getFreeTierLabel(user),
    launched: Boolean(launchDate && launchDate.getTime() <= Date.now()),
    launchDate,
    expiresAt,
    daysRemaining,
    onFreePromo: normalize(user?.membership_source || "free_promo") === "free_promo",
  };
};
