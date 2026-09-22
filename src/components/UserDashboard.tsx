import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

import { User, DollarSign, Bell, TrendingUp, MessageSquare, Image, Trophy, Users, Smartphone } from "lucide-react";
import DashboardBanner from "./DashboardBanner";
import DashboardVideoHeader from "./DashboardVideoHeader";
import DashboardMoneyCircle from "./DashboardMoneyCircle";
import ProfileSidebar from "./ProfileSidebar";
import ProfileInfo from "./ProfileInfo";
import DashboardSectionLayout from "./DashboardSectionLayout";
import UserNotificationsTab from "./UserNotificationsTab";
import UserEarningsTab from "./UserEarningsTab";
import UserDirectMessagesTab from "./UserDirectMessagesTab";
import UserMediaUploadTab from "./UserMediaUploadTab";
import UserMakeMoneyTab from "./UserMakeMoneyTab";
import UserReferralsTab from "./UserReferralsTab";
import UserJackpotTab from "./UserJackpotTab";
import Top20DimesCarousel from "./Top20DimesCarousel";
import ApprovalStatusBanner from "./ApprovalStatusBanner";
import LatestDimesCarousel from "@/components/LatestDimesCarousel";
import DiamondPlusPopup from "./DiamondPlusPopup";
import MansionPartyPopup from "./MansionPartyPopup";
import SubscriptionProgress from "./SubscriptionProgress";
import DashboardCommandBar from "./DashboardCommandBar";
import DashboardChecklist from "./DashboardChecklist";
import DashboardMembershipCard from "./DashboardMembershipCard";
import DashboardFeedSection from "./dashboard/DashboardFeedSection";
import SharedLeadsList from "./SharedLeadsList";
import AuthGuard from "./AuthGuard";


import { useAppContext } from "@/contexts/AppContext";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { useMobileLayout } from "@/hooks/use-mobile";
import { useNavigate, useParams, Navigate } from "react-router-dom";
import { Tables } from "@/types";
import { usePageVideo } from "@/hooks/usePageVideo";
import { useAccountSetup } from "@/hooks/useAccountSetup";

type UserData = Tables<"users">;

type StoredDashboardUser = Partial<UserData> & {
  firstName?: string;
  lastName?: string;
  userType?: string;
  profilePhoto?: string;
  bannerPhoto?: string;
  createdAt?: string;
  mobileNumber?: string;
  membershipType?: string;
  membershipTier?: string;
  tipsEarned?: number;
  referralFees?: number;
  weeklyHours?: number;
  isRanked?: boolean;
  rankNumber?: number;
};

const normalizeMembershipValue = (value: unknown): string | null => {
  const normalized = String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_");
  return normalized || null;
};

const pickPrimaryMembership = (...values: unknown[]): string | null => {
  const candidates = values.map(normalizeMembershipValue).filter(Boolean) as string[];
  const paidTierPriority = [
    "business_owner_elite",
    "business_owner_elite_installment",
    "elite",
    "diamond_plus",
    "diamond",
    "gold",
  ];

  return paidTierPriority.find((tier) => candidates.includes(tier)) || candidates[0] || null;
};

const normalizeStoredUser = (raw: StoredDashboardUser | null | undefined): UserData | null => {
  if (!raw?.id) return null;

  const membershipTier = pickPrimaryMembership(
    raw.membership_tier,
    raw.membershipTier,
    raw.membership_type,
    raw.membershipType,
  );
  const membershipType = pickPrimaryMembership(
    raw.membership_type,
    raw.membershipType,
    raw.membership_tier,
    raw.membershipTier,
  );

  return {
    ...raw,
    id: String(raw.id),
    username: String(raw.username || ""),
    email: String(raw.email || ""),
    created_at: raw.created_at ?? raw.createdAt ?? null,
    first_name: raw.first_name ?? raw.firstName ?? null,
    last_name: raw.last_name ?? raw.lastName ?? null,
    user_type: raw.user_type ?? raw.userType ?? null,
    profile_photo: raw.profile_photo ?? raw.profilePhoto ?? null,
    banner_photo: raw.banner_photo ?? raw.bannerPhoto ?? null,
    mobile_number: raw.mobile_number ?? raw.mobileNumber ?? null,
    membership_type: membershipType,
    membership_tier: membershipTier,
    tips_earned: raw.tips_earned ?? raw.tipsEarned ?? 0,
    referral_fees: raw.referral_fees ?? raw.referralFees ?? 0,
    overrides: raw.overrides ?? 0,
    weekly_hours: raw.weekly_hours ?? raw.weeklyHours ?? 0,
    is_ranked: raw.is_ranked ?? raw.isRanked ?? false,
    rank_number: raw.rank_number ?? raw.rankNumber ?? null,
    gender: raw.gender ?? null,
    address: raw.address ?? null,
    city: raw.city ?? null,
    state: raw.state ?? null,
    zip: raw.zip ?? null,
  } as UserData;
};

