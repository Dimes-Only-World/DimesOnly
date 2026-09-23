import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { resolveMembership } from "@/lib/membership";
import { getPlusUpgradeTarget } from "@/lib/freeMembership";

export interface SetupStep {
  id: string;
  label: string;
  href: string;
  cta: string;
  done: boolean;
}

const readStoredUser = (): any | null => {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem("userData");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

/**
 * Shared "Finish setting up your account" progress, usable from the navigation
 * bar as well as the dashboard.
 */
export function useAccountSetup(externalUser?: any) {
  const [userData, setUserData] = useState<any | null>(externalUser || readStoredUser());
  const [hasMedia, setHasMedia] = useState(false);
  const [hasRated, setHasRated] = useState(false);
  const [hasTipped, setHasTipped] = useState(false);
  const [shared, setShared] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (externalUser?.id) setUserData(externalUser);
  }, [externalUser?.id]);

  const readShared = useCallback(
    () => localStorage.getItem(`dimes-shared-link-${userData?.id}`) === "1",
    [userData?.id],
  );

  useEffect(() => {
    setShared(readShared());
    const onUpdate = () => setShared(readShared());
    window.addEventListener("dimes-checklist-updated", onUpdate);
    return () => window.removeEventListener("dimes-checklist-updated", onUpdate);
  }, [readShared]);

  useEffect(() => {
    let cancelled = false;
    const id = userData?.id;
    if (!id) return;
    setLoading(true);
    Promise.all([
      supabase.from("user_media").select("id", { count: "exact", head: true }).eq("user_id", id),
      supabase.from("ratings").select("id", { count: "exact", head: true }).eq("rater_id", id),
      supabase.from("tips").select("id", { count: "exact", head: true }).eq("tipper_id", id),
    ]).then(([media, rated, tipped]) => {
      if (cancelled) return;
      setHasMedia((media.count || 0) > 0);
      setHasRated((rated.count || 0) > 0);
      setHasTipped((tipped.count || 0) > 0);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [userData?.id]);

  const membership = resolveMembership(userData);
  const upgradeTarget = getPlusUpgradeTarget(userData);
  const PLUS_RANKS: Record<string, number> = {
    silver_plus: 2,
    diamond_plus: 5,
    elite_plus: 7,
  };
  const hasUpgraded = (PLUS_RANKS[membership.key] ?? 0) >= (PLUS_RANKS[upgradeTarget.key] ?? 99);
  const myUsername = String(userData?.username || "").trim();
  const refQuery = myUsername ? `?ref=${encodeURIComponent(myUsername)}` : "";

  const steps: SetupStep[] = [
    {
      id: "photo",
      label: "Add a profile photo",
      href: "/dashboard/profile-info",
      cta: "Add photo",
      done: Boolean(userData?.profile_photo),
    },
    { id: "media", label: "Upload your first media", href: "/dashboard/media", cta: "Upload", done: hasMedia },
    { id: "rate", label: "Rate your first Dime", href: `/rate-girls${refQuery}`, cta: "Rate", done: hasRated },
    { id: "tip", label: "Tip your first Dime", href: `/tip-girls${refQuery}`, cta: "Tip", done: hasTipped },
    {
      id: "share",
      label: "Share your referral link",
      href: "/dashboard/make-money#referral-link",
      cta: "Get link",
      done: shared,
    },
    {
      id: "upgrade",
      label: `Upgrade to ${upgradeTarget.label.replace("Lifetime ", "")}`,
      href: upgradeTarget.href,
      cta: "Upgrade",
      done: hasUpgraded,
    },
  ];

  const completed = steps.filter((s) => s.done).length;
  const percent = Math.round((completed / steps.length) * 100);

  return {
    steps,
    completed,
    total: steps.length,
    percent,
    allDone: completed === steps.length,
    loading: loading || !userData?.id,
    hasUser: Boolean(userData?.id),
  };
}
