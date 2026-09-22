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
