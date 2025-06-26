import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Camera, Upload } from "lucide-react";
import { supabase } from "@/lib/supabase"; // Import your Supabase client
import { useToast } from "@/hooks/use-toast"; // For error notifications

interface DashboardCoreProps {
  onLogout?: () => void;
  userData?: {
    id: string;
    username: string;
    email: string;
    firstName?: string;
    lastName?: string;
    userType?: string;
    profilePhoto?: string;
    bannerPhoto?: string;
    mobileNumber?: string;
    address?: string;
    city?: string;
    state?: string;
    zip?: string;
    gender?: string;
    membershipType?: string;
    tipsEarned?: number;
    referralFees?: number;
    overrides?: number;
    weeklyHours?: number;
    isRanked?: boolean;
    rankNumber?: number;
  };
}

const DashboardCore: React.FC<DashboardCoreProps> = ({
  onLogout,
  userData,
}) => {
  const { toast } = useToast();
  const [profilePhoto, setProfilePhoto] = useState<string>(
    userData?.profilePhoto ||
      "https://via.placeholder.com/128x128?text=No+Photo"
  );
  const [bannerPhoto, setBannerPhoto] = useState<string>(
    userData?.bannerPhoto ||
      "https://via.placeholder.com/400x128?text=No+Banner"
  );
  const showTipsEarned =
    userData?.userType?.toLowerCase() === "exotic" ||
    userData?.userType?.toLowerCase() === "dancer";

  // Fetch profile and banner photos from Supabase on component mount
  useEffect(() => {
    const fetchPhotos = async () => {
      if (!userData?.username) return;

      try {
        const { data, error } = await supabase
          .from("users")
          .select("profile_photo, banner_photo")
          .eq("username", userData.username)
          .single();

        if (error) {
          throw new Error(`Failed to fetch photos: ${error.message}`);
        }

        if (data) {
          if (data.profile_photo) setProfilePhoto(data.profile_photo);
          if (data.banner_photo) setBannerPhoto(data.banner_photo);
        }
      } catch (error) {
        console.error("Error fetching photos:", error);
        toast({
          title: "Error",
          description: "Could not load profile or banner photos.",
          variant: "destructive",
        });
      }
    };

    fetchPhotos();
  }, [userData?.username, toast]);

  const handleButtonClick = (path: string) => {
    const username = userData?.username || "demo";
    window.location.href = `${path}?ref=${username}`;
  };

  const generateTicketNumber = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    return Array.from(
      { length: 7 },
      () => chars[Math.floor(Math.random() * chars.length)]
    ).join("");
  };

  // Handle profile photo upload
  const handleProfilePhotoUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file || !userData?.username) return;

    const fileExt = file.name.split(".").pop();
    // Use new folder structure: profiles/username/profile.ext
    const filePath = `profiles/${userData.username}/profile.${fileExt}`;

    try {
      const { error: uploadError } = await supabase.storage
        .from("user-photos")
        .upload(filePath, file, { upsert: true });

      if (uploadError) {
        throw new Error(`Photo upload failed: ${uploadError.message}`);
      }

      const { data: publicUrlData } = supabase.storage
        .from("user-photos")
        .getPublicUrl(filePath);

      const photoUrl = publicUrlData.publicUrl;
      if (!photoUrl) {
        throw new Error("Failed to get public URL for profile photo");
      }

      // Update users table with new profile photo URL
      const { error: updateError } = await supabase
        .from("users")
        .update({ profile_photo: photoUrl })
        .eq("username", userData.username);

      if (updateError) {
        throw new Error(
          `Failed to update profile photo: ${updateError.message}`
        );
      }

      setProfilePhoto(photoUrl);
      toast({
        title: "Success",
        description: "Profile photo updated successfully!",
      });
    } catch (error) {
      console.error("Profile photo upload error:", error);
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Failed to update profile photo.";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  // Handle banner photo upload
  const handleBannerPhotoUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file || !userData?.username) return;

    const fileExt = file.name.split(".").pop();
    // Use new folder structure: profiles/username/banner.ext
    const filePath = `profiles/${userData.username}/banner.${fileExt}`;

    try {
      const { error: uploadError } = await supabase.storage
        .from("user-photos")
        .upload(filePath, file, { upsert: true });

      if (uploadError) {
        throw new Error(`Banner upload failed: ${uploadError.message}`);
      }

      const { data: publicUrlData } = supabase.storage
        .from("user-photos")
        .getPublicUrl(filePath);

      const photoUrl = publicUrlData.publicUrl;
      if (!photoUrl) {
        throw new Error("Failed to get public URL for banner photo");
      }

      // Update users table with new banner photo URL
      const { error: updateError } = await supabase
        .from("users")
        .update({ banner_photo: photoUrl })
        .eq("username", userData.username);

      if (updateError) {
        throw new Error(
          `Failed to update banner photo: ${updateError.message}`
        );
      }

      setBannerPhoto(photoUrl);
      toast({
        title: "Success",
        description: "Banner photo updated successfully!",
      });
    } catch (error) {
      console.error("Banner photo upload error:", error);
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Failed to update banner photo.";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 text-white">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold">Dashboard</h1>
          {onLogout && (
            <Button
              onClick={onLogout}
              variant="outline"
              className="text-white border-white hover:bg-white hover:text-black"
            >
              Logout
            </Button>
          )}
        </div>

        {/* Profile Photos Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <Card className="bg-white/10 backdrop-blur border-white/20">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Camera className="w-5 h-5" />
                Profile Picture
              </CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <div className="w-32 h-32 mx-auto mb-4 rounded-full overflow-hidden border-4 border-white/30">
                <img
                  src={profilePhoto}
                  alt="Profile"
                  className="w-full h-full object-cover"
                />
              </div>
              <label htmlFor="profile-photo-upload">
                <Button
                  asChild
                  className="bg-blue-600 hover:bg-blue-700 cursor-pointer"
                >
                  <div>
                    <Upload className="w-4 h-4 mr-2" />
                    Change Photo
                    <input
                      id="profile-photo-upload"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleProfilePhotoUpload}
                    />
                  </div>
                </Button>
              </label>
            </CardContent>
          </Card>

          <Card className="bg-white/10 backdrop-blur border-white/20">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Camera className="w-5 h-5" />
                Banner Photo
              </CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <div className="w-full h-32 mb-4 rounded-lg overflow-hidden border-2 border-white/30">
                <img
                  src={bannerPhoto}
                  alt="Banner"
                  className="w-full h-full object-cover"
                />
              </div>
              <label htmlFor="banner-photo-upload">
                <Button
                  asChild
                  className="bg-purple-600 hover:bg-purple-700 cursor-pointer"
                >
                  <div>
                    <Upload className="w-4 h-4 mr-2" />
                    Change Banner
                    <input
                      id="banner-photo-upload"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleBannerPhotoUpload}
                    />
                  </div>
                </Button>
              </label>
            </CardContent>
          </Card>
        </div>

        {/* Navigation Buttons */}
        <Card className="bg-white/10 backdrop-blur border-white/20 mb-8">
          <CardHeader>
            <CardTitle className="text-white">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <Button
                onClick={() => handleButtonClick("/tip-girls")}
                className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-semibold py-3 px-4 h-auto"
              >
                TIP & WIN
              </Button>
              <Button
                onClick={() => handleButtonClick("/rate-girls")}
                className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-semibold py-3 px-4 h-auto"
              >
                RATE DIMES
              </Button>
              <Button
                onClick={() => handleButtonClick("/events-girls")}
                className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold py-3 px-4 h-auto"
              >
                EVENTS
              </Button>
              <Button
                onClick={() => handleButtonClick("/cars-girls")}
                className="bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-white font-semibold py-3 px-4 h-auto"
              >
                GET A CAR
              </Button>
              <Button
                onClick={() => handleButtonClick("/clothes")}
                className="bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white font-semibold py-3 px-4 h-auto"
              >
                CLOTHES
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Earnings Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {showTipsEarned && (
            <Card className="bg-white/10 backdrop-blur border-white/20">
              <CardHeader>
                <CardTitle className="text-white flex items-center justify-between">
                  Tips Earned
                  <Button
                    variant="link"
                    className="text-blue-300 text-sm p-0 h-auto"
                  >
                    see reports
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-green-400">
                  ${userData?.tipsEarned || 0}.00
                </p>
              </CardContent>
            </Card>
          )}

          <Card className="bg-white/10 backdrop-blur border-white/20">
            <CardHeader>
              <CardTitle className="text-white flex items-center justify-between">
                Referral Fees
                <Button
                  variant="link"
                  className="text-blue-300 text-sm p-0 h-auto"
                >
                  see reports
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-blue-400">
                ${userData?.referralFees || 0}.00
              </p>
            </CardContent>
          </Card>

          <Card className="bg-white/10 backdrop-blur border-white/20">
            <CardHeader>
              <CardTitle className="text-white">Total Earnings</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-yellow-400">
                ${(userData?.tipsEarned || 0) + (userData?.referralFees || 0)}
                .00
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Program Information */}
        <Card className="bg-white/10 backdrop-blur border-white/20 mb-8">
          <CardHeader>
            <CardTitle className="text-white">Program Information</CardTitle>
          </CardHeader>
          <CardContent className="text-white space-y-6">
            <div>
              <p className="mb-4">
                Your $6,500 will start when all positions are filled.
              </p>
              <ul className="list-disc list-inside space-y-2">
                <li>You must attend 3 events every 3 months</li>
                <li>
                  You must interact on the site for 2 hours a day with different
                  customers
                </li>
                <li>Missed events a month is a $500 deduction</li>
                <li>Missed hours is a $37.50 an hour deduction</li>
              </ul>
              <p className="mt-4 font-bold">
                Begins when the counts are 0 below:
              </p>
              <p>Exotics and Dancers: 1,000 Left</p>
              <p>Men and Ladies: 3,000 Left</p>
            </div>

            {/* Jackpot Section */}
            <div className="border-t border-white/20 pt-6">
              <h3 className="text-xl font-bold text-yellow-400 mb-4">
                Jackpot Winnings
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div className="text-center">
                  <p className="text-lg font-semibold">CURRENT JACKPOT</p>
                  <p className="text-3xl font-bold text-green-400">$0.00</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-semibold">
                    TOTAL JACKPOT EARNINGS 2025
                  </p>
                  <p className="text-3xl font-bold text-blue-400">$0.00</p>
                </div>
              </div>

              <Button variant="link" className="text-yellow-300 mb-6">
                click here for breakdown
              </Button>

              <div className="space-y-4">
                <div>
                  <h4 className="text-lg font-semibold mb-2">
                    Your Tickets Through Tipping:
                  </h4>
                  <div className="bg-black/30 rounded-lg p-4">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="font-semibold"># of Tickets</div>
                      <div className="font-semibold">Ticket #</div>
                      <div>0</div>
                      <div>{generateTicketNumber()}</div>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="text-lg font-semibold mb-2">
                    Referrals Tickets:
                  </h4>
                  <div className="bg-black/30 rounded-lg p-4">
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div className="font-semibold"># of Tickets</div>
                      <div className="font-semibold">Ticket #</div>
                      <div className="font-semibold">By User</div>
                      <div>0</div>
                      <div>-</div>
                      <div>-</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default DashboardCore;
