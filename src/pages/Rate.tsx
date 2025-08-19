import React, { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
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
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import MediaGrid from "@/components/MediaGrid";
import ContentAccessControl from "@/components/ContentAccessControl";

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
}

interface UserMedia {
  id: string;
  media_url: string;
  media_type: string;
  created_at: string;
  content_tier?: string;
  is_nude?: boolean;
  is_xrated?: boolean;
  upload_date?: string;
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

interface RatingWithUser {
  id: string;
  rater_id: string;
  user_id: string;
  rating: number;
  year: number;
  created_at: string;
  users: {
    username: string;
    profile_photo: string | null;
  } | null;
}

interface DatabaseRating {
  id: unknown;
  rater_id: unknown;
  user_id: unknown;
  rating: unknown;
  year: unknown;
  created_at: unknown;
  users: {
    username: unknown;
    profile_photo: unknown;
  } | null;
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
  const refUsername = searchParams.get("ref") || "";

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
  const [userMedia, setUserMedia] = useState<UserMedia[]>([]);
  const [showPhotosDialog, setShowPhotosDialog] = useState(false);
  const [showVideosDialog, setShowVideosDialog] = useState(false);
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(0);
  const [likes, setLikes] = useState(0);
  const [hasLiked, setHasLiked] = useState(false);

