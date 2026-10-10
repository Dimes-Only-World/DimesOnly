export type NotificationCategory = "earnings" | "messages" | "media" | "referrals" | "account";

export const NOTIFICATION_CATEGORIES: { key: NotificationCategory; label: string; link: string }[] = [
  { key: "earnings", label: "Earnings", link: "/dashboard/earnings" },
  { key: "messages", label: "Messages", link: "/dashboard/messages" },
  { key: "media", label: "Media", link: "/dashboard/media" },
  { key: "referrals", label: "Referrals", link: "/dashboard/referrals" },
  { key: "account", label: "Account", link: "/dashboard/profile-info" },
];

const isCategory = (v: unknown): v is NotificationCategory =>
  typeof v === "string" && NOTIFICATION_CATEGORIES.some((c) => c.key === v);

/** One shared rule so the user center, bell, menu badges and admin sender agree. */
export const categorizeNotification = (
  type: string | null | undefined,
  link: string | null | undefined,
  data?: unknown,
): NotificationCategory => {
  const explicit = (data as { category?: unknown } | null | undefined)?.category;
  if (isCategory(explicit)) return explicit;
  const t = (type || "").toLowerCase();
  const l = (link || "").toLowerCase();
  if (l.includes("earnings") || /commission|direct|payout|booking|extension|ticket_sale|event_host|tip|jackpot/.test(t)) return "earnings";
  if (l.includes("referrals") || /referr|upline|money_circle/.test(t)) return "referrals";
  if (l.includes("messages") || t === "message" || t === "admin") return "messages";
  if (l.includes("media") || t === "photo" || t === "video" || /selfie|flyer|media/.test(t)) return "media";
  return "account";
};
