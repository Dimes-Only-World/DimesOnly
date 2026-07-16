import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { User as UserIcon } from "lucide-react";
import { useAppContext } from "@/contexts/AppContext";
import { supabase } from "@/lib/supabase";

interface HomeProfileButtonProps {
  className?: string;
}

const HomeProfileButton: React.FC<HomeProfileButtonProps> = ({ className = "" }) => {
  const navigate = useNavigate();
  const { user } = useAppContext();
  const [fallbackPhoto, setFallbackPhoto] = useState("");

  useEffect(() => {
    const loadProfilePhoto = async () => {
      const contextPhoto = user?.profilePhoto;
      if (contextPhoto) {
        setFallbackPhoto(contextPhoto);
        return;
      }

      const savedUserData = sessionStorage.getItem("userData");
      if (savedUserData) {
        try {
          const parsedUser = JSON.parse(savedUserData);
          const storedPhoto = parsedUser?.profilePhoto || parsedUser?.profile_photo;
          if (storedPhoto) {
            setFallbackPhoto(String(storedPhoto));
            return;
          }
        } catch (error) {
          console.error("Error reading saved profile photo:", error);
        }
      }

      try {
        const savedToken = localStorage.getItem("authToken");
        let userId = user?.id || "";

        if (!userId && savedToken?.startsWith("authenticated_")) {
          userId = savedToken.replace("authenticated_", "");
        }

        if (!userId) {
          const {
            data: { user: authUser },
          } = await supabase.auth.getUser();
          userId = authUser?.id || "";
        }

        if (!userId) return;

        const { data, error } = await supabase
          .from("users")
          .select("profile_photo")
          .eq("id", userId)
          .maybeSingle();

        if (error) {
          console.error("Error loading profile photo:", error);
          return;
        }

        if (data?.profile_photo) {
          setFallbackPhoto(String(data.profile_photo));
        }
      } catch (error) {
        console.error("Error loading profile photo:", error);
      }
    };

    loadProfilePhoto();
  }, [user?.id, user?.profilePhoto]);

  const handleClick = () => {
    if (user) {
      navigate("/dashboard/profile");
    } else {
      navigate("/login");
    }
  };

  const photo = user?.profilePhoto || fallbackPhoto;

  return (
    <button
      onClick={handleClick}
      aria-label="Go to your profile"
      title="Go to your profile"
      className={`relative flex h-14 w-14 sm:h-16 sm:w-16 shrink-0 items-center justify-center overflow-hidden rounded-full ring-2 ring-pink-400 hover:ring-pink-500 shadow-lg bg-slate-200 transition-all ${className}`}
    >
      {photo ? (
        <img
          src={photo}
          alt={user?.username ? `${user.username} profile` : "Profile"}
          className="h-full w-full object-cover"
        />
      ) : (
        <UserIcon className="h-7 w-7 text-slate-600" />
      )}
    </button>
  );
};

export default HomeProfileButton;
