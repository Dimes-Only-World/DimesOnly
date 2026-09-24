import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MessageCircle, DollarSign, Star, Lock, Crown, Grid3x3, PlaySquare, UserSquare2, Users } from "lucide-react";
import { Link } from "react-router-dom";
import { resolveMembership } from "@/lib/membership";
import { supabase } from "@/lib/supabase";
import { useAppContext } from "@/contexts/AppContext";
import { useToast } from "@/hooks/use-toast";
import MediaGrid from "@/components/MediaGrid";
import { formatMemberSince } from "@/lib/formatDate";
import DirectMessageModal from "@/components/DirectMessageModal";


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
  const [memberRank, setMemberRank] = useState(0);
  const [view, setView] = useState<"grid" | "videos" | "tagged">("grid");
  const [circle, setCircle] = useState<any[]>([]);
  const [tagged, setTagged] = useState<any[]>([]);
  const [showCircle, setShowCircle] = useState(false);
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
      fetchCircleAndTagged(data.username, data.id);
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
      const { data: userRow } = await supabase.from("users").select("*").eq("id", user.id).maybeSingle();
      setMemberRank(resolveMembership(userRow || user).rank);
    } catch (error) {
      console.error("Error fetching membership:", error);
      setMemberRank(0);
    }
  };

  const fetchCircleAndTagged = async (uname: string, uid: string) => {
    const [circleRes, taggedRes] = await Promise.all([
      supabase.functions.invoke("public-data", { body: { action: "fetchMoneyCircle", username: uname } }),
      supabase.functions.invoke("public-data", { body: { action: "fetchTaggedPosts", username: uname, userId: uid } }),
    ]);
    setCircle((circleRes.data as any)?.data || []);
    setTagged((taggedRes.data as any)?.data || []);
  };

  const isDime = ["exotic", "stripper"].includes(String(profile?.user_type || "").toLowerCase());

  const absUrl = (u: string) =>
    u.startsWith("http") ? u : `https://qkcuykpndrolrewwnkwb.supabase.co/storage/v1/object/public/media/${u}`;

  const getFilteredMedia = () => {
    const tier = isDime ? activeTab : "free";
    const wantType = view === "videos" ? "video" : null;
    return media
      .filter((item) => item.content_tier === tier && (!wantType || item.type === wantType))
      .map((item) => ({ ...item, media_type: item.type, media_url: absUrl(item.url), url: absUrl(item.url) }));
  };

  // silver (Gold content) = Silver Plus & up; gold (Gold+ content) = Diamond, Diamond Plus, Elite & up
  const canAccessTier = (tier: string) => {
    if (tier === "free") return true;
    if (tier === "silver") return memberRank >= 2;
    if (tier === "gold") return memberRank >= 4;
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

  const location = [profile.city, profile.state].filter(Boolean).join(", ");
  const tierLabel = (t: string) => (t === "free" ? "Silver Content" : t === "silver" ? "Gold Content" : "Gold+ Content");
  const tabs: { key: "free" | "silver" | "gold"; label: string; sub: string }[] = [
    { key: "free", label: "Silver", sub: "Everyone" },
    { key: "silver", label: "Gold", sub: "Silver Plus" },
    { key: "gold", label: "Gold+", sub: "Diamond & up" },
  ];
  const shown = getFilteredMedia();

  return (
    <div className="min-h-screen bg-background text-foreground">
      {profile.banner_photo && (
        <div className="h-40 sm:h-56 w-full overflow-hidden">
          <img src={profile.banner_photo} alt="Banner" className="w-full h-full object-cover" />
        </div>
      )}

      <div className="mx-auto max-w-4xl px-4 py-6">
        {/* Header */}
        <div className="flex items-center gap-5 sm:gap-10">
          <div className="w-24 h-24 sm:w-40 sm:h-40 rounded-full overflow-hidden flex-shrink-0 ring-2 ring-primary/60 bg-muted">
            <img src={profile.profile_photo || "/placeholder.svg"} alt={profile.username} className="w-full h-full object-cover" />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-xl sm:text-3xl font-bold break-all">{profile.username}</h1>
            {(profile.first_name || location) && (
              <p className="text-sm text-muted-foreground mt-1">
                {[profile.first_name, location].filter(Boolean).join(" · ")}
              </p>
            )}
            <div className="flex gap-5 mt-3 text-sm sm:text-base">
              <span><b>{media.length}</b> posts</span>
              <button onClick={() => setShowCircle((v) => !v)} className="hover:underline">
                <b>{circle.length}</b> in money circle
              </button>
            </div>
            {profile.bio && <p className="text-sm mt-3 whitespace-pre-line">{profile.bio}</p>}
          </div>
        </div>

        {/* Actions */}
        <div className="grid grid-cols-2 gap-2 mt-5">
          <Button variant="secondary" className="font-semibold" onClick={() => setShowCircle((v) => !v)}>
            <Users className="w-4 h-4 mr-2" /> My Money Circle
          </Button>
          <Button variant="secondary" className="font-semibold" onClick={() => setMessageOpen(true)}>
            <MessageCircle className="w-4 h-4 mr-2" /> Message
          </Button>
        </div>
        {isDime && (
          <div className="grid grid-cols-2 gap-2 mt-2">
            <Button onClick={handleTip} className="bg-green-600 hover:bg-green-700 text-white">
              <DollarSign className="w-4 h-4 mr-1" /> Tip
            </Button>
            <Button onClick={handleRate} className="bg-yellow-600 hover:bg-yellow-700 text-white">
              <Star className="w-4 h-4 mr-1" /> Rate
            </Button>
          </div>
        )}

        {/* Money circle row (highlights style) */}
        {circle.length > 0 ? (
          <div className={`mt-6 flex gap-4 ${showCircle ? "flex-wrap" : "overflow-x-auto pb-2"}`}>
            {(showCircle ? circle : circle.slice(0, 12)).map((m) => (
              <Link key={m.id} to={`/profile/${m.username}`} className="flex flex-col items-center w-20 flex-shrink-0">
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full p-[3px] bg-muted ring-1 ring-border">
                  <img src={m.profile_photo || "/placeholder.svg"} alt={m.username} className="w-full h-full rounded-full object-cover" />
                </div>
                <span className="text-xs mt-1 w-full truncate text-center">{m.username}</span>
              </Link>
            ))}
          </div>
        ) : (
          showCircle && <p className="mt-6 text-sm text-muted-foreground text-center">No one in this money circle yet.</p>
        )}

        {/* Tabs */}
        <div className="mt-8 border-t border-border grid grid-cols-3">
          {([
            ["grid", Grid3x3, "Posts"],
            ["videos", PlaySquare, "Videos"],
            ["tagged", UserSquare2, "Tagged"],
          ] as const).map(([key, Icon, label]) => (
            <button
              key={key}
              aria-label={label}
              onClick={() => setView(key)}
              className={`flex justify-center py-3 border-t-2 -mt-px ${view === key ? "border-foreground text-foreground" : "border-transparent text-muted-foreground"}`}
            >
              <Icon className="w-6 h-6" />
            </button>
          ))}
        </div>

        {/* Tier selector for dimes (grid + videos) */}
        {isDime && view !== "tagged" && (
          <div className="grid grid-cols-3 gap-2 my-3">
            {tabs.map((t) => (
              <Button key={t.key} size="sm" variant={activeTab === t.key ? "default" : "outline"} onClick={() => setActiveTab(t.key)} className="flex flex-col h-auto py-1.5">
                <span className="flex items-center gap-1 font-semibold">
                  {t.key !== "free" && <Crown className="w-3.5 h-3.5" />}{t.label}
                  {!canAccessTier(t.key) && <Lock className="w-3.5 h-3.5" />}
                </span>
                <span className="text-[10px] opacity-80">{t.sub}</span>
              </Button>
            ))}
          </div>
        )}

        {view === "tagged" ? (
          tagged.length > 0 ? (
            <MediaGrid media={tagged as any} currentUserId={user?.id || ""} showLikesAndComments={false} />
          ) : (
            <p className="text-center text-muted-foreground py-10">No tagged posts yet</p>
          )
        ) : canAccessTier(isDime ? activeTab : "free") ? (
          shown.length > 0 ? (
            <MediaGrid media={shown} currentUserId={user?.id || ""} showLikesAndComments={true} />
          ) : (
            <p className="text-center text-muted-foreground py-10">
              No {view === "videos" ? "videos" : "posts"} in {tierLabel(isDime ? activeTab : "free")} yet
            </p>
          )
        ) : (
          <div className="text-center py-10">
            <Lock className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
            <h3 className="text-lg font-semibold mb-1">{tierLabel(activeTab)} Locked</h3>
            <p className="text-muted-foreground mb-4">
              {activeTab === "silver" ? "Available to Silver Plus members and up" : "Available to Diamond, Diamond Plus and Elite members"}
            </p>
            <Button onClick={() => handleUpgrade(activeTab)}>
              Upgrade to {activeTab === "silver" ? "Silver Plus" : "Diamond"}
            </Button>
          </div>
        )}
      </div>

      <DirectMessageModal isOpen={messageOpen} onClose={() => setMessageOpen(false)} recipientUsername={profile.username} />
    </div>
  );
};

export default Profile;
