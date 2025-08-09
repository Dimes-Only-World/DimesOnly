import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import {
  User,
  Bell,
  DollarSign,
  MessageCircle,
  Camera,
  Share2,
  Trophy,
  LogOut,
  Crown,
  CheckCircle2,
} from "lucide-react";
import DashboardBanner from "./DashboardBanner";
import DashboardVideoHeader from "./DashboardVideoHeader";
import ProfileSidebar from "./ProfileSidebar";
import ProfileInfo from "./ProfileInfo";
import AuthGuard from "./AuthGuard";
import UserNotificationsTab from "./UserNotificationsTab";
import UserEarningsTab from "./UserEarningsTab";
import UserDirectMessagesTab from "./UserDirectMessagesTab";
import UserMediaUploadTab from "./UserMediaUploadTab";
import UserMakeMoneyTab from "./UserMakeMoneyTab";
import UserJackpotTab from "./UserJackpotTab";
import DiamondPlusDashboard from "./DiamondPlusDashboard";
import DiamondPlusButton from "./DiamondPlusButton";
import SilverPlusMembership from "./SilverPlusMembership";
import SilverPlusCounter from "./SilverPlusCounter";
import { useAppContext } from "@/contexts/AppContext";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { useMobileLayout } from "@/hooks/use-mobile";
import { useNavigate } from "react-router-dom";
import { Tables } from "@/types";

type UserData = Tables<"users">;

