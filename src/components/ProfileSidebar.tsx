import React, { useState, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Calendar,
  User,
  Camera,
  Award,
  DollarSign,
  MapPin,
} from "lucide-react";
import { Tables } from "@/types";
import ReferrerInfo from "./ReferrerInfo";
import { Button } from "@/components/ui/button";
import { useMobileLayout } from "@/hooks/use-mobile";

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
  const [isUploading, setIsUploading] = useState(false);
  const { isMobile, getCardClasses, getPaddingClasses } = useMobileLayout();

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
    // Check for Diamond Plus first
    if (
      userData.diamond_plus_active ||
      userData.membership_tier === "diamond_plus"
    ) {
      return (
        <Badge className="bg-gradient-to-r from-yellow-400 to-orange-400 text-black border-0 font-bold">
          <Award className="w-3 h-3 mr-1" />
          Diamond Plus
        </Badge>
      );
    }

    // Check for membership_tier first, then fall back to user_type logic
    const membershipTier = userData.membership_tier || userData.membership_type;

    if (membershipTier) {
      switch (membershipTier.toLowerCase()) {
        case "diamond":
          return (
            <Badge className="bg-gradient-to-r from-purple-600 to-pink-600 text-white border-0">
              <Award className="w-3 h-3 mr-1" />
              Diamond Member
            </Badge>
          );
        case "gold":
          return (
            <Badge className="bg-gradient-to-r from-yellow-500 to-yellow-600 text-white border-0">
              <Award className="w-3 h-3 mr-1" />
              Gold Member
            </Badge>
          );
        case "silver":
          return (
            <Badge className="bg-gradient-to-r from-gray-400 to-gray-500 text-white border-0">
              <Award className="w-3 h-3 mr-1" />
              Silver Member
            </Badge>
          );
        default:
          break;
      }
    }

    // Fall back to user_type logic for strippers/exotics
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

  const safeToFixed = (
    value: number | null | undefined,
    decimals: number = 2
  ) => {
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
      <Card
        className={getCardClasses(
          "shadow-lg border-0 bg-gradient-to-br from-blue-50 to-indigo-50"
        )}
      >
        <CardContent className={getPaddingClasses("p-6")}>
          <div className="text-center">
            <div className="relative w-32 h-32 mx-auto mb-4">
              <img
                src={userData.profile_photo || "/placeholder.svg"}
                alt="Profile"
                className="w-full h-full rounded-full object-cover border-4 border-white shadow-lg"
              />
              <Button
                onClick={handlePhotoChange}
                disabled={isUploading}
                className="absolute bottom-0 right-0 w-10 h-10 rounded-full bg-blue-600 hover:bg-blue-700 p-0"
              >
                {isUploading ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Camera className="w-4 h-4 text-white" />
                )}
              </Button>
            </div>

            <h3 className="text-xl font-bold text-gray-900 mb-2">
              @{userData.username}
            </h3>

            {/* Add membership display here */}
            <div className="mb-3">{getMembershipBadge()}</div>

            <div className="flex items-center justify-center gap-2 mb-3">
              <MapPin className="w-4 h-4 text-gray-500" />
              <span className="text-gray-600 text-sm">
                {userData.city && userData.state
                  ? `${userData.city}, ${userData.state}`
                  : "Location not set"}
              </span>
            </div>

            <Badge
              variant="outline"
              className="bg-blue-100 text-blue-800 border-blue-300"
            >
              {userData.user_type || "User"}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Financial Summary for Exotic/Dancers */}
      {isExoticOrDancer && (
        <Card
          className={getCardClasses(
            "shadow-lg border-0 bg-gradient-to-br from-green-50 to-emerald-50"
          )}
        >
          <CardContent className={getPaddingClasses("p-6")}>
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
      <Card className={getCardClasses("shadow-lg border-0")}>
        <CardContent className={getPaddingClasses("p-6")}>
          <div className="flex items-center gap-3 mb-3">
            <Calendar className="w-5 h-5 text-gray-500" />
            <span className="text-gray-700 font-medium">Member Since</span>
          </div>
          <p className="text-gray-900 font-semibold">
            {new Date(userData.created_at || "").toLocaleDateString("en-US", {
              year: "numeric",
              month: "long",
            })}
          </p>
        </CardContent>
      </Card>

      {/* Additional User Info */}
      <Card className={getCardClasses("shadow-lg border-0")}>
        <CardContent className={getPaddingClasses("p-6")}>
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