  useEffect(() => {
    if (rateUsername) {
      initializeRatingSystem();
    }
  }, [rateUsername]);

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
        await fetchUserRatings(user.id);
      }
    } catch (error) {
      console.error("Error fetching current user:", error);
    }
  };

  const fetchUserData = async () => {
    try {
      const { data, error } = await supabase
        .from("users")
        .select(
          "id, username, profile_photo, banner_photo, front_page_photo, city, state, bio, user_type"
        )
        .eq("username", rateUsername)
        .in("user_type", ["stripper", "exotic"])
        .single();

      if (error) {
        console.error("Error fetching user data:", error);
        return;
      }

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
        };
        setUserData(userData);

        // Fetch current standing, media, and likes
        await Promise.all([
          fetchCurrentStanding(userData.id),
          fetchUserMedia(userData.id),
          fetchLikes(userData.id),
        ]);
      }
    } catch (error) {
      console.error("Error:", error);
    }
  };

  const fetchCurrentStanding = async (userId: string) => {
    try {
      const currentYear = new Date().getFullYear();

      // Get all ratings for this user this year
      const { data: userRatingsData, error: ratingsError } = await supabase
        .from("ratings")
        .select("rating")
        .eq("user_id", userId)
        .eq("year", currentYear);

      if (ratingsError) {
        console.error("Error fetching user ratings:", ratingsError);
        return;
      }

      // Get all users with ratings to calculate ranking
      const { data: allRatingsData, error: allRatingsError } = await supabase
        .from("ratings")
        .select("user_id, rating")
        .eq("year", currentYear);

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

  const fetchUserMedia = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("user_media")
        .select("id, media_url, media_type, created_at, content_tier, is_nude, is_xrated, upload_date")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching user media:", error);
        return;
      }

      if (data) {
        const media: UserMedia[] = data.map((item) => ({
          id: String(item.id),
          media_url: String(item.media_url),
          media_type: String(item.media_type),
          created_at: String(item.created_at),
          content_tier: item.content_tier || 'free',
          is_nude: Boolean(item.is_nude),
          is_xrated: Boolean(item.is_xrated),
          upload_date: item.upload_date ? String(item.upload_date) : undefined,
        }));
        setUserMedia(media);
      }
    } catch (error) {
      console.error("Error fetching user media:", error);
    }
  };

  const fetchLikes = async (userId: string) => {
    try {
      // Get the user's current likes count and liked_by data
      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("likes, liked_by")
        .eq("id", userId)
        .single();

      if (!userError && userData) {
        setLikes(Number(userData.likes) || 0);

        // Check if current user has already liked this profile
        if (currentUser && userData.liked_by) {
          const likedByUsers = Array.isArray(userData.liked_by)
            ? userData.liked_by
            : [userData.liked_by];
          setHasLiked(likedByUsers.includes(currentUser.id));
        }
      }
    } catch (error) {
      console.error("Error fetching likes:", error);
    }
  };

  const fetchUserRatings = async (userId: string) => {
    try {
      const currentYear = new Date().getFullYear();

      // Get all ratings made by current user this year (without join to avoid relation issues)
      const { data: ratings, error } = await supabase
        .from("ratings")
        .select("id, rater_id, user_id, rating, year, created_at")
        .eq("rater_id", userId)
        .eq("year", currentYear);

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
            .from("users")
            .select("id, username, profile_photo")
            .in("id", userIds);

          if (usersData) {
            const userMap: Record<
              string,
              { id: string; username: string; profile_photo: string | null }
            > = usersData.reduce((acc, user) => {
              acc[String(user.id)] = user;
              return acc;
            }, {});

            ratings.forEach((rating) => {
              const user = userMap[String(rating.user_id)];
              if (user) {
                assignments[Number(rating.rating)] = {
                  number: Number(rating.rating),
                  assigned_to_username: String(user.username),
                  assigned_to_photo: String(user.profile_photo || ""),
                  is_current_page: String(user.username) === rateUsername,
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
      // First, get current state to ensure we have latest data
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
        // Unlike - remove like
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
        // Like - add like
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

  const handleNumberClick = async (number: number) => {
    if (!userData || !currentUser) return;

    // Check if user has used all numbers
    if (isAllNumbersUsed && !numberAssignments[number]) {
      toast({
        title: "All Numbers Used",
        description:
          "YOU HAVE USED ALL THE NUMBERS, CLICK HERE TO SEE THE RANKING OF ALL THE STRIPPERS AND EXOTICS",
        variant: "destructive",
      });
      return;
    }

    const existingAssignment = numberAssignments[number];

    if (!existingAssignment) {
      // Number is available, show confirmation for selection
      if (number === 100) {
        setConfirmMessage(
          `Confirm you want to give ${userData.username} number ${number}.`
        );
      } else {
        setConfirmMessage(
          `Confirm you want to give ${userData.username} number ${number}.`
        );
      }
      setSelectedNumber(number);
      setShowConfirmDialog(true);
    } else if (existingAssignment.is_current_page) {
      // Number already assigned to current page user
      toast({
        title: "Already Assigned",
        description: `You have already given number ${number} to ${userData.username}.`,
      });
    } else {
      // Number assigned to different user, show reassignment dialog
      setReassignFromUser({
        username: existingAssignment.assigned_to_username,
        photo: existingAssignment.assigned_to_photo,
      });
      setSelectedNumber(number);
      setShowReassignDialog(true);
    }
  };

  const confirmRating = async () => {
    if (!selectedNumber || !userData || !currentUser) return;

    try {
      const currentYear = new Date().getFullYear();

      // Check if this number is already assigned to another user
      const existingAssignment = numberAssignments[selectedNumber];
      if (existingAssignment && !existingAssignment.is_current_page) {
        // Delete the old rating for this number
        await supabase
          .from("ratings")
          .delete()
          .eq("rater_id", currentUser.id)
          .eq("rating", selectedNumber)
          .eq("year", currentYear);
      }

      // Check if current user already rated this performer with a different number
      const existingRatingForUser = userRatings.find(
        (r) => r.user_id === userData.id
      );
      if (existingRatingForUser) {
        // Delete the existing rating for this performer
        await supabase
          .from("ratings")
          .delete()
          .eq("rater_id", currentUser.id)
          .eq("user_id", userData.id)
          .eq("year", currentYear);
      }

      // Insert new rating
      const { error } = await supabase.from("ratings").insert({
        rater_id: currentUser.id,
        user_id: userData.id,
        rating: selectedNumber,
        year: currentYear,
      });

      if (error) {
        console.error("Error saving rating:", error);
        toast({
          title: "Error",
          description: "Failed to save rating. Please try again.",
          variant: "destructive",
        });
        return;
      }

      // Update local state - remove old assignment for this user if exists
      const newAssignments = { ...numberAssignments };

      // Remove any existing assignment for this user (from previous rating)
      Object.keys(newAssignments).forEach((key) => {
        const assignment = newAssignments[Number(key)];
        if (
          assignment.assigned_to_username === userData.username &&
          assignment.is_current_page
        ) {
          delete newAssignments[Number(key)];
        }
      });

      // Add new assignment
      newAssignments[selectedNumber] = {
        number: selectedNumber,
        assigned_to_username: userData.username,
        assigned_to_photo: userData.profile_photo || "",
        is_current_page: true,
      };
      setNumberAssignments(newAssignments);

      // Update user ratings - remove old rating for this user and add new one
      const newRating: UserRating = {
        id: "",
        rater_id: currentUser.id,
        user_id: userData.id,
        rating: selectedNumber,
        year: currentYear,
        created_at: new Date().toISOString(),
      };
      setUserRatings((prev) => [
        ...prev.filter((r) => r.user_id !== userData.id), // Remove old rating for this user
        newRating,
      ]);

      toast({
        title: "Rating Saved",
        description: `You have given ${userData.username} number ${selectedNumber}!`,
      });

      setShowConfirmDialog(false);
      setSelectedNumber(null);

      // If this was a reassignment, redirect back to the previous user's page
      if (existingAssignment && !existingAssignment.is_current_page) {
        setTimeout(() => {
          navigate(
            `/rate/?rate=${existingAssignment.assigned_to_username}&ref=${refUsername}`
          );
        }, 2000);
      }
    } catch (error) {
      console.error("Error confirming rating:", error);
      toast({
        title: "Error",
        description: "Failed to save rating. Please try again.",
        variant: "destructive",
      });
    }
  };

  const confirmReassignment = async () => {
    setShowReassignDialog(false);
    setShowConfirmDialog(true);
    setConfirmMessage(
      `This number is for ${reassignFromUser?.username}! Do you want to give this number to ${userData?.username}?`
    );
  };

  const getNumberColor = (number: number) => {
    const assignment = numberAssignments[number];
    if (!assignment) {
      return "bg-gray-700 text-white hover:bg-gray-600"; // Available
    } else if (assignment.is_current_page) {
      return "bg-yellow-400 text-black"; // Current page
    } else {
      return "bg-red-500 text-white"; // Used on other page
    }
  };

  const getPhotos = () => {
    const photos = [
      userData?.profile_photo,
      userData?.banner_photo,
      userData?.front_page_photo,
    ].filter(Boolean) as string[];

    const uploadedPhotos = userMedia
      .filter((item) => item.media_type === "photo")
      .map((item) => item.media_url);

    return [...photos, ...uploadedPhotos];
  };

  const getVideos = () => {
    return userMedia
      .filter((item) => item.media_type === "video")
      .map((item) => item.media_url);
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
              onClick={() => (window.location.href = "/rate-girls")}
              className="mt-4 bg-red-500 hover:bg-red-600"
            >
              Back to Rate Girls
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Check if user has access to rating system
  if (
    isAllNumbersUsed &&
    Object.values(numberAssignments).every((a) => !a.is_current_page)
  ) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <Card className="bg-yellow-900/20 border-yellow-500 max-w-md">
          <CardContent className="p-8 text-center">
            <Lock className="w-16 h-16 text-yellow-400 mx-auto mb-4" />
            <h2 className="text-yellow-400 font-bold text-xl mb-4">
              YOU HAVE USED ALL THE NUMBERS
            </h2>
            <p className="text-yellow-300 mb-6">
              CLICK HERE TO SEE THE RANKING OF ALL THE STRIPPERS AND EXOTICS
            </p>
            <Button
              onClick={() => navigate("/rankings")}
              className="bg-yellow-500 hover:bg-yellow-600 text-black font-bold"
            >
              <Trophy className="w-4 h-4 mr-2" />
              View Rankings
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const numbers = Array.from({ length: 100 }, (_, i) => i + 1);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Banner Photo */}
        {userData.banner_photo && (
          <div className="relative w-full h-48 md:h-64 rounded-lg overflow-hidden mb-6">
            <img
              src={userData.banner_photo}
              alt={`${userData.username} banner`}
              className="w-full h-full object-cover"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.style.display = "none";
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>
          </div>
        )}

        <div className="text-center mb-8">
          {/* Current Standing */}
          {currentStanding && currentStanding.rank > 0 && (
            <div className="mb-6">
              <Card className="bg-gradient-to-r from-yellow-900/30 to-orange-900/30 border-yellow-500/50 inline-block">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <Trophy className="w-8 h-8 text-violet-600" />
                    <div className="text-left">
                      <div className="text-2xl font-bold text-violet-600">
                        Ranked #{currentStanding.rank}
                      </div>
                      <div className="text-sm text-gray-900">
                        {currentStanding.totalScore} points •{" "}
                        {currentStanding.totalRatings} ratings
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Profile Photos - All 3 photos */}
          <div className="flex justify-center gap-4 mb-6">
            {userData.profile_photo && (
              <img
                src={userData.profile_photo}
                alt={`${userData.username} profile`}
                className="w-24 h-24 md:w-32 md:h-32 rounded-lg object-cover border-4 border-yellow-400 shadow-2xl cursor-pointer hover:scale-105 transition-transform"
                onClick={() => {
                  setSelectedPhotoIndex(0);
                  setShowPhotosDialog(true);
                }}
              />
            )}
            {userData.banner_photo && (
              <img
                src={userData.banner_photo}
                alt={`${userData.username} banner`}
                className="w-24 h-24 md:w-32 md:h-32 rounded-lg object-cover border-4 border-blue-400 shadow-2xl cursor-pointer hover:scale-105 transition-transform"
                onClick={() => {
                  setSelectedPhotoIndex(1);
                  setShowPhotosDialog(true);
                }}
              />
            )}
            {userData.front_page_photo && (
              <img
                src={userData.front_page_photo}
                alt={`${userData.username} front page`}
                className="w-24 h-24 md:w-32 md:h-32 rounded-lg object-cover border-4 border-green-400 shadow-2xl cursor-pointer hover:scale-105 transition-transform"
                onClick={() => {
                  setSelectedPhotoIndex(2);
                  setShowPhotosDialog(true);
                }}
              />
            )}
          </div>

          <h1 className="text-3xl md:text-4xl font-bold text-yellow-400 mb-2">
            Rate @{userData.username}
          </h1>
          <div className="flex items-center justify-center gap-4 text-gray-300 mb-4">
            <div className="flex items-center gap-1">
              <User size={16} />
              <span className="capitalize">{userData.user_type}</span>
            </div>
            {userData.city && userData.state && (
              <div className="flex items-center gap-1">
                <MapPin size={16} />
                <span>
                  {userData.city}, {userData.state}
                </span>
              </div>
            )}
          </div>
          {userData.bio && (
            <p className="text-gray-300 mb-6 max-w-2xl mx-auto">
              {userData.bio}
            </p>
          )}

          {/* Profile Like Button */}
          <div className="flex justify-center mb-8">
            <Button
              onClick={handleLike}
              variant={hasLiked ? "default" : "outline"}
              className={`flex items-center gap-2 ${
                hasLiked
                  ? "bg-red-600 hover:bg-red-700 text-white"
                  : "border-red-500 text-red-400 hover:bg-red-600 hover:text-white"
              }`}
            >
              <Heart className={`w-4 h-4 ${hasLiked ? "fill-current" : ""}`} />
              {hasLiked ? "Liked" : "Like"} ({likes})
            </Button>
          </div>

          {/* User Media Grid with Likes and Comments */}
          {userMedia.length > 0 && (
            <div className="mb-8">
              <h3 className="text-2xl font-bold text-white mb-4 text-center">
                Photos & Videos
              </h3>
              <div className="bg-white/10 backdrop-blur rounded-2xl p-6 border border-white/20">
                <MediaGrid
                  media={userMedia}
                  onDelete={() => {}} // Read-only for Rate page
                  showContentTier={true}
                  currentUserId={currentUser?.id}
                  showLikesAndComments={true}
                />
              </div>
            </div>
          )}
        </div>

        {/* Rating Grid */}
        <div className="mb-8">
          <h3 className="text-2xl font-bold text-yellow-400 mb-6 text-center">
            Select a Number (1-100)
          </h3>

          {/* Legend */}
          <div className="flex flex-wrap justify-center gap-4 mb-6 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-gray-700 rounded"></div>
              <span>Available</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-yellow-400 rounded"></div>
              <span>Selected for {userData.username}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-red-500 rounded"></div>
              <span>Used for other performer</span>
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur rounded-2xl p-4 sm:p-6 border border-white/20">
            <div className="grid grid-cols-10 gap-1 sm:gap-2 max-w-4xl mx-auto justify-items-center">
              {numbers.map((number) => {
                const colorClass = getNumberColor(number);
                const assignment = numberAssignments[number];

                return (
                  <button
                    key={number}
                    onClick={() => handleNumberClick(number)}
                    className={`
                      w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 rounded-lg font-bold text-xs sm:text-sm transition-all duration-200 
                      ${colorClass}
                      ${
                        assignment?.is_current_page ? "scale-110 shadow-lg" : ""
                      }
                      hover:scale-105
                    `}
                    title={
                      assignment
                        ? `Assigned to ${assignment.assigned_to_username}`
                        : "Available"
                    }
                  >
                    {number}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Progress indicator */}
        <div className="text-center mb-8">
          <div className="bg-white/10 backdrop-blur rounded-lg p-4 max-w-md mx-auto">
            <p className="text-gray-300 mb-2">
              Numbers Used: {Object.keys(numberAssignments).length}/100
            </p>
            <div className="w-full bg-gray-700 rounded-full h-2">
              <div
                className="bg-yellow-400 h-2 rounded-full transition-all duration-300"
                style={{
                  width: `${
                    (Object.keys(numberAssignments).length / 100) * 100
                  }%`,
                }}
              ></div>
            </div>
          </div>
        </div>

        <div className="text-center">
          <Button
            className="bg-gradient-to-r from-yellow-400 to-yellow-500 text-black hover:from-yellow-500 hover:to-yellow-600 px-8 py-4 text-lg font-semibold rounded-xl shadow-lg transform hover:scale-105 transition-all duration-200"
            onClick={() => navigate(`/rate-girls/?ref=${refUsername}`)}
          >
            Rate Another Performer
          </Button>
        </div>
      </div>

      {/* Confirmation Dialog */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent className="bg-gray-800 border-yellow-500">
          <DialogHeader>
            <DialogTitle className="text-yellow-400">
              Confirm Rating
            </DialogTitle>
            <DialogDescription className="text-white">
              {confirmMessage}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button
              onClick={() => setShowConfirmDialog(false)}
              variant="outline"
              className="border-gray-500 text-gray-300 hover:bg-gray-700"
            >
              No
            </Button>
            <Button
              onClick={confirmRating}
              className="bg-yellow-500 text-black hover:bg-yellow-600"
            >
              Yes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reassignment Dialog */}
      <Dialog open={showReassignDialog} onOpenChange={setShowReassignDialog}>
        <DialogContent className="bg-gray-800 border-red-500">
          <DialogHeader>
            <DialogTitle className="text-red-400">
              Number Already Used
            </DialogTitle>
            <DialogDescription className="text-white">
              <div className="flex items-center gap-4 mt-4">
                {reassignFromUser?.photo && (
                  <img
                    src={reassignFromUser.photo}
                    alt={reassignFromUser.username}
                    className="w-16 h-16 rounded-full object-cover border-2 border-red-400"
                  />
                )}
                <div>
                  <p>
                    This number is for{" "}
                    <strong>{reassignFromUser?.username}</strong>!
                  </p>
                  <p>
                    Do you want to give this number to{" "}
                    <strong>{userData?.username}</strong>?
                  </p>
                </div>
              </div>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button
              onClick={() => setShowReassignDialog(false)}
              variant="outline"
              className="border-gray-500 text-gray-300 hover:bg-gray-700"
            >
              No
            </Button>
            <Button
              onClick={confirmReassignment}
              className="bg-red-500 text-white hover:bg-red-600"
            >
              Yes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Photos Modal */}
      <Dialog open={showPhotosDialog} onOpenChange={setShowPhotosDialog}>
        <DialogContent className="bg-gray-800 border-blue-500 max-w-7xl max-h-[95vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle className="text-blue-400 flex items-center gap-2">
              <Eye className="w-5 h-5" />
              Photos - @{userData?.username} ({selectedPhotoIndex + 1} of{" "}
              {getPhotos().length})
            </DialogTitle>
            <button
              onClick={() => setShowPhotosDialog(false)}
              className="absolute right-4 top-4 text-gray-400 hover:text-white z-10"
            >
              <X className="w-6 h-6" />
            </button>
          </DialogHeader>

          {getPhotos().length > 0 ? (
            <div className="relative h-[85vh] flex items-center justify-center">
              {/* Main large image display */}
              <div className="relative w-full h-full flex items-center justify-center">
                <img
                  src={getPhotos()[selectedPhotoIndex]}
                  alt={`Photo ${selectedPhotoIndex + 1}`}
                  className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
                />

                {/* Navigation arrows */}
                {getPhotos().length > 1 && (
                  <>
                    <button
                      onClick={() =>
                        setSelectedPhotoIndex((prev) =>
                          prev === 0 ? getPhotos().length - 1 : prev - 1
                        )
                      }
                      className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-3 rounded-full transition-all duration-200"
                    >
                      <ChevronLeft className="w-6 h-6" />
                    </button>
                    <button
                      onClick={() =>
                        setSelectedPhotoIndex((prev) =>
                          prev === getPhotos().length - 1 ? 0 : prev + 1
                        )
                      }
                      className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-3 rounded-full transition-all duration-200"
                    >
                      <ChevronRight className="w-6 h-6" />
                    </button>
                  </>
                )}
              </div>

              {/* Thumbnail strip at bottom */}
              {getPhotos().length > 1 && (
                <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black/70 rounded-lg p-2">
                  <div className="flex gap-2 max-w-md overflow-x-auto">
                    {getPhotos().map((photo, index) => (
                      <img
                        key={index}
                        src={photo}
                        alt={`Thumbnail ${index + 1}`}
                        className={`w-16 h-16 object-cover rounded cursor-pointer transition-all duration-200 ${
                          index === selectedPhotoIndex
                            ? "ring-2 ring-blue-400 opacity-100"
                            : "opacity-60 hover:opacity-80"
                        }`}
                        onClick={() => setSelectedPhotoIndex(index)}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-400 h-64 flex items-center justify-center">
              No photos available
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Videos Modal */}
      <Dialog open={showVideosDialog} onOpenChange={setShowVideosDialog}>
        <DialogContent className="bg-gray-800 border-purple-500 max-w-4xl max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle className="text-purple-400 flex items-center gap-2">
              <Play className="w-5 h-5" />
              Videos - @{userData?.username}
            </DialogTitle>
            <button
              onClick={() => setShowVideosDialog(false)}
              className="absolute right-4 top-4 text-gray-400 hover:text-white"
            >
              <X className="w-6 h-6" />
            </button>
          </DialogHeader>
          <div className="overflow-y-auto max-h-[70vh]">
            {getVideos().length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4">
                {getVideos().map((video, index) => (
                  <video
                    key={index}
                    src={video}
                    className="w-full h-48 object-cover rounded-lg"
                    controls
                    preload="metadata"
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-400">
                No videos available
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default RatePage;
