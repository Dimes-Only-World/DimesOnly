import React, { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";
import { hasOpenDialogInDom, isPopupQueueClear, subscribePopupQueue } from "@/lib/popupQueue";
import { resolveMembership } from "@/lib/membership";

/** The stored value is the login instance in which the celebration was shown. */
const STORAGE_KEY = "mansion_party_popup_shown_v3";
const LOGIN_INSTANCE_KEY = "dimes_login_instance";

interface MansionPartyPopupProps {
  /** Current user record; popup is skipped for Plus members. */
  userData?: any;
}

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
  shape: "rect" | "circle";
  rot: number;
  vr: number;
};

const GOLD = ["#F7E7A6", "#E8C87A", "#D4AF37", "#FFF3D1", "#C9A227", "#FDF6E3"];

/** Confetti + fireworks canvas overlay */
const CelebrationCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const resize = () => {
      canvas.width = canvas.offsetWidth * dpr;
      canvas.height = canvas.offsetHeight * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    const w = () => canvas.offsetWidth;
    const h = () => canvas.offsetHeight;
    let particles: Particle[] = [];

    const pick = () => GOLD[Math.floor(Math.random() * GOLD.length)];

    const burstConfetti = (count: number) => {
      for (let i = 0; i < count; i++) {
        particles.push({
          x: Math.random() * w(),
          y: -20 - Math.random() * h() * 0.4,
          vx: (Math.random() - 0.5) * 1.4,
          vy: 1.2 + Math.random() * 2.2,
          life: 0,
          maxLife: 260 + Math.random() * 160,
          size: 4 + Math.random() * 6,
          color: pick(),
          shape: Math.random() > 0.35 ? "rect" : "circle",
          rot: Math.random() * Math.PI,
          vr: (Math.random() - 0.5) * 0.2,
        });
      }
    };

    const firework = () => {
      const cx = w() * (0.15 + Math.random() * 0.7);
      const cy = h() * (0.1 + Math.random() * 0.45);
      const count = 46;
      const color = pick();
      for (let i = 0; i < count; i++) {
        const a = (Math.PI * 2 * i) / count;
        const speed = 1.6 + Math.random() * 2.6;
        particles.push({
          x: cx,
          y: cy,
          vx: Math.cos(a) * speed,
          vy: Math.sin(a) * speed,
          life: 0,
          maxLife: 70 + Math.random() * 40,
          size: 2 + Math.random() * 2.2,
          color: Math.random() > 0.5 ? color : pick(),
          shape: "circle",
          rot: 0,
          vr: 0,
        });
      }
    };

    burstConfetti(140);
    firework();
    const fwTimer = window.setInterval(firework, 900);
    const confettiTimer = window.setInterval(() => burstConfetti(40), 1400);

    let raf = 0;
    const tick = () => {
      ctx.clearRect(0, 0, w(), h());
      particles = particles.filter((p) => p.life < p.maxLife && p.y < h() + 40);
      for (const p of particles) {
        p.life += 1;
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.03;
        p.vx *= 0.995;
        p.rot += p.vr;
        const alpha = Math.max(0, 1 - p.life / p.maxLife);
        ctx.globalAlpha = alpha;
        ctx.fillStyle = p.color;
        ctx.shadowBlur = 12;
        ctx.shadowColor = p.color;
        if (p.shape === "circle") {
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size / 2, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(p.rot);
          ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
          ctx.restore();
        }
      }
      ctx.globalAlpha = 1;
      ctx.shadowBlur = 0;
      raf = requestAnimationFrame(tick);
    };
    tick();

    return () => {
      cancelAnimationFrame(raf);
      clearInterval(fwTimer);
      clearInterval(confettiTimer);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none absolute inset-0 h-full w-full"
      aria-hidden="true"
    />
  );
};

