import { supabase } from "@/lib/supabase";

export interface DashboardAd {
  id: string;
  slot_number: number;
  position: number;
  title: string | null;
  media_url: string | null;
  media_type: "image" | "gif" | "video";
  link_url: string | null;
  is_active: boolean;
}

/** Active, filled ad spots in display order. */
export async function fetchActiveAds(): Promise<DashboardAd[]> {
  const { data, error } = await supabase
    .from("dashboard_ads")
    .select("id, slot_number, position, title, media_url, media_type, link_url, is_active")
    .eq("is_active", true)
    .not("media_url", "is", null)
    .order("position", { ascending: true });
  if (error) {
    console.warn("fetchActiveAds failed", error.message);
    return [];
  }
  return (data || []) as DashboardAd[];
}

/** Log an advertisement click so admins can report on it. Never blocks the click. */
export async function recordAdClick(
  ad: DashboardAd,
  userId?: string | null,
  username?: string | null,
): Promise<void> {
  try {
    await supabase.from("dashboard_ad_clicks").insert({
      ad_id: ad.id,
      user_id: userId || null,
      username: username || null,
      link_url: ad.link_url,
    });
  } catch (e) {
    console.warn("recordAdClick failed", e);
  }
}
