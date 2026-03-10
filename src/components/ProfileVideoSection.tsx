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
      setLoading(true);

      const requested = String(username || "").trim();
      console.log("🏠 Fetching public profile for username:", requested);

      const { data, error } = await supabase.functions.invoke("public-data", {
        body: {
          action: "fetchProfile",
          username: requested,
        },
      });

      if (error) throw error;

      // Edge function returns: { data: result }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = (data as any)?.data ?? null;

      setDebugInfo(
        JSON.stringify(
          {
            requested,
            found: Boolean(result?.username),
            returnedUsername: result?.username ?? null,
          },
          null,
          2
        )
      );

      if (result?.username) {
        const name = String(result.username).trim();
        const imgSrc =
          String(result.front_page_photo || "") ||
          String(result.profile_photo || "") ||
          "https://via.placeholder.com/450x300?text=No+Photo+Available";

        setProfile({
          name,
          imgSrc,
          alt: `${name} profile`,
        });
      } else {
        setProfile(null);
      }
    } catch (error) {
      console.error("🏠 💥 Error fetching public profile:", error);
      setProfile(null);
      setDebugInfo(
        `Exception: ${error instanceof Error ? error.message : String(error)}`
      );
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
          {import.meta.env.DEV && refValue && (
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
{import.meta.env.DEV && (
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
        <h1 className="text-2xl md:text-6xl font-bold mb-8 text-yellow-400 uppercase tracking-wider">
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
