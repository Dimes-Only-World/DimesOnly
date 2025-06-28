import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

interface ReferrerDisplayProps {
  referrerUsername: string;
}

const ReferrerDisplay: React.FC<ReferrerDisplayProps> = ({
  referrerUsername,
}) => {
  const [referrerData, setReferrerData] = useState<{
    username: string;
    front_page_photo?: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchReferrerData = async () => {
      if (!referrerUsername) {
        setLoading(false);
        return;
      }

      try {
        console.log("Fetching referrer data for:", referrerUsername);

        const { data, error } = await supabase
          .from("users")
          .select("username, front_page_photo")
          .eq("username", referrerUsername)
          .single();

        console.log("Referrer data result:", { data, error });

        if (error) {
          console.error("Error fetching referrer data:", error);
          setLoading(false);
          return;
        }

        if (data) {
          setReferrerData({
            username: String(data.username),
            front_page_photo: data.front_page_photo
              ? String(data.front_page_photo)
              : undefined,
          });
        }
      } catch (error) {
        console.error("Exception fetching referrer data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchReferrerData();
  }, [referrerUsername]);

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-4 mt-6 p-4 bg-gradient-to-r from-purple-600/20 to-pink-600/20 backdrop-blur border border-purple-400/30 rounded-xl max-w-md mx-auto shadow-lg">
        <div className="w-16 h-16 rounded-full bg-gray-700 animate-pulse ring-2 ring-purple-400/50"></div>
        <div className="text-left space-y-2">
          <div className="h-5 w-32 bg-gray-700 animate-pulse rounded"></div>
        </div>
      </div>
    );
  }

  if (!referrerData) {
    return null;
  }

  return (
    <div className="flex items-center justify-center gap-4 mt-6 p-4 bg-gradient-to-r from-purple-600/20 to-pink-600/20 backdrop-blur border border-purple-400/30 rounded-xl max-w-md mx-auto shadow-lg">
      <img
        src={referrerData.front_page_photo || "/placeholder.svg"}
        alt={referrerData.username}
        className="w-16 h-16 rounded-full object-cover border-3 border-gradient-to-r from-yellow-400 to-pink-400 shadow-xl ring-2 ring-purple-400/50"
        onError={(e) => {
          const target = e.target as HTMLImageElement;
          target.src = "/placeholder.svg";
        }}
      />
      <div className="text-left">
        <p className="text-white font-bold text-lg bg-gradient-to-r from-yellow-400 to-pink-400 bg-clip-text text-transparent">
          @{referrerData.username}
        </p>
      </div>
    </div>
  );
};

export default ReferrerDisplay;
