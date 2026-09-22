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
} from "lucide-react";

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
  { label: "MONEY CIRCLE", to: "/feed", Icon: UserPlus },
  { label: "TOP 20", to: "/rankings", Icon: Crown },
  { label: "NEW DIMES", to: "/dimes", Icon: Sparkles },
  { label: "PROFILE INFO", to: "/dashboard/profile#profile-info", Icon: IdCard },
];

interface Props {
  profilePhoto?: string | null;
  username?: string | null;
}

/**
 * Upper-left avatar that flips every 2 seconds between the member's photo and a
 * menu icon. Tapping it opens the full navigation bar with every link + icon.
 */
const DashboardNavAvatar: React.FC<Props> = ({ profilePhoto, username }) => {
  const [showMenuFace, setShowMenuFace] = useState(false);
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

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
            className="fixed left-0 right-0 top-[72px] z-50 border-y border-dimes-magenta/30 bg-white shadow-2xl sm:top-[84px]"
            aria-label="Main navigation"
          >
            <div className="mx-auto grid max-w-7xl grid-cols-3 gap-2 p-3 sm:grid-cols-5 lg:grid-cols-7">
              {DASHBOARD_NAV_LINKS.map(({ label, to, Icon }) => (
                <button
                  key={label + to}
                  onClick={() => go(to)}
                  className="group flex flex-col items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-center transition-all hover:-translate-y-0.5 hover:border-dimes-magenta hover:bg-white hover:shadow"
                >
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-dimes-magenta/10 text-dimes-magenta group-hover:bg-dimes-magenta group-hover:text-white">
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="text-[10px] font-bold leading-tight tracking-wide text-slate-800 sm:text-[11px]">
                    {label}
                  </span>
                </button>
              ))}
            </div>
          </nav>
        </>
      )}
    </>
  );
};

export default DashboardNavAvatar;
