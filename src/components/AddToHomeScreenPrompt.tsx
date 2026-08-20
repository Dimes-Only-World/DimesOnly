import React, { useEffect, useState } from "react";
import { Bell, Download, Share, X } from "lucide-react";
import { useHomeScreenStatus } from "@/hooks/useHomeScreenStatus";
import { acquirePopupSlot, releasePopupSlot } from "@/lib/popupQueue";

const DISMISS_KEY = "dimes-a2hs-dismissed";
const POPUP_ID = "add-to-home-screen";

interface Props {
  /** When true, always render (used as a controlled modal from the notification bell). */
  forceOpen?: boolean;
  onClose?: () => void;
}

const AddToHomeScreenPrompt: React.FC<Props> = ({ forceOpen, onClose }) => {
  const { platform, isMobile, isStandalone, canInstallPrompt, promptInstall } = useHomeScreenStatus();
  const [dismissed, setDismissed] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return sessionStorage.getItem(DISMISS_KEY) === "1";
  });

  // Auto-show banner once per session on mobile browser (not installed).
  const [autoOpen, setAutoOpen] = useState(false);
  useEffect(() => {
    if (forceOpen) return;
    if (!isMobile || isStandalone || dismissed) return;
    // Reserve the popup slot immediately so later popups wait for this one.
    acquirePopupSlot(POPUP_ID);
    const t = setTimeout(() => setAutoOpen(true), 1500);
    return () => clearTimeout(t);
  }, [forceOpen, isMobile, isStandalone, dismissed]);

  const open = forceOpen || autoOpen;

  useEffect(() => {
    if (open) acquirePopupSlot(POPUP_ID);
    return () => releasePopupSlot(POPUP_ID);
  }, [open]);

  if (!open) return null;
  if (isStandalone && !forceOpen) return null;


  const close = () => {
    setAutoOpen(false);
    sessionStorage.setItem(DISMISS_KEY, "1");
    setDismissed(true);
    onClose?.();
  };

  const iosSteps = (
    <ol className="mt-3 space-y-2 text-sm text-slate-200">
      <li className="flex items-start gap-2">
        <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-400 text-[11px] font-bold text-slate-950">1</span>
        <span>Tap the <Share className="mx-1 inline h-4 w-4 text-sky-300" /> <b>Share</b> button in Safari.</span>
      </li>
      <li className="flex items-start gap-2">
        <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-400 text-[11px] font-bold text-slate-950">2</span>
        <span>Scroll and tap <b>Add to Home Screen</b>.</span>
      </li>
      <li className="flex items-start gap-2">
        <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-400 text-[11px] font-bold text-slate-950">3</span>
        <span>Open <b>Dimes Only World</b> from your Home Screen, then enable notifications.</span>
      </li>
    </ol>
  );

  const androidSteps = (
    <ol className="mt-3 space-y-2 text-sm text-slate-200">
      <li className="flex items-start gap-2">
        <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-400 text-[11px] font-bold text-slate-950">1</span>
        <span>Tap the <b>⋮ menu</b> in Chrome.</span>
      </li>
      <li className="flex items-start gap-2">
        <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-400 text-[11px] font-bold text-slate-950">2</span>
        <span>Tap <b>Add to Home screen</b> or <b>Install app</b>.</span>
      </li>
      <li className="flex items-start gap-2">
        <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-400 text-[11px] font-bold text-slate-950">3</span>
        <span>Open the app icon, then enable notifications.</span>
      </li>
    </ol>
  );

  const desktopSteps = (
    <p className="mt-3 text-sm text-slate-300">
      For lock-screen alerts on your phone, open <b>dimesonly.world</b> in your phone browser and add it to your Home Screen.
    </p>
  );

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/70 p-3 sm:items-center">
      <div className="w-full max-w-md overflow-hidden rounded-2xl border border-amber-400/40 bg-slate-950 shadow-2xl shadow-black/60">
        <div className="flex items-center justify-between border-b border-amber-400/20 px-4 py-3">
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-amber-300" />
            <h3 className="text-sm font-bold uppercase tracking-wide text-amber-300">Get lock-screen alerts</h3>
          </div>
          <button
            type="button"
            onClick={close}
            aria-label="Close"
            className="rounded-md p-1.5 text-slate-400 hover:bg-white/5 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-4 py-4">
          <p className="text-sm font-semibold text-white">
            For lock screen notifications, please add <span className="text-amber-300">Dimes Only World</span> to your Home Screen.
          </p>
          <p className="mt-1 text-xs text-slate-400">
            Once installed, open the app from the Home Screen icon to turn on alerts.
          </p>

          {platform === "ios" ? iosSteps : platform === "android" ? androidSteps : desktopSteps}

          {canInstallPrompt && platform === "android" && (
            <button
              type="button"
              onClick={promptInstall}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-full bg-amber-400 px-4 py-2.5 text-sm font-bold text-slate-950 transition-colors hover:bg-amber-300"
            >
              <Download className="h-4 w-4" /> Install App Now
            </button>
          )}

          <button
            type="button"
            onClick={close}
            className="mt-3 w-full rounded-full border border-slate-700 px-4 py-2 text-xs font-medium text-slate-300 hover:bg-white/5"
          >
            Maybe later
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddToHomeScreenPrompt;
