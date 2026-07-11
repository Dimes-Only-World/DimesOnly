import { useSearchParams } from "react-router-dom";
import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import defaultAvatar from "../assets/default-avatar.jpg";
import dimesLogo from "@/assets/dimes-only-world-logo.jpg.asset.json";

const supabaseUrl = "https://qkcuykpndrolrewwnkwb.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFrY3V5a3BuZHJvbHJld3dua3diIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkzODIwNzAsImV4cCI6MjA2NDk1ODA3MH0.gamp40tIrDSMaI5_YMIrn3qCR-oVdx__YtvBl75yOJs";
const supabase = createClient(supabaseUrl, supabaseAnonKey);

interface ReferrerData {
  username: string;
  profile_photo: string | null;
  front_page_photo: string | null;
}

const ReferrerProfile = () => {
  const [searchParams] = useSearchParams();
  const ref = searchParams.get("ref");
  const [referrer, setReferrer] = useState<ReferrerData | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!ref) return;

    const fetchReferrer = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("public_user_profiles")
          .select("username, profile_photo, front_page_photo")
          .ilike("username", ref)
          .maybeSingle();

        if (!error && data) {
          setReferrer(data);
        }
      } catch (err) {
        console.error("Error fetching referrer profile:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchReferrer();
  }, [ref]);

  const photoUrl = referrer?.front_page_photo || referrer?.profile_photo || defaultAvatar;

  return (
    <section id="referrer-section" className="py-16 bg-black">
      <div className="container mx-auto px-4 text-center">
        {ref ? (
          <div className="flex flex-col items-center gap-4">
            <div className="max-w-sm w-full rounded-lg border-2 border-primary overflow-hidden">
              {loading ? (
                <div className="w-full h-64 bg-muted animate-pulse" />
              ) : (
                <img
                  src={photoUrl}
                  alt={`@${referrer?.username || ref} profile`}
                  className="w-full object-contain"
                  onError={(e) => { (e.target as HTMLImageElement).src = defaultAvatar; }}
                />
              )}
            </div>
            <p className="text-xl font-semibold text-foreground">@{referrer?.username || ref}</p>
            <p className="text-muted-foreground text-sm">invited you to join Dimes Only Network</p>
          </div>
        ) : (
          <img
            src={dimesLogo.url}
            alt="Dimes Only World"
            className="mx-auto w-full max-w-2xl h-auto object-contain"
          />
        )}
      </div>
    </section>);
};

export default ReferrerProfile;
