import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./supabase";

/**
 * Read public data straight from the REST API with the anon key.
 * It never waits on the sign-in session, so a stalled token refresh on a
 * phone (e.g. a tab resumed from the background) can't freeze public pages.
 * Each attempt is capped and retried once.
 */
export async function publicRest<T = any>(path: string, timeoutMs = 12000): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt < 2; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          Accept: "application/json",
        },
        signal: controller.signal,
        cache: "no-store",
      });
      if (!res.ok) throw new Error(`Request failed (${res.status})`);
      return (await res.json()) as T;
    } catch (e) {
      lastError = e;
    } finally {
      clearTimeout(timer);
    }
  }
  throw lastError;
}

/** Build a PostgREST `in.(...)` filter value. */
export const inList = (values: string[]) =>
  `in.(${values.map((v) => encodeURIComponent(`"${v.replace(/"/g, "")}"`)).join(",")})`;
