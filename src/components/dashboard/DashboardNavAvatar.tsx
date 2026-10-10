import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  User as UserIcon,
  LayoutGrid,
  DollarSign,
  Star,
  Sparkles,
  CalendarDays,
  Car,
  Shirt,
  Flame,
  Bell,
  TrendingUp,
  MessageSquare,
  Image as ImageIcon,
  Trophy,
  Users,
  Crown,
  UserPlus,
  IdCard,
  X,
  Rocket,
  ChevronDown,
  ChevronUp,
  LogOut,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAppContext } from "@/contexts/AppContext";
import { useAccountSetup } from "@/hooks/useAccountSetup";
import ShareLinkDialog from "./ShareLinkDialog";

export interface NavLink {
  label: string;
  to: string;
  Icon: React.ComponentType<{ className?: string }>;
}

export const DASHBOARD_NAV_LINKS: NavLink[] = [
  { label: "TIP & WIN", to: "/tip-girls", Icon: DollarSign },
  { label: "RATE", to: "/rate-girls", Icon: Star },
  { label: "DIMES", to: "/dimes", Icon: Sparkles },
  { label: "EVENTS", to: "/events", Icon: CalendarDays },
  { label: "GET A CAR", to: "/rentals", Icon: Car },
  { label: "CLOTHES", to: "/clothes", Icon: Shirt },
  { label: "FLAMEFLIX", to: "/flix", Icon: Flame },
  { label: "PROFILE", to: "/dashboard/profile", Icon: UserIcon },
  { label: "MAKE MONEY", to: "/dashboard/make-money", Icon: DollarSign },
  { label: "NOTIFICATIONS", to: "/dashboard/notifications", Icon: Bell },
  { label: "EARNINGS", to: "/dashboard/earnings", Icon: TrendingUp },
  { label: "MESSAGES", to: "/dashboard/messages", Icon: MessageSquare },
  { label: "MEDIA", to: "/dashboard/media", Icon: ImageIcon },
  { label: "JACKPOT", to: "/dashboard/jackpot", Icon: Trophy },
  { label: "REFERRALS", to: "/dashboard/referrals", Icon: Users },
  { label: "MONEY CIRCLE", to: "/money-circle", Icon: UserPlus },
  { label: "TOP 20", to: "/rankings", Icon: Crown },
  { label: "NEW DIMES", to: "/dimes", Icon: Sparkles },
];

export const PROFILE_INFO_LINK: NavLink = {
  label: "PROFILE INFO",
  to: "/dashboard/profile-info",
  Icon: IdCard,
};

interface Props {
  profilePhoto?: string | null;
  username?: string | null;
  onLogout?: () => void;
}

/** Menu tiles that show an unread badge; categories come from the shared notification rules. */
const BADGE_RULES: Record<string, (type: string, link: string, cat: NotificationCategory) => boolean> = {
  "MAKE MONEY": (t, l) => l.includes("make-money"),
  NOTIFICATIONS: () => true,
  EARNINGS: (_t, _l, c) => c === "earnings",
  MESSAGES: (_t, _l, c) => c === "messages",
  MEDIA: (_t, _l, c) => c === "media",
  JACKPOT: (t, l) => l.includes("jackpot") || /jackpot|tip/.test(t),
  REFERRALS: (_t, _l, c) => c === "referrals",
  "MONEY CIRCLE": (t, l) => l.includes("money-circle") || t.includes("money_circle"),
};

