import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Safely decode a URL parameter that might contain special characters
 * Handles cases where the parameter might already be decoded or contain encoded characters
 */
export function decodeUrlParam(param: string | null): string {
  if (!param) return "";

  try {
    // First try to decode the parameter
    const decoded = decodeURIComponent(param);

    // If the decoded version is different from the original, return decoded
    if (decoded !== param) {
      return decoded;
    }

    // If they're the same, the parameter was likely not encoded
    return param;
  } catch (error) {
    // If decoding fails, return the original parameter
    console.warn("Failed to decode URL parameter:", param, error);
    return param;
  }
}

/**
 * Get a referral username from URL search params with proper decoding
 */
export function getReferralUsername(searchParams: URLSearchParams): string {
  const ref = searchParams.get("ref");
  return decodeUrlParam(ref);
}
