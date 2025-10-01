import React, { useState, useEffect } from "react";
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
import { MapPin, User, Calendar, Star, Heart, Play } from "lucide-react";
import AuthGuard from "@/components/AuthGuard";
import TipAmountSelector from "@/components/TipAmountSelector";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";

// PayPal SDK types
declare global {
  interface Window {
    paypal?: {
      Buttons: (config: {
        createOrder: (
          data: unknown,
          actions: {
            order: {
              create: (order: {
                purchase_units: Array<{
                  amount: { value: string };
                  custom_id?: string;
                }>;
              }) => Promise<string>;
            };
          }
        ) => Promise<string>;
        onApprove: (
          data: unknown,
          actions: {
            order: {
              capture: () => Promise<unknown>;
            };
          }
        ) => Promise<void>;
        onError: (err: unknown) => void;
      }) => {
        render: (container: HTMLElement) => Promise<void>;
      };
    };
  }
}
const SOLD_OUT_MESSAGE =
  "Jackpot is maxed out for the upcoming drawing. Tipping will resume at Saturday 12:00 am PST.";
const JACKPOT_UNAVAILABLE_ERROR = "JACKPOT_UNAVAILABLE";

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
  const [searchParams] = useSearchParams();
  const tipUsername = searchParams.get("tip");
  const refUsername = searchParams.get("ref") || "";
  const [tipAmount, setTipAmount] = useState(0);
  const [customAmount, setCustomAmount] = useState("");
  const [userData, setUserData] = useState<UserData | null>(null);
  const [recentPhotos, setRecentPhotos] = useState<MediaFile[]>([]);
  const [recentVideos, setRecentVideos] = useState<MediaFile[]>([]);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [digitalTicket, setDigitalTicket] = useState("");
  const [currentUser, setCurrentUser] = useState<{
    id: string;
    email?: string;
    username?: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [likes, setLikes] = useState(0);
  const [hasLiked, setHasLiked] = useState(false);
  const [paypalLoaded, setPaypalLoaded] = useState(false);
  const [paypalError, setPaypalError] = useState<string | null>(null);

  useEffect(() => {
    if (tipUsername) {
      fetchUserData();
      fetchUserMedia();
    }
    getCurrentUser();
    initializePayPal();
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

  const initializePayPal = () => {
    if (window.paypal) {
      setPaypalLoaded(true);
      return;
    }

    const clientId = import.meta.env.VITE_PAYPAL_CLIENT_ID || "sb";
    const scriptUrl = `https://www.paypal.com/sdk/js?client-id=${clientId}&currency=USD`;
    const script = document.createElement("script");
    script.src = scriptUrl;
    script.async = true;
    script.onload = () => {
      setPaypalLoaded(true);
    };
    script.onerror = () => {
      setPaypalError("Failed to load PayPal SDK");
    };

    if (!document.querySelector('script[src*="paypal.com/sdk"]')) {
      document.body.appendChild(script);
    }
  };

  const checkJackpotAvailability = async (): Promise<{
    canTip: boolean;
    message?: string;
  }> => {
    try {
      const { data, error } = await supabase
        .from("v_jackpot_active_pool")
        .select("pool_id,status")
        .single();
  
      if (error) {
        if ("code" in error && error.code === "PGRST116") {
          return {
            canTip: false,
            message:
              "Jackpot ticket sales are unavailable right now. Please try again later.",
          };
        }
        throw error;
      }
  
      if (!data) {
        return {
          canTip: false,
          message:
            "Jackpot ticket sales are unavailable right now. Please try again later.",
        };
      }
  
      if (data.status === "sold_out") {
        return { canTip: false, message: SOLD_OUT_MESSAGE };
      }
  
      return { canTip: true };
    } catch (err) {
      console.error("Jackpot availability check failed:", err);
      return {
        canTip: false,
        message:
          "Jackpot ticket sales are unavailable right now. Please try again later.",
      };
    }
  };

  const renderPayPalButton = (containerId: string, amount: number) => {
    if (!window.paypal || amount <= 0) return;

    const container = document.getElementById(containerId);
    if (!container) return;

    // Clear any existing buttons
    container.innerHTML = "";

    window.paypal
      .Buttons({
        createOrder: async (data: unknown, actions: unknown) => {
          const orderActions = actions as {
            order: {
              create: (order: {
                purchase_units: Array<{
                  amount: { value: string };
                  custom_id?: string;
                }>;
              }) => Promise<string>;
            };
          };
  
          const availability = await checkJackpotAvailability();
          if (!availability.canTip) {
            const description =
              availability.message ||
              "Jackpot ticket sales are unavailable right now. Please try again later.";
  
            toast({
              title: description.toLowerCase().includes("maxed")
                ? "Jackpot Sold Out"
                : "Tip Unavailable",
              description,
              variant: "destructive",
            });
  
            return Promise.reject(new Error(JACKPOT_UNAVAILABLE_ERROR));
          }
  
          return orderActions.order.create({
            purchase_units: [
              {
                amount: {
                  value: amount.toFixed(2),
                },
                custom_id: JSON.stringify({
                  tipped_username: userData?.username,
                  referrer_username: refUsername,
                  tipper_username:
                    currentUser?.username || currentUser?.email || "anonymous",
                  tip_amount: amount,
                  tip_message: (message || "").slice(0, 60),
                }),
              },
            ],
          });
        },
        onApprove: (data: unknown, actions: unknown) => {
          const captureActions = actions as {
            order: {
              capture: () => Promise<unknown>;
            };
          };
          return captureActions.order.capture().then((details: unknown) => {
            handlePaymentSuccess(details as { id: string });
          });
        },
        onError: (err: unknown) => {
          if (
            err === JACKPOT_UNAVAILABLE_ERROR ||
            (err instanceof Error && err.message === JACKPOT_UNAVAILABLE_ERROR)
          ) {
            return;
          }
          console.error("PayPal error:", err);
          setPaypalError("Payment failed. Please try again.");
        },
      })
      .render(container);
  };

  // Re-render PayPal button when amount changes (minimum $5)
  useEffect(() => {
    if (paypalLoaded && tipAmount >= 5 && currentUser && userData) {
      const containerId = `paypal-button-container-${tipAmount}`;
      setTimeout(() => renderPayPalButton(containerId, tipAmount), 100);
    }
  }, [paypalLoaded, tipAmount, currentUser, userData]);

  const fetchUserData = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("users")
        .select("*")
        .eq("username", tipUsername)
        .in("user_type", ["stripper", "exotic"])
        .single();

      if (error) {
        console.error("Error fetching user data:", error);
        return;
      }

      if (data) {
        setUserData({
          id: String(data.id),
          username: String(data.username),
          profile_photo: String(data.profile_photo || ""),
          banner_photo: data.banner_photo
            ? String(data.banner_photo)
            : undefined,
          city: String(data.city || ""),
          state: String(data.state || ""),
          bio: data.bio ? String(data.bio) : undefined,
          user_type: String(data.user_type),
          created_at: String(data.created_at),
        });
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
      // Get user ID first
      const { data: user, error: userError } = await supabase
        .from("users")
        .select("id")
        .eq("username", tipUsername)
        .single();

      if (userError || !user) return;

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

      // Fetch recent videos (2 most recent)
      const { data: videos, error: videosError } = await supabase
        .from("user_media")
        .select("id, media_url, media_type, created_at")
        .eq("user_id", user.id)
        .eq("media_type", "video")
        .order("created_at", { ascending: false })
        .limit(2);

      if (!videosError && videos) {
        setRecentVideos(
          videos.map((video) => ({
            id: String(video.id),
            media_url: String(video.media_url),
            media_type: video.media_type as "photo" | "video",
            created_at: String(video.created_at),
          }))
        );
      }
    } catch (error) {
      console.error("Error fetching user media:", error);
    }
  };

  // FIXED: Use same like system as Rate.tsx (users.likes and users.liked_by)
  const fetchLikes = async () => {
    if (!userData || !currentUser) return;

    try {
      // Get the user's current likes count and liked_by data (same as Rate.tsx)
      const { data: userLikeData, error: userError } = await supabase
        .from("users")
        .select("likes, liked_by")
        .eq("id", userData.id)
        .single();

      if (!userError && userLikeData) {
        setLikes(Number(userLikeData.likes) || 0);

        // Check if current user has already liked this profile
        if (currentUser && userLikeData.liked_by) {
          const likedByUsers = Array.isArray(userLikeData.liked_by)
            ? userLikeData.liked_by
            : [userLikeData.liked_by];
          setHasLiked(likedByUsers.includes(currentUser.id));
        }
      }
    } catch (error) {
      console.error("Error fetching likes:", error);
    }
  };

  // FIXED: Use same like system as Rate.tsx
  const handleLike = async () => {
    if (!currentUser || !userData) return;

    try {
      // First, get current state to ensure we have latest data (same as Rate.tsx)
      const { data: currentUserData, error: fetchError } = await supabase
        .from("users")
        .select("likes, liked_by")
        .eq("id", userData.id)
        .single();

      if (fetchError) {
        console.error("Error fetching current user data:", fetchError);
        return;
      }

      const currentLikes = Number(currentUserData.likes) || 0;
      const currentLikedBy = currentUserData.liked_by;

      // Check if user has already liked
      let userHasLiked = false;
      if (currentLikedBy) {
        const likedByUsers = Array.isArray(currentLikedBy)
          ? currentLikedBy
          : [currentLikedBy];
        userHasLiked = likedByUsers.includes(currentUser.id);
      }

      if (userHasLiked) {
        // Unlike - remove like (same as Rate.tsx)
        const { error } = await supabase
          .from("users")
          .update({
            likes: Math.max(0, currentLikes - 1),
            liked_by: null, // Simplified for now
          })
          .eq("id", userData.id);

        if (!error) {
          setHasLiked(false);
          setLikes(Math.max(0, currentLikes - 1));
          toast({
            title: "Unliked",
            description: `You unliked ${userData.username}`,
          });
        }
      } else {
        // Like - add like (same as Rate.tsx)
        const { error } = await supabase
          .from("users")
          .update({
            likes: currentLikes + 1,
            liked_by: currentUser.id, // Simplified for now
          })
          .eq("id", userData.id);

        if (!error) {
          setHasLiked(true);
          setLikes(currentLikes + 1);
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

  const handlePaymentSuccess = async (details: { id: string }) => {
    try {
      const { data: resp, error: fnError } = await supabase.functions.invoke(
        "process-tip",
        {
          body: {
            tipper_id: currentUser?.id,
            tipper_username: currentUser?.username || currentUser?.email,
            tipped_username: userData?.username,
            amount: tipAmount,
            message: message || null,
            referrer_username: refUsername || null,
            paypal_capture_id: details.id,
          },
        }
      );

      if (fnError) {
        console.error("process-tip error", fnError);
        const errorMessage =
          typeof fnError.message === "string" && fnError.message.length
            ? fnError.message
            : "Jackpot ticket sales are unavailable right now. Please try again later.";

        const lowerMessage = errorMessage.toLowerCase();
        toast({
          title: lowerMessage.includes("maxed")
            ? "Jackpot Sold Out"
            : "Tip Failed",
          description: errorMessage,
          variant: "destructive",
        });
        return;
      }

      const payload = (resp as { success?: boolean; ticket_codes?: string[] }) || {
        success: false,
        ticket_codes: [],
      };

      console.log("process-tip response", resp);

      if (!payload.success) {
        toast({
          title: "Tip Processed",
          description:
            "Your payment completed, but no jackpot tickets were issued. Please contact support.",
          variant: "destructive",
        });
        return;
      }

      if (payload.ticket_codes?.length) {
        setDigitalTicket(payload.ticket_codes[0] || "");
      } else {
        console.warn(
          "process-tip returned success without ticket codes",
          resp,
        );
      }

      setShowSuccessDialog(true);
    } catch (err) {
      console.error("Error processing tip:", err);
      toast({
        title: "Tip Failed",
        description: "We couldn't process your tip. Please try again.",
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

        <div className="max-w-6xl mx-auto p-4 -mt-16 relative z-10">
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
                              src={video.media_url}
                              className="w-full h-full object-cover"
                            />
                            <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                              <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                                <Play className="w-6 h-6 text-white ml-1" />
                              </div>
                            </div>
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

                      {paypalError ? (
                        <div className="text-center p-4 bg-red-50 rounded-lg border border-red-200 mb-4">
                          <p className="text-red-600">{paypalError}</p>
                          <Button
                            onClick={() => {
                              setPaypalError(null);
                              initializePayPal();
                            }}
                            variant="outline"
                            className="mt-2"
                          >
                            Retry
                          </Button>
                        </div>
                      ) : !paypalLoaded ? (
                        <div className="flex items-center justify-center p-4">
                          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-yellow-500"></div>
                          <span className="ml-2 text-white">
                            Loading PayPal...
                          </span>
                        </div>
                      ) : (
                        <div className="w-full">
                          <div id={`paypal-button-container-${tipAmount}`} />
                        </div>
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
              <div className="bg-gradient-to-r from-yellow-400 to-yellow-500 text-black font-bold text-2xl p-4 rounded-lg mb-4 shadow-lg">
                🎟️ {digitalTicket}
              </div>
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