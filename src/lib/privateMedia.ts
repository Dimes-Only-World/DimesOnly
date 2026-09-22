import { supabase } from "@/lib/supabase";
import { getSignedFeedUrl } from "@/lib/feedApi";

const MARKER = "/private-media/";
const cache = new Map<string, string>();

/** Extract the storage path from a public-style URL pointing at private-media. */
export const privateMediaPath = (url: string | null | undefined): string | null => {
  if (!url) return null;
  const idx = url.indexOf(MARKER);
  if (idx === -1) return null;
  return decodeURIComponent(url.slice(idx + MARKER.length).split("?")[0]);
};

/**
 * The `private-media` bucket is not public, so stored ".../object/public/private-media/..."
 * URLs render blank. Swap them for a short-lived signed URL.
 */
export const resolveMediaUrl = async (url: string): Promise<string> => {
  const path = privateMediaPath(url);
  if (!path) return url;
  const cached = cache.get(path);
  if (cached) return cached;

  try {
    const { data, error } = await supabase.storage
      .from("private-media")
      .createSignedUrl(path, 3600);
    if (!error && data?.signedUrl) {
      cache.set(path, data.signedUrl);
      return data.signedUrl;
    }
  } catch {
    /* fall through to edge function */
  }

  const signed = await getSignedFeedUrl("private-media", path, 3600);
  if (signed) {
    cache.set(path, signed);
    return signed;
  }
  return url;
};

/** Resolve many URLs at once, returning a map keyed by the original URL. */
export const resolveMediaUrls = async (urls: string[]): Promise<Record<string, string>> => {
  const unique = Array.from(new Set(urls.filter(Boolean)));
  const entries = await Promise.all(
    unique.map(async (u) => [u, await resolveMediaUrl(u)] as const),
  );
  return Object.fromEntries(entries);
};
