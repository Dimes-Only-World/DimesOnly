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
} from "lucide-react";
import DashboardBanner from "./DashboardBanner";
import ProfileSidebar from "./ProfileSidebar";
import ProfileInfo from "./ProfileInfo";
import AuthGuard from "./AuthGuard";
import UserNotificationsTab from "./UserNotificationsTab";
import UserDirectMessagesTab from "./UserDirectMessagesTab";
import UserMediaUploadTab from "./UserMediaUploadTab";
import UserEarningsTab from "./UserEarningsTab";
import UserMakeMoneyTab from "./UserMakeMoneyTab";
import UserJackpotTab from "./UserJackpotTab";
import JackpotDisplay from "./JackpotDisplay";
import JackpotCountdown from "./JackpotCountdown";
import { useAppContext } from "@/contexts/AppContext";
import { supabase, supabaseAdmin } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { Tables } from "@/types";

type UserData = Tables<"users">;

const UserDashboardEnhanced: React.FC = () => {
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAppContext();
  const { toast } = useToast();

  useEffect(() => {
    if (user?.id) {
      fetchUserDataById(user.id);
    } else {
      getCurrentUser();
    }
  }, [user?.id]);

  const getCurrentUser = async () => {
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (authUser) {
        fetchUserDataById(authUser.id);
      } else {
        setLoading(false);
      }
    } catch (error) {
      console.error("Error getting current user:", error);
      setLoading(false);
    }
  };

  const fetchUserDataById = async (userId: string) => {
    try {
      setLoading(true);
      const { data, error } = await supabaseAdmin
        .from("users")
        .select("*")
        .eq("id", userId)
        .single();

      if (error) {
        console.error("Error fetching user data:", error);
        return;
      }

      if (data) {
        setUserData(data);
      }
    } catch (error) {
      console.error("Error fetching user data:", error);
    } finally {
      setLoading(false);
    }
  };

  const updateUserData = async (updatedData: Partial<UserData>) => {
    if (!userData) return false;

    try {
      const { error } = await supabaseAdmin
        .from("users")
        .update({ ...updatedData, updated_at: new Date().toISOString() })
        .eq("id", userData.id);

      if (error) {
        console.error("Error updating user data:", error);
        return false;
      }

      setUserData({ ...userData, ...updatedData });
      toast({ title: "Success", description: "Profile updated successfully" });
      return true;
    } catch (error) {
      console.error("Error updating user data:", error);
      return false;
    }
  };

  const handleImageUpload = async (
    file: File,
    imageType: "profile" | "banner" | "front_page"
  ) => {
    if (!userData) return;

    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `profiles/${userData.username}/${imageType}.${fileExt}`;
      
      const { data, error } = await supabase.storage
        .from("user-photos")
        .upload(fileName, file, { cacheControl: "3600", upsert: true });

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from("user-photos")
        .getPublicUrl(fileName);

      const updateField = imageType === "profile" ? "profile_photo" : 
                         imageType === "banner" ? "banner_photo" : "front_page_photo";

      await updateUserData({ [updateField]: publicUrl });
    } catch (error) {
      console.error("Error uploading image:", error);
      toast({ title: "Error", description: "Failed to upload image", variant: "destructive" });
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
        <div className="bg-gradient-to-r from-yellow-400 via-yellow-500 to-yellow-600 text-white py-8">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
              <JackpotDisplay />
              <JackpotCountdown />
            </div>
          </div>
        </div>

        <div className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-4">
              <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
              <span className="text-sm text-gray-600">Welcome back, {userData.username}</span>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Card className="mb-8 overflow-hidden">
            <DashboardBanner
              bannerPhoto={userData.banner_photo}
              userData={userData}
              onImageUpload={(file) => handleImageUpload(file, "banner")}
            />
          </Card>

          <Card className="shadow-lg">
            <Tabs defaultValue="profile" className="w-full">
              <div className="border-b bg-gray-50">
                <TabsList className="w-full justify-start bg-transparent p-0 h-auto flex-wrap">
                  <TabsTrigger value="profile" className="flex items-center gap-2 px-4 py-3">
                    <User className="w-4 h-4" />Profile
                  </TabsTrigger>
                  <TabsTrigger value="notifications" className="flex items-center gap-2 px-4 py-3">
                    <Bell className="w-4 h-4" />Notifications
                  </TabsTrigger>
                  <TabsTrigger value="messages" className="flex items-center gap-2 px-4 py-3">
                    <MessageCircle className="w-4 h-4" />Messages
                  </TabsTrigger>
                  <TabsTrigger value="upload" className="flex items-center gap-2 px-4 py-3">
                    <Camera className="w-4 h-4" />Upload
                  </TabsTrigger>
                  <TabsTrigger value="earnings" className="flex items-center gap-2 px-4 py-3">
                    <DollarSign className="w-4 h-4" />Earnings
                  </TabsTrigger>
                  <TabsTrigger value="makemoney" className="flex items-center gap-2 px-4 py-3">
                    <Share2 className="w-4 h-4" />Make Money
                  </TabsTrigger>
                  <TabsTrigger value="jackpot" className="flex items-center gap-2 px-4 py-3">
                    <Trophy className="w-4 h-4" />Jackpot
                  </TabsTrigger>
                </TabsList>
              </div>

              <CardContent className="p-6">
                <TabsContent value="profile" className="mt-0">
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
                </TabsContent>

                <TabsContent value="notifications" className="mt-0">
                  <UserNotificationsTab userId={userData.id} />
                </TabsContent>

                <TabsContent value="messages" className="mt-0">
                  <UserDirectMessagesTab userId={userData.id} username={userData.username} />
                </TabsContent>

                <TabsContent value="upload" className="mt-0">
                  <UserMediaUploadTab userId={userData.id} username={userData.username} />
                </TabsContent>

                <TabsContent value="earnings" className="mt-0">
                  <UserEarningsTab userId={userData.id} username={userData.username} />
                </TabsContent>

                <TabsContent value="makemoney" className="mt-0">
                  <UserMakeMoneyTab username={userData.username} />
                </TabsContent>

                <TabsContent value="jackpot" className="mt-0">
                  <UserJackpotTab userId={userData.id} username={userData.username} />
                </TabsContent>
              </CardContent>
            </Tabs>
          </Card>
        </div>
      </div>
    </AuthGuard>
  );
};

export default UserDashboardEnhanced;