import React from "react";

export const SALE_STATUS_LABEL: Record<string, string> = { pending: "Pending", sold: "Sold", declined: "Declined" };

export const SaleStatusBadge = ({ status }: { status: string }) => {
  const cls =
    status === "sold" ? "bg-sale-sold text-background" :
    status === "declined" ? "bg-sale-declined text-background" :
    "bg-sale-pending text-foreground";
  return <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-bold ${cls}`}>{SALE_STATUS_LABEL[status] || "Pending"}</span>;
};

export const MiniAvatar = ({ src, name, size = 32 }: { src?: string | null; name?: string | null; size?: number }) => {
  const initials = (name || "?").split(/\s+/).map((p) => p[0]).join("").slice(0, 2).toUpperCase();
  return src
    ? <img src={src} alt={name || ""} style={{ width: size, height: size }} className="shrink-0 rounded-full border border-border object-cover" />
    : <div style={{ width: size, height: size }} className="flex shrink-0 items-center justify-center rounded-full border border-border bg-muted text-[10px] font-bold text-muted-foreground">{initials}</div>;
};

export const usd = (n: number | null | undefined) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Number(n || 0));

export const shortDate = (v?: string | null) => {
  if (!v) return "—";
  const d = new Date(v.length === 10 ? `${v}T12:00:00Z` : v);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
};
