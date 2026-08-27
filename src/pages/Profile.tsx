import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Heart, MessageCircle, DollarSign, Star, Lock, Crown, Calendar } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAppContext } from "@/contexts/AppContext";
import { useToast } from "@/hooks/use-toast";
import MediaGrid from "@/components/MediaGrid";
import { formatMemberSince } from "@/lib/formatDate";

interface UserProfile {
  id: string;
  username: string;
  first_name: string;
  last_name: string;
  bio: string;
  profile_photo: string;
  banner_photo: string;
  user_type: string;
  gender: string;
  city: string;
  state: string;
  created_at?: string | null;
}

interface UserMedia {
  id: string;
  url: string;
  type: "photo" | "video";
  content_tier: string;
  flagged: boolean;
  created_at: string;
}

const Profile: React.FC = () => {
  const { username } = useParams<{ username: string }>();
  const navigate = useNavigate();
  const { user } = useAppContext();
  const { toast } = useToast();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [media, setMedia] = useState<UserMedia[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"free" | "silver" | "gold">("free");
  const [userMembership, setUserMembership] = useState<string>("free");
  const [messageOpen, setMessageOpen] = useState(false);


  useEffect(() => {
    if (username) {
      fetchProfile();
      fetchUserMembership();
    }
  }, [username]);

  // Ensure membership is fetched when auth session becomes available/changes
  useEffect(() => {
    if (user?.id) {
      fetchUserMembership();
    }
  }, [user?.id]);

  const fetchProfile = async () => {
    try {
      // Use public-data edge function to fetch profile
      const { data: response, error } = await supabase.functions.invoke("public-data", {
        body: { action: "fetchProfile", username },
      });

      if (error) throw error;

      let data = response?.data;

      if (!data) {
        toast({
          title: "Profile not found",
          description: "The requested profile does not exist.",
          variant: "destructive",
        });
        navigate("/dashboard");
        return;
      }

      if (!data.created_at) {
        const { data: publicProfileDate } = await supabase
          .from("public_user_profiles")
          .select("created_at")
          .eq("id", data.id)
          .maybeSingle();

        if (publicProfileDate?.created_at) {
          data = { ...data, created_at: publicProfileDate.created_at };
        } else {
          const { data: usernameProfileDate } = await supabase
            .from("public_user_profiles")
            .select("created_at")
            .ilike("username", String(username || "").trim())
            .maybeSingle();

          if (usernameProfileDate?.created_at) {
            data = { ...data, created_at: usernameProfileDate.created_at };
          }
        }
      }

      setProfile(data as UserProfile);
      await fetchMedia(data.id);
    } catch (error) {
      console.error("Error fetching profile:", error);
      toast({
        title: "Error",
        description: "Failed to load profile.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchMedia = async (userId: string) => {
    try {
      // Use public-data edge function to fetch media
      const { data: response, error } = await supabase.functions.invoke("public-data", {
        body: { action: "fetchUserMedia", userId },
      });

      if (error) throw error;

      const data = response?.data || [];

      const transformedMedia = await Promise.all(
        data.map(async (item: any) => {
          let effectiveUrl = item.media_url as string;
          const rawUrl = String(item.media_url || "");
          const isPrivate =
            (item.storage_path && !rawUrl.startsWith("http")) ||
            rawUrl.includes("/private-media/");

          // Both photos and videos may live in the private-media bucket; sign them.
          if (isPrivate || item.media_type === "video") {
            const storagePath =
              item.storage_path ||
              (rawUrl.includes("/private-media/")
                ? rawUrl.split("/private-media/")[1]?.split("?")[0]
                : null);
            if (storagePath) {
              try {
                const { data: signedResponse, error: signErr } = await supabase.functions.invoke("public-data", {
                  body: { action: "createSignedUrl", storagePath, expiresIn: 3600 },
                });
                if (!signErr && signedResponse?.data?.signedUrl) {
                  effectiveUrl = signedResponse.data.signedUrl;
                }
              } catch (e) {
                console.warn("Failed to create signed URL for media", item.id, e);
              }
            }
          }

          return {
            id: item.id,
            url: effectiveUrl,
            type: item.media_type as "photo" | "video",
            content_tier: item.content_tier,
            flagged: item.flagged,
            created_at: item.created_at,
          };
        }),
      );


      setMedia(transformedMedia);
    } catch (error) {
      console.error("Error fetching media:", error);
    }
  };

  const fetchUserMembership = async () => {
    if (!user?.id) return;
    try {
      // 1) Trust the users table first (updated by webhook)
      const { data: userRow, error: userErr } = await supabase
        .from("users")
        .select("membership_tier, membership_type, silver_plus_active, diamond_plus_active")
        .eq("id", user.id)
        .single();

      if (!userErr && userRow) {
        const rawTier = (userRow.membership_tier || userRow.membership_type || "").toString().toLowerCase();
        const normalizedTier =
          rawTier === "gold" || rawTier === "diamond" ? "diamond_plus" : rawTier === "silver" ? "silver_plus" : rawTier;

        if (userRow.diamond_plus_active || normalizedTier === "diamond_plus") {
          setUserMembership("diamond_plus");
          return;
        }
        if (userRow.silver_plus_active || normalizedTier === "silver_plus") {
          setUserMembership("silver_plus");
          return;
        }
      }

      // 2) Fallback to completed upgrades in membership_upgrades
      const { data: upgrades, error: upgErr } = await supabase
        .from("membership_upgrades")
        .select("upgrade_type, upgrade_status")
        .eq("user_id", user.id)
        .eq("upgrade_status", "completed")
        .order("created_at", { ascending: false })
        .limit(1);

      if (!upgErr && upgrades && upgrades.length > 0) {
        const rawUpgrade = String(upgrades[0].upgrade_type || "").toLowerCase();
        const normalizedUpgrade =
          rawUpgrade === "gold" || rawUpgrade === "diamond"
            ? "diamond_plus"
            : rawUpgrade === "silver"
              ? "silver_plus"
              : rawUpgrade;
        setUserMembership(normalizedUpgrade);
        return;
      }

      // Default
      setUserMembership("free");
    } catch (error) {
      console.error("Error fetching membership:", error);
      setUserMembership("free");
    }
  };

  const isTierless =
    profile?.gender?.toLowerCase() === "male" ||
    (profile?.gender?.toLowerCase() === "female" && profile?.user_type?.toLowerCase() === "normal");

  const getFilteredMedia = () => {
    const filtered = media.filter((item) => {
      if (isTierless) return true;
      if (activeTab === "free") return item.content_tier === "free";
      if (activeTab === "silver") return item.content_tier === "silver";
      if (activeTab === "gold") return item.content_tier === "gold";
      return false;
    });

    // Transform for MediaGrid: ensure media_type is set and URLs are absolute
    return filtered.map((item) => ({
      ...item,
      media_type: item.type, // required by MediaGrid
      media_url: item.url.startsWith("http")
        ? item.url
        : `https://qkcuykpndrolrewwnkwb.supabase.co/storage/v1/object/public/media/${item.url}`,
      url: item.url.startsWith("http")
        ? item.url
        : `https://qkcuykpndrolrewwnkwb.supabase.co/storage/v1/object/public/media/${item.url}`,
    }));
  };


  const canAccessTier = (tier: string) => {
    if (tier === "free") return true;
    if (tier === "silver") return ["silver_plus", "diamond_plus"].includes(userMembership);
    if (tier === "gold") return userMembership === "diamond_plus";
    return false;
  };

  const handleTip = () => {
    navigate(`/tip?tip=${username}`);
  };

  const handleRate = () => {
    navigate(`/rate?rate=${username}`);
  };

  const handleUpgrade = (tier: string) => {
    if (tier === "silver") {
      navigate("/upgrade-silver-plus");
    } else if (tier === "gold") {
      navigate("/upgrade");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading profile...</div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="text-white text-xl">Profile not found</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
      <div className="w-full p-0">
        {/* Banner Section */}
        <Card className="mb-0 overflow-hidden border-0 shadow-none rounded-none">
          <div className="relative h-72 sm:h-64 bg-gradient-to-r from-purple-600 to-blue-600">
            {profile.banner_photo && (
              <img src={profile.banner_photo} alt="Banner" className="w-full h-full object-cover" />
            )}
            <div className="absolute inset-0 bg-black bg-opacity-30" />

            {/* Profile Picture & Info */}
            <div className="absolute bottom-0 left-0 right-0 p-0">
              <div className="flex flex-col sm:flex-row items-center sm:items-end gap-3 sm:gap-6">
                <div className="w-20 h-20 sm:w-32 sm:h-32 rounded-full border-4 border-white overflow-hidden bg-white flex-shrink-0 shadow-lg mt-6 sm:mt-0">
                  <img
                    src={profile.profile_photo || "/placeholder.svg"}
                    alt={profile.username}
                    className="w-full h-full object-cover"
                  />
                </div>

                <div className="flex-1 text-white text-center sm:text-left">
                  <h1 className="text-xl sm:text-3xl font-bold">@{profile.username}</h1>
                  <p className="text-sm sm:text-xl opacity-90 break-words">
                    {profile.city && profile.state
                      ? `${profile.city}, ${profile.state}`
                      : profile.city
                        ? profile.city
                        : profile.state
                          ? profile.state
                          : "Location not specified"}
                  </p>
                  <div className="flex items-center justify-center sm:justify-start gap-2 mt-2 flex-wrap">
                    <Badge variant="secondary" className="bg-white/20 text-white text-xs">
                      {profile.gender}
                    </Badge>
                    <Badge variant="secondary" className="bg-white/20 text-white text-xs">
                      {profile.user_type}
                    </Badge>
                    <Button
                      onClick={() => setMessageOpen(true)}
                      size="sm"
                      className="h-7 bg-[#E916D1] hover:bg-[#E916D1]/90 text-white text-xs px-3"
                    >
                      <MessageCircle className="w-3 h-3 mr-1" />
                      Message Me
                    </Button>
                  </div>

                </div>

                {/* Action Buttons (hidden for male or normal female) */}
                {!(
                  profile.gender?.toLowerCase() === "male" ||
                  (profile.gender?.toLowerCase() === "female" && profile.user_type?.toLowerCase() === "normal")
                ) && (
                  <div className="flex gap-2 sm:gap-3 w-full sm:w-auto">
                    <Button
                      onClick={handleTip}
                      className="bg-green-600 hover:bg-green-700 flex-1 sm:flex-none text-sm sm:text-base px-3 sm:px-4 py-2"
                      size="sm"
                    >
                      <DollarSign className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                      Tip
                    </Button>
                    <Button
                      onClick={handleRate}
                      className="bg-yellow-600 hover:bg-yellow-700 flex-1 sm:flex-none text-sm sm:text-base px-3 sm:px-4 py-2"
                      size="sm"
                    >
                      <Star className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                      Rate
                    </Button>
                  </div>
                )}

              </div>

              {profile.bio && (
                <div className="mt-3 sm:mt-4 text-white/90 text-center sm:text-left">
                  <p className="text-sm sm:text-base">{profile.bio}</p>
                </div>
              )}
            </div>
          </div>
        </Card>




        {/* Content Tiers */}
          <Card className="border-0 shadow-none rounded-none"><CardContent className="p-0">
            {/* Tier Tabs (hidden for male or normal female) */}
            {!(
              profile.gender?.toLowerCase() === "male" ||
              (profile.gender?.toLowerCase() === "female" && profile.user_type?.toLowerCase() === "normal")
            ) && (
            <div className="flex flex-col gap-2 w-full">
              <Button
                variant={activeTab === "free" ? "default" : "outline"}
                onClick={() => setActiveTab("free")}
                className="flex w-full items-center justify-center gap-2 rounded-none text-base py-4"
                size="sm"
              >
                Free Silver Content
              </Button>

              <Button
                variant={activeTab === "silver" ? "default" : "outline"}
                onClick={() => setActiveTab("silver")}
                className="flex w-full items-center justify-center gap-2 rounded-none text-base py-4"
                size="sm"
              >
                <Crown className="w-4 h-4" />
                Silver Plus Content
                {!canAccessTier("silver") && <Lock className="w-4 h-4" />}
              </Button>

              <Button
                variant={activeTab === "gold" ? "default" : "outline"}
                onClick={() => setActiveTab("gold")}
                className="flex w-full items-center justify-center gap-2 rounded-none text-base py-4"
                size="sm"
              >
                <Crown className="w-4 h-4 text-yellow-500" />
                Gold or Better Content
                {!canAccessTier("gold") && <Lock className="w-4 h-4" />}
              </Button>
            </div>
            )}


            {/* Content Display */}
            {canAccessTier(activeTab) ? (
              <div>
                {getFilteredMedia().length > 0 ? (
                  <MediaGrid media={getFilteredMedia()} currentUserId={user?.id || ""} showLikesAndComments={true} />
                ) : (
                    <div className="text-center py-0">
                    <p className="text-gray-500">No {activeTab} content available yet</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-0">
                <Lock className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                <h3 className="text-xl font-semibold mb-2">
                  {activeTab === "silver" ? "Silver" : "Gold"} Content Locked
                </h3>
                <p className="text-gray-500 mb-4">Upgrade your membership to access {activeTab} content</p>
                <Button onClick={() => handleUpgrade(activeTab)}>
                  Upgrade to {activeTab === "silver" ? "Silver Plus" : "Gold"}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Profile;
