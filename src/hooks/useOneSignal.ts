import { useCallback, useEffect, useRef, useState } from "react";
import { supabase, SUPABASE_URL, SUPABASE_ANON_KEY } from "@/lib/supabase";

declare global {
  interface Window {
    OneSignal?: any;
    OneSignalDeferred?: any[];
  }
}

const SDK_SRC = "https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js";
const DISMISS_KEY = "dimes-push-dismissed";

let sdkPromise: Promise<void> | null = null;

const loadSdk = () => {
  if (sdkPromise) return sdkPromise;
  sdkPromise = new Promise<void>((resolve, reject) => {
    if (window.OneSignal) return resolve();
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${SDK_SRC}"]`);
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error("OneSignal SDK failed to load")));
      return;
    }
    const script = document.createElement("script");
    script.src = SDK_SRC;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("OneSignal SDK failed to load"));
    document.head.appendChild(script);
  });
  return sdkPromise;
};

const fetchAppId = async (): Promise<string> => {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/notification-config`, {
    headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
  });
  if (!res.ok) return "";
  const body = await res.json().catch(() => ({}));
  return String(body?.appId ?? "");
};

export type PushState = "unsupported" | "unconfigured" | "default" | "granted" | "denied";

/**
 * Initialises OneSignal web push for the signed-in user and keeps their
 * subscription id in sync with `push_subscriptions`.
 */
export const useOneSignal = (userId?: string | null) => {
  const [state, setState] = useState<PushState>("default");
  const [busy, setBusy] = useState(false);
  const readyRef = useRef(false);

  const supported =
    typeof window !== "undefined" &&
    "Notification" in window &&
    "serviceWorker" in navigator &&
    window.isSecureContext;

  const saveSubscription = useCallback(
    async (playerId: string, uid: string) => {
      if (!playerId || !uid) return;
      try {
        await supabase
          .from("push_subscriptions")
          .upsert(
            { user_id: uid, player_id: playerId, platform: "web", updated_at: new Date().toISOString() },
            { onConflict: "player_id" },
          );
      } catch (e) {
        console.warn("Could not save push subscription", e);
      }
    },
    [],
  );

  const init = useCallback(async () => {
    if (!supported || readyRef.current || !userId) return;

    const appId = await fetchAppId();
    if (!appId) {
      setState("unconfigured");
      return;
    }

    await loadSdk();
    readyRef.current = true;

    window.OneSignalDeferred = window.OneSignalDeferred || [];
    window.OneSignalDeferred.push(async (OneSignal: any) => {
      try {
        await OneSignal.init({
          appId,
          allowLocalhostAsSecureOrigin: true,
          serviceWorkerPath: "/OneSignalSDKWorker.js",
          serviceWorkerParam: { scope: "/" },
        });

        await OneSignal.login(userId);

        const sync = async () => {
          const id = OneSignal.User?.PushSubscription?.id;
          const optedIn = OneSignal.User?.PushSubscription?.optedIn;
          if (id && optedIn) {
            await saveSubscription(id, userId);
            setState("granted");
          }
        };

        OneSignal.User?.PushSubscription?.addEventListener?.("change", sync);
        await sync();

        const permission = window.Notification?.permission;
        if (permission === "denied") setState("denied");
        else if (permission === "granted") setState("granted");
        else setState("default");
      } catch (e) {
        console.warn("OneSignal init failed", e);
      }
    });
  }, [supported, userId, saveSubscription]);

  useEffect(() => {
    if (!supported) {
      setState("unsupported");
      return;
    }
    if (!userId) return;
    // Only auto-init if the user has not explicitly dismissed the prompt.
    void init();
  }, [supported, userId, init]);

  const enablePush = useCallback(async () => {
    if (!supported || !userId) return;
    setBusy(true);
    try {
      await init();
      window.OneSignalDeferred = window.OneSignalDeferred || [];
      window.OneSignalDeferred.push(async (OneSignal: any) => {
        try {
          await OneSignal.Notifications.requestPermission();
          if (window.Notification?.permission === "granted") {
            await OneSignal.User.PushSubscription.optIn();
            const id = OneSignal.User?.PushSubscription?.id;
            if (id) await saveSubscription(id, userId);
            setState("granted");
            localStorage.removeItem(DISMISS_KEY);
          } else if (window.Notification?.permission === "denied") {
            setState("denied");
          }
        } finally {
          setBusy(false);
        }
      });
    } catch {
      setBusy(false);
    }
  }, [supported, userId, init, saveSubscription]);

  return { pushState: state, enablePush, pushBusy: busy };
};

export default useOneSignal;
