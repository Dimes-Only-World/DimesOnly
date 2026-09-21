import { normalizeRefParam } from "@/lib/utils";

/** One shared key for the referral username captured from any ?ref= link. */
export const REF_STORAGE_KEY = "dimes_ref";

/** Reads ?ref= from the current URL and remembers it for the rest of the visit. */
export function captureRefFromUrl(): string {
  try {
    const raw = new URLSearchParams(window.location.search).get("ref");
    if (!raw) return getStoredRef();
    const normalized = normalizeRefParam(raw);
    if (!normalized || normalized.toLowerCase() === "company") return getStoredRef();
    sessionStorage.setItem(REF_STORAGE_KEY, normalized);
    // Keep the legacy FlameFlix key in sync so older reads still work.
    sessionStorage.setItem("flix_ref", normalized);
    return normalized;
  } catch {
    return "";
  }
}

/** The referral username remembered for this visit, if any. */
export function getStoredRef(): string {
  try {
    return sessionStorage.getItem(REF_STORAGE_KEY) || sessionStorage.getItem("flix_ref") || "";
  } catch {
    return "";
  }
}

/** Referral username from the URL if present, otherwise the remembered one. */
export function getActiveRef(): string {
  return captureRefFromUrl() || getStoredRef();
}

/**
 * Builds a /register or /login URL that carries both the referral username
 * and the page the visitor should return to.
 */
export function buildAuthUrl(base: "/register" | "/login", returnTo: string): string {
  const params = new URLSearchParams();
  if (returnTo) params.set("redirect", returnTo);
  const ref = getActiveRef();
  if (ref) params.set("ref", ref);
  const qs = params.toString();
  return qs ? `${base}?${qs}` : base;
}