const readStoredUser = (): UserData | null => {
  if (typeof window === "undefined") return null;
  const savedUserData = sessionStorage.getItem("userData");
  if (!savedUserData) return null;
  try {
    return normalizeStoredUser(JSON.parse(savedUserData));
  } catch (error) {
    console.error("Error parsing saved dashboard user:", error);
    return null;
  }
};

const persistDashboardUser = (data: UserData | null) => {
  if (typeof window === "undefined" || !data?.id) return;
  const normalizedData = {
    ...data,
    created_at: data.created_at ?? (data as StoredDashboardUser).createdAt ?? null,
    createdAt: data.created_at ?? (data as StoredDashboardUser).createdAt ?? null,
  };
  sessionStorage.setItem("userData", JSON.stringify(normalizedData));
  if (data.username) sessionStorage.setItem("currentUser", data.username);
};

const mergeUserDataWithMemberDate = (
  previous: UserData | null | undefined,
  incoming: Partial<UserData> | null | undefined,
): UserData | null => {
  if (!previous && !incoming?.id) return null;

  const createdAt = incoming?.created_at ?? previous?.created_at ?? (incoming as StoredDashboardUser | null | undefined)?.createdAt ?? null;
  return {
    ...(previous || {}),
    ...(incoming || {}),
    created_at: createdAt,
  } as UserData;
};

const SLUG_TITLES: Record<string, string> = {
  profile: "Profile",
  "make-money": "Make Money",
  notifications: "Notifications",
  earnings: "Earnings",
  messages: "Messages",
  media: "Media",
  jackpot: "Jackpot",
  referrals: "Referrals",
};

