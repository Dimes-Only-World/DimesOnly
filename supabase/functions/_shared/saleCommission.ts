// Vehicle sale commission helpers: 53% to the direct referrer, 5% to the referrer's referrer.
export const DIRECT_RATE = 0.53;
export const UPLINE_RATE = 0.05;

const isCompany = (v?: string | null) => !v || v.trim().toLowerCase() === "company";

export async function resolveReferralChain(admin: any, referrerUsername?: string | null) {
  const name = (referrerUsername || "").trim();
  if (isCompany(name)) return { referrerId: null as string | null, uplineId: null as string | null, referrerUsername: "Company" };
  const { data: ref } = await admin.from("users").select("id, username, referred_by").ilike("username", name).maybeSingle();
  if (!ref) return { referrerId: null, uplineId: null, referrerUsername: "Company" };
  let uplineId: string | null = null;
  if (!isCompany(ref.referred_by)) {
    const { data: up } = await admin.from("users").select("id").ilike("username", String(ref.referred_by).trim()).maybeSingle();
    if (up && up.id !== ref.id) uplineId = up.id;
  }
  return { referrerId: ref.id as string, uplineId, referrerUsername: ref.username as string };
}

export function computeCommissions(amount: number, referrerId: string | null, uplineId: string | null) {
  const round = (n: number) => Math.round(n * 100) / 100;
  return {
    referrer_commission: referrerId ? round(amount * DIRECT_RATE) : 0,
    upline_commission: uplineId ? round(amount * UPLINE_RATE) : 0,
  };
}

export const areaCode = (phone?: string | null) => {
  const d = String(phone || "").replace(/\D/g, "");
  const n = d.length === 11 && d.startsWith("1") ? d.slice(1) : d;
  return n.length >= 3 ? n.slice(0, 3) : "";
};

export async function signAvatar(admin: any, path?: string | null) {
  if (!path) return null;
  const { data } = await admin.storage.from("credit-app-avatars").createSignedUrl(path, 3600);
  return data?.signedUrl || null;
}
