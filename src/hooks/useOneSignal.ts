import { useCallback, useEffect, useRef, useState } from "react";
import { supabase, SUPABASE_URL, SUPABASE_ANON_KEY } from "@/lib/supabase";

declare global {
  interface Window {
    OneSignal?: any;
    OneSignalDeferred?: any[];
  }
}

const SDK_SRC = "https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js";

let sdkPromise: Promise<void> | null = null;
let initPromise: Promise<any | null> | null = null;

const withTimeout = <T,>(p: Promise<T>, ms: number, label: string): Promise<T> =>
  Promise.race([
    p,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error(`${label} timed out`)), ms)),
  ]);

const loadSdk = () => {
  if (sdkPromise) return sdkPromise;
  sdkPromise = new Promise<void>((resolve, reject) => {
    if (window.OneSignal) return resolve();
    // The deferred queue must exist *before* the SDK script executes.
    window.OneSignalDeferred = window.OneSignalDeferred || [];
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${SDK_SRC}"]`);
    if (existing) return resolve();
    const target = document.createElement("script");
    target.addEventListener("load", () => resolve());
    target.addEventListener("error", () => reject(new Error("OneSignal SDK failed to load")));
    target.src = SDK_SRC;
    target.defer = true;
    document.head.appendChild(target);
  }).catch((e) => {
    sdkPromise = null;
    throw e;
  });
  return sdkPromise;
};

