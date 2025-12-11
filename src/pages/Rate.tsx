import React, { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { normalizeRefParam } from "@/lib/utils";
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

        // Fetch current standing and likes only (no media on Rate page)
        await Promise.all([
          fetchCurrentStanding(userData.id),
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
            }, {} as Record<string, { id: string; username: string; profile_photo: string | null }>);

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
            liked_by: null, 
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
            liked_by: currentUser.id,
          })
          .eq("id", userData.id);

        if (!error) {
          setHasLiked(true);
          setLikes(currentLikes + 1);
          toast({
            title: "Liked!",
            description: `You liked ${userData.username}`,
          });
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
      const currentYear = new Date().getFullYear();

      // Check if user already has a rating for this user this year
      const existingRating = userRatings.find(
        (r) => r.user_id === userData.id && r.year === currentYear
      );

      if (existingRating) {
        // Update existing rating
        const { error } = await supabase
          .from("ratings")
          .update({ rating: selectedNumber })
          .eq("id", existingRating.id);

        if (error) throw error;
      } else {
        // Insert new rating
        const { error } = await supabase.from("ratings").insert({
          rater_id: currentUser.id,
          user_id: userData.id,
          rating: selectedNumber,
          year: currentYear,
        });

        if (error) throw error;
      }

      toast({
        title: "Rating Saved!",
        description: `You gave #${selectedNumber} to @${userData.username}`,
      });

      // Update local state
      const newAssignment: NumberAssignment = {
        number: selectedNumber,
        assigned_to_username: userData.username,
        assigned_to_photo: userData.profile_photo,
        is_current_page: true,
      };

      setNumberAssignments((prev) => ({
        ...prev,
        [selectedNumber]: newAssignment,
      }));

      // Refresh ratings
      await fetchUserRatings(currentUser.id);
      await fetchCurrentStanding(userData.id);
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
    if (!assignment) return "bg-gray-100 hover:bg-gray-200 text-gray-800";
    if (assignment.is_current_page)
      return "bg-green-500 hover:bg-green-600 text-white";
    return "bg-blue-100 hover:bg-blue-200 text-blue-800";
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
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
                  <span>
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
              <div className="mt-6 grid grid-cols-3 gap-4 text-center">
                <div className="bg-yellow-50 rounded-lg p-3">
                  <Trophy className="w-6 h-6 text-yellow-500 mx-auto mb-1" />
                  <div className="text-2xl font-bold text-yellow-600">
                    #{currentStanding.rank || "—"}
                  </div>
                  <div className="text-xs text-gray-600">Current Rank</div>
                </div>
                <div className="bg-purple-50 rounded-lg p-3">
                  <div className="text-2xl font-bold text-purple-600">
                    {currentStanding.totalScore}
                  </div>
                  <div className="text-xs text-gray-600">Total Score</div>
                </div>
                <div className="bg-blue-50 rounded-lg p-3">
                  <div className="text-2xl font-bold text-blue-600">
                    {currentStanding.totalRatings}
                  </div>
                  <div className="text-xs text-gray-600">Total Ratings</div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

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
                <div className="w-4 h-4 rounded bg-gray-100 border"></div>
                <span>Available</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-green-500"></div>
                <span>Assigned to this user</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-blue-100 border border-blue-200"></div>
                <span>Assigned to another user</span>
              </div>
            </div>

            <div className="mt-4 text-center text-gray-600">
              Numbers used: {Object.keys(numberAssignments).length}/100
            </div>
          </CardContent>
        </Card>

        {/* Navigation Buttons */}
        <div className="mt-8 flex justify-center gap-4">
          <Button variant="outline" onClick={() => navigate("/rate-girls")}>
            Rate Another Girl
          </Button>
          <Button onClick={() => navigate(`/profile/${userData.username}`)}>
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reassign Number?</DialogTitle>
            <DialogDescription>
              #{selectedNumber} is currently assigned to @
              {reassignFromUser?.username}. Do you want to reassign it to @
              {userData?.username}?
            </DialogDescription>
          </DialogHeader>
          {reassignFromUser?.photo && (
            <div className="flex justify-center">
              <img
                src={reassignFromUser.photo}
                alt={reassignFromUser.username}
                className="w-16 h-16 rounded-full object-cover"
              />
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowReassignDialog(false)}
            >
              Cancel
            </Button>
            <Button onClick={confirmReassignment}>Reassign</Button>
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
