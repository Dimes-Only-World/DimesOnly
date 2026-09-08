import { supabase } from "@/integrations/supabase/client";

export function getAdminUserId(): string | null {
  try {
    const raw = sessionStorage.getItem("adminUser");
    return raw ? JSON.parse(raw).id ?? null : null;
  } catch {
    return null;
  }
}

export async function storeAdmin<T = any>(action: string, params: Record<string, unknown> = {}): Promise<T> {
  const adminUserId = getAdminUserId();
  if (!adminUserId) throw new Error("Admin session expired. Please sign in again.");
  const { data, error } = await supabase.functions.invoke("store-admin", {
    body: { action, adminUserId, ...params },
  });
  if (error) throw new Error(error.message);
  if (data?.error) throw new Error(data.error);
  return data as T;
}

export const centsToInput = (cents: number | null | undefined) =>
  cents == null ? "" : (cents / 100).toFixed(2);

export const inputToCents = (value: string) => Math.round(parseFloat(value || "0") * 100) || 0;
