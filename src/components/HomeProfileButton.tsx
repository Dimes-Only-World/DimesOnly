import React from "react";
import { useNavigate } from "react-router-dom";
import { User as UserIcon } from "lucide-react";
import { useAppContext } from "@/contexts/AppContext";

interface HomeProfileButtonProps {
  className?: string;
}

const HomeProfileButton: React.FC<HomeProfileButtonProps> = ({ className = "" }) => {
  const navigate = useNavigate();
  const { user } = useAppContext();

  const handleClick = () => {
    if (user) {
      navigate("/dashboard/profile");
    } else {
      navigate("/login");
    }
  };

  const photo = user?.profilePhoto;

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
