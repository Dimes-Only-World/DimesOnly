import React, { useState, useRef, useEffect } from "react";
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
import SilverPlusCounter from "./SilverPlusCounter";
import SilverPlusMembership from "./SilverPlusMembership";
import { supabase } from "@/lib/supabase";
import { formatMemberSince } from "@/lib/formatDate";
import {
  fetchReferralEarnings,
  loadReferralEarningsFilters,
  REFERRAL_EARNINGS_FILTERS_EVENT,
  type ReferralEarningsFilters,
} from "@/lib/referralEarnings";

type UserData = Tables<"users"> & {
  diamond_plus_active?: boolean;
  silver_plus_active?: boolean;
};

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
  const normalizedUserType = String(userData.user_type || "").toLowerCase();
  const isExoticOrDancer =
    normalizedUserType === "exotic" || normalizedUserType === "stripper";
  const [isUploading, setIsUploading] = useState(false);
  const [liveEarnings, setLiveEarnings] = useState<{ tips_earned: number; referral_fees: number } | null>(null);
  const { isMobile, getCardClasses, getPaddingClasses } = useMobileLayout();

  useEffect(() => {
    if (!isExoticOrDancer || !userData?.id) return;
    let cancelled = false;

    const loadLiveEarnings = async (filters: ReferralEarningsFilters = loadReferralEarningsFilters(userData.id)) => {
      try {
        const [profileResult, referralResult] = await Promise.all([
          supabase
            .from("public_user_profiles")
            .select("tips_earned, referral_fees")
            .eq("id", userData.id)
            .maybeSingle(),
          fetchReferralEarnings({
            userId: userData.id,
            filters,
            page: 1,
            pageSize: 1,
          }),
        ]);

        const profileData = profileResult.data as
          | { tips_earned?: number | string | null; referral_fees?: number | string | null }
          | null;
        const referralTotal = Number(referralResult.total_amount);

        if (!cancelled) {
          setLiveEarnings({
            tips_earned: Number(profileData?.tips_earned ?? userData.tips_earned) || 0,
            referral_fees: Number.isFinite(referralTotal)
              ? referralTotal
              : Number(profileData?.referral_fees ?? userData.referral_fees) || 0,
          });
        }
      } catch (e) {
        console.warn("live earnings fetch failed", e);
      }
    };

    loadLiveEarnings();

    const handleFiltersChanged = (event: Event) => {
      const customEvent = event as CustomEvent<{ userId?: string; filters?: ReferralEarningsFilters }>;
      if (customEvent.detail?.userId === userData.id) {
        loadLiveEarnings(customEvent.detail.filters || {});
      }
    };

    window.addEventListener(REFERRAL_EARNINGS_FILTERS_EVENT, handleFiltersChanged);
    return () => {
      cancelled = true;
      window.removeEventListener(REFERRAL_EARNINGS_FILTERS_EVENT, handleFiltersChanged);
    };
  }, [isExoticOrDancer, userData?.id]);

  const tipsEarnedDisplay = liveEarnings?.tips_earned ?? Number(userData.tips_earned) ?? 0;
  const referralFeesDisplay = liveEarnings?.referral_fees ?? Number(userData.referral_fees) ?? 0;

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
    const normalizeTier = (value: unknown) =>
      String(value ?? "")
        .trim()
        .toLowerCase()
        .replace(/\s+/g, "_");
    const tierCandidates = [
      normalizeTier(userData.membership_tier),
      normalizeTier((userData as any).membershipTier),
      normalizeTier(userData.membership_type),
      normalizeTier((userData as any).membershipType),
    ].filter(Boolean);
    const tierRaw =
      [
        "business_owner_elite",
        "business_owner_elite_installment",
        "elite",
        "diamond_plus",
        "diamond",
        "gold",
        "silver",
        "silver_plus",
      ].find((tier) => tierCandidates.includes(tier)) || tierCandidates[0] || "";
    const hasSilverPlus = !!userData.silver_plus_active;
    const silverPlusChip = hasSilverPlus ? (
      <Badge
        variant="outline"
        className="border-blue-400 text-blue-300 bg-blue-500/10 font-semibold"
      >
        Silver Plus (Lifetime)
      </Badge>
    ) : null;

    // Elite Plus (Business Owner) — top priority
    if (
      (userData as any).business_owner_elite_active === true ||
      tierRaw === "business_owner_elite" ||
      tierRaw === "business_owner_elite_installment"
    ) {
      return (
        <div className="flex flex-wrap items-center">
          <Badge className="bg-gradient-to-r from-fuchsia-500 to-yellow-400 text-black border-0 font-bold">
            <Award className="w-3 h-3 mr-1" />
            Elite Plus
          </Badge>
          {silverPlusChip}
        </div>
      );
    }

    // Diamond Plus
    if (userData.diamond_plus_active || tierRaw === "diamond_plus") {
      return (
        <div className="flex flex-wrap items-center">
          <Badge className="bg-gradient-to-r from-yellow-400 to-orange-400 text-black border-0 font-bold">
            <Award className="w-3 h-3 mr-1" />
            Diamond Plus
          </Badge>
          {silverPlusChip}
        </div>
      );
    }

    // Current paid tier takes priority over lifetime Silver Plus flag
    const tierBadges: Record<string, JSX.Element> = {
      diamond: (
        <Badge className="bg-gradient-to-r from-purple-600 to-pink-600 text-white border-0">
          <Award className="w-3 h-3 mr-1" />
          Diamond Member
        </Badge>
      ),
      gold: (
        <Badge className="bg-gradient-to-r from-yellow-500 to-yellow-600 text-white border-0">
          <Award className="w-3 h-3 mr-1" />
          Gold Member
        </Badge>
      ),
      elite: (
        <Badge className="bg-gradient-to-r from-red-600 to-yellow-500 text-white border-0">
          <Award className="w-3 h-3 mr-1" />
          Elite Member
        </Badge>
      ),
    };

    if (tierBadges[tierRaw]) {
      return (
        <div className="flex flex-wrap items-center">
          {tierBadges[tierRaw]}
          {silverPlusChip}
        </div>
      );
    }

    // Silver Plus Member (lifetime, when no higher tier is active)
    if (hasSilverPlus) {
      return (
        <Badge className="bg-gradient-to-r from-blue-600 to-purple-600 text-white border-0 font-bold">
          <Award className="w-3 h-3 mr-1" />
          Silver Plus Member
        </Badge>
      );
    }

    if (tierRaw === "silver") {
      return (
        <Badge className="bg-gradient-to-r from-gray-400 to-gray-500 text-white border-0">
          <Award className="w-3 h-3 mr-1" />
          Silver Member
        </Badge>
      );
    }

    // Exotic/Stripper fallback
    if (isExoticOrDancer) {
      return (
        <Badge className="bg-gradient-to-r from-purple-600 to-pink-600 text-white border-0">
          <Award className="w-3 h-3 mr-1" />
          Diamond Member
        </Badge>
      );
    }

    // Default: Silver Member for males, business owners, and normal females
    return (
      <Badge className="bg-gradient-to-r from-gray-400 to-gray-500 text-white border-0">
        <Award className="w-3 h-3 mr-1" />
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

  // Determine Silver Plus eligibility
  const isSilverPlusEligible =
    (userData.gender === "male" ||
      (userData.gender === "female" && userData.user_type === "normal")) &&
    !userData.silver_plus_active &&
    !userData.diamond_plus_active &&
    userData.membership_tier !== "diamond_plus";

  return (
    <div className="space-y-6">
      {/* Silver Plus section removed as per design update */}

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
                  ${safeToFixed(tipsEarnedDisplay)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Referral Fees:</span>
                <span className="font-bold text-blue-600">
                  ${safeToFixed(referralFeesDisplay)}
                </span>
              </div>
              <div className="pt-2 border-t border-gray-200">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-700">
                    Total:
                  </span>
                  <span className="font-bold text-lg text-gray-900">
                    ${safeToFixed(tipsEarnedDisplay + referralFeesDisplay)}
                  </span>
                </div>
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-3 leading-relaxed">
              Earnings paid bi-weekly if greater than $250. Via CashApp, PayPal, Zelle.
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
            {formatMemberSince(userData.created_at)}
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
                {userData.user_type || "male"}
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
