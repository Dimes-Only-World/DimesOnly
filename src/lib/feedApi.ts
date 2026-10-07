import { supabase } from "@/lib/supabase";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "@/lib/supabase";

// Feed grids request many tiles at once; a burst of ~50 parallel calls makes the
// media function fail to boot (503). Cache, de-duplicate, cap concurrency, retry.
const urlCache = new Map<string, { url: string | null; at: number }>();
const inflight = new Map<string, Promise<string | null>>();
const MAX_CONCURRENT = 4;
let active = 0;
const queue: (() => void)[] = [];
const acquire = () =>
  new Promise<void>((res) => {
    if (active < MAX_CONCURRENT) { active++; res(); } else queue.push(() => { active++; res(); });
  });
const release = () => { active--; queue.shift()?.(); };
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function requestSignedUrl(bucket: string, path: string, expiresIn: number): Promise<string | null> {
  for (let attempt = 0; attempt < 3; attempt++) {
    await acquire();
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
      if (resp.status >= 500) throw new Error(`status ${resp.status}`);
      const json = await resp.json().catch(() => ({}));
      return json?.url || null;
    } catch (e) {
      if (attempt === 2) { console.warn("getSignedFeedUrl failed", path, e); return null; }
    } finally {
      release();
    }
    await wait(400 * (attempt + 1));
  }
  return null;
}

export async function getSignedFeedUrl(bucket: string, path: string, expiresIn = 3600): Promise<string | null> {
  const key = `${bucket}/${path}`;
  const cached = urlCache.get(key);
  if (cached && Date.now() - cached.at < 50 * 60 * 1000) return cached.url;
  const pending = inflight.get(key);
  if (pending) return pending;
  const p = requestSignedUrl(bucket, path, expiresIn).then((url) => {
    if (url) urlCache.set(key, { url, at: Date.now() });
    inflight.delete(key);
    return url;
  });
  inflight.set(key, p);
  return p;
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
