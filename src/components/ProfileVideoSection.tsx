import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { normalizeRefParam } from "@/lib/utils";

interface ProfileData {
  name: string;
  imgSrc: string;
  alt: string;
}

interface ProfileVideoSectionProps {
  className?: string;
}

const ProfileVideoSection: React.FC<ProfileVideoSectionProps> = ({
  className = "",
}) => {
  const [refValue, setRefValue] = useState<string | null>(null);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [debugInfo, setDebugInfo] = useState<string>("");

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const rawRef = urlParams.get("ref");
    const ref = normalizeRefParam(rawRef);

    console.log("🏠 INDEX PAGE - ProfileVideoSection Debug:");
    console.log("🏠 Original URL:", window.location.href);
    console.log("🏠 URL Search Params:", window.location.search);
    console.log("🏠 Raw ref param:", urlParams.get("ref"));
    console.log("🏠 Processed ref param:", ref);

    // IMPORTANT: treat 'company' (default) or missing ref as no referral
    if (!rawRef || ref === "company") {
      console.log("🏠 No specific user ref provided. Showing default hero.");
      setRefValue(null);
      setLoading(false);
      return;
    }

    console.log("🏠 Setting ref value and fetching profile for:", ref);
    setRefValue(ref);
    fetchProfile(ref);
  }, []);

  const fetchProfile = async (username: string) => {
    try {
      console.log("🏠 Fetching profile for username:", username);
      console.log("🏠 Username length:", username.length);
      console.log(
        "🏠 Username characters:",
        username
          .split("")
          .map((c) => `${c}(${c.charCodeAt(0)})`)
          .join(", ")
      );

      // First, let's get ALL usernames that contain any part of our search term
      console.log("🏠 🔍 SEARCHING FOR ALL SIMILAR USERNAMES...");
      const { data: allSimilarUsers, error: allSimilarError } = await supabase
        .from("users")
        .select("username, front_page_photo")
        .ilike("username", `%${username}%`);

      console.log("🏠 🔍 ALL SIMILAR USERS FOUND:", allSimilarUsers);

      if (allSimilarUsers && allSimilarUsers.length > 0) {
        console.log("🏠 🔍 DETAILED ANALYSIS OF SIMILAR USERS:");
        allSimilarUsers.forEach((user, index) => {
          const dbUsername = String(user.username);
          console.log(`🏠 🔍 Similar user ${index + 1}:`);
          console.log(`🏠 🔍   Database username: "${dbUsername}"`);
          console.log(
            `🏠 🔍   Length: ${dbUsername.length} vs search: ${username.length}`
          );
          console.log(
            `🏠 🔍   Characters: ${dbUsername
              .split("")
              .map((c) => `${c}(${c.charCodeAt(0)})`)
              .join(", ")}`
          );
          console.log(`🏠 🔍   Exact match: ${dbUsername === username}`);
          console.log(
            `🏠 🔍   Case insensitive match: ${
              dbUsername.toLowerCase() === username.toLowerCase()
            }`
          );
          console.log(
            `🏠 🔍   Trimmed match: ${dbUsername.trim() === username.trim()}`
          );
          console.log(
            `🏠 🔍   Trimmed case insensitive: ${
              dbUsername.trim().toLowerCase() === username.trim().toLowerCase()
            }`
          );
          console.log(
            `🏠 🔍   Has photo: ${user.front_page_photo ? "Yes" : "No"}`
          );

          // Character by character comparison
          if (dbUsername.length === username.length) {
            console.log(`🏠 🔍   Character comparison:`);
            for (let i = 0; i < username.length; i++) {
              const searchChar = username[i];
              const dbChar = dbUsername[i];
              const match = searchChar === dbChar;
              console.log(
                `🏠 🔍     Position ${i}: "${searchChar}"(${searchChar.charCodeAt(
                  0
                )}) vs "${dbChar}"(${dbChar.charCodeAt(0)}) - ${
                  match ? "MATCH" : "DIFFERENT"
                }`
              );
            }
          }
        });
      }

      // Now let's try a broader search to see ALL usernames in the database that start with 'miss'
      console.log("🏠 🔍 SEARCHING FOR ALL USERNAMES STARTING WITH 'miss'...");
      const { data: missUsers, error: missError } = await supabase
        .from("users")
        .select("username")
        .ilike("username", "miss%")
        .limit(20);

      console.log(
        "🏠 🔍 ALL USERNAMES STARTING WITH 'miss':",
        missUsers?.map((u) => String(u.username))
      );

      // Try exact match first
      const { data: exactData, error: exactError } = await supabase
        .from("users")
        .select("username, front_page_photo")
        .eq("username", username)
        .single();

      console.log("🏠 Exact match result:", {
        data: exactData,
        error: exactError,
      });

      // Try case-insensitive match if exact fails
      const { data: caseInsensitiveData, error: caseInsensitiveError } =
        await supabase
          .from("users")
          .select("username, front_page_photo")
          .ilike("username", username)
          .single();

      console.log("🏠 Case-insensitive match result:", {
        data: caseInsensitiveData,
        error: caseInsensitiveError,
      });

      // Try with trimmed whitespace - this should fix the trailing space issue!
      console.log("🏠 🔍 TRYING TRIMMED WHITESPACE MATCHES...");

      // Search for usernames that match when trimmed
      const { data: allPotentialMatches, error: potentialError } =
        await supabase
          .from("users")
          .select("username, front_page_photo")
          .ilike("username", `%${username.trim()}%`);

      console.log("🏠 Potential trimmed matches:", allPotentialMatches);

      // Find exact match after trimming
      let trimmedMatch = null;
      if (allPotentialMatches) {
        trimmedMatch = allPotentialMatches.find(
          (user) =>
            String(user.username).trim().toLowerCase() ===
            username.trim().toLowerCase()
        );
      }

      console.log("🏠 Trimmed match result:", trimmedMatch);

      // Try with SQL LIKE using different patterns
      console.log("🏠 🔍 TRYING DIFFERENT SQL PATTERNS...");

      // Try with escaped underscore
      const { data: escapedData, error: escapedError } = await supabase
        .from("users")
        .select("username, front_page_photo")
        .like("username", username.replace("_", "\\_"))
        .single();

      console.log("🏠 Escaped underscore match:", {
        data: escapedData,
        error: escapedError,
      });

      // Try without escaping underscore (underscore as wildcard)
      const { data: wildcardData, error: wildcardError } = await supabase
        .from("users")
        .select("username, front_page_photo")
        .like("username", username)
        .single();

      console.log("🏠 Wildcard underscore match:", {
        data: wildcardData,
        error: wildcardError,
      });

      const finalData =
        exactData ||
        caseInsensitiveData ||
        trimmedMatch ||
        escapedData ||
        wildcardData;

      setDebugInfo(`
        Original: "${username}"
        Length: ${username.length}
        Exact match: ${exactData ? "Found" : "Not found"}
        Case insensitive: ${caseInsensitiveData ? "Found" : "Not found"}
        Trimmed match: ${trimmedMatch ? "Found" : "Not found"}
        Escaped underscore: ${escapedData ? "Found" : "Not found"}
        Wildcard underscore: ${wildcardData ? "Found" : "Not found"}
        Similar users: ${allSimilarUsers?.length || 0}
        Similar usernames: ${
          allSimilarUsers?.map((u) => `"${String(u.username)}"`).join(", ") ||
          "None"
        }
        Miss users found: ${missUsers?.length || 0}
        Miss usernames: ${
          missUsers?.map((u) => `"${String(u.username)}"`).join(", ") || "None"
        }
        Final result: ${finalData ? "Success" : "Failed"}
        Match method: ${
          exactData
            ? "Exact"
            : caseInsensitiveData
            ? "Case insensitive"
            : trimmedMatch
            ? "Trimmed whitespace"
            : escapedData
            ? "Escaped underscore"
            : wildcardData
            ? "Wildcard"
            : "None"
        }
      `);

      if (finalData) {
        console.log("🏠 ✅ Profile found:", finalData.username);
        setProfile({
          name: String(finalData.username).trim(), // Trim the display name
          imgSrc:
            String(finalData.front_page_photo || "") ||
            "https://via.placeholder.com/450x300?text=No+Photo+Available",
          alt: `${String(finalData.username).trim()} profile`,
        });
      } else {
        console.log("🏠 ❌ No profile found for:", username);
        setProfile(null);
      }
    } catch (error) {
      console.error("🏠 💥 Error fetching profile:", error);
      setDebugInfo(`Exception: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  // Show default video if no profile or still loading
  if (loading) {
    return (
      <div
        className={`relative w-full min-h-screen flex items-center justify-center ${className}`}
      >
        <video
          autoPlay
          muted
          loop
          playsInline
          className="absolute inset-0 w-full h-full object-cover z-0"
        >
          <source
            src="https://dimesonlyworld.s3.us-east-2.amazonaws.com/Background-Ladies-1.webm"
            type="video/webm"
          />
        </video>
        <div className="absolute inset-0 bg-black bg-opacity-50 z-1"></div>

        <div className="relative z-10 text-center max-w-4xl mx-auto p-5">
          <h1 className="text-4xl md:text-6xl font-bold mb-8 text-yellow-400 uppercase tracking-wider">
            LOADING...
          </h1>
          <p className="text-white text-lg mt-6 font-semibold">
            {refValue ? `Searching for ${refValue}...` : "Loading..."}
          </p>
          {process.env.NODE_ENV === "development" && refValue && (
            <div className="mt-4 p-4 bg-black/50 rounded text-left text-xs text-gray-300">
              <p className="text-yellow-300 font-bold mb-2">Debug Info:</p>
              <p>Ref Value: {refValue}</p>
              <p>Status: Searching...</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (!profile && refValue) {
    return (
      <div
        className={`relative w-full min-h-screen flex items-center justify-center ${className}`}
      >
        <video
          autoPlay
          muted
          loop
          playsInline
          className="absolute inset-0 w-full h-full object-cover z-0"
        >
          <source
            src="https://dimesonlyworld.s3.us-east-2.amazonaws.com/Background-Ladies-1.webm"
            type="video/webm"
          />
        </video>
        <div className="absolute inset-0 bg-black bg-opacity-50 z-1"></div>

        <div className="relative z-10 text-center max-w-4xl mx-auto p-5">
          <h1 className="text-4xl md:text-6xl font-bold mb-8 text-red-400 uppercase tracking-wider">
            USER NOT FOUND
          </h1>
          <p className="text-white text-lg mt-6 font-semibold">
            @{refValue} could not be found
          </p>
          {process.env.NODE_ENV === "development" && (
            <div className="mt-4 p-4 bg-red-900/50 rounded text-left text-xs text-gray-300 max-w-md mx-auto">
              <p className="text-red-300 font-bold mb-2">Debug Info:</p>
              <pre className="whitespace-pre-wrap text-xs">{debugInfo}</pre>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div
        className={`relative w-full min-h-screen flex items-center justify-center ${className}`}
      >
        <video
          autoPlay
          muted
          loop
          playsInline
          className="absolute inset-0 w-full h-full object-cover z-0"
        >
          <source
            src="https://dimesonlyworld.s3.us-east-2.amazonaws.com/Background-Ladies-1.webm"
            type="video/webm"
          />
        </video>
        <div className="absolute inset-0 bg-black bg-opacity-50 z-1"></div>

        <div className="relative z-10 text-center max-w-4xl mx-auto p-5">
          <h1 className="text-4xl md:text-6xl font-bold mb-8 text-yellow-400 uppercase tracking-wider">
            DIMES ONLY WORLD
          </h1>
          <p className="text-white text-lg mt-6 font-semibold">
            Welcome to the Ultimate Experience
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`relative w-full min-h-screen flex items-center justify-center ${className}`}
    >
      <video
        autoPlay
        muted
        loop
        playsInline
        className="absolute inset-0 w-full h-full object-cover z-0"
      >
        <source
          src="https://dimesonlyworld.s3.us-east-2.amazonaws.com/Background-Ladies-1.webm"
          type="video/webm"
        />
      </video>
      <div className="absolute inset-0 bg-black bg-opacity-50 z-1"></div>

      <div className="relative z-10 text-center max-w-4xl mx-auto p-5">
        <h1 className="text-4xl md:text-6xl font-bold mb-8 text-yellow-400 uppercase tracking-wider">
          @{profile.name}
        </h1>
        <div className="relative inline-block">
          <img
            src={profile.imgSrc}
            alt={profile.alt}
            className="w-full max-w-md mx-auto rounded-lg shadow-2xl"
            style={{
              boxShadow: "0 0 30px 10px rgba(255, 105, 180, 0.8)",
            }}
            onError={(e) => {
              e.currentTarget.src =
                "https://via.placeholder.com/450x300?text=Image+Not+Found";
            }}
          />
        </div>
        <p className="text-white text-lg mt-6 font-semibold">
          Welcome to the Ultimate Experience
        </p>
        {process.env.NODE_ENV === "development" && (
          <div className="mt-4 p-4 bg-green-900/50 rounded text-left text-xs text-gray-300 max-w-md mx-auto">
            <p className="text-green-300 font-bold mb-2">Debug Info:</p>
            <pre className="whitespace-pre-wrap text-xs">{debugInfo}</pre>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProfileVideoSection;