const UserDashboard: React.FC = () => {
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const { user, setUser } = useAppContext();
  const { toast } = useToast();
  const {
    isMobile,
    getContainerClasses,
    getContentClasses,
    getCardClasses,
    getPaddingClasses,
  } = useMobileLayout();
  const navigate = useNavigate();

  useEffect(() => {
    if (user?.id) {
      fetchUserDataById(user.id);
    } else {
      getCurrentUser();
    }
  }, [user?.id]);

  const getCurrentUser = async () => {
    try {
      const {
        data: { user: currentUser },
      } = await supabase.auth.getUser();
      if (currentUser?.id) {
        await fetchUserDataById(currentUser.id);
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

      if (error) {
        console.error("Error fetching user data:", error);
        return false;
      }

      if (data) {
        setUserData(data as UserData);
        return true;
      }
      return false;
    } catch (error) {
      console.error("Error fetching user data:", error);
      toast({
        title: "Error",
        description: "Failed to load user data",
        variant: "destructive",
      });
      return false;
    } finally {
      setLoading(false);
    }
  };

  const testUserUpdate = async () => {
    if (!userData?.id) return;

    console.log("Testing simple update with minimal data...");
    try {
      // Test with just one field
      const { data, error } = await supabase
        .from("users")
        .update({ bio: "Test update - " + new Date().toISOString() })
        .eq("id", userData.id)
        .select();

      console.log("Test update result:", { data, error });

      if (error) {
        console.error("Test update failed:", error);
        // Try with admin client
        console.log("Trying with admin client...");
        const { createClient } = await import("@supabase/supabase-js");
        const adminClient = createClient(
          "https://qkcuykpndrolrewwnkwb.supabase.co",
          "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFrY3V5a3BuZHJvbHJld3dua3diIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0OTM4MjA3MCwiZXhwIjoyMDY0OTU4MDcwfQ.ayaH1xWQQU-KzPkS5Zufk_Ss6wHns95u6DBhtdLKFN8"
        );

        const { data: adminData, error: adminError } = await adminClient
          .from("users")
          .update({ bio: "Admin test update - " + new Date().toISOString() })
          .eq("id", userData.id)
          .select();

        console.log("Admin update result:", { adminData, adminError });
      }
    } catch (error) {
      console.error("Test update exception:", error);
    }
  };

  const updateUserData = async (updatedData: Partial<UserData>) => {
    if (!userData?.id) {
      console.error("No user ID available for update");
      return false;
    }

    console.log("Attempting to update user data:", {
      userId: userData.id,
      updatedData,
      originalData: userData,
    });

    try {
      const { data, error } = await supabase
        .from("users")
        .update(updatedData)
        .eq("id", userData.id)
        .select();

      console.log("Supabase update response:", { data, error });

      if (error) {
        console.error("Supabase error updating user data:", error);
        toast({
          title: "Error",
          description: `Failed to update profile: ${error.message}`,
          variant: "destructive",
        });
        return false;
      }

      if (data && data.length > 0) {
        console.log("Update successful, new data:", data[0]);
        setUserData(data[0] as UserData);
        toast({
          title: "Success",
          description: "Profile updated successfully",
        });
        return true;
      } else {
        console.log("No data returned from update, refetching...");
        // If no data returned, refetch the user data
        const refetchedData = await fetchUserDataById(userData.id);
        if (refetchedData) {
          toast({
            title: "Success",
            description: "Profile updated successfully",
          });
          return true;
        } else {
          toast({
            title: "Warning",
            description: "Profile may have been updated, but couldn't verify",
            variant: "destructive",
          });
          return false;
        }
      }
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

      const { data, error } = await supabase.storage
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

  const handleLogout = async () => {
    try {
      // Sign out from Supabase
      await supabase.auth.signOut();

      // Clear local storage and session storage
      localStorage.removeItem("authToken");
      sessionStorage.removeItem("userData");
      sessionStorage.removeItem("currentUser");

      // Clear app context
      setUser(null);

      toast({
        title: "Logged out successfully",
        description: "You have been logged out of your account",
      });

      // Redirect to login
      navigate("/login", { replace: true });
    } catch (error) {
      console.error("Error logging out:", error);
      toast({
        title: "Error",
        description: "Failed to logout properly",
        variant: "destructive",
      });
    }
  };

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

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
        <div className="bg-white shadow-sm border-b">
          <div className={getContainerClasses()}>
            <div
              className={`relative flex flex-col items-center py-4 ${getContentClasses()}`}
            >
              <h1 className="text-2xl font-bold text-gray-900 mb-1">
                Dimes Only World
              </h1>
              <p className="text-lg text-gray-600">
                Welcome Back {userData.username || "User"}
              </p>

              <div className="absolute top-2 right-2">
                <Button
                  onClick={handleLogout}
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-2 text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300"
                >
                  <LogOut className="w-4 h-4" />
                  Logout
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div
          className={`${getContainerClasses()} ${isMobile ? "py-4" : "py-8"}`}
        >
          <DashboardVideoHeader
            videoUrl="https://dimesonlyworld.s3.us-east-2.amazonaws.com/home+page.mp4"
            thumbnailUrl="https://dimesonly.s3.us-east-2.amazonaws.com/HOUSING-ANGELS+(1).png"
          />

          {/* Diamond Plus Button - placed under video banner, above banner photo */}
          <DiamondPlusButton userData={userData} />

          {/* Silver Plus Counter and Benefits Section */}
          <Card className="bg-gradient-to-br from-blue-900 to-blue-700 text-white mb-6">
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row gap-8 items-center">
                {/* Left side - Counter */}
                <div className="w-full md:w-1/3">
                  <h3 className="text-2xl font-bold mb-4 text-center md:text-left">Silver Plus Memberships</h3>
                  <div className="text-yellow-300 text-sm mb-4 text-center md:text-left">Limited Time Offer</div>
                  <div className="bg-black/30 p-4 rounded-lg">
                    <SilverPlusCounter />
                  </div>
                </div>
                
                {/* Right side - Benefits */}
                <div className="w-full md:w-2/3">
                  <h4 className="font-semibold text-yellow-300 text-lg mb-3">Silver Plus Referral & Compensation</h4>
                  <ul className="space-y-3 text-sm">
                    <li className="flex items-start">
                      <CheckCircle2 className="w-4 h-4 mt-0.5 mr-2 text-green-400 flex-shrink-0" />
                      <span>One Year of Flame Flix Subscription in Phase 6</span>
                    </li>
                    <li className="flex items-start">
                      <CheckCircle2 className="w-4 h-4 mt-0.5 mr-2 text-green-400 flex-shrink-0" />
                      <span><b>10%</b> discount site wide forever from all Dimes Only related products and services.</span>
                    </li>
                    <li className="flex items-start">
                      <CheckCircle2 className="w-4 h-4 mt-0.5 mr-2 text-green-400 flex-shrink-0" />
                      <span>Get Overrides from Strippers and Exotics</span>
                    </li>
                    <li className="flex items-start">
                      <CheckCircle2 className="w-4 h-4 mt-0.5 mr-2 text-green-400 flex-shrink-0" />
                      <span>Earn <b>20%</b> of tips from all your strippers & exotics.</span>
                    </li>
                    <li className="flex items-start">
                      <CheckCircle2 className="w-4 h-4 mt-0.5 mr-2 text-green-400 flex-shrink-0" />
                      <span>Earn <b>10%</b> override from your referrals' purchases of all products & services</span>
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

          {/* Silver Plus Membership Section */}
          {userData && (
            <div className="mb-6">
              <SilverPlusMembership userData={userData} onMembershipUpdate={setUserData} />
            </div>
          )}

          <Card
            className={`${
              isMobile ? "mb-4 mx-0 rounded-none" : "mb-8"
            } overflow-hidden`}
          >
            <DashboardBanner
              bannerPhoto={userData.banner_photo}
              userData={userData}
              onImageUpload={(file) => handleImageUpload(file, "banner")}
            />
          </Card>

          {/* Universal Upgrade Membership Button – appears below banner for all users */}
          <div className="my-6 flex justify-center">
            <Button
              asChild
              className="bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white font-bold px-8 py-3 text-lg shadow-lg"
              aria-label="Upgrade Membership"
            >
              <a href="/upgrade">Upgrade Membership</a>
            </Button>
          </div>

          {/* Rest of dashboard content */}

          <Card className={getCardClasses()}>
            <Tabs defaultValue="profile" className="w-full">
              <div className="border-b bg-gray-50">
                <TabsList className="w-full justify-start bg-transparent p-0 h-auto flex-wrap">
                  <TabsTrigger
                    value="profile"
                    className="flex items-center gap-2 px-4 py-3"
                  >
                    <User className="w-4 h-4" />
                    Profile
                  </TabsTrigger>
                  <TabsTrigger
                    value="makemoney"
                    className="flex items-center gap-2 px-4 py-3"
                  >
                    <Share2 className="w-4 h-4" />
                    Make Money
                  </TabsTrigger>
                  <TabsTrigger
                    value="notifications"
                    className="flex items-center gap-2 px-4 py-3"
                  >
                    <Bell className="w-4 h-4" />
                    Notifications
                  </TabsTrigger>
                  <TabsTrigger
                    value="earnings"
                    className="flex items-center gap-2 px-4 py-3"
                  >
                    <DollarSign className="w-4 h-4" />
                    Earnings
                  </TabsTrigger>
                  <TabsTrigger
                    value="messages"
                    className="flex items-center gap-2 px-4 py-3"
                  >
                    <MessageCircle className="w-4 h-4" />
                    Messages
                  </TabsTrigger>
                  <TabsTrigger
                    value="media"
                    className="flex items-center gap-2 px-4 py-3"
                  >
                    <Camera className="w-4 h-4" />
                    Media
                  </TabsTrigger>
                  <TabsTrigger
                    value="jackpot"
                    className="flex items-center gap-2 px-4 py-3"
                  >
                    <Trophy className="w-4 h-4" />
                    Jackpot
                  </TabsTrigger>
                </TabsList>
              </div>

              <CardContent className={getPaddingClasses()}>
                <TabsContent value="profile" className="mt-0">
                  <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                    <div className="lg:col-span-1">
                      <ProfileSidebar
                        userData={userData}
                        referrerData={null}
                        onImageUpload={(file) =>
                          handleImageUpload(file, "profile")
                        }
                      />
                    </div>
                    <div className="lg:col-span-3">
                      <ProfileInfo
                        userData={userData}
                        onUpdate={updateUserData}
                      />
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="notifications" className="mt-0">
                  <UserNotificationsTab />
                </TabsContent>

                <TabsContent value="earnings" className="mt-0">
                  <UserEarningsTab userData={userData} />
                </TabsContent>

                <TabsContent value="messages" className="mt-0">
                  <UserDirectMessagesTab />
                </TabsContent>

                <TabsContent value="media" className="mt-0">
                  <UserMediaUploadTab
                    userData={userData}
                    onUpdate={updateUserData}
                  />
                </TabsContent>

                <TabsContent value="makemoney" className="mt-0">
                  <UserMakeMoneyTab />
                </TabsContent>

                <TabsContent value="jackpot" className="mt-0">
                  <UserJackpotTab userData={userData} />
                </TabsContent>
              </CardContent>
            </Tabs>
          </Card>
        </div>
      </div>
    </AuthGuard>
  );
};

export default UserDashboard;
