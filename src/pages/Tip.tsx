import React, { useState, useEffect } from "react";
import { usePageVideo } from "@/hooks/usePageVideo";
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
import { MapPin, User, Calendar, Star, Heart, Play, Loader2, CreditCard } from "lucide-react";
import AuthGuard from "@/components/AuthGuard";
import TipAmountSelector from "@/components/TipAmountSelector";
// CreditCardForm removed - using PayPal Hosted Checkout redirect for cards
import PhotoLightbox from "@/components/PhotoLightbox";
import VideoPlayerModal, { VideoThumbnail } from "@/components/VideoPlayerModal";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import AngelLoader from "@/components/AngelLoader";

// Toggle state for card form visibility

const SOLD_OUT_MESSAGE =
  "Jackpot is maxed out for the upcoming drawing. Tipping will resume at Saturday 12:00 am PST.";

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
  video_urls?: string[];
}

interface MediaFile {
  id: string;
  media_url: string;
  media_type: "photo" | "video";
  created_at: string;
  content_tier?: string;
}

const Tip: React.FC = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { videoUrl: tipVideoUrl } = usePageVideo("tip_win_page");
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
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  // Card form state removed - using PayPal Hosted Checkout redirect

  // Lightbox & Video modal state
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(0);
  const [videoModalOpen, setVideoModalOpen] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState<MediaFile | null>(null);

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

  // Handle PayPal redirect payment
  const handlePayWithPayPal = async () => {
    if (!currentUser || !userData || tipAmount < 5) return;

    setIsProcessingPayment(true);
    setPaymentError(null);

    try {
      // Check jackpot availability first
      const availability = await checkJackpotAvailability();
      if (!availability.canTip) {
        toast({
          title: "Tip Unavailable",
          description: availability.message || "Unable to process tip at this time.",
          variant: "destructive",
        });
        setIsProcessingPayment(false);
        return;
      }

      // Build return URL with all necessary params for capture
      const baseUrl = window.location.origin;
      const returnParams = new URLSearchParams({
        tipper_id: currentUser.id,
        tipper_username: currentUser.username || currentUser.email || "anonymous",
        tipped_username: userData.username,
        amount: tipAmount.toString(),
        referrer_username: refUsername || "",
        tip_message: (message || "").slice(0, 60),
      });
      
      const returnUrl = `${baseUrl}/tip-paypal-return?${returnParams.toString()}`;
      const cancelUrl = `${baseUrl}/tip?tip=${userData.username}${refUsername ? `&ref=${refUsername}` : ""}`;

      console.log("Creating PayPal tip order:", {
        tipper_id: currentUser.id,
        tipped_username: userData.username,
        amount: tipAmount,
        return_url: returnUrl,
      });

      // Call our edge function to create the PayPal order
      const { data, error } = await supabase.functions.invoke("create-paypal-order", {
        body: {
          payment_type: "tip",
          tipper_id: currentUser.id,
          tipper_username: currentUser.username || currentUser.email || "anonymous",
          tipped_username: userData.username,
          amount: tipAmount,
          tip_message: message,
          return_url: returnUrl,
          cancel_url: cancelUrl,
        },
      });

      if (error) {
        console.error("PayPal order creation error:", error);
        throw new Error(error.message || "Failed to create PayPal order");
      }

      if (!data?.success || !data?.approval_url) {
        throw new Error(data?.error || "Failed to get PayPal approval URL");
      }

      console.log("Redirecting to PayPal:", data.approval_url);
      
      // Redirect to PayPal for payment approval
      window.location.href = data.approval_url;
    } catch (err) {
      console.error("Payment error:", err);
      const errorMessage = err instanceof Error ? err.message : "Failed to process payment";
      setPaymentError(errorMessage);
      toast({
        title: "Payment Error",
        description: errorMessage,
        variant: "destructive",
      });
      setIsProcessingPayment(false);
    }
  };

  // Handle PayPal Pay Later redirect payment
  const handlePayWithPayPalLater = async () => {
    if (!currentUser || !userData || tipAmount < 5) return;

    setIsProcessingPayment(true);
    setPaymentError(null);

    try {
      // Check jackpot availability first
      const availability = await checkJackpotAvailability();
      if (!availability.canTip) {
        toast({
          title: "Tip Unavailable",
          description: availability.message || "Unable to process tip at this time.",
          variant: "destructive",
        });
        setIsProcessingPayment(false);
        return;
      }

      // Build return URL with all necessary params for capture
      const baseUrl = window.location.origin;
      const returnParams = new URLSearchParams({
        tipper_id: currentUser.id,
        tipper_username: currentUser.username || currentUser.email || "anonymous",
        tipped_username: userData.username,
        amount: tipAmount.toString(),
        referrer_username: refUsername || "",
        tip_message: (message || "").slice(0, 60),
      });
      
      const returnUrl = `${baseUrl}/tip-paypal-return?${returnParams.toString()}`;
      const cancelUrl = `${baseUrl}/tip?tip=${userData.username}${refUsername ? `&ref=${refUsername}` : ""}`;

      console.log("Creating PayPal Pay Later order:", {
        tipper_id: currentUser.id,
        tipped_username: userData.username,
        amount: tipAmount,
        return_url: returnUrl,
      });

      // Call our edge function to create the PayPal order
      const { data, error } = await supabase.functions.invoke("create-paypal-order", {
        body: {
          payment_type: "tip",
          tipper_id: currentUser.id,
          tipper_username: currentUser.username || currentUser.email || "anonymous",
          tipped_username: userData.username,
          amount: tipAmount,
          tip_message: message,
          return_url: returnUrl,
          cancel_url: cancelUrl,
        },
      });

      if (error) {
        console.error("PayPal order creation error:", error);
        throw new Error(error.message || "Failed to create PayPal order");
      }

      if (!data?.success || !data?.approval_url) {
        throw new Error(data?.error || "Failed to get PayPal approval URL");
      }

      // Append fundingSource=paylater to redirect to Pay Later tab
      const payLaterUrl = `${data.approval_url}&fundingSource=paylater`;
      console.log("Redirecting to PayPal Pay Later:", payLaterUrl);
      
      // Redirect to PayPal Pay Later tab
      window.location.href = payLaterUrl;
    } catch (err) {
      console.error("Payment error:", err);
      const errorMessage = err instanceof Error ? err.message : "Failed to process payment";
      setPaymentError(errorMessage);
      toast({
        title: "Payment Error",
        description: errorMessage,
        variant: "destructive",
      });
      setIsProcessingPayment(false);
    }
  };

  // Handle Credit Card payment via PayPal Hosted Checkout redirect
  const handleCardRedirect = async () => {
    if (!currentUser || !userData || tipAmount < 5) return;

    setIsProcessingPayment(true);
    setPaymentError(null);

    try {
      // Check jackpot availability first
      const availability = await checkJackpotAvailability();
      if (!availability.canTip) {
        toast({
          title: "Tip Unavailable",
          description: availability.message || "Unable to process tip at this time.",
          variant: "destructive",
        });
        setIsProcessingPayment(false);
        return;
      }

      // Build return URL with all necessary params for capture
      const baseUrl = window.location.origin;
      const returnParams = new URLSearchParams({
        tipper_id: currentUser.id,
        tipper_username: currentUser.username || currentUser.email || "anonymous",
        tipped_username: userData.username,
        amount: tipAmount.toString(),
        referrer_username: refUsername || "",
        tip_message: (message || "").slice(0, 60),
      });
      
      const returnUrl = `${baseUrl}/tip-paypal-return?${returnParams.toString()}`;
      const cancelUrl = `${baseUrl}/tip?tip=${userData.username}${refUsername ? `&ref=${refUsername}` : ""}`;

      console.log("Creating PayPal card order for tip:", {
        tipper_id: currentUser.id,
        tipped_username: userData.username,
        amount: tipAmount,
        return_url: returnUrl,
      });

      // Call our edge function to create the PayPal order
      const { data, error } = await supabase.functions.invoke("create-paypal-order", {
        body: {
          payment_type: "tip",
          tipper_id: currentUser.id,
          tipper_username: currentUser.username || currentUser.email || "anonymous",
          tipped_username: userData.username,
          amount: tipAmount,
          tip_message: message,
          return_url: returnUrl,
          cancel_url: cancelUrl,
        },
      });

      if (error) {
        console.error("PayPal order creation error:", error);
        throw new Error(error.message || "Failed to create PayPal order");
      }

      if (!data?.success || !data?.approval_url) {
        throw new Error(data?.error || "Failed to get PayPal approval URL");
      }

      // Append fundingSource=card to redirect to card checkout
      const cardUrl = `${data.approval_url}&fundingSource=card`;
      console.log("Redirecting to PayPal card checkout:", cardUrl);
      
      // Redirect to PayPal card checkout
      window.location.href = cardUrl;
    } catch (err) {
      console.error("Card redirect error:", err);
      const errorMessage = err instanceof Error ? err.message : "Failed to process payment";
      setPaymentError(errorMessage);
      toast({
        title: "Payment Error",
        description: errorMessage,
        variant: "destructive",
      });
      setIsProcessingPayment(false);
    }
  };

  const fetchUserData = async () => {
    try {
      setLoading(true);
      console.log("Fetching user data for username:", tipUsername);
      
      // Use public_user_profiles view to bypass RLS restrictions
      // Use maybeSingle() instead of single() to handle missing users gracefully
      const { data, error } = await supabase
        .from("public_user_profiles")
        .select("id, username, profile_photo, city, state, bio, user_type, created_at, video_urls")
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
          created_at: data.created_at ? String(data.created_at) : new Date().toISOString(),
          video_urls: Array.isArray(data.video_urls) ? data.video_urls.filter(Boolean).map(String) : undefined,
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

      const resolveMediaUrl = async (media: {
        media_url?: string | null;
        storage_path?: string | null;
      }) => {
        const rawUrl = String(media.media_url || "");
        const storagePath = media.storage_path || rawUrl.split("/private-media/")[1];

        if (!storagePath) return rawUrl;

        try {
          const { data: signedResponse, error: signErr } =
            await supabase.functions.invoke("public-data", {
              body: {
                action: "createSignedUrl",
                storagePath,
                expiresIn: 3600,
              },
            });

          const signedUrl = signedResponse?.data?.signedUrl as string | undefined;
          return !signErr && signedUrl ? signedUrl : rawUrl;
        } catch {
          return rawUrl;
        }
      };

      const { data: mediaResponse, error: mediaError } =
        await supabase.functions.invoke("public-data", {
          body: {
            action: "fetchUserMedia",
            userId: user.id,
          },
        });

      if (mediaError) {
        console.error("Error fetching recent media:", mediaError);
        return;
      }

      const mediaRows = Array.isArray(mediaResponse?.data)
        ? mediaResponse.data
        : [];

      // Fetch 1 most recent photo from each tier (free, silver, gold)
      const tiers = ["free", "silver", "gold"];
      const allPhotos: MediaFile[] = [];

      for (const tier of tiers) {
        const photo = mediaRows.find(
          (item) => item.media_type === "photo" && item.content_tier === tier,
        );

        if (photo) {
          allPhotos.push({
            id: String(photo.id),
            media_url: await resolveMediaUrl(photo),
            media_type: photo.media_type as "photo" | "video",
            created_at: String(photo.created_at),
            content_tier: tier,
          });
        }
      }

      // Show photos immediately, don't block on video signed URLs
      setRecentPhotos(allPhotos);

      const allVideos: MediaFile[] = [];
      for (const tier of tiers) {
        const v = mediaRows.find(
          (item) => item.media_type === "video" && item.content_tier === tier,
        );

        if (v) {
          allVideos.push({
            id: String(v.id),
            media_url: await resolveMediaUrl(v),
            media_type: v.media_type as "photo" | "video",
            created_at: String(v.created_at),
            content_tier: tier,
          });
        }
      }

      setRecentVideos(allVideos);

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

      const normalizedResp =
      typeof resp === "string" && resp.trim().length
        ? JSON.parse(resp)
        : resp ?? {};

    const payload =
      (normalizedResp as { success?: boolean; ticket_codes?: string[] }) || {
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
        console.log("Tickets received:", payload.ticket_codes);
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
    return <AngelLoader variant="fullscreen" />;
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
        {/* Banner Video or Photo */}
        {tipVideoUrl ? (
          <div className="w-full bg-black">
            <video
              className="w-full h-auto"
              controls
              playsInline
              preload="metadata"
            >
              <source src={tipVideoUrl} type="video/mp4" />
            </video>
          </div>

        ) : userData.banner_photo ? (
          <div className="w-full h-64 relative overflow-hidden">
            <img
              src={userData.banner_photo}
              alt="Banner"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-black/30" />
          </div>
        ) : null}

        <div className={`w-full p-0 relative z-10 ${userData.banner_photo ? '-mt-16' : 'pt-8'}`}>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-0">
            {/* Left Column - Profile */}
            <div className="lg:col-span-1">
              <Card className="bg-white/10 backdrop-blur border-0 shadow-none rounded-none">
                <CardContent className="p-4">
                  <div className="text-center mb-6">
                    <img
                      src={userData.profile_photo || "/placeholder.svg"}
                      alt={userData.username}
                      className="w-48 h-48 rounded-full mx-auto mb-4 border-4 border-yellow-400 shadow-lg object-cover"
                    />
                    <h2 className="text-xl sm:text-2xl font-bold text-white mb-2">
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
                        {recentPhotos.map((photo, index) => (
                          <div
                            key={photo.id}
                            className="aspect-square overflow-hidden rounded-lg"
                          >
                            <img
                              src={photo.media_url}
                              alt="Recent photo"
                              className="w-full h-full object-cover hover:scale-105 transition-transform cursor-pointer"
                              onClick={() => {
                                setSelectedPhotoIndex(index);
                                setLightboxOpen(true);
                              }}
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
                          <VideoThumbnail
                            key={video.id}
                            videoUrl={video.media_url}
                            className="aspect-video"
                            onClick={() => {
                              setSelectedVideo(video);
                              setVideoModalOpen(true);
                            }}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Right Column - Tipping */}
            <div className="lg:col-span-2">
              <Card className="bg-white/10 backdrop-blur border-0 shadow-none rounded-none">
                <CardHeader className="p-4 pb-0">
                  <CardTitle className="text-3xl font-bold text-center text-white">
                    💎 Tip @{userData.username} 💎
                  </CardTitle>
                  <p className="text-center text-gray-300">
                    Support your favorite performer and enter the jackpot!
                  </p>
                </CardHeader>
                <CardContent className="space-y-6 p-4">
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
                        <>
                          {/* PayPal Button */}
                          <Button
                            onClick={handlePayWithPayPal}
                            disabled={isProcessingPayment}
                            className="w-full bg-[#0070ba] hover:bg-[#005ea6] text-white font-bold py-4 text-lg rounded-xl mb-3"
                          >
                            {isProcessingPayment ? (
                              <>
                                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                Redirecting to PayPal...
                              </>
                            ) : (
                              <>Pay ${tipAmount} with PayPal</>
                            )}
                          </Button>
                          
                          {/* Card Button - Redirect to PayPal Hosted Checkout */}
                          <Button
                            onClick={handleCardRedirect}
                            disabled={isProcessingPayment}
                            className="w-full bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-700 hover:to-purple-700 text-white font-bold py-4 text-lg rounded-xl mb-3"
                          >
                            {isProcessingPayment ? (
                              <>
                                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                Redirecting...
                              </>
                            ) : (
                              <>
                                <CreditCard className="w-5 h-5 mr-2" />
                                Pay with Card
                              </>
                            )}
                          </Button>
                          
                          {/* Pay Later Button */}
                          <Button
                            onClick={handlePayWithPayPalLater}
                            disabled={isProcessingPayment}
                            variant="outline"
                            className="w-full border-2 border-yellow-400 text-yellow-400 bg-transparent hover:bg-yellow-400/10 font-bold py-4 text-lg rounded-xl"
                          >
                            {isProcessingPayment ? (
                              <>
                                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                Redirecting to PayPal...
                              </>
                            ) : (
                              <>Pay ${tipAmount} Later with PayPal</>
                            )}
                          </Button>
                        </>
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

        {/* Photo Lightbox */}
        <PhotoLightbox
          photos={recentPhotos.map((p) => p.media_url)}
          initialIndex={selectedPhotoIndex}
          isOpen={lightboxOpen}
          onClose={() => setLightboxOpen(false)}
        />

        {/* Video Player Modal */}
        {selectedVideo && (
          <VideoPlayerModal
            videoUrl={selectedVideo.media_url}
            isOpen={videoModalOpen}
            onClose={() => setVideoModalOpen(false)}
          />
        )}
      </div>
    </AuthGuard>
  );
};

export default Tip;