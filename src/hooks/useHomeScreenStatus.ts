import { useEffect, useState } from "react";

export type Platform = "ios" | "android" | "desktop";

interface HomeScreenStatus {
  platform: Platform;
  isMobile: boolean;
  isStandalone: boolean;
  canInstallPrompt: boolean;
  promptInstall: () => Promise<void>;
}

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const detectPlatform = (): Platform => {
  if (typeof navigator === "undefined") return "desktop";
  const ua = navigator.userAgent || "";
  if (/iPhone|iPad|iPod/i.test(ua)) return "ios";
  if (/Android/i.test(ua)) return "android";
  return "desktop";
};

const detectStandalone = (): boolean => {
  if (typeof window === "undefined") return false;
  const mm = window.matchMedia?.("(display-mode: standalone)").matches;
  // iOS Safari sets navigator.standalone when launched from Home Screen.
  const iosStandalone = (window.navigator as unknown as { standalone?: boolean }).standalone === true;
  return Boolean(mm || iosStandalone);
};

export const useHomeScreenStatus = (): HomeScreenStatus => {
  const [platform] = useState<Platform>(() => detectPlatform());
  const [isStandalone, setIsStandalone] = useState<boolean>(() => detectStandalone());
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    const onChange = () => setIsStandalone(detectStandalone());
    const mql = window.matchMedia?.("(display-mode: standalone)");
    mql?.addEventListener?.("change", onChange);

    const onBIP = (e: Event) => {
      e.preventDefault();
      setInstallEvent(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", onBIP);

    const onInstalled = () => {
      setInstallEvent(null);
      setIsStandalone(detectStandalone());
    };
    window.addEventListener("appinstalled", onInstalled);

    return () => {
      mql?.removeEventListener?.("change", onChange);
      window.removeEventListener("beforeinstallprompt", onBIP);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const isMobile = platform === "ios" || platform === "android";

  const promptInstall = async () => {
    if (!installEvent) return;
    try {
      await installEvent.prompt();
      await installEvent.userChoice.catch(() => undefined);
    } finally {
      setInstallEvent(null);
    }
  };

  return {
    platform,
    isMobile,
    isStandalone,
    canInstallPrompt: !!installEvent,
    promptInstall,
  };
};

export default useHomeScreenStatus;