const fetchAppId = async (): Promise<string> => {
  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/notification-config`, {
      headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
    });
    if (!res.ok) return "";
    const body = await res.json().catch(() => ({}));
    return String(body?.appId ?? "");
  } catch {
    return "";
  }
};

/** Resolves with the initialised OneSignal instance, or null if unavailable. */
const getOneSignal = (appId: string): Promise<any | null> => {
  if (initPromise) return initPromise;
  initPromise = (async () => {
    await withTimeout(loadSdk(), 12000, "OneSignal SDK load");
    const OneSignal: any = await withTimeout(
      new Promise((resolve) => {
        window.OneSignalDeferred = window.OneSignalDeferred || [];
        window.OneSignalDeferred.push((os: any) => resolve(os));
      }),
      12000,
      "OneSignal SDK ready",
    );
    try {
      await withTimeout(
        OneSignal.init({
          appId,
          allowLocalhostAsSecureOrigin: true,
          serviceWorkerPath: "OneSignalSDKWorker.js",
          serviceWorkerParam: { scope: "/" },
        }),
        15000,
        "OneSignal init",
      );
    } catch (e) {
      // "already initialized" is fine; anything else we still try to use the instance.
      console.warn("OneSignal init warning", e);
    }
    return OneSignal;
  })().catch((e) => {
    console.warn("OneSignal unavailable", e);
    initPromise = null;
    return null;
  });
  return initPromise;
};

export type PushState = "unsupported" | "unconfigured" | "default" | "granted" | "denied";

/**
 * Initialises OneSignal web push for the signed-in user and keeps their
 * subscription id in sync with `push_subscriptions`.
 */
export const useOneSignal = (userId?: string | null) => {
  const supported =
    typeof window !== "undefined" &&
    "Notification" in window &&
    "serviceWorker" in navigator &&
    window.isSecureContext;

  const [state, setState] = useState<PushState>(() => {
    if (typeof window === "undefined") return "default";
    if (!("Notification" in window)) return "unsupported";
    return (window.Notification.permission as PushState) ?? "default";
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const appIdRef = useRef<string | null>(null);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const saveSubscription = useCallback(async (playerId: string, uid: string) => {
    if (!playerId || !uid) return;
    try {
      await supabase.from("push_subscriptions").upsert(
        { user_id: uid, player_id: playerId, platform: "web", updated_at: new Date().toISOString() },
        { onConflict: "player_id" },
      );
    } catch (e) {
      console.warn("Could not save push subscription", e);
    }
  }, []);

  const resolveAppId = useCallback(async () => {
    if (appIdRef.current !== null) return appIdRef.current;
    const id = await fetchAppId();
    appIdRef.current = id;
    return id;
  }, []);

  // Passive bootstrap: only attach to OneSignal when the user already granted push.
  useEffect(() => {
    let cancelled = false;
    if (!supported) {
      setState("unsupported");
      return;
    }
    if (!userId) return;
    if (window.Notification.permission === "denied") {
      setState("denied");
      return;
    }
    if (window.Notification.permission !== "granted") {
      setState("default");
      return;
    }

    (async () => {
      const appId = await resolveAppId();
      if (cancelled) return;
      if (!appId) {
        if (mounted.current) setState("unconfigured");
        return;
      }
      const OneSignal = await getOneSignal(appId);
      if (cancelled || !OneSignal) return;
      try {
        await OneSignal.login(userId);
        const sync = async () => {
          const id = OneSignal.User?.PushSubscription?.id;
          if (id) await saveSubscription(id, userId);
        };
        OneSignal.User?.PushSubscription?.addEventListener?.("change", sync);
        await sync();
        if (mounted.current) setState("granted");
      } catch (e) {
        console.warn("OneSignal attach failed", e);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [supported, userId, resolveAppId, saveSubscription]);

  const enablePush = useCallback(async () => {
    if (!supported) {
      setState("unsupported");
      return;
    }
    if (!userId || busy) return;

    setError(null);
    setBusy(true);

    // Ask for permission first, straight from the click, so the browser keeps
    // the user-gesture context (Safari/iOS require this).
    let permission = window.Notification.permission;
    try {
      if (permission === "default") {
        permission = await window.Notification.requestPermission();
      }
    } catch (e) {
      console.warn("Notification.requestPermission failed", e);
    }

    if (permission !== "granted") {
      setState(permission === "denied" ? "denied" : "default");
      setBusy(false);
      if (permission === "denied") {
        setError("Notifications are blocked. Enable them in your browser settings, then try again.");
      }
      return;
    }

    setState("granted");

    try {
      const appId = await resolveAppId();
      if (!appId) {
        setState("unconfigured");
        setError("Push isn't configured yet. Please try again later.");
        return;
      }
      const OneSignal = await getOneSignal(appId);
      if (!OneSignal) {
        setError("Couldn't reach the push service. Please try again in a moment.");
        return;
      }

      // Each of these can throw harmlessly (already logged in, already opted
      // in, race with the SDK). None of them should surface an error to the
      // user on their own — only a missing subscription id matters.
      try {
        await OneSignal.login(userId);
      } catch (e) {
        console.warn("OneSignal.login skipped", e);
      }
      try {
        await OneSignal.User?.PushSubscription?.optIn?.();
      } catch (e) {
        console.warn("OneSignal optIn skipped", e);
      }

      // The subscription id can take a moment to appear.
      let id: string | undefined;
      for (let i = 0; i < 20 && !id; i += 1) {
        id = OneSignal.User?.PushSubscription?.id;
        if (!id) await new Promise((r) => setTimeout(r, 400));
      }

      OneSignal.User?.PushSubscription?.addEventListener?.("change", async () => {
        const next = OneSignal.User?.PushSubscription?.id;
        if (next) {
          await saveSubscription(next, userId);
          if (mounted.current) setError(null);
        }
      });

      if (id) {
        await saveSubscription(id, userId);
        if (mounted.current) setError(null);
      } else {
        setError("Alerts are on for this browser, but this device is still registering. Reload the page if you don't get alerts.");
      }
    } catch (e) {
      console.warn("enablePush failed", e);
      setError("Couldn't finish setting up alerts. Please reload and try again.");
    } finally {
      if (mounted.current) setBusy(false);
    }
  }, [supported, userId, busy, resolveAppId, saveSubscription]);


  return { pushState: state, enablePush, pushBusy: busy, pushError: error };
};

export default useOneSignal;
