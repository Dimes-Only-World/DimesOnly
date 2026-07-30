import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

const CHANNEL = "online-users";

const readStoredUsername = () => {
  if (typeof window === "undefined") return "";
  const savedUser = sessionStorage.getItem("userData");
  if (!savedUser) return sessionStorage.getItem("currentUser") || "";
  try {
    const parsed = JSON.parse(savedUser);
    return String(parsed?.username || sessionStorage.getItem("currentUser") || "");
  } catch {
    return sessionStorage.getItem("currentUser") || "";
  }
};

/**
 * Joins a global realtime presence channel.
 * - When `track` is true, announces the current user as online.
 * - Always returns the set of lowercase usernames currently online.
 */
export function useOnlinePresence(track = false) {
  const [online, setOnline] = useState<Set<string>>(new Set());

  useEffect(() => {
    const username = readStoredUsername().trim().toLowerCase();
    const channel = supabase.channel(CHANNEL, {
      config: { presence: { key: username || `guest-${Math.random().toString(36).slice(2)}` } },
    });

    const sync = () => {
      const state = channel.presenceState() as Record<string, Array<{ username?: string }>>;
      const next = new Set<string>();
      Object.entries(state).forEach(([key, entries]) => {
        const name = (entries?.[0]?.username || key || "").toLowerCase();
        if (name && !name.startsWith("guest-")) next.add(name);
      });
      setOnline(next);
    };

    channel
      .on("presence", { event: "sync" }, sync)
      .on("presence", { event: "join" }, sync)
      .on("presence", { event: "leave" }, sync)
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED" && track && username) {
          await channel.track({ username, online_at: new Date().toISOString() });
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [track]);

  return online;
}

export default useOnlinePresence;
