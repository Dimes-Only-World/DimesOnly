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
import { useAppContext } from "@/contexts/AppContext";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";

interface UserData {
  id: string;
  username: string;
  email: string;
  first_name?: string;
  last_name?: string;
  user_type?: string;
  profile_photo?: string;
  banner_photo?: string;
  front_page_photo?: string;
  mobile_number?: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  gender?: string;
  membership_type?: string;
  tips_earned?: number;
  referral_fees?: number;
  overrides?: number;
  weekly_hours?: number;
  is_ranked?: boolean;
  rank_number?: number;
  lottery_tickets?: number;
  bio?: string;
  occupation?: string;
  about_me?: string;
  description?: string;
  referred_by?: string;
  created_at?: string;
  updated_at?: string;
}

const UserDashboard: React.FC = () => {
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
      const { data, error } = await supabase
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
      const { error } = await supabase
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
        <div className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-4">
              <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
              <span className="text-sm text-gray-600">Welcome back, {userData.username || 'User'}</span>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <DashboardVideoHeader
            videoUrl="https://dimesonlyworld.s3.us-east-2.amazonaws.com/HOME+PAGE+16-9+1080+final.mp4"
            thumbnailUrl="https://dimesonly.s3.us-east-2.amazonaws.com/HOUSING-ANGELS+(1).png"
          />
          
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
                  <TabsTrigger value="makemoney" className="flex items-center gap-2 px-4 py-3">
                    <Share2 className="w-4 h-4" />Make Money
                  </TabsTrigger>
                  <TabsTrigger value="notifications" className="flex items-center gap-2 px-4 py-3">
                    <Bell className="w-4 h-4" />Notifications
                  </TabsTrigger>
                  <TabsTrigger value="earnings" className="flex items-center gap-2 px-4 py-3">
                    <DollarSign className="w-4 h-4" />Earnings
                  </TabsTrigger>
                  <TabsTrigger value="messages" className="flex items-center gap-2 px-4 py-3">
                    <MessageCircle className="w-4 h-4" />Messages
                  </TabsTrigger>
                  <TabsTrigger value="media" className="flex items-center gap-2 px-4 py-3">
                    <Camera className="w-4 h-4" />Media
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
                  <UserNotificationsTab />
                </TabsContent>

                <TabsContent value="earnings" className="mt-0">
                  <UserEarningsTab userData={userData} />
                </TabsContent>

                <TabsContent value="messages" className="mt-0">
                  <UserDirectMessagesTab />
                </TabsContent>

                <TabsContent value="media" className="mt-0">
                  <UserMediaUploadTab userData={userData} onUpdate={updateUserData} />
                </TabsContent>

                <TabsContent value="makemoney" className="mt-0">
                  <UserMakeMoneyTab userData={userData} />
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