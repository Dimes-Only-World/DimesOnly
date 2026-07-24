import { SUPABASE_ANON_KEY, SUPABASE_URL } from "@/lib/supabase";

export type ReferralEarningsFilters = {
  startDate?: string;
  endDate?: string;
  q?: string;
  membershipType?: string;
  commissionTypes?: string[];
};

export type ReferralEarningsItem = {
  id: string;
  created_at: string;
  amount: number;
  currency: string;
  payment_type: string;
  payment_status: string | null;
  buyer_id: string | null;
  buyer_username: string | null;
  buyer_avatar_url?: string | null;
  buyer_location?: string | null;
  buyer_joined_at?: string | null;
  buyer_membership_tier: string | null;
  plan_tier: string | null;
  cadence: string | null;
  billing_option: string | null;
  subscription_id: string | null;
  source_label: string;
  override_badge: boolean;
  referrer_username?: string | null;
};

export type ReferralEarningsResponse = {
  items: ReferralEarningsItem[];
  total: number;
  total_amount: number;
  page: number;
  page_size: number;
};

const FILTER_STORAGE_PREFIX = "dimes_referral_earnings_filters";
export const REFERRAL_EARNINGS_FILTERS_EVENT = "dimes-referral-earnings-filters-changed";

export const expandCommissionLabels = (labels: string[] = []): string[] => {
  const set = new Set<string>();
  for (const label of labels) {
    const l = label.toLowerCase();
    if (l === "subscription") {
      set.add("subscription_referral_commission");
      set.add("subscription_upline_referral_commission");
    } else if (l === "membership") {
      set.add("referral_commission");
      set.add("upline_referral_commission");
      set.add("diamond_plus_referral_commission");
      set.add("diamond_plus_upline_referral_commission");
    } else {
      set.add(label);
    }
  }
  return Array.from(set);
};

const storageKeyFor = (userId: string) => `${FILTER_STORAGE_PREFIX}:${userId}`;

export const saveReferralEarningsFilters = (
  userId: string,
  filters: ReferralEarningsFilters,
) => {
  if (typeof window === "undefined" || !userId) return;
  const normalized: ReferralEarningsFilters = {
    startDate: filters.startDate || "",
    endDate: filters.endDate || "",
    q: filters.q || "",
    membershipType: filters.membershipType || "all",
    commissionTypes: filters.commissionTypes || [],
  };
  window.localStorage.setItem(storageKeyFor(userId), JSON.stringify(normalized));
  window.dispatchEvent(
    new CustomEvent(REFERRAL_EARNINGS_FILTERS_EVENT, {
      detail: { userId, filters: normalized },
    }),
  );
};

export const loadReferralEarningsFilters = (userId: string): ReferralEarningsFilters => {
  if (typeof window === "undefined" || !userId) return {};
  const raw = window.localStorage.getItem(storageKeyFor(userId));
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as ReferralEarningsFilters;
    return {
      startDate: parsed.startDate || "",
      endDate: parsed.endDate || "",
      q: parsed.q || "",
      membershipType: parsed.membershipType || "all",
      commissionTypes: Array.isArray(parsed.commissionTypes) ? parsed.commissionTypes : [],
    };
  } catch {
    return {};
  }
};

export const buildReferralEarningsUrl = ({
  userId,
  filters = {},
  page = 1,
  pageSize = 25,
  format = "json",
}: {
  userId: string;
  filters?: ReferralEarningsFilters;
  page?: number;
  pageSize?: number;
  format?: "json" | "csv";
}) => {
  const params = new URLSearchParams();
  params.set("user_id", userId);
  if (filters.startDate) params.set("start_date", filters.startDate);
  if (filters.endDate) params.set("end_date", filters.endDate);
  if (filters.q) params.set("q", filters.q);
  if (filters.membershipType && filters.membershipType !== "all") {
    params.set("membership_type", filters.membershipType);
  }
  if (filters.commissionTypes && filters.commissionTypes.length > 0) {
    const expanded = expandCommissionLabels(filters.commissionTypes);
    if (expanded.length > 0) params.set("commission_type", expanded.join(","));
  }
  params.set("page", String(page));
  params.set("page_size", String(pageSize));
  params.set("format", format);
  return `${SUPABASE_URL}/functions/v1/earnings-query?${params.toString()}`;
};

export const fetchReferralEarnings = async ({
  userId,
  filters = {},
  page = 1,
  pageSize = 25,
}: {
  userId: string;
  filters?: ReferralEarningsFilters;
  page?: number;
  pageSize?: number;
}): Promise<ReferralEarningsResponse> => {
  const url = buildReferralEarningsUrl({ userId, filters, page, pageSize, format: "json" });
  const res = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      apikey: SUPABASE_ANON_KEY,
    },
  });
  if (!res.ok) throw new Error(`earnings-query failed: ${res.status}`);
  const body = await res.json();
  const items = (body.items || []) as ReferralEarningsItem[];
  return {
    items,
    total: Number(body.total || items.length),
    total_amount: Number(body.total_amount || 0),
    page: Number(body.page || page),
    page_size: Number(body.page_size || pageSize),
  };
};