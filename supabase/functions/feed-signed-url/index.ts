
import { createClient } from "npm:@supabase/supabase-js@2";
import { getCallerId, getVerifiedAdminId, AUTH_HEADERS } from "../_shared/caller.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": AUTH_HEADERS,
};

const reply = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const { bucket, path, expiresIn } = await req.json();
    if (!bucket || !path || typeof path !== "string" || path.includes("..")) return reply({ error: "bucket and path required" }, 400);
    if (!["feed-videos", "feed-photos", "private-media", "user-photos", "user-videos"].includes(bucket)) return reply({ error: "invalid bucket" }, 400);

    const callerId = await getCallerId(req);
    const adminId = callerId ? null : await getVerifiedAdminId(req);
    if (!callerId && !adminId) return reply({ error: "Please sign in to view this media." }, 401);

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // Private media: only the owner, admins, or media published at a member-visible tier.
    if (bucket === "private-media" && !adminId) {
      let allowed = false;
      const { data: owner } = await admin.from("users").select("id, username").eq("id", callerId).maybeSingle();
      if (path.startsWith(`${callerId}/`) || (owner?.username && path.startsWith(`${owner.username}/`))) allowed = true;
      if (!allowed) {
        const q = (v: string) => `"${v.replace(/["\\]/g, "")}"`;
        const { data: media } = await admin
          .from("user_media")
          .select("id")
          .or(`storage_path.eq.${q(path)},media_url.ilike.${q("%" + path.replace(/[%,()]/g, ""))}`)
          .in("content_tier", ["free", "silver", "public"])
          .limit(1);
        allowed = !!media?.length;
      }
      if (!allowed) {
        const { data: feedMedia } = await admin.from("feed_post_media").select("id").eq("storage_path", path).limit(1);
        allowed = !!feedMedia?.length;
      }
      // Locked content: respond softly so the page doesn't crash; the client shows a locked tile.
      if (!allowed) return reply({ url: null, locked: true });
    }

    const ttl = Math.min(Math.max(Number(expiresIn) || 3600, 60), 3600);
    const { data, error } = await admin.storage.from(bucket).createSignedUrl(path, ttl);
    if (error) return reply({ error: "Media not found" }, 404);
    return reply({ url: data.signedUrl });
  } catch {
    return reply({ error: "Could not load media" }, 400);
  }
});
