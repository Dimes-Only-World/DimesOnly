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
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAppContext();
  const { toast } = useToast();
  const { isMobile } = useMobileLayout();
  const navigate = useNavigate();
  const { tab: tabParam } = useParams<{ tab: string }>();
  const slug = tabParam || "profile";
  const isValidSlug = slug in SLUG_TITLES;

  const isDimeUser = userData
    ? ["stripper", "exotic"].includes((userData.user_type || "").toLowerCase())
    : false;
  const { videoUrl: heroVideoUrl } = usePageVideo(
    isDimeUser ? "dashboard_dimes" : "dashboard_male"
  );

  useEffect(() => {
    const loadUserData = async () => {
      const authToken = localStorage.getItem("authToken");
      const isCustomAuth =
        authToken === "authenticated" || authToken?.startsWith("authenticated_");

      if (user?.id) {
        if (isCustomAuth) {
          await fetchUserViaEdgeFunction(user.id);
        } else {
          await fetchUserDataById(user.id);
        }
      } else {
        await getCurrentUser();
      }
    };
    loadUserData();
  }, [user?.id]);

  const fetchUserViaEdgeFunction = async (userId: string): Promise<boolean> => {
    try {
      const response = await fetch(
        "https://qkcuykpndrolrewwnkwb.supabase.co/functions/v1/public-data",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "getUserById", userId }),
        }
      );
      if (!response.ok) return false;
      const result = await response.json();
      if (result.data) {
        setUserData(result.data);
        setLoading(false);
        return true;
      }
      return false;
    } catch (error) {
      console.error("Error fetching user via edge function:", error);
      return false;
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

  const fetchUserDataById = async (userId: string): Promise<boolean> => {
    try {
      setLoading(true);
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

            <DashboardMoneyCircle
              userId={userData.id}
              onViewAll={() => navigate("/dashboard/referrals")}
              onGetLink={() => navigate("/dashboard/make-money#referral-link")}
            />

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
      {renderSection()}
    </DashboardSectionLayout>
  );
};

export default UserDashboard;
