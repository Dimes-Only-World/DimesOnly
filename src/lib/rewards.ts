import { supabase } from "@/lib/supabase";

export const REWARD_CATEGORIES: Record<string, { label: string; unit: string; money?: boolean; icon: string }> = {
  most_tipped: { label: "Top Tipped", unit: "tipped", money: true, icon: "💸" },
  highest_rated: { label: "Highest Rated", unit: "avg rating", icon: "⭐" },
  car_sales: { label: "Most Car Sales", unit: "cars sold", icon: "🚗" },
  money_circle: { label: "Biggest Money Circle", unit: "sign-ups", icon: "💰" },
  dimes_recruited: { label: "Most Dimes Recruited", unit: "Dimes", icon: "💎" },
  most_likes: { label: "Most Likes", unit: "likes", icon: "❤️" },
  tips_given: { label: "Top Tipper", unit: "given", money: true, icon: "🎁" },
};

export const REWARD_AUDIENCES: Record<string, string> = {
  dimes: "Dimes",
  male: "Men",
  normal_female: "Normal Females",
  business_owner: "Business Owners",
};

export interface Leader { user_id: string; username?: string; avatar?: string | null; score: number; count: number; rank: number }
export interface Contest {
  id: string; title: string; description: string | null; prize_amount: number; prize_label: string | null;
  category: string; contest_type: "most" | "goal"; goal: number | null; audience: string[];
  starts_at: string; ends_at: string | null; status: string; paid_at: string | null; won_at: string | null;
  background_image_url: string | null; featured_user_id: string | null;
  featured_user: { user_id: string; username?: string; avatar?: string | null } | null;
  leaders: Leader[]; participants: number; my: Leader | null;
  winner: { user_id: string; username?: string; avatar?: string | null; score: number } | null;
}

export async function callRewards<T = any>(action: string, extra: Record<string, unknown> = {}): Promise<T> {
  const { data, error } = await supabase.functions.invoke("rewards", { body: { action, ...extra } });
  if (error) {
    let msg = error.message;
    try { msg = (await (error as any).context?.json())?.error || msg; } catch { /* ignore */ }
    throw new Error(msg);
  }
  if ((data as any)?.error) throw new Error((data as any).error);
  return data as T;
}

export const fmtScore = (cat: string, v: number) =>
  REWARD_CATEGORIES[cat]?.money ? `$${Number(v).toLocaleString(undefined, { maximumFractionDigits: 2 })}` : String(v);
