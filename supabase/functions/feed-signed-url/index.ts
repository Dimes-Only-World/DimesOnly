
import { createClient } from "npm:@supabase/supabase-js@2";
import { getCallerId, getVerifiedAdminId, AUTH_HEADERS } from "../_shared/caller.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": AUTH_HEADERS,
};

const reply = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const BUCKETS = ["feed-videos", "feed-photos", "private-media", "user-photos", "user-videos"];
type Item = { bucket: string; path: string };
const validItem = (i: any): i is Item =>
  i && BUCKETS.includes(i.bucket) && typeof i.path === "string" && i.path.length > 0 && i.path.length < 500 && !i.path.includes("..");

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const body = await req.json();
    const batch = Array.isArray(body?.items);
    const items: Item[] = batch ? body.items : [{ bucket: body?.bucket, path: body?.path }];
    if (!items.length || items.length > 100) return reply({ error: "invalid items" }, 400);
    if (!batch && !validItem(items[0])) return reply({ error: "bucket and path required" }, 400);

    const callerId = await getCallerId(req);
    const adminId = callerId ? null : await getVerifiedAdminId(req);
    // Not signed in (or session expired): respond softly so the page keeps working.
    if (!callerId && !adminId) {
      return batch ? reply({ urls: {}, signInRequired: true }) : reply({ url: null, locked: true, signInRequired: true });
    }

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const ttl = Math.min(Math.max(Number(body?.expiresIn) || 3600, 60), 3600);

    let ownerName: string | null | undefined;
    const canSeePrivate = async (path: string) => {
      if (adminId) return true;
      if (ownerName === undefined) {
        const { data: owner } = await admin.from("users").select("username").eq("id", callerId).maybeSingle();
        ownerName = owner?.username ?? null;
      }
      if (path.startsWith(`${callerId}/`) || (ownerName && path.startsWith(`${ownerName}/`))) return true;
      const q = (v: string) => `"${v.replace(/["\\]/g, "")}"`;
      const { data: media } = await admin.from("user_media").select("id")
        .or(`storage_path.eq.${q(path)},media_url.ilike.${q("%" + path.replace(/[%,()]/g, ""))}`)
        .in("content_tier", ["free", "silver", "public"]).limit(1);
      if (media?.length) return true;
      const { data: feedMedia } = await admin.from("feed_post_media").select("id").eq("storage_path", path).limit(1);
      return !!feedMedia?.length;
    };

    // Group allowed paths by bucket, then sign each bucket in one call.
    const byBucket = new Map<string, string[]>();
    await Promise.all(items.filter(validItem).map(async (i) => {
      if (i.bucket === "private-media" && !(await canSeePrivate(i.path))) return;
      const arr = byBucket.get(i.bucket) || [];
      if (!arr.includes(i.path)) arr.push(i.path);
      byBucket.set(i.bucket, arr);
    }));

    const urls: Record<string, string> = {};
    await Promise.all([...byBucket].map(async ([bucket, paths]) => {
      const { data } = await admin.storage.from(bucket).createSignedUrls(paths, ttl);
      for (const s of data || []) if (s.path && s.signedUrl && !s.error) urls[`${bucket}/${s.path}`] = s.signedUrl;
    }));

    if (batch) return reply({ urls });
    const url = urls[`${items[0].bucket}/${items[0].path}`];
    return url ? reply({ url }) : reply({ url: null, locked: true });
  } catch {
    return reply({ error: "Could not load media" }, 400);
  }
});
