import React, { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Camera, Gift, Star, Calendar, Car, Shirt } from "lucide-react";
import { Tables } from "@/types";

type UserData = Tables<"users">;

interface DashboardBannerProps {
  bannerPhoto?: string | null;
  userData: UserData;
  onImageUpload?: (file: File) => void;
}

const DashboardBanner: React.FC<DashboardBannerProps> = ({
  bannerPhoto,
  userData,
  onImageUpload,
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [bannerUrl, setBannerUrl] = useState(bannerPhoto || "");

  // Update bannerUrl when bannerPhoto changes
  useEffect(() => {
    console.log("Banner photo updated:", bannerPhoto);
    setBannerUrl(bannerPhoto || "");
  }, [bannerPhoto]);

  const handleBannerChange = () => {
    if (onImageUpload) {
      fileInputRef.current?.click();
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && onImageUpload) {
      onImageUpload(file);
    }
  };

  const handleTipWin = () => {
    const username = userData.username || "demo";
    window.open(`https://dimesonly.world/tip-girls?ref=${username}`, "_blank");
  };

  const handleEvents = () => {
    const username = userData.username || "demo";
    const userType = userData.user_type;

    if (userType === "stripper" || userType === "exotic") {
      window.open(
        `https://dimesonly.world/events-dimes-only?ref=${username}`,
        "_blank"
      );
    } else {
      window.open(
        `https://dimesonly.world/eventsdimes?ref=${username}`,
        "_blank"
      );
    }
  };

  const handleRate = () => {
    window.open("https://dimesonly.world/rate-girls", "_blank");
  };

  return (
    <div className="w-full">
      <div
        className="relative w-full h-48 md:h-64 mb-8 rounded-xl overflow-hidden shadow-lg group cursor-pointer"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onClick={handleBannerChange}
      >
        <img
          src={
            bannerUrl ||
            "https://images.unsplash.com/photo-1557804506-669a67965ba0?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&h=300&q=80"
          }
          alt="Profile Banner"
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
        />

        {isHovered && onImageUpload && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center transition-opacity duration-300">
            <div className="bg-white/90 backdrop-blur-sm px-4 py-2 rounded-lg flex items-center gap-2 text-gray-800">
              <Camera className="w-4 h-4" />
              <span className="text-sm font-medium">Change Banner</span>
            </div>
          </div>
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 md:gap-4">
        <Button
          onClick={handleTipWin}
          className="bg-white hover:bg-gray-50 text-gray-900 border border-gray-200 shadow-sm font-medium py-3 px-4 h-auto text-sm transition-all duration-200 hover:shadow-md hover:border-green-300 hover:text-green-700 group"
        >
          <div className="flex flex-col items-center gap-1">
            <Gift className="w-5 h-5 text-green-600 group-hover:text-green-700" />
            <span>TIP & WIN</span>
          </div>
        </Button>

        <Button
          onClick={handleRate}
          className="bg-white hover:bg-gray-50 text-gray-900 border border-gray-200 shadow-sm font-medium py-3 px-4 h-auto text-sm transition-all duration-200 hover:shadow-md hover:border-red-300 hover:text-red-700 group"
        >
          <div className="flex flex-col items-center gap-1">
            <Star className="w-5 h-5 text-red-600 group-hover:text-red-700" />
            <span>RATE</span>
          </div>
        </Button>

        <Button
          onClick={handleEvents}
          className="bg-white hover:bg-gray-50 text-gray-900 border border-gray-200 shadow-sm font-medium py-3 px-4 h-auto text-sm transition-all duration-200 hover:shadow-md hover:border-blue-300 hover:text-blue-700 group"
        >
          <div className="flex flex-col items-center gap-1">
            <Calendar className="w-5 h-5 text-blue-600 group-hover:text-blue-700" />
            <span>EVENTS</span>
          </div>
        </Button>

        <Button className="bg-white hover:bg-gray-50 text-gray-900 border border-gray-200 shadow-sm font-medium py-3 px-4 h-auto text-sm transition-all duration-200 hover:shadow-md hover:border-yellow-300 hover:text-yellow-700 group">
          <div className="flex flex-col items-center gap-1">
            <Car className="w-5 h-5 text-yellow-600 group-hover:text-yellow-700" />
            <span>GET A CAR</span>
          </div>
        </Button>

        <Button className="bg-white hover:bg-gray-50 text-gray-900 border border-gray-200 shadow-sm font-medium py-3 px-4 h-auto text-sm transition-all duration-200 hover:shadow-md hover:border-purple-300 hover:text-purple-700 group">
          <div className="flex flex-col items-center gap-1">
            <Shirt className="w-5 h-5 text-purple-600 group-hover:text-purple-700" />
            <span>CLOTHES</span>
          </div>
        </Button>
      </div>
    </div>
  );
};

export default DashboardBanner;