const useUnreadBadges = () => {
  const { user } = useAppContext();
  const [counts, setCounts] = useState<Record<string, number>>({});
  const userId = user?.id;
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    const load = async () => {
      const { data } = await supabase
        .from("notifications")
        .select("type, link, data")
        .eq("recipient_id", userId)
        .eq("is_read", false)
        .limit(200);
      if (cancelled) return;
      const next: Record<string, number> = {};
      for (const n of (data || []) as { type: string | null; link: string | null; data: unknown }[]) {
        const t = (n.type || "").toLowerCase();
        const l = (n.link || "").toLowerCase();
        const c = categorizeNotification(n.type, n.link, n.data);
        for (const [label, match] of Object.entries(BADGE_RULES)) {
          if (match(t, l, c)) next[label] = (next[label] || 0) + 1;
        }
      }
      setCounts(next);
    };
    void load();
    const channel = supabase
      .channel(`nav-badges-${userId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "notifications", filter: `recipient_id=eq.${userId}` }, () => void load())
      .subscribe();
    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [userId]);
  return counts;
};

/**
 * Upper-left avatar that flips every 2 seconds between the member's photo and a
 * menu icon. Tapping it opens the full navigation bar with every link + icon.
 */
const DashboardNavAvatar: React.FC<Props> = ({ profilePhoto, username, onLogout }) => {
  const badges = useUnreadBadges();
  const [showMenuFace, setShowMenuFace] = useState(false);
  const [open, setOpen] = useState(false);
  const [setupOpen, setSetupOpen] = useState(false);
  const navigate = useNavigate();
  const setup = useAccountSetup();
  const [shareOpen, setShareOpen] = useState(false);
  const showSetup = setup.hasUser && !setup.loading && !setup.allDone;

  useEffect(() => {
    if (open) return;
    const id = window.setInterval(() => setShowMenuFace((v) => !v), 2000);
    return () => window.clearInterval(id);
  }, [open]);

  const go = (to: string) => {
    setOpen(false);
    navigate(to);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "Close navigation" : "Open navigation"}
        aria-expanded={open}
        className="relative flex h-12 w-12 sm:h-14 sm:w-14 shrink-0 items-center justify-center overflow-hidden rounded-full ring-2 ring-dimes-magenta shadow-md transition-all hover:ring-4 bg-slate-200"
        style={{ perspective: "600px" }}
      >
        <span
          className="flex h-full w-full items-center justify-center transition-transform duration-500"
          style={{ transform: showMenuFace && !open ? "rotateY(180deg)" : "rotateY(0deg)" }}
        >
          {open ? (
            <X className="h-6 w-6 text-slate-700" />
          ) : showMenuFace ? (
            <span className="flex h-full w-full items-center justify-center bg-dimes-magenta">
              <LayoutGrid className="h-6 w-6 text-white" style={{ transform: "rotateY(180deg)" }} />
            </span>
          ) : profilePhoto ? (
            <img
              src={profilePhoto}
              alt={username ? `${username} profile` : "Profile"}
              className="h-full w-full object-cover"
            />
          ) : (
            <UserIcon className="h-6 w-6 text-slate-600" />
          )}
        </span>
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/40"
            onClick={() => setOpen(false)}
            aria-hidden
          />
          <nav
            className="fixed left-0 right-0 top-[72px] z-50 max-h-[calc(100dvh-72px)] overflow-y-auto overscroll-contain border-y border-dimes-magenta/30 bg-white pb-[env(safe-area-inset-bottom)] shadow-2xl sm:top-[84px] sm:max-h-[calc(100dvh-84px)]"
            aria-label="Main navigation"
          >
            {showSetup && (
              <div className="mx-auto max-w-7xl px-3 pt-3">
                <button
                  type="button"
                  onClick={() => setSetupOpen((v) => !v)}
                  className="w-full rounded-xl border border-dimes-magenta/40 bg-dimes-magenta/10 px-4 py-3 text-left"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-2">
                      <Rocket className="h-5 w-5 shrink-0 text-dimes-magenta" />
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-slate-900">Finish setting up your account</p>
                        <p className="text-xs text-slate-600">
                          {setup.completed} of {setup.total} steps complete
                        </p>
                      </div>
                    </div>
                    {setupOpen ? (
                      <ChevronUp className="h-4 w-4 text-slate-600" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-slate-600" />
                    )}
                  </div>
                  <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white">
                    <div
                      className="h-full rounded-full bg-dimes-magenta transition-all duration-500"
                      style={{ width: `${setup.percent}%` }}
                    />
                  </div>
                </button>

                {setupOpen && (
                  <ul className="mt-2 space-y-1.5">
                    {setup.steps
                      .filter((s) => !s.done)
                      .map((s) => (
                        <li
                          key={s.id}
                          className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2"
                        >
                          <span className="text-sm font-medium text-slate-800">{s.label}</span>
                          <button
                            onClick={() => (s.id === "share" ? setShareOpen(true) : go(s.href))}
                            className="rounded-md bg-dimes-magenta px-3 py-1 text-xs font-bold text-white"
                          >
                            {s.cta}
                          </button>
                        </li>
                      ))}
                  </ul>
                )}
              </div>
            )}

            <div className="mx-auto grid max-w-7xl grid-cols-2 gap-2 p-3 min-[480px]:grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-7">
              {DASHBOARD_NAV_LINKS.map(({ label, to, Icon }) => (
                <button
                  key={label + to}
                  onClick={() => go(to)}
                  className="group flex min-w-0 flex-col items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 p-2 sm:p-2.5 text-center transition-all hover:-translate-y-0.5 hover:border-dimes-magenta hover:bg-white hover:shadow"
                >
                  <span className="relative flex h-9 w-9 items-center justify-center rounded-full bg-dimes-magenta/10 text-dimes-magenta group-hover:bg-dimes-magenta group-hover:text-white">
                    <Icon className="h-4 w-4" />
                    {badges[label] > 0 && (
                      <span
                        aria-label={`${badges[label]} unread`}
                        className="absolute -right-2 -top-1.5 flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-red-600 px-1 text-[0.6875rem] font-bold leading-none text-white ring-2 ring-white"
                      >
                        {badges[label] > 9 ? "9+" : badges[label]}
                      </span>
                    )}
                  </span>
                  <span className="w-full whitespace-normal break-normal text-xs font-bold leading-snug tracking-normal text-slate-800 [overflow-wrap:normal]">
                    {label}
                  </span>
                </button>
              ))}
              {onLogout && (
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    onLogout();
                  }}
                  className="group flex min-w-0 flex-col items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 p-2 sm:p-2.5 text-center transition-all hover:-translate-y-0.5 hover:border-red-500 hover:bg-white hover:shadow"
                >
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-red-500/10 text-red-600 group-hover:bg-red-600 group-hover:text-white">
                    <LogOut className="h-4 w-4" />
                  </span>
                  <span className="w-full text-xs font-bold leading-snug text-slate-800">LOG OUT</span>
                </button>
              )}
            </div>

            {showSetup && (
              <div className="mx-auto max-w-7xl px-3 pb-3">
                <button
                  onClick={() => go(PROFILE_INFO_LINK.to)}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-dimes-magenta/40 bg-dimes-magenta/10 px-4 py-3 text-sm font-bold tracking-wide text-slate-900 transition-colors hover:bg-dimes-magenta hover:text-white"
                >
                  <PROFILE_INFO_LINK.Icon className="h-4 w-4" />
                  {PROFILE_INFO_LINK.label}
                </button>
              </div>
            )}
          </nav>
        </>
      )}
      <ShareLinkDialog open={shareOpen} onOpenChange={setShareOpen} userId={setup.userId} username={setup.username} />
    </>
  );
};

export default DashboardNavAvatar;
