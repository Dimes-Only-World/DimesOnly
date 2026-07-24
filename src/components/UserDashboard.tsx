import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle2, User, DollarSign, Bell, TrendingUp, MessageSquare, Image, Trophy, Users } from "lucide-react";
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
import LatestDimesCarousel from "@/components/LatestDimesCarousel";
import DiamondPlusButton from "./DiamondPlusButton";
import DiamondPlusPopup from "./DiamondPlusPopup";
import SilverPlusMembership from "./SilverPlusMembership";
import SilverPlusCounter from "./SilverPlusCounter";
import SubscriptionProgress from "./SubscriptionProgress";
import AuthGuard from "./AuthGuard";
import { useAppContext } from "@/contexts/AppContext";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { useMobileLayout } from "@/hooks/use-mobile";
import { useNavigate, useParams, Navigate } from "react-router-dom";
import { Tables } from "@/types";
import { usePageVideo } from "@/hooks/usePageVideo";

type UserData = Tables<"users">;

type StoredDashboardUser = Partial<UserData> & {
  firstName?: string;
  lastName?: string;
  userType?: string;
  profilePhoto?: string;
  bannerPhoto?: string;
  mobileNumber?: string;
  membershipType?: string;
  tipsEarned?: number;
  referralFees?: number;
  weeklyHours?: number;
  isRanked?: boolean;
  rankNumber?: number;
};

