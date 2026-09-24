import { supabase } from "@/lib/supabase";

/** Signed URLs for rental photos (vehicle listings / approved captures), keyed by storage path. */
export async function signRentalMedia(
  bucket: "vehicle-media" | "rental-captures",
  paths: string[],
): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  const unique = Array.from(new Set(paths.filter(Boolean)));
  if (!unique.length) return out;
  try {
    const { data } = await supabase.functions.invoke("rental-media-urls", { body: { bucket, paths: unique } });
    for (const [p, u] of Object.entries((data as any)?.urls || {})) out.set(p, u as string);
  } catch (e) {
    console.warn("rental media signing failed", e);
  }
  return out;
}
