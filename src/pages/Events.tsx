import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import { useMobileLayout } from "@/hooks/use-mobile";
import {
  Calendar,
  MapPin,
  Clock,
  Check,
  X,
  Users,
  Eye,
  Play,
  Image as ImageIcon,
} from "lucide-react";

interface Event {
  id: string;
  name: string;
  date: string;
  start_time: string;
  end_time: string;
  address: string;
  city: string;
  state: string;
  photo_url: string;
  genre: string;
  price: number;
  max_attendees: number;
  current_attendees: number;
  free_spots_strippers: number;
  free_spots_exotics: number;
  is_attending: boolean;
  description?: string;
  video_urls?: string[];
  additional_photos?: string[];
}

interface UserProfile {
  username: string;
  profile_photo: string;
  banner_photo: string;
  city: string;
  state: string;
  user_type: string;
  banner_video?: string;
}

const Events: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { getContainerClasses, getContentClasses, getCardClasses } =
    useMobileLayout();
  const username = searchParams.get("events") || "";

  const [events, setEvents] = useState<Event[]>([]);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    location: "",
    date: "",
  });
  const [attendanceFilter, setAttendanceFilter] = useState<"all" | "going" | "not_going">("all");

  useEffect(() => {
    if (username) {
      fetchUserProfile();
      fetchEvents();
    }
  }, [username]);

  // Cleanup function to cancel ongoing requests
  useEffect(() => {
    return () => {
      setLoading(false);
    };
  }, []);

  const fetchUserProfile = useCallback(async () => {
    try {
      const { data: profileData, error } = await supabase
        .from("users")
        .select("id, username, profile_photo, banner_photo, city, state, user_type")
        .eq("username", username)
        .single();

      if (error) throw error;

      // Get the latest silver video from user_media (videos are stored in private-media; use a signed URL)
      let bannerVideo: string | undefined;
      if (profileData?.id) {
        const { data: videoRows } = await supabase
          .from("user_media")
          .select("media_url, storage_path")
          .eq("user_id", profileData.id)
          .eq("media_type", "video")
          .eq("content_tier", "silver")
          .order("created_at", { ascending: false })
          .limit(1);

        const videoRow = (videoRows || [])[0] as
          | { media_url?: string | null; storage_path?: string | null }
          | undefined;

        bannerVideo = videoRow?.media_url || undefined;

        // Prefer signed URL from storage path (works for private buckets)
        let storagePath = videoRow?.storage_path || undefined;
        if (!storagePath && bannerVideo?.includes("/private-media/")) {
          storagePath = bannerVideo.split("/private-media/")[1];
        }

        if (storagePath) {
          const { data: signed } = await supabase.storage
            .from("private-media")
            .createSignedUrl(storagePath, 60 * 60);

          // Handle both signedUrl and signedURL property names
          const signedUrl = (signed as any)?.signedUrl || (signed as any)?.signedURL;
          if (signedUrl) {
            // Convert relative URL to absolute if needed
            if (signedUrl.startsWith("/object/sign/")) {
              bannerVideo = `https://qkcuykpndrolrewwnkwb.supabase.co/storage/v1${signedUrl}`;
            } else {
              bannerVideo = signedUrl;
            }
          }
        }
      }
      setUserProfile({
        username: profileData.username,
        profile_photo: profileData.profile_photo,
        banner_photo: profileData.banner_photo,
        city: profileData.city,
        state: profileData.state,
        user_type: profileData.user_type,
        banner_video: bannerVideo,
      });
    } catch (error) {
      console.error("Error fetching user profile:", error);
    }
  }, [username]);

  const fetchEvents = useCallback(async () => {
    try {
      // Get ALL events in the system
      const { data: allEvents, error: eventsError } = await supabase
        .from("events")
        .select("*")
        .gte("date", new Date().toISOString().split("T")[0])
        .order("date");

      if (eventsError) throw eventsError;

      // Get user's event attendance to mark which ones they're attending
      const { data: userEvents, error: userEventsError } = await supabase
        .from("user_events")
        .select("event_id")
        .eq("username", username);

      if (userEventsError) throw userEventsError;

      const attendingEventIds = userEvents?.map((ue) => ue.event_id) || [];

      // Get attendee counts for each event and mark attendance
      const eventsWithAttendance = await Promise.all(
        (allEvents || []).map(async (event) => {
          const { count } = await supabase
            .from("user_events")
            .select("*", { count: "exact", head: true })
            .eq("event_id", event.id);

          return {
            ...event,
            current_attendees: count || 0,
            is_attending: attendingEventIds.includes(event.id),
          };
        })
      );

      setEvents(eventsWithAttendance as Event[]);
    } catch (error) {
      console.error("Error fetching events:", error);
      toast({
        title: "Error",
        description: "Failed to fetch events",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [username, toast]);

  const handleViewDetails = useCallback(
    (event: Event) => {
      if (!event?.id) return;
      navigate(`/event-details?id=${event.id}`);
    },
    [navigate]
  );

  // Memoized filtered events with proper null checks
  const filteredEvents = useMemo(() => {
    return events.filter((event) => {
      const matchesLocation =
        !filters.location ||
        (event.city &&
          event.city.toLowerCase().includes(filters.location.toLowerCase())) ||
        (event.state &&
          event.state.toLowerCase().includes(filters.location.toLowerCase())) ||
        (event.address &&
          event.address
            .toLowerCase()
            .includes(filters.location.toLowerCase())) ||
        (event.name &&
          event.name.toLowerCase().includes(filters.location.toLowerCase()));
      const matchesDate = !filters.date || event.date.includes(filters.date);
      const matchesAttendance =
        attendanceFilter === "all" ||
        (attendanceFilter === "going" && event.is_attending) ||
        (attendanceFilter === "not_going" && !event.is_attending);
      return matchesLocation && matchesDate && matchesAttendance;
    });
  }, [events, filters, attendanceFilter]);

  const getAvailableSpots = useCallback((event: Event | null) => {
    if (!event) return 0;
    return Math.max(0, event.max_attendees - event.current_attendees);
  }, []);

  const getFreeSpots = useCallback((event: Event | null) => {
    if (!event) return 0;
    return (event.free_spots_strippers || 0) + (event.free_spots_exotics || 0);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 text-white">
      {/* Mobile-first full width design */}
      <div className={getContainerClasses()}>
        {/* User Profile Header with Banner */}
        {userProfile && (
          <div className="relative mb-6">
            {/* Banner - Video or Photo */}
            <div className="h-48 md:h-64 relative overflow-hidden">
              {userProfile.banner_video ? (
                <video
                  autoPlay
                  muted
                  loop
                  playsInline
                  poster={userProfile.banner_photo || "/placeholder.svg"}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    // Fallback to banner photo if video fails
                    const video = e.currentTarget;
                    video.style.display = "none";
                    const fallbackImg = document.createElement("img");
                    fallbackImg.src = userProfile.banner_photo || "/placeholder.svg";
                    fallbackImg.alt = `${userProfile.username} banner`;
                    fallbackImg.className = "w-full h-full object-cover";
                    video.parentElement?.appendChild(fallbackImg);
                  }}
                >
                  <source src={userProfile.banner_video} type="video/mp4" />
                </video>
              ) : (
                <img
                  src={userProfile.banner_photo || "/placeholder.svg"}
                  alt={`${userProfile.username} banner`}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.src = "/placeholder.svg";
                  }}
                />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>
            </div>

            {/* Profile Info Overlay */}
            <div className="absolute bottom-0 left-0 right-0 p-4 md:p-6">
              <div className="flex flex-col md:flex-row items-center md:items-end gap-4">
                <div className="relative">
                  <img
                    src={userProfile.profile_photo || "/placeholder.svg"}
                    alt={userProfile.username}
                    className="w-24 h-24 md:w-32 md:h-32 rounded-full object-cover border-4 border-yellow-400 bg-white/10"
                  />
                  <div className="absolute -bottom-3 left-1/2 transform -translate-x-1/2 z-10">
                    <span
                      className={`px-2 py-1 text-xs font-bold rounded-full text-white shadow-lg ${
                        userProfile.user_type === "stripper"
                          ? "bg-pink-500"
                          : userProfile.user_type === "exotic"
                          ? "bg-purple-500"
                          : "bg-blue-500"
                      }`}
                    >
                      {userProfile.user_type}
                    </span>
                  </div>
                </div>

                <div className="text-center md:text-left flex-1">
                  <h1 className="text-3xl md:text-4xl font-bold text-yellow-400 mb-2">
                    @{userProfile.username}
                  </h1>
                  <div className="flex flex-col md:flex-row items-center gap-2 text-gray-300 mb-2">
                    <div className="flex items-center gap-1">
                      <MapPin className="h-4 w-4" />
                      <span>
                        {userProfile.city}, {userProfile.state}
                      </span>
                    </div>
                  </div>

                  {/* User Profile Info Display */}
                  <div className="flex items-center justify-center md:justify-start gap-3 mt-4 p-3 bg-white/10 backdrop-blur rounded-lg border border-white/20">
                    <img
                      src={userProfile.profile_photo || "/placeholder.svg"}
                      alt={userProfile.username}
                      className="w-12 h-12 rounded-full object-cover border-2 border-yellow-400"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.src = "/placeholder.svg";
                      }}
                    />
                    <div className="text-center md:text-left">
                      <p className="font-semibold text-white text-sm">
                        @{userProfile.username}
                      </p>
                      <p className="text-xs text-gray-300">
                        {userProfile.user_type} • {userProfile.city},{" "}
                        {userProfile.state}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className={getContentClasses()}>
          <div className="text-center mb-6">
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-2">
              {username ? `Upcoming Events` : "Events"}
            </h2>
            <p className="text-gray-300 text-sm md:text-base">
              All upcoming events - purchase tickets from any event page
            </p>
            {userProfile && (
              <div className="mt-2">
                <Badge className="bg-yellow-400/20 text-yellow-400 border-yellow-400/50">
                  Events attending:{" "}
                  {events.filter((event) => event.is_attending).length}
                </Badge>
              </div>
            )}
          </div>

          {/* Attendance Filter Tabs */}
          <div className="flex justify-center gap-2 mb-4">
            <Button
              onClick={() => setAttendanceFilter("all")}
              className={`px-4 py-2 font-semibold ${
                attendanceFilter === "all"
                  ? "bg-yellow-400 text-black"
                  : "bg-white/10 text-white hover:bg-white/20"
              }`}
            >
              All Events
            </Button>
            <Button
              onClick={() => setAttendanceFilter("going")}
              className={`px-4 py-2 font-semibold ${
                attendanceFilter === "going"
                  ? "bg-green-500 text-white"
                  : "bg-white/10 text-white hover:bg-white/20"
              }`}
            >
              Going
            </Button>
            <Button
              onClick={() => setAttendanceFilter("not_going")}
              className={`px-4 py-2 font-semibold ${
                attendanceFilter === "not_going"
                  ? "bg-red-500 text-white"
                  : "bg-white/10 text-white hover:bg-white/20"
              }`}
            >
              Not Going
            </Button>
          </div>

          {/* Filters - Mobile optimized */}
          <Card
            className={`bg-white/10 backdrop-blur border-white/20 mb-6 ${getCardClasses()}`}
          >
            <CardContent className={getContentClasses()}>
              <h3 className="text-lg md:text-xl font-bold text-yellow-400 mb-4">
                Filter Events
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                <div className="relative">
                  <MapPin className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Filter by event name or location"
                    value={filters.location}
                    onChange={(e) =>
                      setFilters((prev) => ({
                        ...prev,
                        location: e.target.value,
                      }))
                    }
                    className="pl-10 bg-white/10 border-white/20 text-white placeholder-gray-400"
                  />
                </div>
                <div className="relative">
                  <Calendar className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    type="date"
                    value={filters.date}
                    onChange={(e) =>
                      setFilters((prev) => ({ ...prev, date: e.target.value }))
                    }
                    className="pl-10 bg-white/10 border-white/20 text-white"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Events Grid */}
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-400 mx-auto mb-4"></div>
              <p className="text-gray-400 text-lg">Loading events...</p>
            </div>
          ) : filteredEvents.length === 0 ? (
            <div className="text-center py-12">
              <Card
                className={`bg-white/10 backdrop-blur border-white/20 max-w-md mx-auto ${getCardClasses()}`}
              >
                <CardContent className={getContentClasses()}>
                  <h3 className="text-xl font-bold text-yellow-400 mb-4">
                    No Events Available
                  </h3>
                  <p className="text-gray-300 mb-4">
                    {filters.location || filters.date
                      ? "No events match your filters."
                      : "No upcoming events found."}
                  </p>
                  <p className="text-gray-400 text-sm">
                    {filters.location || filters.date
                      ? "Try adjusting your filters"
                      : "CHECK BACK TOMORROW"}
                  </p>
                </CardContent>
              </Card>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-6">
              {filteredEvents.map((event) => (
                <Card
                  key={event.id}
                  className={`bg-white/10 backdrop-blur border-white/20 hover:bg-white/20 transition-all duration-300 overflow-hidden ${getCardClasses()}`}
                >
                  <div className="relative">
                    <img
                      src={event.photo_url || "/placeholder.svg"}
                      alt={event.name}
                      className="w-full h-32 md:h-40 object-cover"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.src = "/placeholder.svg";
                      }}
                    />

                    {/* Attendance Status Badge */}
                    <div className="absolute top-3 right-3">
                      {event.is_attending ? (
                        <div className="bg-green-500 text-white px-3 py-1 rounded-lg text-sm font-bold shadow-lg">
                          Going
                        </div>
                      ) : (
                        <div className="bg-red-500 text-white px-3 py-1 rounded-lg text-sm font-bold shadow-lg">
                          Not Going
                        </div>
                      )}
                    </div>

                    {/* Event Status Badge */}
                    <div className="absolute top-3 left-3">
                      {getAvailableSpots(event) === 0 ? (
                        <Badge className="bg-red-600 text-white font-bold">
                          SOLD OUT
                        </Badge>
                      ) : getFreeSpots(event) > 0 ? (
                        <Badge className="bg-green-600 text-white font-bold">
                          Free Spots: {getFreeSpots(event)}
                        </Badge>
                      ) : (
                        <Badge className="bg-yellow-600 text-white font-bold">
                          PAID ONLY
                        </Badge>
                      )}
                    </div>

                    {/* Media Indicators */}
                    <div className="absolute bottom-3 left-3 flex gap-2">
                      {event.video_urls && event.video_urls.length > 0 && (
                        <div className="bg-black/60 text-white px-2 py-1 rounded-full text-xs flex items-center gap-1">
                          <Play className="h-3 w-3" />
                          {event.video_urls.length}
                        </div>
                      )}
                      {event.additional_photos &&
                        event.additional_photos.length > 0 && (
                          <div className="bg-black/60 text-white px-2 py-1 rounded-full text-xs flex items-center gap-1">
                            <ImageIcon className="h-3 w-3" />
                            {event.additional_photos.length}
                          </div>
                        )}
                    </div>
                  </div>

                  <CardContent className={getContentClasses()}>
                    <div className="flex items-start justify-between mb-3">
                      <h3 className="text-lg font-bold text-yellow-400 line-clamp-2">
                        {event.name}
                      </h3>
                      <div className="text-right text-sm text-gray-300 ml-2">
                        <div className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          <span>
                            {event.current_attendees}/{event.max_attendees}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2 text-sm text-gray-300 mb-4">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-yellow-400" />
                        <span>{new Date(event.date).toLocaleDateString()}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-yellow-400" />
                        <span>
                          {event.start_time} - {event.end_time}
                        </span>
                      </div>
                      <div className="flex items-start gap-2">
                        <MapPin className="h-4 w-4 text-yellow-400 mt-0.5" />
                        <span className="line-clamp-2">
                          {event.address}, {event.city}, {event.state}
                        </span>
                      </div>
                      {event.price > 0 && (
                        <div className="flex items-center gap-2">
                          <span className="text-yellow-400 font-bold">
                            ${event.price}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2">
                      <Button
                        onClick={() => handleViewDetails(event)}
                        variant="outline"
                        size="sm"
                        className="flex-1 border-yellow-400/50 text-yellow-400 hover:bg-yellow-400/10 hover:text-yellow-400 bg-transparent"
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        Details
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Events;
