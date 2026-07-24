import { supabase } from "@/lib/supabase";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "@/lib/supabase";

export async function getSignedFeedUrl(bucket: string, path: string, expiresIn = 3600): Promise<string | null> {
  try {
    const resp = await fetch(`${SUPABASE_URL}/functions/v1/feed-signed-url`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        apikey: SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({ bucket, path, expiresIn }),
    });
    const json = await resp.json();
    return json.url || null;
  } catch (e) {
    console.error("getSignedFeedUrl error", e);
    return null;
  }
}

export type FeedVisibility = "public" | "money_circle";
export type FeedPostType = "photo" | "reel";

export interface FeedPostRow {
  id: string;
  user_id: string;
  post_type: FeedPostType;
  caption: string | null;
  visibility: FeedVisibility;
  like_count: number;
  comment_count: number;
  created_at: string;
}

export interface FeedMediaRow {
  id: string;
  post_id: string;
  media_type: "photo" | "video";
  storage_bucket: string;
  storage_path: string;
  display_order: number;
}

export async function fetchFeed(mode: "all" | "circle", currentUserId?: string) {
  let query = supabase
    .from("feed_posts")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(50);

  if (mode === "circle" && currentUserId) {
    // fetch usernames referred by current user via RPC (bypasses users RLS)
    const { data: refs } = await supabase.rpc("get_my_referrals");
    const ids = ((refs as any[]) || []).map((r: any) => r.id);
    if (ids.length === 0) return { posts: [], media: [], authors: [] };
    query = supabase
      .from("feed_posts")
      .select("*")
      .in("user_id", ids)
      .order("created_at", { ascending: false })
      .limit(50);
  }

  const { data: posts, error } = await query;
  if (error) throw error;
  const postIds = (posts || []).map((p: any) => p.id);
  const userIds = Array.from(new Set((posts || []).map((p: any) => p.user_id)));

  const [{ data: media }, { data: authors }] = await Promise.all([
    postIds.length
      ? supabase.from("feed_post_media").select("*").in("post_id", postIds).order("display_order")
      : Promise.resolve({ data: [] as any[] }),
    userIds.length
      ? supabase.from("public_user_profiles").select("id, username, profile_photo").in("id", userIds)
      : Promise.resolve({ data: [] as any[] }),
  ]);

  return { posts: (posts || []) as FeedPostRow[], media: (media || []) as FeedMediaRow[], authors: (authors || []) as any[] };
}
