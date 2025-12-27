import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useSearchParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { MapPin, User, Calendar, Heart } from "lucide-react";
import AuthGuard from "@/components/AuthGuard";
import TipAmountSelector from "@/components/TipAmountSelector";
import PayPalTipButton from "@/components/PayPalTipButton";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";


interface UserData {
  id: string;
  username: string;
  profile_photo: string;
  banner_photo?: string;
  city: string;
  state: string;
  bio?: string;
  user_type: string;
  created_at: string;
}

interface MediaFile {
  id: string;
  media_url: string;
  media_type: "photo" | "video";
  created_at: string;
}

const Tip: React.FC = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const tipUsername = searchParams.get("tip");
  const refUsername = searchParams.get("ref") || "";
  const [tipAmount, setTipAmount] = useState(0);
  const [customAmount, setCustomAmount] = useState("");
  const [userData, setUserData] = useState<UserData | null>(null);
  const [recentPhotos, setRecentPhotos] = useState<MediaFile[]>([]);
  const [recentVideos, setRecentVideos] = useState<MediaFile[]>([]);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [currentUser, setCurrentUser] = useState<{
    id: string;
    email?: string;
    username?: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [likes, setLikes] = useState(0);
  const [hasLiked, setHasLiked] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);

  useEffect(() => {
    if (tipUsername) {
      fetchUserData();
      fetchUserMedia();
    }
    getCurrentUser();
  }, [tipUsername]);

  // Fetch likes after currentUser is loaded
  useEffect(() => {
    if (userData && currentUser) {
      fetchLikes();
    }
  }, [userData, currentUser]);

  const getCurrentUser = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        // Get username from database
        const { data: userData, error } = await supabase
          .from("users")
          .select("username")
          .eq("id", user.id)
          .single();

        if (!error && userData) {
          setCurrentUser({
            id: user.id,
            email: user.email,
            username: String(userData.username),
          });
        } else {
          setCurrentUser(user);
        }
      }
    } catch (error) {
      console.error("Error getting current user:", error);
    }
  };

  const handlePaymentSuccess = (transactionId?: string) => {
    console.log("Payment successful:", transactionId);
    setShowSuccessDialog(true);
  };

  const handlePaymentError = (error: string) => {
    console.error("Payment error:", error);
    setPaymentError(error);
  };

  const fetchUserData = async () => {
    try {
      setLoading(true);
      console.log("Fetching user data for username:", tipUsername);
      
      // Use public_user_profiles view to bypass RLS restrictions
      // Use maybeSingle() instead of single() to handle missing users gracefully
      const { data, error } = await supabase
        .from("public_user_profiles")
        .select("id, username, profile_photo, city, state, bio, user_type")
        .eq("username", tipUsername)
        .in("user_type", ["stripper", "exotic"])
        .maybeSingle();

      console.log("Query result - data:", data, "error:", error);

      if (error) {
        console.error("Error fetching user data:", error);
        return;
      }

      if (data) {
        console.log("User found:", data.username);
        setUserData({
          id: String(data.id),
          username: String(data.username),
          profile_photo: String(data.profile_photo || ""),
          banner_photo: undefined, // Not available in public view
          city: String(data.city || ""),
          state: String(data.state || ""),
          bio: data.bio ? String(data.bio) : undefined,
          user_type: String(data.user_type),
          created_at: new Date().toISOString(), // Not available in public view
        });
      } else {
        console.log("No user found for username:", tipUsername);
      }
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserMedia = async () => {
    if (!tipUsername) return;

    try {
      // Get user ID from public_user_profiles to bypass RLS
      const { data: user, error: userError } = await supabase
        .from("public_user_profiles")
        .select("id")
        .eq("username", tipUsername)
        .maybeSingle();

      if (userError) {
        console.error("Error fetching user for media:", userError);
        return;
      }
      if (!user) {
        console.log("No user found for media fetch:", tipUsername);
        return;
      }

      // Fetch recent photos (3 most recent)
      const { data: photos, error: photosError } = await supabase
        .from("user_media")
        .select("id, media_url, media_type, created_at")
        .eq("user_id", user.id)
        .eq("media_type", "photo")
        .order("created_at", { ascending: false })
        .limit(3);

      if (!photosError && photos) {
        setRecentPhotos(
          photos.map((photo) => ({
            id: String(photo.id),
            media_url: String(photo.media_url),
            media_type: photo.media_type as "photo" | "video",
            created_at: String(photo.created_at),
          }))
        );
      }

      // Fetch recent videos (6 most recent)
      const { data: videos, error: videosError } = await supabase
        .from("user_media")
        .select("id, media_url, media_type, created_at, storage_path")
        .eq("user_id", user.id)
        .eq("media_type", "video")
        .order("created_at", { ascending: false })
        .limit(6);

      if (!videosError && videos) {
        const transformed = await Promise.all(
          videos.map(async (video) => {
            const rawUrl = String(video.media_url || "");
            const storagePath = (video as unknown as { storage_path?: string | null }).storage_path;

            // Videos may be stored in the private-media bucket (requires a signed URL)
            if (storagePath) {
              try {
                const { data: signedResponse, error: signErr } =
                  await supabase.functions.invoke("public-data", {
                    body: {
                      action: "createSignedUrl",
                      storagePath,
                      expiresIn: 3600,
                    },
                  });

                const signedUrl = signedResponse?.data?.signedUrl as
                  | string
                  | undefined;

                if (!signErr && signedUrl) {
                  return {
                    id: String(video.id),
                    media_url: signedUrl,
                    media_type: video.media_type as "photo" | "video",
                    created_at: String(video.created_at),
                  };
                }
              } catch {
                // fall back to rawUrl
              }
            }

            return {
              id: String(video.id),
              media_url: rawUrl,
              media_type: video.media_type as "photo" | "video",
              created_at: String(video.created_at),
            };
          })
        );

        setRecentVideos(transformed);
      }
    } catch (error) {
      console.error("Error fetching user media:", error);
    }
  };

  // Fetch likes from profile_likes table
  const fetchLikes = async () => {
    if (!userData) return;

    try {
      // Count total likes for this profile
      const { count, error: countError } = await supabase
        .from("profile_likes")
        .select("*", { count: "exact", head: true })
        .eq("profile_user_id", userData.id);

      if (!countError) {
        setLikes(count || 0);
      }

      // Check if current user has liked this profile
      if (currentUser) {
        const { data: likeData, error: likeError } = await supabase
          .from("profile_likes")
          .select("id")
          .eq("profile_user_id", userData.id)
          .eq("liker_user_id", currentUser.id)
          .maybeSingle();

        if (!likeError) {
          setHasLiked(!!likeData);
        }
      }
    } catch (error) {
      console.error("Error fetching likes:", error);
    }
  };

  // Handle like/unlike using profile_likes table
  const handleLike = async () => {
    if (!currentUser || !userData) return;

    try {
      if (hasLiked) {
        // Unlike - remove the like record
        const { error } = await supabase
          .from("profile_likes")
          .delete()
          .eq("profile_user_id", userData.id)
          .eq("liker_user_id", currentUser.id);

        if (!error) {
          setHasLiked(false);
          setLikes((prev) => Math.max(0, prev - 1));
          toast({
            title: "Unliked",
            description: `You unliked ${userData.username}`,
          });
        } else {
          console.error("Error unliking:", error);
        }
      } else {
        // Like - insert a new like record
        const { error } = await supabase
          .from("profile_likes")
          .insert({
            profile_user_id: userData.id,
            liker_user_id: currentUser.id,
          });

        if (!error) {
          setHasLiked(true);
          setLikes((prev) => prev + 1);
          toast({
            title: "Liked",
            description: `You liked ${userData.username}!`,
          });
        }
      }
    } catch (error) {
      console.error("Error handling like:", error);
      toast({
        title: "Error",
        description: "Failed to update like. Please try again.",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  if (!userData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <Card className="bg-red-900/20 border-red-500">
          <CardContent className="p-8 text-center">
            <h2 className="text-red-400 font-bold text-xl mb-2">
              User Not Found
            </h2>
            <p className="text-red-300">
              The requested user could not be found.
            </p>
            <Button
              onClick={() => (window.location.href = "/tip-girls")}
              className="mt-4 bg-red-500 hover:bg-red-600"
            >
              Back to Tip Girls
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
        {/* Banner Photo */}
        {userData.banner_photo && (
          <div className="w-full h-64 relative overflow-hidden">
            <img
              src={userData.banner_photo}
              alt="Banner"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-black/30" />
          </div>
        )}

        <div className={`max-w-6xl mx-auto p-4 relative z-10 ${userData.banner_photo ? '-mt-16' : 'pt-8'}`}>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column - Profile */}
            <div className="lg:col-span-1">
              <Card className="bg-white/10 backdrop-blur border-white/20 shadow-2xl">
                <CardContent className="p-6">
                  <div className="text-center mb-6">
                    <img
                      src={userData.profile_photo || "/placeholder.svg"}
                      alt={userData.username}
                      className="w-32 h-32 rounded-full mx-auto mb-4 border-4 border-yellow-400 shadow-lg object-cover"
                    />
                    <h2 className="text-2xl font-bold text-white mb-2">
                      @{userData.username}
                    </h2>
                    <div className="flex items-center justify-center gap-2 text-gray-300 mb-2">
                      <User size={16} />
                      <span className="capitalize">{userData.user_type}</span>
                    </div>
                    {userData.city && userData.state && (
                      <div className="flex items-center justify-center gap-2 text-gray-300 mb-2">
                        <MapPin size={16} />
                        <span>
                          {userData.city}, {userData.state}
                        </span>
                      </div>
                    )}
                    <div className="flex items-center justify-center gap-2 text-gray-400 text-sm mb-4">
                      <Calendar size={14} />
                      <span>
                        Joined{" "}
                        {new Date(userData.created_at).toLocaleDateString()}
                      </span>
                    </div>

                    {/* Like Button */}
                    <Button
                      onClick={handleLike}
                      variant={hasLiked ? "default" : "outline"}
                      className={`w-full mb-4 ${
                        hasLiked
                          ? "bg-red-600 hover:bg-red-700 text-white"
                          : "border-red-500 text-red-400 hover:bg-red-600 hover:text-white"
                      }`}
                    >
                      <Heart
                        className={`w-4 h-4 mr-2 ${
                          hasLiked ? "fill-current" : ""
                        }`}
                      />
                      {hasLiked ? "Liked" : "Like"} ({likes})
                    </Button>
                  </div>

                  {userData.bio && (
                    <div className="mb-4">
                      <h3 className="text-white font-semibold mb-2">About</h3>
                      <p className="text-gray-300 text-sm">{userData.bio}</p>
                    </div>
                  )}

                  {/* Recent Photos */}
                  {recentPhotos.length > 0 && (
                    <div className="mb-6">
                      <h3 className="text-white font-semibold mb-3">
                        Recent Photos
                      </h3>
                      <div className="grid grid-cols-3 gap-2">
                        {recentPhotos.map((photo) => (
                          <div
                            key={photo.id}
                            className="aspect-square overflow-hidden rounded-lg"
                          >
                            <img
                              src={photo.media_url}
                              alt="Recent photo"
                              className="w-full h-full object-cover hover:scale-105 transition-transform cursor-pointer"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Recent Videos */}
                  {recentVideos.length > 0 && (
                    <div className="mb-4">
                      <h3 className="text-white font-semibold mb-3">
                        Recent Videos
                      </h3>
                      <div className="grid grid-cols-2 gap-2">
                        {recentVideos.map((video) => (
                          <div
                            key={video.id}
                            className="aspect-video overflow-hidden rounded-lg relative"
                          >
                            <video
                              className="w-full h-full object-cover"
                              playsInline
                              preload="metadata"
                              controls
                            >
                              <source src={video.media_url} type="video/mp4" />
                            </video>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Right Column - Tipping */}
            <div className="lg:col-span-2">
              <Card className="bg-white/10 backdrop-blur border-white/20 shadow-2xl">
                <CardHeader>
                  <CardTitle className="text-3xl font-bold text-center text-white">
                    💎 Tip @{userData.username} 💎
                  </CardTitle>
                  <p className="text-center text-gray-300">
                    Support your favorite performer and enter the jackpot!
                  </p>
                </CardHeader>
                <CardContent className="space-y-6">
                  <TipAmountSelector
                    selectedAmount={tipAmount}
                    onAmountChange={setTipAmount}
                    customAmount={customAmount}
                    onCustomAmountChange={setCustomAmount}
                  />

                  <div>
                    <label className="block text-white mb-2 font-semibold">
                      Message (Optional)
                    </label>
                    <textarea
                      placeholder="Leave a nice message..."
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      className="w-full p-4 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-400 resize-none focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                      rows={3}
                      maxLength={200}
                    />
                  </div>

                  {tipAmount >= 5 && currentUser && (
                    <div className="bg-gradient-to-r from-yellow-500/20 to-yellow-600/20 rounded-xl p-6 border border-yellow-500/30">
                      <h3 className="text-white font-bold mb-4 text-center">
                        Complete Your Tip
                      </h3>

                      {paymentError && (
                        <div className="text-center p-4 bg-red-50 rounded-lg border border-red-200 mb-4">
                          <p className="text-red-600">{paymentError}</p>
                          <Button
                            onClick={() => setPaymentError(null)}
                            variant="outline"
                            className="mt-2"
                          >
                            Try Again
                          </Button>
                        </div>
                      )}

                      {!paymentError && (
                        <PayPalTipButton
                          tipAmount={tipAmount}
                          tippedUsername={userData.username}
                          tipperUserId={currentUser.id}
                          tipperUsername={currentUser.username || currentUser.email || "anonymous"}
                          referrerUsername={refUsername || undefined}
                          tipMessage={message}
                          onSuccess={handlePaymentSuccess}
                          onError={handlePaymentError}
                        />
                      )}

                      <p className="text-yellow-200 text-sm text-center mt-3">
                        🎟️ You'll receive {tipAmount} lottery tickets!
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>

        {/* Success Dialog */}
        <Dialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
          <DialogContent className="bg-gray-900 border-yellow-500">
            <DialogHeader>
              <DialogTitle className="text-yellow-500 text-center">
                🎉 Tip Successful!
              </DialogTitle>
              <DialogDescription className="text-white text-center">
                Thank you for your tip of ${tipAmount} to @{userData.username}!
              </DialogDescription>
            </DialogHeader>
            <div className="text-center py-4">
            <Button
              onClick={() => {
                setShowSuccessDialog(false);
                navigate("/dashboard?tab=jackpot");
              }}
              className="bg-gradient-to-r from-yellow-400 to-yellow-500 text-black hover:from-yellow-500 hover:to-yellow-600 w-full text-2xl font-bold py-4 mb-4 shadow-lg"
            >
              🎟️ View Tickets
            </Button>
            <p className="text-white font-semibold mb-2">
              You received {tipAmount} lottery tickets!
            </p>
            <p className="text-gray-300 text-sm">
              Check your dashboard for all tickets
            </p>
          </div>
            <DialogFooter>
              <Button
                onClick={() => setShowSuccessDialog(false)}
                className="bg-gradient-to-r from-yellow-400 to-yellow-500 text-black hover:from-yellow-500 hover:to-yellow-600 w-full"
              >
                Awesome!
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AuthGuard>
  );
};

export default Tip;