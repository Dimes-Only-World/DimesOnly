import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import { useAppContext } from "@/contexts/AppContext";
import AuthGuard from "@/components/AuthGuard";
import { Search, MapPin, User } from "lucide-react";

interface Performer {
  id: string;
  username: string;
  profile_photo: string;
  city: string;
  state: string;
  user_type: "stripper" | "exotic";
}

const EventsDimes: React.FC = () => {
  const { user, loading: userLoading } = useAppContext();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const [performers, setPerformers] = useState<Performer[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    username: "",
    city: "",
    state: "",
  });
  const [currentPage, setCurrentPage] = useState(1);
  const performersPerPage = 30;

  // Get ref parameter from URL
  const refParam = searchParams.get("ref") || user?.username || "";

  // Check access control - only males and normal females (not strippers/exotics)
  const canViewPage =
    !userLoading &&
    user &&
    (user.gender === "male" ||
      user.userType === "normal" ||
      user.userType === "female");

  console.log("EventsDimes access control check:", {
    userLoading,
    user: user
      ? {
          id: user.id,
          username: user.username,
          userType: user.userType,
          gender: user.gender,
        }
      : null,
    canViewPage,
    refParam,
  });

  useEffect(() => {
    if (canViewPage) {
      fetchPerformers();
    }
  }, [canViewPage]);

  const fetchPerformers = async () => {
    try {
      const { data, error } = await supabase
        .from("users")
        .select("id, username, profile_photo, city, state, user_type")
        .in("user_type", ["stripper", "exotic"])
        .order("username");

      if (error) throw error;
      setPerformers((data as Performer[]) || []);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch performers",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredPerformers = performers.filter((performer) => {
    return (
      (filters.username === "" ||
        performer.username
          .toLowerCase()
          .includes(filters.username.toLowerCase())) &&
      (filters.city === "" ||
        performer.city?.toLowerCase().includes(filters.city.toLowerCase())) &&
      (filters.state === "" ||
        performer.state?.toLowerCase().includes(filters.state.toLowerCase()))
    );
  });

  const paginatedPerformers = filteredPerformers.slice(
    (currentPage - 1) * performersPerPage,
    currentPage * performersPerPage
  );

  const handleLetsGo = (performerUsername: string) => {
    // Navigate to events page with performer's username and ref parameter
    navigate(`/events?events=${performerUsername}&ref=${refParam}`);
  };

  // Show loading state while user data is being fetched
  if (userLoading) {
    return (
      <AuthGuard>
        <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center px-4">
          <Card className="bg-white/10 backdrop-blur border-white/20 w-full max-w-md">
            <CardContent className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-4"></div>
              <p className="text-white">Loading user data...</p>
            </CardContent>
          </Card>
        </div>
      </AuthGuard>
    );
  }

  if (!canViewPage) {
    return (
      <AuthGuard>
        <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center px-4">
          <Card className="bg-white/10 backdrop-blur border-white/20 w-full max-w-md">
            <CardContent className="p-8 text-center">
              <h2 className="text-2xl font-bold text-red-400 mb-4">
                Access Restricted
              </h2>
              <p className="text-white">
                This page is only available to Male and Female users.
              </p>

              {/* Debug information - remove in production */}
              {process.env.NODE_ENV === "development" && (
                <div className="mt-4 p-4 bg-black/20 rounded text-left text-xs">
                  <p className="text-yellow-300 font-bold mb-2">Debug Info:</p>
                  <p className="text-gray-300">
                    User Loading: {userLoading ? "Yes" : "No"}
                  </p>
                  <p className="text-gray-300">User ID: {user?.id || "None"}</p>
                  <p className="text-gray-300">
                    Username: {user?.username || "None"}
                  </p>
                  <p className="text-gray-300">
                    User Type: {user?.userType || "None"}
                  </p>
                  <p className="text-gray-300">
                    Gender: {user?.gender || "None"}
                  </p>
                  <p className="text-gray-300">
                    Can View Page: {canViewPage ? "Yes" : "No"}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 text-white">
        {/* Mobile-first full width design */}
        <div className="w-full px-4 py-6 md:px-8">
          <div className="text-center mb-6">
            <h1 className="text-3xl md:text-4xl font-bold text-yellow-400 mb-4">
              Choose Your Event Partner
            </h1>
            <p className="text-gray-300 text-sm md:text-base">
              Select a stripper or exotic dancer to attend events with
            </p>
            {refParam && (
              <p className="text-yellow-300 text-sm mt-2">
                Referred by: @{refParam}
              </p>
            )}
          </div>

          {/* Filters - Mobile optimized */}
          <Card className="bg-white/10 backdrop-blur border-white/20 mb-6">
            <CardContent className="p-4 md:p-6">
              <h2 className="text-lg md:text-xl font-bold text-yellow-400 mb-4 flex items-center gap-2">
                <Search className="h-5 w-5" />
                Filter Performers
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
                <div className="relative">
                  <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search by username"
                    value={filters.username}
                    onChange={(e) =>
                      setFilters((prev) => ({
                        ...prev,
                        username: e.target.value,
                      }))
                    }
                    className="pl-10 bg-white/10 border-white/20 text-white placeholder-gray-400"
                  />
                </div>
                <div className="relative">
                  <MapPin className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search by city"
                    value={filters.city}
                    onChange={(e) =>
                      setFilters((prev) => ({ ...prev, city: e.target.value }))
                    }
                    className="pl-10 bg-white/10 border-white/20 text-white placeholder-gray-400"
                  />
                </div>
                <Input
                  placeholder="Search by state"
                  value={filters.state}
                  onChange={(e) =>
                    setFilters((prev) => ({ ...prev, state: e.target.value }))
                  }
                  className="bg-white/10 border-white/20 text-white placeholder-gray-400"
                />
              </div>
            </CardContent>
          </Card>

          {/* Loading State */}
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-400 mx-auto mb-4"></div>
              <p className="text-gray-400 text-lg">Loading performers...</p>
            </div>
          ) : filteredPerformers.length === 0 ? (
            <div className="text-center py-12">
              <Card className="bg-white/10 backdrop-blur border-white/20 max-w-md mx-auto">
                <CardContent className="p-8">
                  <h3 className="text-xl font-bold text-yellow-400 mb-4">
                    No Performers Found
                  </h3>
                  <p className="text-gray-300">
                    No performers match your search criteria.
                  </p>
                </CardContent>
              </Card>
            </div>
          ) : (
            <>
              {/* Performers Grid - Mobile optimized */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6 mb-8">
                {paginatedPerformers.map((performer) => (
                  <Card
                    key={performer.id}
                    className="bg-white/10 backdrop-blur border-white/20 hover:bg-white/20 transition-all duration-300 group"
                  >
                    <CardContent className="p-4">
                      <div className="text-center">
                        <div className="relative mb-4">
                          <img
                            src={performer.profile_photo || "/placeholder.svg"}
                            alt={performer.username}
                            className="w-20 h-20 md:w-24 md:h-24 rounded-full object-cover mx-auto border-3 border-yellow-400 group-hover:border-yellow-300 transition-colors"
                          />
                          <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2">
                            <span
                              className={`px-2 py-1 text-xs rounded-full text-white ${
                                performer.user_type === "stripper"
                                  ? "bg-pink-500"
                                  : "bg-purple-500"
                              }`}
                            >
                              {performer.user_type}
                            </span>
                          </div>
                        </div>

                        <h3 className="text-lg md:text-xl font-bold text-yellow-400 mb-2">
                          @{performer.username}
                        </h3>

                        {(performer.city || performer.state) && (
                          <div className="flex items-center justify-center gap-1 text-gray-300 mb-4 text-sm">
                            <MapPin className="h-3 w-3" />
                            <span>
                              {performer.city && performer.state
                                ? `${performer.city}, ${performer.state}`
                                : performer.city || performer.state}
                            </span>
                          </div>
                        )}

                        <Button
                          onClick={() => handleLetsGo(performer.username)}
                          className="w-full bg-gradient-to-r from-yellow-400 to-yellow-600 hover:from-yellow-500 hover:to-yellow-700 text-black font-bold py-2 px-4 rounded-lg transition-all duration-300 transform hover:scale-105"
                        >
                          LET'S GO!
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Pagination - Mobile optimized */}
              {Math.ceil(filteredPerformers.length / performersPerPage) > 1 && (
                <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mt-8">
                  <p className="text-gray-300 text-sm text-center">
                    Showing {(currentPage - 1) * performersPerPage + 1} to{" "}
                    {Math.min(
                      currentPage * performersPerPage,
                      filteredPerformers.length
                    )}{" "}
                    of {filteredPerformers.length} performers
                  </p>

                  <div className="flex gap-2">
                    <Button
                      onClick={() =>
                        setCurrentPage(Math.max(1, currentPage - 1))
                      }
                      disabled={currentPage === 1}
                      variant="outline"
                      className="border-white/20 text-white hover:bg-white/10"
                    >
                      Previous
                    </Button>
                    <Button
                      onClick={() =>
                        setCurrentPage(
                          Math.min(
                            Math.ceil(
                              filteredPerformers.length / performersPerPage
                            ),
                            currentPage + 1
                          )
                        )
                      }
                      disabled={
                        currentPage ===
                        Math.ceil(filteredPerformers.length / performersPerPage)
                      }
                      variant="outline"
                      className="border-white/20 text-white hover:bg-white/10"
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </AuthGuard>
  );
};

export default EventsDimes;