const normalizeStoredUser = (raw: StoredDashboardUser | null | undefined): UserData | null => {
  if (!raw?.id) return null;

  return {
    ...raw,
    id: String(raw.id),
    username: String(raw.username || ""),
    email: String(raw.email || ""),
    first_name: raw.first_name ?? raw.firstName ?? null,
    last_name: raw.last_name ?? raw.lastName ?? null,
    user_type: raw.user_type ?? raw.userType ?? null,
    profile_photo: raw.profile_photo ?? raw.profilePhoto ?? null,
    banner_photo: raw.banner_photo ?? raw.bannerPhoto ?? null,
    mobile_number: raw.mobile_number ?? raw.mobileNumber ?? null,
    membership_type: raw.membership_type ?? raw.membershipType ?? null,
    membership_tier: raw.membership_tier ?? raw.membershipType ?? null,
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

    const loadUserData = async () => {
      const localUserData = normalizeStoredUser(user as StoredDashboardUser | null) || readStoredUser();
      if (localUserData) {
        setUserData((prev) => prev ?? localUserData);
        setLoading(false);
      }

      const authToken = localStorage.getItem("authToken");
      const isCustomAuth =
        authToken === "authenticated" || authToken?.startsWith("authenticated_");
      const userId = user?.id || localUserData?.id;

      if (userId) {
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
        setUserData(response.data);
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
        setUserData(data as UserData);
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
        setUserData(data[0] as UserData);
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
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
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
          <>

            <div className={`${isMobile ? "py-2" : "py-4"} -mx-4 sm:-mx-6 lg:-mx-8`}>
              <DashboardVideoHeader
                srcDesktop={heroVideoUrl}
                srcMobile={heroVideoUrl}
                thumbnailUrl="https://dimesonly.s3.us-east-2.amazonaws.com/HOUSING-ANGELS+(1).png"
              />
            </div>

            <Top20DimesCarousel />

            <DashboardMoneyCircle
              userId={userData.id}
              onViewAll={() => navigate("/dashboard/referrals")}
              onGetLink={() => navigate("/dashboard/make-money#referral-link")}
            />

            <LatestDimesCarousel />


            <div className="w-full max-w-md mx-auto mb-6">
              <button
                onClick={() => navigate("/feed")}
                className="w-full py-4 px-6 rounded-xl bg-gradient-to-r from-fuchsia-500 to-pink-600 hover:from-fuchsia-600 hover:to-pink-700 text-white font-bold text-lg shadow-lg flex items-center justify-center gap-2"
              >
                📱 SOCIAL FEED — Post Photos & Reels
              </button>
            </div>

            <DiamondPlusPopup userData={userData} />
            <DiamondPlusButton userData={userData} />

            <SubscriptionProgress userId={userData.id} />

            {userData &&
              (userData.gender === "male" ||
                (userData.gender === "female" && userData.user_type === "normal")) &&
              !userData.silver_plus_active && (
                <Card className="bg-gradient-to-br from-blue-900 to-blue-700 text-white mb-6">
                  <CardContent className="p-6">
                    <div className="flex flex-col md:flex-row gap-8 items-center">
                      <div className="w-full md:w-1/3">
                        <h3 className="text-2xl font-bold mb-4 text-center md:text-left">
                          Silver Plus Memberships
                        </h3>
                        <div className="text-yellow-300 text-sm mb-4 text-center md:text-left">
                          Limited Time Offer
                        </div>
                        <div className="bg-black/30 p-4 rounded-lg">
                          <SilverPlusCounter />
                        </div>
                      </div>
                      <div className="w-full md:w-2/3">
                        <h4 className="font-semibold text-yellow-300 text-lg mb-3">
                          Silver Plus Referral & Compensation
                        </h4>
                        <ul className="space-y-3 text-sm">
                          <li className="flex items-start">
                            <CheckCircle2 className="w-4 h-4 mt-0.5 mr-2 text-green-400 flex-shrink-0" />
                            <span>One Year of Flame Flix Subscription in Phase 6</span>
                          </li>
                          <li className="flex items-start">
                            <CheckCircle2 className="w-4 h-4 mt-0.5 mr-2 text-green-400 flex-shrink-0" />
                            <span>
                              <b>10%</b> discount site wide forever from all Dimes Only related products and services.
                            </span>
                          </li>
                          <li className="flex items-start">
                            <CheckCircle2 className="w-4 h-4 mt-0.5 mr-2 text-green-400 flex-shrink-0" />
                            <span>Get Overrides from Strippers and Exotics</span>
                          </li>
                          <li className="flex items-start">
                            <CheckCircle2 className="w-4 h-4 mt-0.5 mr-2 text-green-400 flex-shrink-0" />
                            <span>
                              Earn <b>20%</b> of tips from all your strippers & exotics.
                            </span>
                          </li>
                          <li className="flex items-start">
                            <CheckCircle2 className="w-4 h-4 mt-0.5 mr-2 text-green-400 flex-shrink-0" />
                            <span>
                              Earn <b>10%</b> override from your referrals' purchases of all products & services
                            </span>
                          </li>
                          <li className="flex items-start">
                            <CheckCircle2 className="w-4 h-4 mt-0.5 mr-2 text-green-400 flex-shrink-0" />
                            <span>View nude photos & videos from strippers & exotics</span>
                          </li>
                        </ul>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

            {userData && (
              <div className="mb-6">
                <SilverPlusMembership
                  userData={userData}
                  onMembershipUpdate={(updatedData) =>
                    setUserData((prev) => ({ ...prev, ...updatedData }))
                  }
                />
              </div>
            )}

            <Card className="mb-6 overflow-hidden">
              <DashboardBanner
                bannerPhoto={userData.banner_photo}
                userData={userData}
                onImageUpload={(file) => handleImageUpload(file, "banner")}
              />
            </Card>

            <div className="my-6 flex justify-center">
              <Button
                asChild
                className="bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white font-bold px-8 py-3 text-lg shadow-lg"
                aria-label="Upgrade Membership"
              >
                <a href="/upgrade">Upgrade Membership</a>
              </Button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3 md:gap-4 mb-6">
              {[
                { slug: "profile", label: "PROFILE", Icon: User, hoverBtn: "hover:border-pink-300 hover:text-pink-700", iconColor: "text-pink-600 group-hover:text-pink-700" },
                { slug: "make-money", label: "MAKE MONEY", Icon: DollarSign, hoverBtn: "hover:border-green-300 hover:text-green-700", iconColor: "text-green-600 group-hover:text-green-700" },
                { slug: "notifications", label: "NOTIFICATIONS", Icon: Bell, hoverBtn: "hover:border-blue-300 hover:text-blue-700", iconColor: "text-blue-600 group-hover:text-blue-700" },
                { slug: "earnings", label: "EARNINGS", Icon: TrendingUp, hoverBtn: "hover:border-yellow-300 hover:text-yellow-700", iconColor: "text-yellow-600 group-hover:text-yellow-700" },
                { slug: "messages", label: "MESSAGES", Icon: MessageSquare, hoverBtn: "hover:border-purple-300 hover:text-purple-700", iconColor: "text-purple-600 group-hover:text-purple-700" },
                { slug: "media", label: "MEDIA", Icon: Image, hoverBtn: "hover:border-red-300 hover:text-red-700", iconColor: "text-red-600 group-hover:text-red-700" },
                { slug: "jackpot", label: "JACKPOT", Icon: Trophy, hoverBtn: "hover:border-orange-300 hover:text-orange-700", iconColor: "text-orange-600 group-hover:text-orange-700" },
                { slug: "referrals", label: "REFERRALS", Icon: Users, hoverBtn: "hover:border-cyan-300 hover:text-cyan-700", iconColor: "text-cyan-600 group-hover:text-cyan-700" },
              ].map(({ slug: s, label, Icon, hoverBtn, iconColor }) => (
                <Button
                  key={s}
                  onClick={() => navigate(`/dashboard/${s}`)}
                  className={`group bg-white hover:bg-gray-50 text-gray-900 border border-gray-200 shadow-sm font-medium py-3 px-4 h-auto text-xs sm:text-sm transition-all duration-200 hover:shadow-md ${hoverBtn}`}
                  aria-label={label}
                >
                  <span className="flex flex-col items-center gap-1">
                    <Icon className={`w-5 h-5 ${iconColor}`} />
                    <span className="truncate">{label}</span>
                  </span>
                </Button>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              <div className="lg:col-span-1">
                <ProfileSidebar
                  userData={userData}
                  referrerData={null}
                  onImageUpload={(file) => handleImageUpload(file, "profile")}
                />
              </div>
              <div className="lg:col-span-3">
                <ProfileInfo userData={userData} onUpdate={updateUserData} />
              </div>
            </div>
          </>
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
    >
      <Top20DimesCarousel />
      {isBusinessOwner && !boEliteActive && (
        <div className="mb-4 rounded-lg border border-fuchsia-500/60 bg-gradient-to-r from-fuchsia-900/60 to-purple-900/60 p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div>
            <div className="text-white font-semibold">Upgrade to Business Owner Elite</div>
            <div className="text-fuchsia-200 text-sm">$15,000 lifetime — full access to every area of the site. Only 100 seats.</div>
          </div>
          <button
            onClick={() => navigate("/business-owner-elite")}
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
    </DashboardSectionLayout>
  );
};

export default UserDashboard;
