import { supabase } from "@/integrations/supabase/client";

export const PURCHASE_DOC_TYPES = [
  { type: "drivers_license", label: "Driver's License", hint: "Front and back" },
  { type: "insurance_card", label: "Insurance Card", hint: "Current card" },
  { type: "paystub", label: "Pay Stubs", hint: "Last 3 months" },
  { type: "proof_of_residence", label: "Proof of Residence", hint: "Dated within the last 30 days" },
  { type: "proof_of_income", label: "Proof of Income", hint: "Tax returns, bank statements, 1099s" },
  { type: "other", label: "Other Document", hint: "Anything else we requested" },
] as const;
export type PurchaseDocType = (typeof PURCHASE_DOC_TYPES)[number]["type"];
export const DOC_ACCEPT = "application/pdf,image/jpeg,image/png,image/webp,image/heic,image/heif";
export const MAX_DOC_BYTES = 10 * 1024 * 1024;

const KEY = "purchaseAppKeys";
export function savedAccessKeys(): Array<{ id: string; key: string }> {
  try { const v = JSON.parse(localStorage.getItem(KEY) || "[]"); return Array.isArray(v) ? v : []; } catch { return []; }
}
export function rememberAccessKey(id: string, key: string) {
  try { const list = savedAccessKeys().filter((k) => k.id !== id); localStorage.setItem(KEY, JSON.stringify([{ id, key }, ...list].slice(0, 20))); } catch { /* ignore */ }
}

const toBase64 = (file: File) => new Promise<string>((resolve, reject) => { const r = new FileReader(); r.onload = () => resolve(String(r.result).split(",")[1] || ""); r.onerror = reject; r.readAsDataURL(file); });

async function call(body: Record<string, unknown>) {
  const { data, error } = await supabase.functions.invoke("submit-vehicle-purchase", { body: { ...body, accessKeys: savedAccessKeys() } });
  if (error) { let msg = ""; try { msg = (await (error as any).context?.json?.())?.error || ""; } catch { /* ignore */ } throw new Error(msg || "Request failed. Please try again."); }
  if ((data as any)?.error) throw new Error((data as any).error);
  return data as any;
}

export async function uploadPurchaseDoc(applicationId: string, docType: PurchaseDocType, file: File) {
  if (file.size > MAX_DOC_BYTES) throw new Error(`${file.name} is larger than 10 MB.`);
  const contentType = file.type || (/\.heic$/i.test(file.name) ? "image/heic" : "");
  return (await call({ action: "uploadDoc", applicationId, docType, fileName: file.name, contentType, base64: await toBase64(file) })).data;
}
export const listMyPurchases = async () => (await call({ action: "listMine" })).data as any[];
export const signMyPurchaseDoc = async (applicationId: string, documentId: string) => (await call({ action: "signDoc", applicationId, documentId })).url as string;
