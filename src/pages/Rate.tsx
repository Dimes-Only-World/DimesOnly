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
import { MapPin, User, Trophy, Lock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface UserData {
  id: string;
  username: string;
  profile_photo: string;
  city: string;
  state: string;
  bio?: string;
  user_type: string;
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
        .select("id, username, profile_photo, city, state, bio, user_type")
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
          city: String(data.city || ""),
          state: String(data.state || ""),
          bio: data.bio ? String(data.bio) : undefined,
          user_type: String(data.user_type),
        };
        setUserData(userData);
      }
    } catch (error) {
      console.error("Error:", error);
    }
  };

  const fetchUserRatings = async (userId: string) => {
    try {
      const currentYear = new Date().getFullYear();

      // Get all ratings made by current user this year
      const { data: ratings, error } = await supabase
        .from("ratings")
        .select(
          `
          id,
          rater_id,
          user_id,
          rating,
          year,
          created_at,
          users!ratings_user_id_fkey (username, profile_photo)
        `
        )
        .eq("rater_id", userId)
        .eq("year", currentYear);

      if (error) {
        console.error("Error fetching user ratings:", error);
        return;
      }

      if (ratings && Array.isArray(ratings)) {
        // Transform the data to match our UserRating interface
        const transformedRatings: UserRating[] = ratings.map(
          (rating: DatabaseRating) => ({
            id: String(rating.id),
            rater_id: String(rating.rater_id),
            user_id: String(rating.user_id),
            rating: Number(rating.rating),
            year: Number(rating.year),
            created_at: String(rating.created_at),
          })
        );

        setUserRatings(transformedRatings);

        // Build number assignments map
        const assignments: { [key: number]: NumberAssignment } = {};
        ratings.forEach((rating: DatabaseRating) => {
          if (rating.users) {
            assignments[Number(rating.rating)] = {
              number: Number(rating.rating),
              assigned_to_username: String(rating.users.username),
              assigned_to_photo: String(rating.users.profile_photo || ""),
              is_current_page: String(rating.users.username) === rateUsername,
            };
          }
        });

        setNumberAssignments(assignments);
        setIsAllNumbersUsed(Object.keys(assignments).length >= 100);
      }
    } catch (error) {
      console.error("Error fetching ratings:", error);
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
        <div className="text-center mb-8">
          <img
            src={userData.profile_photo || "/placeholder.svg"}
            alt={userData.username}
            className="w-48 h-48 md:w-72 md:h-72 rounded-lg object-cover mx-auto mb-4 border-4 border-yellow-400 shadow-2xl"
          />
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

          <div className="bg-white/10 backdrop-blur rounded-2xl p-6 border border-white/20">
            <div className="grid grid-cols-10 gap-2 max-w-4xl mx-auto">
              {numbers.map((number) => {
                const colorClass = getNumberColor(number);
                const assignment = numberAssignments[number];

                return (
                  <button
                    key={number}
                    onClick={() => handleNumberClick(number)}
                    className={`
                      w-12 h-12 rounded-lg font-bold text-sm transition-all duration-200 
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
    </div>
  );
};

export default RatePage;
