import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { decodeUrlParam } from "@/lib/utils";

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
  const [debugInfo, setDebugInfo] = useState<string>("");

  useEffect(() => {
    const fetchReferrerData = async () => {
      if (!referrerUsername) {
        setLoading(false);
        setDebugInfo("No referrer username provided");
        return;
      }

      try {
        // Decode the username in case it's URL encoded
        const decodedUsername = decodeUrlParam(referrerUsername);

        console.log("🔍 Original referrer username:", referrerUsername);
        console.log("🔍 Decoded referrer username:", decodedUsername);
        console.log("🔍 Username length:", decodedUsername.length);
        console.log(
          "🔍 Username characters:",
          decodedUsername
            .split("")
            .map((c) => `${c}(${c.charCodeAt(0)})`)
            .join(", ")
        );

        // First, let's check if there are any users with similar usernames (case-insensitive)
        const { data: allUsers, error: allUsersError } = await supabase
          .from("users")
          .select("username")
          .ilike("username", `%${decodedUsername}%`);

        console.log("🔍 Users with similar usernames:", allUsers);

        // Try exact match first (case-sensitive)
        const { data: exactData, error: exactError } = await supabase
          .from("users")
          .select("username, front_page_photo")
          .eq("username", decodedUsername)
          .single();

        console.log("🔍 Exact match result:", {
          data: exactData,
          error: exactError,
        });

        // Try case-insensitive match if exact fails
        const { data: caseInsensitiveData, error: caseInsensitiveError } =
          await supabase
            .from("users")
            .select("username, front_page_photo")
            .ilike("username", decodedUsername)
            .single();

        console.log("🔍 Case-insensitive match result:", {
          data: caseInsensitiveData,
          error: caseInsensitiveError,
        });

        // Try with original (non-decoded) username if decoded fails
        let originalData = null;
        let originalError = null;
        if (decodedUsername !== referrerUsername) {
          const { data, error } = await supabase
            .from("users")
            .select("username, front_page_photo")
            .eq("username", referrerUsername)
            .single();
          originalData = data;
          originalError = error;
          console.log("🔍 Original (non-decoded) match result:", {
            data: originalData,
            error: originalError,
          });
        }

        setDebugInfo(`
          Original: ${referrerUsername}
          Decoded: ${decodedUsername}
          Same?: ${decodedUsername === referrerUsername ? "Yes" : "No"}
          Exact match: ${exactData ? "Found" : "Not found"}
          Case insensitive: ${caseInsensitiveData ? "Found" : "Not found"}
          Original match: ${
            originalData
              ? "Found"
              : decodedUsername === referrerUsername
              ? "N/A"
              : "Not found"
          }
          Similar users: ${allUsers?.length || 0}
        `);

        // Use the first successful match
        const finalData = exactData || caseInsensitiveData || originalData;
        const finalError =
          exactError?.code !== "PGRST116"
            ? exactError
            : caseInsensitiveError?.code !== "PGRST116"
            ? caseInsensitiveError
            : originalError?.code !== "PGRST116"
            ? originalError
            : null;

        if (finalError) {
          console.error("❌ Error fetching referrer data:", finalError);
          setLoading(false);
          return;
        }

        if (finalData) {
          setReferrerData({
            username: String(finalData.username),
            front_page_photo: finalData.front_page_photo
              ? String(finalData.front_page_photo)
              : undefined,
          });
          console.log("✅ Successfully found referrer:", finalData.username);
        } else {
          console.log("❌ No referrer found for:", decodedUsername);
        }
      } catch (error) {
        console.error("💥 Exception fetching referrer data:", error);
        setDebugInfo(`Exception: ${error}`);
      } finally {
        setLoading(false);
      }
    };

    fetchReferrerData();
  }, [referrerUsername]);

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-3 mt-4 p-3 bg-gradient-to-r from-purple-600/15 to-pink-600/15 backdrop-blur border border-purple-400/20 rounded-lg max-w-xs mx-auto shadow-md">
        <div className="w-10 h-10 rounded-full bg-gray-700 animate-pulse ring-1 ring-purple-400/30"></div>
        <div className="text-left space-y-1">
          <div className="h-4 w-24 bg-gray-700 animate-pulse rounded"></div>
          <div className="text-xs text-gray-400">Loading...</div>
        </div>
      </div>
    );
  }

  if (!referrerData) {
    return (
      <div className="flex items-center justify-center gap-3 mt-4 p-3 bg-red-600/15 backdrop-blur border border-red-400/20 rounded-lg max-w-xs mx-auto shadow-md">
        <div className="text-left">
          <p className="text-white font-semibold text-xs">
            Referrer not found: @{referrerUsername}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center gap-3 mt-4 p-3 bg-gradient-to-r from-purple-600/15 to-pink-600/15 backdrop-blur border border-purple-400/20 rounded-lg max-w-xs mx-auto shadow-md">
      <img
        src={referrerData.front_page_photo || "/placeholder.svg"}
        alt={referrerData.username}
        className="w-10 h-10 rounded-full object-cover border-2 border-gradient-to-r from-yellow-400 to-pink-400 shadow-lg ring-1 ring-purple-400/30"
        onError={(e) => {
          const target = e.target as HTMLImageElement;
          target.src = "/placeholder.svg";
        }}
      />
      <div className="text-left">
        <p className="text-white font-semibold text-sm bg-gradient-to-r from-yellow-400 to-pink-400 bg-clip-text text-transparent">
          @{referrerData.username}
        </p>
        <div className="text-xs text-gray-400 mt-0.5">Referrer</div>
      </div>
    </div>
  );
};

export default ReferrerDisplay;
