import React, { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
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
        setPreviewPhotos(fallbackPhotos);
        setPreviewVideos(fallbackVideos);
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

      setPreviewPhotos(photos.length > 0 ? photos : fallbackPhotos);
      setPreviewVideos(videos.length > 0 ? videos : fallbackVideos);
    } catch (e) {
      console.error("Free media error:", e);
      setPreviewPhotos(fallbackPhotos);
      setPreviewVideos(fallbackVideos);
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
      <div className="container mx-auto px-4 py-8">
        {/* User Profile Card */}
        <Card className="mb-8 overflow-hidden">
          <div className="relative h-48 sm:h-64 bg-gradient-to-r from-purple-600 to-blue-600">
            {userData.banner_photo && (
              <img
                src={userData.banner_photo}
                alt="Banner"
                className="w-full h-full object-cover"
              />
            )}
            <div className="absolute inset-0 bg-black bg-opacity-30" />
          </div>

          <CardContent className="relative -mt-16 pb-6">
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <div
                className="w-32 h-32 rounded-full border-4 border-white overflow-hidden bg-white cursor-pointer"
                onClick={() =>
                  userData.profile_photo &&
                  setExpandedImage(userData.profile_photo)
                }
              >
                <img
                  src={userData.profile_photo || "/placeholder.svg"}
                  alt={userData.username}
                  className="w-full h-full object-cover"
                />
              </div>

              <div className="text-center sm:text-left flex-1">
                <h1 className="text-2xl font-bold">@{userData.username}</h1>
                <div className="flex items-center justify-center sm:justify-start gap-2 text-gray-600 mt-1">
                  <MapPin className="w-4 h-4" />
                  <span className="capitalize">
                    {userData.city && userData.state
                      ? `${userData.city}, ${userData.state}`
                      : userData.city || userData.state || "Location not set"}
                  </span>
                </div>
                {userData.bio && (
                  <p className="text-gray-600 mt-2">{userData.bio}</p>
                )}
              </div>

              <div className="flex flex-col items-center gap-2">
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

            {/* Current Standing */}
            {currentStanding && (
              <div className="mt-6">
                <div className="flex justify-center mb-2">
                  <Trophy className="w-8 h-8 text-yellow-500 animate-[trophy-rotate-in_1s_ease-out]" />
                </div>
                <div className="grid grid-cols-3 gap-4 text-center items-stretch">
                  <div className="bg-purple-50 rounded-lg p-3 flex flex-col justify-center">
                    <div className="text-2xl font-bold text-purple-600">
                      {currentStanding.totalScore}
                    </div>
                    <div className="text-xs text-gray-600">Total Score</div>
                  </div>
                  <div className="bg-yellow-50 rounded-lg p-3 flex flex-col justify-center">
                    <div className="text-2xl font-bold text-yellow-600">
                      #{currentStanding.rank || "—"}
                    </div>
                    <div className="text-xs text-gray-600">Current Rank</div>
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

          </CardContent>
        </Card>

        {/* Content Preview */}
        {(previewPhotos.length > 0 || previewVideos.length > 0) && (
          <Card className="mb-6">
            <CardContent className="p-4 sm:p-6">
              <h2 className="text-lg font-bold mb-4 text-center">
                Content Preview
              </h2>
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
                      src={previewVideos[0]}
                      className="w-full h-full object-cover"
                      muted
                      playsInline
                      preload="metadata"
                      controlsList="nodownload"
                    />
                    <span className="absolute inset-0 flex items-center justify-center">
                      <span className="w-14 h-14 rounded-full bg-white/85 flex items-center justify-center text-2xl">
                        ▶
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
              className="absolute top-4 right-4 z-10 w-11 h-11 rounded-full bg-white/15 hover:bg-white/25 text-white text-xl"
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
                  className="relative max-w-[98vw] max-h-[95vh] flex items-center justify-center"
                  onClick={(e) => e.stopPropagation()}
                >
                  {lightbox.type === "video" ? (
                    <video
                      key={url}
                      src={url}
                      className="max-w-[98vw] max-h-[95vh] object-contain"
                      controls
                      autoPlay
                      playsInline
                      controlsList="nodownload"
                    />
                  ) : (
                    <img
                      src={url}
                      alt="Expanded content"
                      className="max-w-[98vw] max-h-[95vh] object-contain"
                    />
                  )}
                  {showNav && (
                    <>
                      <button
                        onClick={() => go(-1)}
                        aria-label="Previous"
                        className="absolute left-2 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/15 hover:bg-white/30 text-white flex items-center justify-center"
                      >
                        <ChevronLeft className="w-6 h-6" />
                      </button>
                      <button
                        onClick={() => go(1)}
                        aria-label="Next"
                        className="absolute right-2 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/15 hover:bg-white/30 text-white flex items-center justify-center"
                      >
                        <ChevronRight className="w-6 h-6" />
                      </button>
                      <span className="absolute bottom-3 left-1/2 -translate-x-1/2 text-white text-sm bg-black/60 px-3 py-1 rounded-full">
                        {lightbox.index + 1} / {items.length}
                      </span>
                    </>
                  )}
                </div>
              );
            })()}

          </div>
        )}


        {/* Rating Grid */}
        <Card>
          <CardContent className="p-6">
            <h2 className="text-xl font-bold mb-4 text-center">
              Rate @{userData.username}
            </h2>
            <p className="text-gray-600 text-center mb-6">
              Click a number to assign it to this user. Higher numbers = better
              rating!
            </p>

            <div className="grid grid-cols-10 gap-2">
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

            <div className="mt-6 flex flex-wrap gap-4 justify-center text-sm">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-green-500"></div>
                <span>Available</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-yellow-400"></div>
                <span>Assigned to this user</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-red-500"></div>
                <span>Assigned to another user</span>
              </div>
            </div>

            <div className="mt-4 text-center text-gray-600">
              Numbers used: {Object.keys(numberAssignments).length}/100
            </div>
          </CardContent>
        </Card>

        {/* Navigation Buttons */}
        <div className="mt-8 flex flex-col sm:flex-row justify-center gap-4 max-w-2xl mx-auto">
          <Button
            variant="outline"
            onClick={() => navigate("/rate-girls")}
            className="flex-1 min-w-[160px] h-12 text-base font-semibold bg-gradient-to-r from-pink-500 via-purple-500 to-yellow-400 hover:from-pink-400 hover:via-purple-400 hover:to-yellow-300 text-white border-transparent shadow-lg animate-pulse"
          >
            Rate Another Girl
          </Button>
          <Button
            onClick={() => navigate("/")}
            className="flex-1 min-w-[160px] h-12 text-base font-semibold bg-green-600 hover:bg-green-500 text-white border-transparent shadow-lg"
          >
            <Home className="w-5 h-5 mr-2" />
            Home
          </Button>
          <Button
            onClick={() => navigate(`/profile/${userData.username}`)}
            className="flex-1 min-w-[160px] h-12 text-base font-semibold"
          >
            View Full Profile
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
        <DialogContent className="max-w-3xl">
          {expandedImage && (
            <img
              src={expandedImage}
              alt="Expanded"
              className="w-full h-auto rounded-lg"
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default RatePage;
