import { supabase } from "@/integrations/supabase/client";

export interface FlixTitle {
  id: string;
  name: string;
  logline: string;
  description: string;
  genres: string[];
  rating: string;
  year: number;
  duration_minutes: number;
  cast_members: string[];
  tags: string[];
  poster_url: string;
  backdrop_url: string;
  poster_mobile_url?: string;
  backdrop_mobile_url?: string;
  trailer_url: string;
  video_url: string;
  featured: boolean;
  featured_order: number;
  is_original: boolean;
  coming_soon: boolean;
  status: string;
  created_at: string;
}

export interface FlixSubscription {
  id: string;
  user_id: string;
  plan: "monthly" | "annual";
  status: string;
  amount_cents: number;
  current_period_end: string | null;
  is_demo?: boolean;
  created_at: string;
}

export const FLIX_PLANS = {
  monthly: { label: "Monthly", price: 5.99, cents: 599, note: "Charged once per month. Cancel anytime." },
  annual: { label: "Annual", price: 29.99, cents: 2999, note: "Only $2.50 per month the first year. Renews at the then-current annual rate ($59.99 after year 1)." },
};

export const FLIX_DIRECT_RATE = 0.10;
export const FLIX_OVERRIDE_RATE = 0.05;
export const FLIX_MIN_PAYOUT_CENTS = 1000;

export async function fetchLiveTitles(): Promise<FlixTitle[]> {
  const { data, error } = await supabase
    .from("flix_titles")
    .select("*")
    .eq("status", "live")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data || []) as FlixTitle[];
}

export async function fetchTitle(id: string): Promise<FlixTitle | null> {
  const { data, error } = await supabase.from("flix_titles").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return (data as FlixTitle) || null;
}

export async function fetchMySubscription(userId: string): Promise<FlixSubscription | null> {
  const { data, error } = await supabase
    .from("flix_subscriptions")
    .select("*")
    .eq("user_id", userId)
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) return null;
  return (data as FlixSubscription) || null;
}

export interface FlixProgressRow {
  title_id: string;
  seconds: number;
  duration_seconds: number;
  updated_at: string;
}

export async function fetchContinueWatching(userId: string) {
  const { data, error } = await supabase
    .from("flix_watch_progress")
    .select("title_id, seconds, duration_seconds, updated_at, flix_titles(*)")
    .eq("user_id", userId)
    .gt("seconds", 5)
    .order("updated_at", { ascending: false })
    .limit(20);
  if (error) return [];
  return (data || []).filter((r: any) => r.flix_titles?.status === "live");
}

export async function saveProgress(userId: string, titleId: string, seconds: number, duration: number) {
  await supabase.from("flix_watch_progress").upsert(
    { user_id: userId, title_id: titleId, seconds, duration_seconds: duration, updated_at: new Date().toISOString() },
    { onConflict: "user_id,title_id" },
  );
}

export async function fetchMyListIds(userId: string): Promise<string[]> {
  const { data } = await supabase.from("flix_my_list").select("title_id").eq("user_id", userId);
  return (data || []).map((r: any) => r.title_id);
}

export async function toggleMyList(userId: string, titleId: string, inList: boolean) {
  if (inList) {
    await supabase.from("flix_my_list").delete().eq("user_id", userId).eq("title_id", titleId);
  } else {
    await supabase.from("flix_my_list").insert({ user_id: userId, title_id: titleId });
  }
}

export async function recordLinkClick(code: string) {
  if (!code) return;
  try {
    await supabase.from("flix_link_clicks").insert({ referral_code: code.toLowerCase() });
  } catch {
    /* non-blocking */
  }
}

export function getFlixRefCode(): string {
  try {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get("ref");
    if (ref) {
      sessionStorage.setItem("flix_ref", ref);
      return ref;
    }
  } catch { /* ignore */ }
  return sessionStorage.getItem("flix_ref") || "";
}

export const formatCents = (cents: number) => `$${(cents / 100).toFixed(2)}`;

/** Picks the mobile-size image on small screens when one is set. */
export function flixImage(title: Pick<FlixTitle, "poster_url" | "backdrop_url" | "poster_mobile_url" | "backdrop_mobile_url">, kind: "poster" | "backdrop"): string {
  const desktop = kind === "poster" ? title.poster_url : title.backdrop_url;
  const mobile = kind === "poster" ? title.poster_mobile_url : title.backdrop_mobile_url;
  if (mobile && typeof window !== "undefined" && window.innerWidth < 768) return mobile;
  return desktop;
}

export const formatDuration = (mins: number) => {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
};

export const formatClock = (secs: number) => {
  const s = Math.max(0, Math.floor(secs));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = s % 60;
  return h > 0
    ? `${h}:${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}`
    : `${m}:${String(r).padStart(2, "0")}`;
};
