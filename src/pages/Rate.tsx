import React, { useState, useEffect } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { normalizeRefParam } from "@/lib/utils";
import { getRatingSeasonYear, normalizeUsername } from "@/lib/timeUtils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from "@/lib/supabase";
import { Card, CardContent } from "@/components/ui/card";
import {
  MapPin,
  User,
  Trophy,
  Lock,
  Eye,
  Play,
  X,
  ChevronLeft,
  ChevronRight,
  Heart,
  Home,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import AngelLoader from "@/components/AngelLoader";
import ZoomableSwipeImage from "@/components/ZoomableSwipeImage";
import TrophyCelebration from "@/components/TrophyCelebration";


import { resolveMembership } from "@/lib/membership";


interface UserData {
  id: string;
  username: string;
  profile_photo: string;
  banner_photo: string;
  front_page_photo: string;
  city: string;
  state: string;
  bio?: string;
  user_type: string;
  gender?: string;
}

interface CurrentStanding {
  rank: number;
  totalScore: number;
  totalRatings: number;
}

interface UserRating {
  id: string;
  rater_id: string;
  user_id: string;
  rating: number;
  year: number;
  created_at: string;
}

interface NumberAssignment {
  number: number;
  assigned_to_username: string;
  assigned_to_photo: string;
  is_current_page: boolean;
}

const RatePage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const rateUsername = searchParams.get("rate");
  const refUsername = normalizeRefParam(searchParams.get("ref"));

  const [userData, setUserData] = useState<UserData | null>(null);
  const [currentUser, setCurrentUser] = useState<{
    id: string;
    email?: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [userRatings, setUserRatings] = useState<UserRating[]>([]);
  const [numberAssignments, setNumberAssignments] = useState<{
    [key: number]: NumberAssignment;
  }>({});
  const [selectedNumber, setSelectedNumber] = useState<number | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showReassignDialog, setShowReassignDialog] = useState(false);
  const [confirmMessage, setConfirmMessage] = useState("");
  const [reassignFromUser, setReassignFromUser] = useState<{
    username: string;
    photo: string;
  } | null>(null);
  const [isAllNumbersUsed, setIsAllNumbersUsed] = useState(false);
  const [currentStanding, setCurrentStanding] =
    useState<CurrentStanding | null>(null);
  const [likes, setLikes] = useState(0);
  const [hasLiked, setHasLiked] = useState(false);
  const [expandedImage, setExpandedImage] = useState<string | null>(null);
  const [previewPhotos, setPreviewPhotos] = useState<string[]>([]);
  const [previewVideos, setPreviewVideos] = useState<string[]>([]);
  const [photoIndex, setPhotoIndex] = useState(0);
  const [hasDiamond, setHasDiamond] = useState(false);
  const [lightbox, setLightbox] = useState<{
    type: "photo" | "video";
    index: number;
  } | null>(null);


  useEffect(() => {
    if (!rateUsername) {
      // No user specified to rate - redirect to rate-girls page
      navigate('/rate-girls' + (refUsername ? `?ref=${refUsername}` : ''));
      return;
    }
    initializeRatingSystem();
  }, [rateUsername, navigate, refUsername]);

  const initializeRatingSystem = async () => {
    try {
      setLoading(true);
      await Promise.all([fetchCurrentUser(), fetchUserData()]);
    } catch (error) {
      console.error("Error initializing rating system:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCurrentUser = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        setCurrentUser(user);
        await Promise.all([fetchUserRatings(user.id), fetchViewerMembership(user.id)]);
      }
    } catch (error) {
      console.error("Error fetching current user:", error);
    }
  };

  const handleHomeClick = async () => {
    const hasStoredSession = Boolean(
      localStorage.getItem("authToken") && sessionStorage.getItem("userData"),
    );

    if (currentUser || hasStoredSession) {
      navigate("/dashboard/profile");
      return;
    }

    const { data: { session } } = await supabase.auth.getSession();
    navigate(session?.user ? "/dashboard/profile" : "/login");
  };

  const fetchViewerMembership = async (authId: string) => {
    try {
      const { data } = await supabase
        .from("users")
        .select(
          "membership_tier, membership_type, user_type, free_membership_tier, silver_plus_active, diamond_plus_active, business_owner_elite_active"
        )
        .eq("id", authId)
        .maybeSingle();
      if (data) {
        setHasDiamond(resolveMembership(data).rank >= 4);
      }
    } catch (e) {
      console.error("Membership check error:", e);
    }
  };

  const fetchUserData = async () => {
    try {
      // Use public-data edge function to fetch profile
      const { data: response, error } = await supabase.functions.invoke('public-data', {
        body: { action: 'fetchProfile', username: rateUsername }
      });

      if (error) {
        console.error("Error fetching user data:", error);
        return;
      }

      const data = response?.data;

      if (data) {
        const userData: UserData = {
          id: String(data.id),
          username: String(data.username),
          profile_photo: String(data.profile_photo || ""),
          banner_photo: String(data.banner_photo || ""),
          front_page_photo: String(data.front_page_photo || ""),
          city: String(data.city || ""),
          state: String(data.state || ""),
          bio: data.bio ? String(data.bio) : undefined,
          user_type: String(data.user_type),
          gender: data.gender ? String(data.gender) : undefined,
        };
        setUserData(userData);

        const registrationVideos: string[] = Array.isArray(data.video_urls)
          ? data.video_urls.filter(Boolean).map((v: unknown) => String(v))
          : [];

        // Fetch current standing, likes and free preview media
        await Promise.all([
          fetchCurrentStanding(userData.id),
          fetchLikes(userData.id),
          fetchFreeMedia(userData, registrationVideos),
        ]);
      }
    } catch (error) {
      console.error("Error:", error);
    }
  };

  const signMediaUrl = async (rawUrl: string): Promise<string> => {
    const url = String(rawUrl || "");
    if (!url.includes("/private-media/")) return url;
    const storagePath = url.split("/private-media/")[1];
    if (!storagePath) return url;
    try {
      const { data: signedResponse, error: signErr } =
        await supabase.functions.invoke("public-data", {
          body: {
            action: "createSignedUrl",
            storagePath: decodeURIComponent(storagePath),
            expiresIn: 3600,
          },
        });
      const signedUrl = signedResponse?.data?.signedUrl as string | undefined;
      return !signErr && signedUrl ? signedUrl : url;
    } catch {
      return url;
    }
  };

  const signAll = async (urls: string[]) =>
    Promise.all(urls.map((u) => signMediaUrl(u)));

  const fetchFreeMedia = async (
    profile: UserData,
    registrationVideos: string[]
  ) => {
    const fallbackPhotos = [
      profile.profile_photo,
      profile.banner_photo,
      profile.front_page_photo,
    ].filter(Boolean);
    const fallbackVideos = registrationVideos.slice(0, 1);

    const applyFallback = async () => {
      setPreviewPhotos(await signAll(fallbackPhotos));
      setPreviewVideos(await signAll(fallbackVideos));
    };

    try {
      const { data, error } = await supabase
        .from("user_media")
        .select("id, media_url, media_type, created_at")
        .eq("user_id", profile.id)
        .eq("content_tier", "free")
        .neq("access_restricted", true)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching free media:", error);
        await applyFallback();
        return;
      }

      const list = data || [];
      const isPhoto = (m: any) => {
        const t = String(m.media_type || "").toLowerCase();
        return t.includes("photo") || t.includes("image");
      };
      const isVideo = (m: any) =>
        String(m.media_type || "").toLowerCase().includes("video");

      const photos = list
        .filter(isPhoto)
        .slice(0, 3)
        .map((m: any) => String(m.media_url));
      const videos = list
        .filter(isVideo)
        .slice(0, 3)
        .map((m: any) => String(m.media_url));

      setPreviewPhotos(await signAll(photos.length > 0 ? photos : fallbackPhotos));
      setPreviewVideos(await signAll(videos.length > 0 ? videos : fallbackVideos));
    } catch (e) {
      console.error("Free media error:", e);
      await applyFallback();
    }
  };


  // Auto-rotate the photo preview
  useEffect(() => {
    if (previewPhotos.length < 2 || lightbox) return;
    const id = setInterval(() => {
      setPhotoIndex((i) => (i + 1) % previewPhotos.length);
    }, 3500);
    return () => clearInterval(id);
  }, [previewPhotos, lightbox]);


  const fetchCurrentStanding = async (userId: string) => {
    try {
      const seasonYear = getRatingSeasonYear();

      // Get all ratings for this user this season
      const { data: userRatingsData, error: ratingsError } = await supabase
        .from("ratings")
        .select("rating")
        .eq("user_id", userId)
        .eq("year", seasonYear);

      if (ratingsError) {
        console.error("Error fetching user ratings:", ratingsError);
        return;
      }

      // Get all users with ratings to calculate ranking
      const { data: allRatingsData, error: allRatingsError } = await supabase
        .from("ratings")
        .select("user_id, rating")
        .eq("year", seasonYear);

      if (allRatingsError) {
        console.error("Error fetching all ratings:", allRatingsError);
        return;
      }

      if (userRatingsData && allRatingsData) {
        const totalScore = userRatingsData.reduce(
          (sum, r) => sum + Number(r.rating),
          0
        );
        const totalRatings = userRatingsData.length;

        // Calculate ranking
        const userScores: { [userId: string]: number } = {};
        allRatingsData.forEach((rating) => {
          const uid = String(rating.user_id);
          if (!userScores[uid]) userScores[uid] = 0;
          userScores[uid] += Number(rating.rating);
        });

        const sortedUsers = Object.entries(userScores).sort(
          ([, scoreA], [, scoreB]) => scoreB - scoreA
        );

        const rank = sortedUsers.findIndex(([uid]) => uid === userId) + 1;

        setCurrentStanding({
          rank: rank || 0,
          totalScore,
          totalRatings,
        });
      }
    } catch (error) {
      console.error("Error fetching current standing:", error);
    }
  };

  const fetchLikes = async (userId: string) => {
    try {
      // Count total likes for this profile from profile_likes table
      const { count, error: countError } = await supabase
        .from("profile_likes")
        .select("*", { count: "exact", head: true })
        .eq("profile_user_id", userId);

      if (!countError) {
        setLikes(count || 0);
      }

      // Check if current user has liked this profile
      if (currentUser) {
        const { data: likeData, error: likeError } = await supabase
          .from("profile_likes")
          .select("id")
          .eq("profile_user_id", userId)
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

  const fetchUserRatings = async (userId: string) => {
    try {
      const seasonYear = getRatingSeasonYear();

      // Get all ratings made by current user this season (without join to avoid relation issues)
      const { data: ratings, error } = await supabase
        .from("ratings")
        .select("id, rater_id, user_id, rating, year, created_at")
        .eq("rater_id", userId)
        .eq("year", seasonYear);

      if (error) {
        console.error("Error fetching user ratings:", error);
        return;
      }

      if (ratings && Array.isArray(ratings)) {
        // Transform the data to match our UserRating interface
        const transformedRatings: UserRating[] = ratings.map((rating) => ({
          id: String(rating.id),
          rater_id: String(rating.rater_id),
          user_id: String(rating.user_id),
          rating: Number(rating.rating),
          year: Number(rating.year),
          created_at: String(rating.created_at),
        }));

        setUserRatings(transformedRatings);

        // Build number assignments map by fetching user data separately
        const assignments: { [key: number]: NumberAssignment } = {};

        // Get unique user IDs from ratings
        const userIds = [...new Set(ratings.map((r) => String(r.user_id)))];

        if (userIds.length > 0) {
          const { data: usersData } = await supabase
            .from("public_user_profiles")
            .select("id, username, profile_photo")
            .in("id", userIds);

          if (usersData) {
            const userMap: Record<
              string,
              { id: string; username: string; profile_photo: string | null }
            > = usersData.reduce((acc, user) => {
              acc[String(user.id)] = user;
              return acc;
            }, {} as Record<string, { id: string; username: string; profile_photo: string | null }>);

            ratings.forEach((rating) => {
              const user = userMap[String(rating.user_id)];
              if (user) {
                assignments[Number(rating.rating)] = {
                  number: Number(rating.rating),
                  assigned_to_username: String(user.username),
                  assigned_to_photo: String(user.profile_photo || ""),
                  is_current_page: normalizeUsername(user.username) === normalizeUsername(rateUsername),
                };
              }
            });
          }
        }

        setNumberAssignments(assignments);
        setIsAllNumbersUsed(Object.keys(assignments).length >= 100);
      }
    } catch (error) {
      console.error("Error fetching ratings:", error);
    }
  };

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
            title: "Liked!",
            description: `You liked ${userData.username}`,
          });
        } else {
          console.error("Error liking:", error);
        }
      }
    } catch (error) {
      console.error("Error handling like:", error);
    }
  };

  const handleNumberClick = (num: number) => {
    if (!currentUser) {
      toast({
        title: "Login Required",
        description: "Please login to rate users.",
        variant: "destructive",
      });
      return;
    }

    if (!userData) return;

    const assignment = numberAssignments[num];

    if (assignment) {
      if (assignment.is_current_page) {
        toast({
          title: "Already Assigned",
          description: `You already gave #${num} to @${userData.username}`,
        });
        return;
      }

      // Number is assigned to someone else - offer to reassign
      setSelectedNumber(num);
      setReassignFromUser({
        username: assignment.assigned_to_username,
        photo: assignment.assigned_to_photo,
      });
      setShowReassignDialog(true);
      return;
    }

    // Number is available - confirm assignment
    setSelectedNumber(num);
    setConfirmMessage(
      `Do you want to give #${num} to @${userData.username}?`
    );
    setShowConfirmDialog(true);
  };

  const confirmRating = async () => {
    if (!currentUser || !userData || selectedNumber === null) return;

    try {
      const seasonYear = getRatingSeasonYear();

      // First, check if this number is currently assigned to someone else (reassignment case)
      const existingNumberRating = userRatings.find(
        (r) => r.rating === selectedNumber && r.year === seasonYear
      );

      // If we're reassigning from another user, delete that rating first
      if (existingNumberRating && existingNumberRating.user_id !== userData.id) {
        const { error: deleteError } = await supabase
          .from("ratings")
          .delete()
          .eq("id", existingNumberRating.id);

        if (deleteError) throw deleteError;
      }

      // Check if user already has a rating for this TARGET user this season
      const existingUserRating = userRatings.find(
        (r) => r.user_id === userData.id && r.year === seasonYear
      );

      if (existingUserRating) {
        // Update existing rating for this user
        const { error } = await supabase
          .from("ratings")
          .update({ rating: selectedNumber })
          .eq("id", existingUserRating.id);

        if (error) throw error;
      } else {
        // Insert new rating
        const { error } = await supabase.from("ratings").insert({
          rater_id: currentUser.id,
          user_id: userData.id,
          rating: selectedNumber,
          year: seasonYear,
        });

        if (error) throw error;
      }

      toast({
        title: "Rating Saved!",
        description: `You gave #${selectedNumber} to @${userData.username}`,
      });

      // Refresh ratings and standings
      await fetchUserRatings(currentUser.id);
      await fetchCurrentStanding(userData.id);

      // If we reassigned from another user, redirect to that user's page
      if (reassignFromUser) {
        toast({
          title: "Redirecting...",
          description: `Redirecting to @${reassignFromUser.username}'s page`,
        });
        setTimeout(() => {
          navigate(`/rate?rate=${reassignFromUser.username}`);
        }, 1500);
      }
    } catch (error) {
      console.error("Error saving rating:", error);
      toast({
        title: "Error",
        description: "Failed to save rating. Please try again.",
        variant: "destructive",
      });
    } finally {
      setShowConfirmDialog(false);
      setShowReassignDialog(false);
      setSelectedNumber(null);
      setReassignFromUser(null);
    }
  };

  const confirmReassignment = async () => {
    if (!reassignFromUser) return;
    setConfirmMessage(
      `This will remove #${selectedNumber} from @${reassignFromUser.username} and give it to @${userData?.username}. Continue?`
    );
    setShowReassignDialog(false);
    setShowConfirmDialog(true);
  };

  const getNumberColor = (num: number) => {
    const assignment = numberAssignments[num];
    // Available = GREEN
    if (!assignment) return "bg-green-500 hover:bg-green-600 text-white";
    // Assigned to THIS user (current page) = YELLOW
    if (assignment.is_current_page)
      return "bg-yellow-400 hover:bg-yellow-500 text-black font-bold";
    // Assigned to ANOTHER user = RED
    return "bg-red-500 hover:bg-red-600 text-white";
  };

  if (loading) {
    return <AngelLoader variant="fullscreen" />;
  }

  if (!userData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="text-center">
          <User className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-white text-2xl mb-2">User Not Found</h2>
          <p className="text-gray-300 mb-4">
            The user you're looking for doesn't exist.
          </p>
          <Button onClick={() => navigate("/rate-girls")}>
            Browse Other Girls
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
      {/* Banner - full width, events style */}
      <div className="w-full bg-black">
        {userData.banner_photo && (
          <img
            src={userData.banner_photo}
            alt={`${userData.username} banner`}
            className="w-full h-auto object-top"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.src = "/placeholder.svg";
            }}
          />
        )}
      </div>

      {/* Profile info bar - events style gradient */}
      <div className="relative bg-gradient-to-r from-blue-600 via-blue-700 to-purple-700">
        <img
          src={userData.profile_photo || "/placeholder.svg"}
          alt={userData.username}
          className="absolute left-1/2 top-0 z-10 h-44 w-44 -translate-x-1/2 -translate-y-1/2 cursor-pointer rounded-full border-4 border-background bg-background object-contain p-2 shadow-lg md:h-60 md:w-60 md:p-3"
          onClick={() =>
            userData.profile_photo && setExpandedImage(userData.profile_photo)
          }
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            target.src = "/placeholder.svg";
          }}
        />
        <div className="px-4 pb-4 pt-24 md:px-6 md:pb-5 md:pt-36">
          <div className="flex flex-col items-center gap-3">
            <div className="text-center">
              <h1 className="text-xl md:text-2xl font-bold text-white">
                @{userData.username}
              </h1>
              <p className="text-sm md:text-base text-yellow-400 font-semibold capitalize">
                {userData.user_type}
              </p>
              <p className="text-sm text-gray-200">
                {userData.city && userData.state
                  ? `${userData.city}, ${userData.state}`
                  : userData.city || userData.state || "Location not set"}
              </p>
              {userData.bio && (
                <p className="text-gray-200 mt-2 text-sm">{userData.bio}</p>
              )}
            </div>

            <Button
              variant={hasLiked ? "default" : "outline"}
              size="sm"
              onClick={handleLike}
              className="flex items-center gap-2"
            >
              <Heart
                className={`w-4 h-4 ${hasLiked ? "fill-current" : ""}`}
              />
              {likes}
            </Button>
          </div>
        </div>
      </div>

      {/* Current Standing */}
      {currentStanding && (
        <div className="px-4 md:px-6 py-4">
          <TrophyCelebration className="mb-2" />

          <div className="grid grid-cols-3 gap-4 text-center items-stretch max-w-2xl mx-auto">
            <div className="bg-purple-50 rounded-lg p-3 flex flex-col justify-center">
              <div className="text-2xl font-bold text-purple-600">
                {currentStanding.totalScore}
              </div>
              <div className="text-xs text-gray-600">
                Total
                <br />
                Score
              </div>
            </div>
            <div className="bg-yellow-50 rounded-lg p-3 flex flex-col justify-center">
              <div className="text-2xl font-bold text-yellow-600">
                #{currentStanding.rank || "—"}
              </div>
              <div className="text-xs text-gray-600">
                {(() => {
                  const rank = currentStanding.rank;
                  if (!rank) return "Current Rank";
                  if (rank === 1) return "Current Rank = $3,000";
                  if (rank === 2) return "Current Rank = $1,500";
                  if (rank === 3) return "Current Rank = $750";
                  if (rank >= 4 && rank <= 10) return "Current Rank = $200";
                  if (rank >= 11 && rank <= 20) return "Current Rank = $150";
                  return "Get to #20 for Cash Prize";
                })()}
              </div>
            </div>
            <div className="bg-blue-50 rounded-lg p-3 flex flex-col justify-center">
              <div className="text-2xl font-bold text-blue-600">
                {currentStanding.totalRatings}
              </div>
              <div className="text-xs text-gray-600">People Rated You</div>
            </div>
          </div>
        </div>
      )}


      <div className="w-full pb-8">
        {/* Content Preview */}
        {(previewPhotos.length > 0 || previewVideos.length > 0) && (
          <Card className="mb-6 rounded-none border-x-0">
            <CardContent className="py-4 sm:py-6 px-0">
              <div className="mb-4 text-center px-4">
                <h2 className="text-lg font-bold">View @{userData.username}</h2>
                <p className="text-lg font-bold">&amp;</p>
                <p className="text-lg font-bold">Rate Her Below</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {previewPhotos.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setLightbox({ type: "photo", index: photoIndex })}
                    className="relative w-full overflow-hidden rounded-lg bg-gray-100 aspect-[3/4] md:aspect-square group"
                  >
                    {previewPhotos.map((url, i) => (
                      <img
                        key={url + i}
                        src={url}
                        alt={`Photo ${i + 1} from @${userData.username}`}
                        className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-700 ${
                          i === photoIndex ? "opacity-100" : "opacity-0"
                        }`}
                      />
                    ))}
                    <span className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <span className="text-white font-extrabold tracking-wide text-sm sm:text-base bg-black/55 px-4 py-2 rounded-full animate-pulse">
                        CLICK TO EXPAND
                      </span>
                    </span>
                    <span className="absolute bottom-2 left-2 text-xs font-semibold bg-black/60 text-white px-2 py-1 rounded">
                      Photos {photoIndex + 1}/{previewPhotos.length}
                    </span>
                  </button>
                )}
                {previewVideos.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setLightbox({ type: "video", index: 0 })}
                    className="relative w-full overflow-hidden rounded-lg bg-black aspect-[3/4] md:aspect-square group"
                  >
                    <video
                      key={previewVideos[0]}
                      className="w-full h-full object-cover"
                      muted
                      playsInline
                      preload="metadata"
                      controlsList="nodownload"
                    >
                      <source src={previewVideos[0]} />
                    </video>

                    <span className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                      <span className="w-14 h-14 rounded-full bg-white/85 flex items-center justify-center text-2xl">
                        ▶
                      </span>
                      <span className="text-white font-extrabold tracking-wide text-sm sm:text-base bg-black/55 px-4 py-2 rounded-full animate-pulse">
                        CLICK PLAY
                      </span>
                    </span>
                    <span className="absolute bottom-2 left-2 text-xs font-semibold bg-black/60 text-white px-2 py-1 rounded">
                      Videos ({previewVideos.length})
                    </span>
                  </button>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Media Lightbox */}
        {lightbox && (
          <div
            className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center p-2"
            onClick={() => setLightbox(null)}
            role="dialog"
            aria-modal="true"
          >
            <button
              onClick={() => setLightbox(null)}
              aria-label="Close"
              className="absolute top-4 right-4 z-20 w-11 h-11 rounded-full bg-white/15 hover:bg-white/25 text-white text-xl"
            >
              ✕
            </button>
            {(() => {
              const items =
                lightbox.type === "video" ? previewVideos : previewPhotos;
              const url = items[lightbox.index];
              const showNav = items.length > 1;
              const go = (dir: number) =>
                setLightbox({
                  type: lightbox.type,
                  index: (lightbox.index + dir + items.length) % items.length,
                });
              return (
                <div
                  className="relative w-full max-w-[98vw] max-h-[95vh] flex items-center justify-center"
                  onClick={(e) => e.stopPropagation()}
                >
                  {showNav && (
                    <span className="absolute top-4 left-1/2 -translate-x-1/2 z-20 h-11 flex items-center text-white text-sm bg-black/60 px-3 rounded-full">
                      {lightbox.index + 1} / {items.length}
                    </span>
                  )}
                  {lightbox.type === "video" ? (
                    <video
                      key={url}
                      className="max-w-[98vw] max-h-[88vh] object-contain"
                      controls
                      autoPlay
                      muted
                      playsInline
                      controlsList="nodownload"
                    >
                      <source src={url} />
                    </video>
                  ) : (
                    <ZoomableSwipeImage
                      src={url}
                      alt="Expanded content"
                      onSwipeLeft={() => showNav && go(1)}
                      onSwipeRight={() => showNav && go(-1)}
                    />
                  )}
                  {showNav && (
                    <>
                      <button
                        onClick={() => go(-1)}
                        aria-label="Previous"
                        className="hidden md:flex absolute left-2 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/15 hover:bg-white/30 text-white items-center justify-center"
                      >
                        <ChevronLeft className="w-6 h-6" />
                      </button>
                      <button
                        onClick={() => go(1)}
                        aria-label="Next"
                        className="hidden md:flex absolute right-2 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/15 hover:bg-white/30 text-white items-center justify-center"
                      >
                        <ChevronRight className="w-6 h-6" />
                      </button>
                    </>
                  )}
                </div>
              );
            })()}

          </div>
        )}



        {/* Rating Grid */}
        <Card className="rounded-none border-x-0">
          <CardContent className="py-6 px-0">
            <div className="px-4">
              <p className="text-gray-600 text-center mb-4">
                Click a # below to assign to this Dime
              </p>
              <h2 className="text-xl font-bold mb-4 text-center">
                Rate @{userData.username}
              </h2>
              <p className="text-gray-600 text-center mb-6">
                Click 100 = Top Dime in your Eyes!
              </p>

              <div className="mb-4 flex flex-col sm:flex-row sm:flex-wrap gap-2 sm:gap-4 sm:justify-center items-center text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded bg-green-500"></div>
                  <span>Available Number</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded bg-yellow-400"></div>
                  <span>Assigned to @{userData.username}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded bg-red-500"></div>
                  <span>Assigned to another user</span>
                </div>
              </div>

              <div className="mb-6 text-center text-gray-600">
                Numbers used: {Object.keys(numberAssignments).length}/100
              </div>
            </div>

            <div className="grid grid-cols-10 gap-2 px-2 sm:px-0 md:max-w-4xl md:mx-auto">
              {Array.from({ length: 100 }, (_, i) => i + 1).map((num) => (
                <button
                  key={num}
                  onClick={() => handleNumberClick(num)}
                  className={`aspect-square rounded-lg font-semibold text-sm transition-colors ${getNumberColor(
                    num
                  )}`}
                >
                  {num}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>


        {/* Upgrade CTA (above Home) */}
        {!hasDiamond && (
          <div className="mt-8 flex justify-center max-w-2xl mx-auto">
            <Button
              onClick={() => navigate("/upgrade")}
              className="w-full sm:w-auto h-12 px-8 text-base font-semibold bg-gradient-to-r from-pink-500 via-purple-500 to-yellow-400 hover:from-pink-400 hover:via-purple-400 hover:to-yellow-300 text-white"
            >
              Upgrade for More Content
            </Button>
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="mt-4 flex flex-col sm:flex-row justify-center gap-4 max-w-2xl mx-auto">

          <Button
            variant="outline"
            onClick={() => navigate("/rate-girls")}
            className="flex-1 min-w-[160px] h-12 text-base font-semibold bg-gradient-to-r from-pink-500 via-purple-500 to-yellow-400 hover:from-pink-400 hover:via-purple-400 hover:to-yellow-300 text-white border-transparent shadow-lg animate-pulse"
          >
            Rate Another Girl
          </Button>
          <Button
            type="button"
            onClick={handleHomeClick}
            className="flex-1 min-w-[160px] h-12 text-base font-semibold bg-green-600 hover:bg-green-500 text-white border-transparent shadow-lg"
          >
            <Home className="w-5 h-5 mr-2" />
            Home
          </Button>
          <Button asChild className="relative z-10 flex-1 min-w-[160px] h-12 text-base font-semibold touch-manipulation">
            <Link to={`/profile/${encodeURIComponent(userData.username)}`}>
              View Her Full Profile
            </Link>
          </Button>
        </div>
      </div>

      {/* Confirm Dialog */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Rating</DialogTitle>
            <DialogDescription>{confirmMessage}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowConfirmDialog(false)}
            >
              Cancel
            </Button>
            <Button onClick={confirmRating}>Confirm</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reassign Dialog */}
      <Dialog open={showReassignDialog} onOpenChange={setShowReassignDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-center">Override Rating #{selectedNumber}?</DialogTitle>
          </DialogHeader>
          
          <div className="py-4">
            <p className="text-center text-muted-foreground mb-6">
              Do you want to take <span className="font-bold text-red-500">#{selectedNumber}</span> from @{reassignFromUser?.username} and give it to @{userData?.username}?
            </p>
            
            {/* Show both users side by side */}
            <div className="flex items-center justify-center gap-8">
              {/* Old user (losing the number) */}
              <div className="text-center">
                <div className="relative">
                  <img
                    src={reassignFromUser?.photo || "/placeholder.svg"}
                    alt={reassignFromUser?.username}
                    className="w-20 h-20 rounded-full object-cover border-4 border-red-500 mx-auto"
                  />
                  <div className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-8 h-8 flex items-center justify-center text-xs font-bold">
                    -{selectedNumber}
                  </div>
                </div>
                <p className="mt-2 font-semibold text-red-600">@{reassignFromUser?.username}</p>
                <p className="text-xs text-muted-foreground">Loses #{selectedNumber}</p>
              </div>

              {/* Arrow */}
              <div className="text-3xl text-muted-foreground">→</div>

              {/* New user (getting the number) */}
              <div className="text-center">
                <div className="relative">
                  <img
                    src={userData?.profile_photo || "/placeholder.svg"}
                    alt={userData?.username}
                    className="w-20 h-20 rounded-full object-cover border-4 border-yellow-400 mx-auto"
                  />
                  <div className="absolute -top-2 -right-2 bg-yellow-400 text-black rounded-full w-8 h-8 flex items-center justify-center text-xs font-bold">
                    +{selectedNumber}
                  </div>
                </div>
                <p className="mt-2 font-semibold text-yellow-600">@{userData?.username}</p>
                <p className="text-xs text-muted-foreground">Gets #{selectedNumber}</p>
              </div>
            </div>
          </div>

          <DialogFooter className="flex gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setShowReassignDialog(false)}
              className="flex-1"
            >
              Decline
            </Button>
            <Button 
              onClick={confirmReassignment}
              className="flex-1 bg-yellow-500 hover:bg-yellow-600 text-black"
            >
              Accept
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Expanded Image Dialog */}
      <Dialog
        open={!!expandedImage}
        onOpenChange={() => setExpandedImage(null)}
      >
        <DialogContent className="max-w-3xl p-2">
          {expandedImage && (
            <button
              className="relative block w-full cursor-pointer bg-transparent p-0"
              onClick={() => setExpandedImage(null)}
              aria-label="Close expanded image"
            >
              <img
                src={expandedImage}
                alt="Expanded"
                className="w-full h-auto rounded-lg"
              />
              <div className="absolute right-2 top-2 z-50 rounded-full bg-black/70 p-2 text-white hover:bg-black/90">
                <X className="h-5 w-5" />
              </div>
            </button>
          )}
          <div className="flex justify-center pt-2">
            <Button variant="secondary" onClick={() => setExpandedImage(null)}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default RatePage;
