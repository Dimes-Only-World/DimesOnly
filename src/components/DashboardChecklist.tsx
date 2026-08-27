import React, { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check, Circle, Rocket, ChevronDown, ChevronUp } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { resolveMembership } from "@/lib/membership";
import { getPlusUpgradeTarget } from "@/lib/freeMembership";

interface DashboardChecklistProps {
  userData: any;
  onProgress?: (percent: number) => void;
}

interface ChecklistItem {
  id: string;
  label: string;
  description: string;
  done: boolean;
  action: () => void;
  cta: string;
}

const DashboardChecklist: React.FC<DashboardChecklistProps> = ({
  userData,
  onProgress,
}) => {
  const navigate = useNavigate();
  const dismissKey = `dimes-checklist-dismissed-${userData?.id}`;
  const [dismissed, setDismissed] = useState(false);
  const [expanded, setExpanded] = useState(true);
  const [hasMedia, setHasMedia] = useState(false);
  const [hasRated, setHasRated] = useState(false);
  const [hasTipped, setHasTipped] = useState(false);
  const [shared, setShared] = useState(false);
  const [referrerIsDime, setReferrerIsDime] = useState(false);

  const readShared = useCallback(
    () => localStorage.getItem(`dimes-shared-link-${userData?.id}`) === "1",
    [userData?.id],
  );

  useEffect(() => {
    setDismissed(localStorage.getItem(dismissKey) === "1");
    setShared(readShared());
    const onUpdate = () => setShared(readShared());
    window.addEventListener("dimes-checklist-updated", onUpdate);
    return () => window.removeEventListener("dimes-checklist-updated", onUpdate);
  }, [dismissKey, readShared]);

  useEffect(() => {
    let cancelled = false;
    if (!userData?.id) return;
    supabase
      .from("user_media")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userData.id)
      .then(({ count }) => {
        if (!cancelled) setHasMedia((count || 0) > 0);
      });
    supabase
      .from("ratings")
      .select("id", { count: "exact", head: true })
      .eq("rater_id", userData.id)
      .then(({ count }) => {
        if (!cancelled) setHasRated((count || 0) > 0);
      });
    supabase
      .from("tips")
      .select("id", { count: "exact", head: true })
      .eq("tipper_id", userData.id)
      .then(({ count }) => {
        if (!cancelled) setHasTipped((count || 0) > 0);
      });
    return () => {
      cancelled = true;
    };
  }, [userData?.id]);

  // Resolve whether the user's referrer is a Dime (stripper/exotic performer).
  useEffect(() => {
    let cancelled = false;
    const referrer = (userData?.referred_by || "").trim();
    if (!referrer) {
      setReferrerIsDime(false);
      return;
    }
    supabase
      .from("public_user_profiles")
      .select("username, user_type")
      .ilike("username", referrer)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled) return;
        const type = String((data as any)?.user_type || "").toLowerCase();
        setReferrerIsDime(type === "stripper" || type === "exotic");
      });
    return () => {
      cancelled = true;
    };
  }, [userData?.referred_by]);

  const referrer = (userData?.referred_by || "").trim();
  const myUsername = (userData?.username || "").trim();
  const rateHref =
    referrerIsDime && referrer
      ? `/rate/?rate=${encodeURIComponent(referrer)}${myUsername ? `&ref=${encodeURIComponent(myUsername)}` : ""}`
      : `/rate-girls${myUsername ? `?ref=${encodeURIComponent(myUsername)}` : ""}`;
  const tipHref =
    referrerIsDime && referrer
      ? `/tip/?tip=${encodeURIComponent(referrer)}${myUsername ? `&ref=${encodeURIComponent(myUsername)}` : ""}`
      : `/tip-girls${myUsername ? `?ref=${encodeURIComponent(myUsername)}` : ""}`;


  const membership = resolveMembership(userData);
  const upgradeTarget = getPlusUpgradeTarget(userData);

  // Only a PAID "Plus" tier counts as upgraded — free promo tiers (Silver/Diamond) do not.
  const PLUS_RANKS: Record<string, number> = {
    silver_plus: 2,
    diamond_plus: 5,
    elite_plus: 7,
  };
  const currentPlusRank = PLUS_RANKS[membership.key] ?? 0;
  const hasUpgraded = currentPlusRank >= (PLUS_RANKS[upgradeTarget.key] ?? 99);

  const items: ChecklistItem[] = [
    {
      id: "photo",
      label: "Add a profile photo",
      description: "Profiles with a photo get far more tips and referrals.",
      done: Boolean(userData?.profile_photo),
      action: () => navigate("/dashboard/profile"),
      cta: "Add photo",
    },
    {
      id: "media",
      label: "Upload your first media",
      description: "Photos and reels put you in the carousels members browse.",
      done: hasMedia,
      action: () => navigate("/dashboard/media"),
      cta: "Upload",
    },
    {
      id: "rate",
      label: "Rate your first Dime",
      description: "Ratings boost rankings and help you get discovered.",
      done: hasRated,
      action: () => navigate(rateHref),
      cta: "Rate",
    },
    {
      id: "tip",
      label: "Tip your first Dime",
      description: "Tipping earns jackpot tickets and supports your favorites.",
      done: hasTipped,
      action: () => navigate(tipHref),
      cta: "Tip",

    },
    {
      id: "share",
      label: "Share your referral link",
      description: "Earn 20% direct and 10% upline on everything they buy.",
      done: shared,
      action: () => navigate("/dashboard/make-money#referral-link"),
      cta: "Get link",
    },
    {
      id: "upgrade",
      label: `Upgrade to ${upgradeTarget.label.replace("Lifetime ", "")}`,
      description: "Unlock profit sharing, overrides and full site access.",
      done: hasUpgraded,
      action: () => navigate(upgradeTarget.href),
      cta: "Upgrade",
    },
  ];

  const completed = items.filter((i) => i.done).length;
  const percent = Math.round((completed / items.length) * 100);

  useEffect(() => {
    onProgress?.(percent);
  }, [percent, onProgress]);

  if (dismissed) return null;

  const dismiss = () => {
    localStorage.setItem(dismissKey, "1");
    setDismissed(true);
  };

  const allDone = completed === items.length;

  return (
    <Card className="mb-6 border-border/60 bg-dimes-surface animate-fade-in">
      <CardContent className="p-5 md:p-6">
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="mb-4 flex w-full items-start justify-between gap-3 text-left"
        >
          <div className="flex items-center gap-2">
            <span className="rounded-lg bg-dimes-magenta/15 p-2 text-dimes-magenta">
              <Rocket className="h-5 w-5" />
            </span>
            <div>
              <h3 className="text-lg font-bold">Finish setting up your account</h3>
              <p className="text-sm text-muted-foreground">
                {completed} of {items.length} steps complete — these are the steps that make money.
              </p>
            </div>
          </div>
          <span className="text-muted-foreground">
            {expanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
          </span>
        </button>

        <div className="mb-4 h-1.5 w-full overflow-hidden rounded-full bg-dimes-surface-elevated">
          <div
            className="h-full rounded-full bg-dimes-magenta transition-all duration-500"
            style={{ width: `${percent}%` }}
          />
        </div>

        {expanded && (
          <>
            {!allDone ? (
              <ul className="space-y-2">
                {items.map((item) => (
                  <li
                    key={item.id}
                    className="flex items-center gap-3 rounded-xl border border-border/60 bg-dimes-surface-elevated p-3"
                  >
                    <span
                      className={
                        item.done
                          ? "flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white"
                          : "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-border text-muted-foreground"
                      }
                    >
                      {item.done ? <Check className="h-3.5 w-3.5" /> : <Circle className="h-2 w-2 fill-current" />}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p
                        className={`text-sm font-semibold ${item.done ? "text-muted-foreground line-through" : ""}`}
                      >
                        {item.label}
                      </p>
                      {!item.done && (
                        <p className="text-xs text-muted-foreground">{item.description}</p>
                      )}
                    </div>
                    {!item.done && (
                      <Button size="sm" variant="secondary" onClick={item.action}>
                        {item.cta}
                      </Button>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <div className="space-y-3">
                <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-center">
                  <p className="font-semibold text-emerald-400">You&apos;re all set!</p>
                  <p className="text-sm text-muted-foreground">Your account setup is complete.</p>
                </div>
                <Button variant="outline" className="w-full" onClick={dismiss}>
                  Close
                </Button>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default DashboardChecklist;
