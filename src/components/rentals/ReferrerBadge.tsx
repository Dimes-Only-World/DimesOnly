import React, { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getActiveRef } from "@/lib/refCapture";

interface ReferrerProfile {
  username: string;
  profile_photo: string | null;
  front_page_photo?: string | null;
}

/**
 * Shows "Referred by: @username" with the referrer's avatar
 * whenever the visitor arrived with a ?ref=username link.
 */
const ReferrerBadge: React.FC<{ className?: string }> = ({ className = "" }) => {
  const [profile, setProfile] = useState<ReferrerProfile | null>(null);

  useEffect(() => {
    const ref = getActiveRef();
    if (!ref || ref.toLowerCase() === "company") return;

    let cancelled = false;
    (async () => {
      const { data } = await (supabase as any)
        .from("public_user_profiles")
        .select("username, profile_photo, front_page_photo")
        .ilike("username", ref)
        .maybeSingle();
      if (!cancelled && data) setProfile(data as ReferrerProfile);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  if (!profile) return null;

  const avatar = profile.front_page_photo || profile.profile_photo;

  return (
    <div className={`mt-2 flex items-center gap-2 ${className}`}>
      {avatar ? (
        <img
          src={avatar}
          alt={`@${profile.username}`}
          className="h-8 w-8 rounded-full border border-rental-primary object-cover"
        />
      ) : (
        <div className="flex h-8 w-8 items-center justify-center rounded-full border border-rental-primary bg-rental-surface font-barlow text-xs font-bold uppercase text-rental-primary">
          {profile.username.charAt(0)}
        </div>
      )}
      <span className="font-barlow text-[10px] font-semibold uppercase leading-tight text-rental-muted sm:text-xs">
        Referred by
        <span className="block text-rental-foreground">@{profile.username}</span>
      </span>
    </div>
  );
};

export default ReferrerBadge;
