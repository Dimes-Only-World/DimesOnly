import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

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

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const ref = urlParams.get("ref");
    if (ref) {
      setRefValue(ref.toLowerCase());
      fetchProfile(ref.toLowerCase());
    } else {
      setLoading(false);
    }
  }, []);

  const fetchProfile = async (username: string) => {
    try {
      const { data, error } = await supabase
        .from("users")
        .select("username, front_page_photo")
        .eq("username", username)
        .single();

      if (data) {
        setProfile({
          name: data.username,
          imgSrc:
            data.front_page_photo ||
            "https://via.placeholder.com/450x300?text=No+Photo+Available",
          alt: `${data.username} profile`,
        });
      }
    } catch (error) {
      console.error("Error fetching profile:", error);
    } finally {
      setLoading(false);
    }
  };

  // Show default video if no profile or still loading
  if (loading || !profile) {
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
            src="https://dimesonlyworld.s3.us-east-2.amazonaws.com/Background-Ladies-1.mp4"
            type="video/mp4"
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
          src="https://dimesonlyworld.s3.us-east-2.amazonaws.com/Background-Ladies-1.mp4"
          type="video/mp4"
        />
      </video>
      <div className="absolute inset-0 bg-black bg-opacity-50 z-1"></div>

      <div className="relative z-10 text-center max-w-4xl mx-auto p-5">
        <h1 className="text-4xl md:text-6xl font-bold mb-8 text-yellow-400 uppercase tracking-wider">
          {profile.name}
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
          Featured Profile
        </p>
      </div>
    </div>
  );
};

export default ProfileVideoSection;
