import React, { useState, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Calendar, User, Camera, Award, DollarSign } from "lucide-react";
import { Tables } from "@/types";
import ReferrerInfo from "./ReferrerInfo";

type UserData = Tables<"users">;

interface ProfileSidebarProps {
  userData: UserData;
  referrerData?: {
    username: string;
    profile_photo?: string;
  } | null;
  onImageUpload?: (file: File) => void;
}

const ProfileSidebar: React.FC<ProfileSidebarProps> = ({
  userData,
  referrerData,
  onImageUpload,
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isExoticOrDancer =
    userData.user_type === "exotic" || userData.user_type === "stripper";

  const handlePhotoChange = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && onImageUpload) {
      onImageUpload(file);
    }
  };

  const getMembershipBadge = () => {
    if (isExoticOrDancer) {
      return (
        <Badge className="bg-gradient-to-r from-purple-600 to-pink-600 text-white border-0">
          <Award className="w-3 h-3 mr-1" />
          Diamond Member
        </Badge>
      );
    }
    return (
      <Badge variant="secondary" className="bg-gray-100 text-gray-700">
        <User className="w-3 h-3 mr-1" />
        Silver Member
      </Badge>
    );
  };

  const safeToFixed = (value: any, decimals: number = 2) => {
    const num = Number(value) || 0;
    return num.toFixed(decimals);
  };

  return (
    <div className="space-y-6">
      {/* Referrer Information */}
      {userData.referred_by && (
        <ReferrerInfo referredBy={userData.referred_by} />
      )}

      {/* Professional User Profile */}
      <Card className="shadow-lg border-0">
        <CardContent className="p-6 text-center">
          <div
            className="relative inline-block mb-4 cursor-pointer"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            onClick={handlePhotoChange}
          >
            <Avatar className="w-32 h-32 border-4 border-white shadow-lg">
              <AvatarImage
                src={userData.profile_photo || undefined}
                alt={userData.username}
              />
              <AvatarFallback className="text-2xl bg-gradient-to-br from-blue-500 to-purple-600 text-white">
                {userData.username?.charAt(0).toUpperCase() || "U"}
              </AvatarFallback>
            </Avatar>

            {isHovered && (
              <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center">
                <div className="bg-white/90 backdrop-blur-sm px-3 py-1 rounded-lg flex items-center gap-1">
                  <Camera className="w-3 h-3" />
                  <span className="text-xs font-medium">Change</span>
                </div>
              </div>
            )}
          </div>

          <h3 className="text-xl font-bold text-gray-900 mb-2">
            @{userData.username}
          </h3>

          <div className="mb-4">{getMembershipBadge()}</div>

          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
          />
        </CardContent>
      </Card>

      {/* Financial Summary for Exotic/Dancers */}
      {isExoticOrDancer && (
        <Card className="shadow-lg border-0 bg-gradient-to-br from-green-50 to-emerald-50">
          <CardContent className="p-6">
            <h4 className="text-gray-900 font-semibold mb-4 flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-green-600" />
              Earnings Summary
            </h4>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Tips Earned:</span>
                <span className="font-bold text-green-600">
                  ${safeToFixed(userData.tips_earned)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Referral Fees:</span>
                <span className="font-bold text-blue-600">
                  ${safeToFixed(userData.referral_fees)}
                </span>
              </div>
              <div className="pt-2 border-t border-gray-200">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-700">
                    Total:
                  </span>
                  <span className="font-bold text-lg text-gray-900">
                    $
                    {safeToFixed(
                      (userData.tips_earned || 0) +
                      (userData.referral_fees || 0)
                    )}
                  </span>
                </div>
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-3 leading-relaxed">
              Earnings paid bi-weekly if ≥ $25. Via CashApp, PayPal, Zelle.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Member Since */}
      {userData.created_at && (
        <Card className="shadow-lg border-0">
          <CardContent className="p-6">
            <h4 className="text-gray-900 font-semibold mb-4 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-blue-600" />
              Member Since
            </h4>
            <div className="bg-blue-50 rounded-lg p-3">
              <p className="text-blue-900 font-medium">
                {new Date(userData.created_at).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Additional User Info */}
      <Card className="shadow-lg border-0">
        <CardContent className="p-6">
          <h4 className="text-gray-900 font-semibold mb-4 flex items-center gap-2">
            <User className="w-4 h-4 text-blue-600" />
            Profile Stats
          </h4>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">User Type:</span>
              <span className="font-medium text-gray-900 capitalize">
                {userData.user_type || "Normal"}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Gender:</span>
              <span className="font-medium text-gray-900 capitalize">
                {userData.gender || "Not specified"}
              </span>
            </div>
            {userData.lottery_tickets !== null && (
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Lottery Tickets:</span>
                <span className="font-medium text-gray-900">
                  {userData.lottery_tickets || 0}
                </span>
              </div>
            )}
            {userData.is_ranked && userData.rank_number && (
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Rank:</span>
                <span className="font-medium text-gray-900">
                  #{userData.rank_number}
                </span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ProfileSidebar;