const UserDashboard: React.FC = () => {
  const { user } = useAppContext();
  const initialUserData = normalizeStoredUser(user as StoredDashboardUser | null) || readStoredUser();
  const [userData, setUserData] = useState<UserData | null>(initialUserData);
  const [loading, setLoading] = useState(!initialUserData);
  const setup = useAccountSetup(initialUserData);
  const completion = setup.percent;
  const { toast } = useToast();
  const { isMobile } = useMobileLayout();
  const navigate = useNavigate();
  const { tab: tabParam } = useParams<{ tab: string }>();
  const slug = tabParam || "profile";
  const isValidSlug = slug in SLUG_TITLES;

  const userType = (userData?.user_type || "").toLowerCase();
  const isDimeUser = ["stripper", "exotic"].includes(userType);
  const isBusinessOwner = userType === "business_owner" || (userData as any)?.is_business_owner === true;
  const boEliteActive = (userData as any)?.business_owner_elite_active === true;
  const heroKey = isBusinessOwner ? "dashboard_business_owner" : (isDimeUser ? "dashboard_dimes" : "dashboard_male");
  const { videoUrl: heroVideoUrl } = usePageVideo(heroKey);

  useEffect(() => {
    let cancelled = false;

    const hydratePublicProfile = async (userId: string) => {
      try {
        const { data: pub } = await supabase
          .from("public_user_profiles")
            .select("created_at, profile_photo, banner_photo, front_page_photo, city, state, username, user_type, gender, membership_tier, membership_type, silver_plus_active, diamond_plus_active")
          .eq("id", userId)
          .maybeSingle();

        if (!cancelled && pub) {
          setUserData((prev) => {
            const merged = mergeUserDataWithMemberDate(prev, pub);
            persistDashboardUser(merged);
            return merged;
          });
        }
      } catch (e) {
        console.warn("public_user_profiles hydrate failed", e);
      }
    };

    const loadUserData = async () => {
      const localUserData = normalizeStoredUser(user as StoredDashboardUser | null) || readStoredUser();
      if (localUserData) {
        setUserData((prev) => mergeUserDataWithMemberDate(prev, localUserData));
        persistDashboardUser(localUserData);
        setLoading(false);
      }

      const authToken = localStorage.getItem("authToken");
      const isCustomAuth =
        authToken === "authenticated" || authToken?.startsWith("authenticated_");
      const userId = user?.id || localUserData?.id;

      if (userId) {
        await hydratePublicProfile(userId);

        if (isCustomAuth) {
          const { data: { session } } = await supabase.auth.getSession();
          if (!cancelled && session?.user?.id === userId) {
            await fetchUserViaEdgeFunction(userId);
          }
          if (!cancelled) setLoading(false);
        } else {
          await fetchUserDataById(userId, { showLoading: !localUserData });
        }

      } else {
        await getCurrentUser();
      }
    };
    loadUserData();

    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const fetchUserViaEdgeFunction = async (userId: string): Promise<boolean> => {
    try {
      // Use the SDK so the user's JWT is automatically forwarded
      const { data: response, error } = await supabase.functions.invoke('public-data', {
        body: { action: 'getUserById', userId },
      });
      if (error) {
        console.error("Error fetching user via edge function:", error);
        return false;
      }
      if (response?.data) {
        const incoming = response.data as UserData;
        setUserData((prev) => {
          const merged = mergeUserDataWithMemberDate(prev, incoming);
          persistDashboardUser(merged);
          return merged;
        });
        return true;
      }
      return false;
    } catch (error) {
      console.error("Error fetching user via edge function:", error);
      return false;
    } finally {
      setLoading(false);
    }
  };


  const getCurrentUser = async () => {
    try {
      const savedUserData = sessionStorage.getItem("userData");
      if (savedUserData) {
        try {
          const parsedUser = JSON.parse(savedUserData);
          if (parsedUser?.id) {
            const success = await fetchUserViaEdgeFunction(parsedUser.id);
            if (success) return;
          }
        } catch (e) {
          console.error("Error parsing saved user data:", e);
        }
      }
      const {
        data: { user: currentUser },
      } = await supabase.auth.getUser();
      if (currentUser?.id) {
        await fetchUserDataById(currentUser.id);
      } else {
        setLoading(false);
      }
    } catch (error) {
      console.error("Error getting current user:", error);
      setLoading(false);
    }
  };

  const fetchUserDataById = async (
    userId: string,
    options: { showLoading?: boolean } = {}
  ): Promise<boolean> => {
    try {
      if (options.showLoading ?? !userData) setLoading(true);
      const { data, error } = await supabase
        .from("users")
        .select("*")
        .eq("id", userId)
        .single();
      if (error) return false;
      if (data) {
        const incoming = data as UserData;
        setUserData((prev) => {
          const merged = mergeUserDataWithMemberDate(prev, incoming);
          persistDashboardUser(merged);
          return merged;
        });
        return true;
      }
      return false;
    } catch (error) {
      console.error("Error fetching user data:", error);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const updateUserData = async (updatedData: Partial<UserData>) => {
    if (!userData?.id) return false;
    try {
      const { data, error } = await supabase
        .from("users")
        .update(updatedData)
        .eq("id", userData.id)
        .select();
      if (error) {
        toast({
          title: "Error",
          description: `Failed to update profile: ${error.message}`,
          variant: "destructive",
        });
        return false;
      }
      if (data && data.length > 0) {
        const incoming = data[0] as UserData;
        setUserData((prev) => {
          const merged = mergeUserDataWithMemberDate(prev, incoming);
          persistDashboardUser(merged);
          return merged;
        });
        toast({ title: "Success", description: "Profile updated successfully" });
        return true;
      }
      const refetched = await fetchUserDataById(userData.id);
      if (refetched) {
        toast({ title: "Success", description: "Profile updated successfully" });
        return true;
      }
      return false;
    } catch (error) {
      console.error("Exception updating user data:", error);
      toast({
        title: "Error",
        description: "Failed to update profile",
        variant: "destructive",
      });
      return false;
    }
  };

  const handleImageUpload = async (
    file: File,
    imageType: "profile" | "banner" | "front_page"
  ) => {
    if (!userData?.username) return;
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `profiles/${userData.username}/${imageType}.${fileExt}`;
      const { error } = await supabase.storage
        .from("user-photos")
        .upload(fileName, file, { cacheControl: "3600", upsert: true });
      if (error) throw error;
      const {
        data: { publicUrl },
      } = supabase.storage.from("user-photos").getPublicUrl(fileName);
      const updateField =
        imageType === "profile"
          ? "profile_photo"
          : imageType === "banner"
          ? "banner_photo"
          : "front_page_photo";
      await updateUserData({ [updateField]: publicUrl });
    } catch (error) {
      console.error("Error uploading image:", error);
      toast({
        title: "Error",
        description: "Failed to upload image",
        variant: "destructive",
      });
    }
  };

  // Redirect unknown slugs to profile
  if (!isValidSlug) {
    return <Navigate to="/dashboard/profile" replace />;
  }

  if (loading) {
    return (
      <AuthGuard>
        <div className="min-h-screen bg-background p-4 sm:p-6 lg:p-8">
          <div className="mx-auto w-full max-w-6xl space-y-6">
            <Skeleton className="h-40 w-full rounded-xl" />
            <Skeleton className="h-56 w-full rounded-xl" />
            <Skeleton className="h-40 w-full rounded-xl" />
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-8">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-20 rounded-xl" />
              ))}
            </div>
          </div>
        </div>
      </AuthGuard>
    );
  }


  if (!userData) {
    return (
      <AuthGuard>
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
          <p className="text-gray-600">User data not found</p>
        </div>
      </AuthGuard>
    );
  }

  const renderSection = () => {
    switch (slug) {
      case "profile":
        return (
          <div className="text-black [--foreground:0_0%_0%] w-full">
            {/* 1. Video header — full-bleed, flush to top */}
            <div className="relative left-1/2 right-1/2 -ml-[50vw] -mr-[50vw] w-screen -mt-6">
              <DashboardVideoHeader
                srcDesktop={heroVideoUrl}
                srcMobile={heroVideoUrl}
                thumbnailUrl="https://dimesonly.s3.us-east-2.amazonaws.com/HOUSING-ANGELS+(1).png"
              />
            </div>

            {/* 2. Welcome back */}
            <DashboardCommandBar userData={userData} completion={completion} section="header" />

            {/* 3. Membership (collapsible) */}
            <Accordion type="single" collapsible className="mb-6 w-full">
              <AccordionItem value="membership" className="rounded-xl border border-border/60 bg-dimes-surface px-4">
                <AccordionTrigger className="text-base font-bold hover:no-underline">
                  Your Membership
                </AccordionTrigger>
                <AccordionContent>
                  <DashboardMembershipCard userData={userData} />
                </AccordionContent>
              </AccordionItem>
            </Accordion>

            {/* 4. Earnings (collapsible) */}
            <Accordion type="single" collapsible className="mb-6 w-full">
              <AccordionItem value="earnings" className="rounded-xl border border-border/60 bg-dimes-surface px-4">
                <AccordionTrigger className="text-base font-bold hover:no-underline">
                  Earnings
                </AccordionTrigger>
                <AccordionContent>
                  <DashboardCommandBar userData={userData} completion={completion} section="kpis" />
                  <div className="mt-4">
                    <SharedLeadsList />
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>


            {/* 5. The feed */}
            <DashboardFeedSection />

            <DiamondPlusPopup userData={userData} />
          </div>
        );
      case "make-money":
        return <UserMakeMoneyTab />;
      case "notifications":
        return <UserNotificationsTab />;
      case "earnings":
        return <UserEarningsTab userData={userData} />;
      case "messages":
        return <UserDirectMessagesTab />;
      case "media":
        return <UserMediaUploadTab userData={userData} onUpdate={updateUserData} />;
      case "jackpot":
        return <UserJackpotTab userData={userData} />;
      case "referrals":
        return <UserReferralsTab />;
      default:
        return null;
    }
  };

  return (
    <DashboardSectionLayout
      title={SLUG_TITLES[slug]}
      username={userData.username}
      profilePhoto={userData.profile_photo}
      fullWidth={slug === "profile"}
    >
      {slug !== "profile" && slug !== "earnings" && <Top20DimesCarousel />}


      {isBusinessOwner && !boEliteActive && (
        <div className="mb-4 rounded-lg border border-fuchsia-500/60 bg-gradient-to-r from-fuchsia-900/60 to-purple-900/60 p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div>
            <div className="text-white font-semibold">Upgrade to Business Owner Elite</div>
            <div className="text-fuchsia-200 text-sm">$15,000 lifetime — full access to every area of the site. Only 100 seats.</div>
          </div>
          <button
            onClick={() => navigate("/elite-plus")}
            className="px-5 py-2 rounded-md bg-fuchsia-500 hover:bg-fuchsia-400 text-white font-semibold whitespace-nowrap"
          >
            Upgrade to Elite — $15,000
          </button>
        </div>
      )}
      {isBusinessOwner && boEliteActive && (
        <div className="mb-4 rounded-lg border border-yellow-400/60 bg-black/40 px-4 py-2 text-yellow-300 text-sm font-semibold">
          Business Owner Elite Member · Seat #{(userData as any)?.business_owner_elite_seat_number ?? "—"}
        </div>
      )}
      {renderSection()}
      {slug === "earnings" && <Top20DimesCarousel />}
      <MansionPartyPopup userData={userData} />
    </DashboardSectionLayout>
  );
};

export default UserDashboard;
