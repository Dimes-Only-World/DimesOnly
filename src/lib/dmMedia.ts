import { supabase } from "@/lib/supabase";

/**
 * Create a signed URL for a direct-message attachment stored in `private-media`.
 * Attachments live under the SENDER's folder, so the recipient cannot sign them
 * with the anon client (storage RLS). We go through the `feed-signed-url` edge
 * function (service role) first, and only fall back to the client for own files.
 */
export const getDmSignedUrl = async (
  path: string,
  expiresIn = 3600
): Promise<string | null> => {
  try {
    const { data, error } = await supabase.functions.invoke("feed-signed-url", {
      body: { bucket: "private-media", path, expiresIn },
    });
    if (!error && (data as any)?.url) return (data as any).url as string;
  } catch (e) {
    console.warn("feed-signed-url failed for DM media", path, e);
  }

  try {
    const { data, error } = await supabase.storage
      .from("private-media")
      .createSignedUrl(path, expiresIn);
    if (!error && data?.signedUrl) return data.signedUrl;
  } catch (e) {
    console.warn("client signed url failed for DM media", path, e);
  }

  return null;
};