const MansionPartyPopup: React.FC<MansionPartyPopupProps> = ({ userData }) => {
  const [open, setOpen] = useState(false);

  const isPlusMember = React.useMemo(() => {
    const u = userData as any;
    if (!u) return false;
    if (u.silver_plus_active || u.diamond_plus_active || u.business_owner_elite_active) return true;
    return resolveMembership(u).key.endsWith("_plus");
  }, [userData]);

  useEffect(() => {
    // Plus members already have access — nothing to promote.
    if (isPlusMember) return;

    // Older sessions did not receive a login instance. Create one once so stale
    // boolean "shown" flags cannot permanently suppress the celebration.
    let loginInstance = sessionStorage.getItem(LOGIN_INSTANCE_KEY);
    if (!loginInstance) {
      loginInstance = `dashboard:${String((userData as any)?.id ?? "user")}:${Date.now()}`;
      sessionStorage.setItem(LOGIN_INSTANCE_KEY, loginInstance);
    }
    if (sessionStorage.getItem(STORAGE_KEY) === loginInstance) return;

    let cancelled = false;
    let pending = 0;
    // Grace window so other popups can register their slot before we poll.
    let armed = false;
    const armTimer = window.setTimeout(() => {
      armed = true;
      evaluate();
    }, 1200);

    const show = () => {
      if (cancelled || sessionStorage.getItem(STORAGE_KEY) === loginInstance) return;
      sessionStorage.setItem(STORAGE_KEY, loginInstance);
      setOpen(true);
    };

    const evaluate = () => {
      if (cancelled || !armed) return;
      const clear = isPopupQueueClear() && !hasOpenDialogInDom();
      if (!clear) {
        window.clearTimeout(pending);
        pending = 0;
        return;
      }
      if (pending) return;
      // Require the "all clear" state to hold briefly (close animations).
      pending = window.setTimeout(() => {
        pending = 0;
        if (isPopupQueueClear() && !hasOpenDialogInDom()) show();
        else evaluate();
      }, 600);
    };

    const unsubscribe = subscribePopupQueue(evaluate);
    // Poll as a fallback for popups that don't use the queue.
    const poll = window.setInterval(evaluate, 500);
    // Safety net: never let the celebration be swallowed forever.
    const hardFallback = window.setTimeout(() => {
      if (!hasOpenDialogInDom()) show();
    }, 9000);

    return () => {
      cancelled = true;
      unsubscribe();
      window.clearTimeout(armTimer);
      window.clearTimeout(pending);
      window.clearTimeout(hardFallback);
      window.clearInterval(poll);
    };
  }, [isPlusMember, userData]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent
        hideClose
        className="max-w-[94vw] sm:max-w-lg overflow-hidden border border-[hsl(45_70%_60%/0.45)] bg-[#0B0B0F] p-0 text-white shadow-[0_30px_80px_-20px_rgba(212,175,55,0.45)]"
      >
        {/* luxury backdrop */}
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_80%_at_50%_0%,rgba(212,175,55,0.28),transparent_65%),radial-gradient(90%_60%_at_50%_100%,rgba(255,243,209,0.10),transparent_70%)]" />
        <CelebrationCanvas />

        <div className="relative z-10 flex min-h-[320px] flex-col items-center justify-center px-5 py-10 text-center sm:px-10">
          <div className="mx-auto mb-5 inline-flex items-center gap-2 rounded-full border border-[hsl(45_70%_60%/0.5)] bg-black/50 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.25em] text-[#EBD79A]">
            <Sparkles className="h-3.5 w-3.5" />
            Exclusive Invitation
          </div>

          <h2 className="max-w-full text-balance break-words font-sans text-[26px] font-black leading-[1.12] tracking-tight sm:text-4xl">
            <span className="block bg-gradient-to-b from-[#FFF7DC] via-[#EBD79A] to-[#C9A227] bg-clip-text text-transparent">
              All Plus members get into the
            </span>
            <span className="mt-2 block bg-gradient-to-b from-[#FFF7DC] via-[#F3DFA6] to-[#D4AF37] bg-clip-text text-transparent drop-shadow-[0_2px_18px_rgba(212,175,55,0.35)]">
              Malibu Mansion App Launch Party
            </span>
            <span className="mt-3 block text-[clamp(2.5rem,14vw,3.75rem)] font-black tracking-[0.06em] text-[#FFF3D1] drop-shadow-[0_0_28px_rgba(212,175,55,0.7)] sm:text-6xl sm:tracking-[0.18em]">
              FREE
            </span>
          </h2>

          <div className="mx-auto my-6 h-px w-2/3 bg-gradient-to-r from-transparent via-[#D4AF37] to-transparent" />

          <p className="mx-auto max-w-xs text-sm text-[#E7E2D3]/75 sm:max-w-sm">
            Champagne, ocean views and the entire Dimes Only World crew — reserved
            for Silver Plus, Diamond Plus and Elite Plus members.
          </p>

          <div className="mt-7 flex w-full max-w-xs flex-col gap-3 sm:max-w-sm">
            <Button
              onClick={() => setOpen(false)}
              className="h-12 w-full rounded-xl bg-gradient-to-r from-[#C9A227] via-[#EBD79A] to-[#C9A227] text-base font-bold text-black hover:opacity-90"
            >
              Go to Events for Tickets - Let&apos;s Celebrate
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default MansionPartyPopup;
