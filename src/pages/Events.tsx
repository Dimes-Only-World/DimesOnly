import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import { useAppContext } from "@/contexts/AppContext";
import { useMobileLayout, useIsMobile } from "@/hooks/use-mobile";
import { formatTimeRange, formatDateForDisplay } from "@/lib/timeUtils";
import { resolveFreeAllocation, getFreeBadgeLabel } from "@/lib/eventTickets";
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

interface EventRegistration {
  user_id: string;
  ticket_quantity: number;
  guest_name: string | null;
  user_type: string;
  payment_status: string;
  gender?: string;
}

interface Event {
  id: string;
  name: string;
  date: string;
  date_tba?: boolean;
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
  free_normal: number;
  free_spots_males: number;
  free_spots_females: number;
  is_attending: boolean;
  description?: string;
  video_urls?: string[];
  additional_photos?: string[];
  registrations?: EventRegistration[];
}

interface UserProfile {
  id: string;
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
  const { user: appUser } = useAppContext();
  const { getContainerClasses, getContentClasses, getCardClasses } =
    useMobileLayout();
  const isMobile = useIsMobile();
  const username = searchParams.get("events") || "";

  const [events, setEvents] = useState<Event[]>([]);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [latestFreeVideo, setLatestFreeVideo] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    location: "",
    date: "",
  });
  const [attendanceFilter, setAttendanceFilter] = useState<"all" | "going" | "not_going">("all");

  useEffect(() => {
    if (username) {
      fetchUserProfile();
    } else {
      setLoading(false);
    }
  }, [username]);

  // Fetch events when userProfile is loaded (so we know the performer's ID)
  useEffect(() => {
    if (userProfile?.id) {
      fetchEvents();
    }
  }, [userProfile?.id]);

  // Fetch latest free video for THIS specific user (not global)
  useEffect(() => {
    const fetchLatestFreeVideo = async () => {
      if (!userProfile?.id) {
        setLatestFreeVideo(null);
        return;
      }

      try {
        // Get latest free tier video for THIS specific user
        const { data: videoData, error } = await supabase
          .from("user_media")
          .select(`
            media_url,
            storage_path,
            user_id
          `)
          .eq("user_id", userProfile.id)
          .eq("content_tier", "free")
          .eq("media_type", "video")
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (error || !videoData) {
          setLatestFreeVideo(null);
          return;
        }

        let videoUrl = videoData.media_url;
        
        // Get signed URL for private storage
        let storagePath = videoData.storage_path;
        if (!storagePath && videoUrl?.includes("/private-media/")) {
          storagePath = videoUrl.split("/private-media/")[1];
        }

        if (storagePath) {
          const { data: signed } = await supabase.storage
            .from("private-media")
            .createSignedUrl(storagePath, 60 * 60);

          const signedUrl = (signed as any)?.signedUrl || (signed as any)?.signedURL;
          if (signedUrl) {
            if (signedUrl.startsWith("/object/sign/")) {
              videoUrl = `https://qkcuykpndrolrewwnkwb.supabase.co/storage/v1${signedUrl}`;
            } else {
              videoUrl = signedUrl;
            }
          }
        }

        setLatestFreeVideo(videoUrl);
      } catch (error) {
        console.error("Error fetching latest free video:", error);
        setLatestFreeVideo(null);
      }
    };

    fetchLatestFreeVideo();
  }, [userProfile?.id]);

  // Cleanup function to cancel ongoing requests
  useEffect(() => {
    return () => {
      setLoading(false);
    };
  }, []);

  const fetchUserProfile = useCallback(async () => {
    try {
      const { data: profileData, error } = await supabase
        .from("public_user_profiles")
        .select("id, username, profile_photo, banner_photo, city, state, user_type")
        .ilike("username", username)
        .maybeSingle();

      if (error) throw error;

      if (!profileData) {
        setUserProfile(null);
        setLoading(false);
        return;
      }

      setUserProfile({
        id: profileData.id,
        username: profileData.username,
        profile_photo: profileData.profile_photo,
        banner_photo: profileData.banner_photo,
        city: profileData.city,
        state: profileData.state,
        user_type: profileData.user_type,
      });
    } catch (error) {
      console.error("Error fetching user profile:", error);
      setUserProfile(null);
      setLoading(false);
    }
  }, [username]);

  const fetchEvents = useCallback(async () => {
    if (!userProfile?.id) return;
    
    try {
      // Get ALL events in the system
      const { data: allEvents, error: eventsError } = await supabase
        .from("events")
        .select("*")
        .gte("date", new Date().toISOString().split("T")[0])
        .order("date");

      if (eventsError) throw eventsError;

      // Get PERFORMER's event attendance to mark which events they're attending
      // This is the key fix: we query the performer's (userProfile) attendance, not the viewer's
      let performerAttendingEventIds: string[] = [];
      const { data: performerEvents, error: performerEventsError } = await supabase
        .from("user_events")
        .select("event_id")
        .eq("user_id", userProfile.id);

      if (!performerEventsError && performerEvents) {
        performerAttendingEventIds = performerEvents.map((ue) => ue.event_id);
      }

      // Get attendee counts for each event and mark attendance
      const eventsWithAttendance = await Promise.all(
        (allEvents || []).map(async (event) => {
          // Get registrations with user info for accurate attendee count and free spot calculation
          const { data: registrations } = await supabase
            .from("user_events")
            .select(`
              user_id,
              ticket_quantity,
              guest_name,
              payment_status,
              users!inner(user_type, gender)
            `)
            .eq("event_id", event.id);

          // Authoritative aggregate count (RLS-safe RPC), includes guests
          const { data: countsData } = await supabase.rpc("event_attendance_counts", {
            p_event_id: event.id,
          });
          const localTotal = (registrations || []).reduce(
            (sum: number, r: any) => sum + (r.ticket_quantity || 1),
            0
          );
          const totalAttendees = Math.max(
            Number((countsData as any)?.total_attendees || 0),
            localTotal
          );


          // Transform registrations to include user_type and payment_status at top level
          const transformedRegistrations = (registrations || []).map((r: any) => ({
            user_id: r.user_id,
            ticket_quantity: r.ticket_quantity || 1,
            guest_name: r.guest_name,
            user_type: r.users?.user_type || 'normal',
            payment_status: r.payment_status || 'paid',
            gender: r.users?.gender || 'unknown'
          }));

          return {
            ...event,
            current_attendees: totalAttendees,
            is_attending: performerAttendingEventIds.includes(event.id),
            registrations: transformedRegistrations,
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
  }, [userProfile?.id, toast]);

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
      const matchesDate = !filters.date || (event.date_tba ? false : event.date.includes(filters.date));
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

  // Tally used free spots per bucket from registrations
  const getUsedFreeSpots = useCallback((event: Event | null) => {
    const regs = (event?.registrations || []) as any[];
    const free = regs.filter((r) => !r.is_paid && !r.amount_paid);
    const cat = (r: any) => {
      const t = String(r.user_type || "").toLowerCase();
      if (t === "stripper") return "stripper";
      if (t === "exotic") return "exotic";
      return String(r.gender || "").toLowerCase() === "female" ? "female" : "male";
    };
    const strippers = free.filter((r) => cat(r) === "stripper").length;
    const exotics = free.filter((r) => cat(r) === "exotic").length;
    const females = free.filter((r) => cat(r) === "female").length;
    const males = free.filter((r) => cat(r) === "male").length;
    return {
      strippers,
      exotics,
      females,
      males,
      dimes: strippers + exotics,
      normals: males + females,
      plus: free.length,
    };
  }, []);


  // Calculate remaining free spots for Normal Male and Female
  // Uses event.free_normal from database (default 0 if not set)
  const getRemainingNormalFreeMales = useCallback((event: Event | null) => {
    if (!event) return 0;
    const total = event.free_spots_males || 0;
    if (total === 0) return 0;
    const usedMales = (event.registrations || [])
      .filter(r => {
        const userType = (r.user_type || '').toLowerCase();
        return userType === 'male' || userType === 'normal' || userType === '';
      })
      .filter(r => (r.gender || '').toLowerCase() === 'male' || (r.user_type || '').toLowerCase() === 'male')
      .length;
    return Math.max(0, total - usedMales);
  }, []);

  const getRemainingNormalFreeFemales = useCallback((event: Event | null) => {
    if (!event) return 0;
    const total = event.free_spots_females || 0;
    if (total === 0) return 0;
    const usedFemales = (event.registrations || [])
      .filter(r => {
        const userType = (r.user_type || '').toLowerCase();
        return userType === 'female';
      })
      .length;
    return Math.max(0, total - usedFemales);
  }, []);

  // Calculate remaining free spots for Exotic Dancers
  const getRemainingExoticFree = useCallback((event: Event | null) => {
    if (!event) return 0;
    const total = event.free_spots_exotics || 0;
    if (total === 0) return 0;
    const usedExotic = (event.registrations || [])
      .filter(r => (r.user_type || '').toLowerCase() === 'exotic')
      .length;
    return Math.max(0, total - usedExotic);
  }, []);

  // Calculate remaining free spots for Strippers
  const getRemainingStripperFree = useCallback((event: Event | null) => {
    if (!event) return 0;
    const total = event.free_spots_strippers || 0;
    if (total === 0) return 0;
    const usedStripper = (event.registrations || [])
      .filter(r => (r.user_type || '').toLowerCase() === 'stripper')
      .length;
    return Math.max(0, total - usedStripper);
  }, []);

  // Check if there are any free spots remaining
  const hasAnyFreeSpots = useCallback((event: Event | null) => {
    if (!event) return false;
    return getRemainingNormalFreeMales(event) > 0 || getRemainingNormalFreeFemales(event) > 0 || getRemainingExoticFree(event) > 0 || getRemainingStripperFree(event) > 0;
  }, [getRemainingNormalFreeMales, getRemainingNormalFreeFemales, getRemainingExoticFree, getRemainingStripperFree]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 text-white overflow-x-hidden">
      {/* Mobile-first full width design */}
      <div className={getContainerClasses("w-full")}>
        {/* User Profile Header with Banner */}
        {userProfile && (
          <div className="relative mb-6">
            {/* Banner - Video or Photo - Full width, larger height, object-cover for stretch */}
            <div className="w-full bg-black">
              {latestFreeVideo ? (
                <video
                  autoPlay
                  muted
                  loop
                  playsInline
                  poster={userProfile.banner_photo || "/placeholder.svg"}
                  className="w-full h-auto"
                  onError={(e) => {
                    const video = e.currentTarget;
                    video.style.display = "none";
                    const fallbackImg = document.createElement("img");
                    fallbackImg.src = userProfile.banner_photo || "/placeholder.svg";
                    fallbackImg.alt = `${userProfile.username} banner`;
                    fallbackImg.className = "w-full h-auto";
                    video.parentElement?.appendChild(fallbackImg);
                  }}
                >
                  <source src={latestFreeVideo} type="video/mp4" />
                </video>
              ) : (
                <img
                  src={userProfile.banner_photo || "/placeholder.svg"}
                  alt={`${userProfile.username} banner`}
                  className="w-full h-auto object-top"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.src = "/placeholder.svg";
                  }}
                />
              )}
            </div>

            {/* Bottom bar with profile photo and info - responsive layout */}
            <div className="bg-gradient-to-r from-blue-600 via-blue-700 to-purple-700">
              <div className="px-4 md:px-6 py-4 md:py-5">
                {isMobile ? (
                  /* Mobile: Stacked layout - Profile row, then Upcoming Events below */
                  <div className="space-y-3">
                    {/* Profile row */}
                    <div className="flex items-center gap-3">
                      <img
                        src={userProfile.profile_photo || "/placeholder.svg"}
                        alt={userProfile.username}
                        className="w-14 h-14 rounded-md object-cover border-2 border-yellow-400 bg-white/10"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.src = "/placeholder.svg";
                        }}
                      />
                      <div className="text-left flex-1">
                        <h1 className="text-lg font-bold text-white">
                          @{userProfile.username}
                        </h1>
                        <p className="text-sm text-yellow-400 font-semibold capitalize">
                          {userProfile.user_type}
                        </p>
                        <p className="text-xs text-gray-200">
                          {userProfile.city}, {userProfile.state}
                        </p>
                      </div>
                    </div>
                    {/* Upcoming Events title below profile */}
                    <div className="text-center pt-2 border-t border-white/20">
                      <h2 className="text-xl font-bold text-white">
                        Upcoming Events
                      </h2>
                      <p className="text-xs text-gray-200 mt-1">
                        All upcoming events - purchase tickets from any event page
                      </p>
                    </div>
                  </div>
                ) : (
                  /* Desktop: Side by side layout */
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      <img
                        src={userProfile.profile_photo || "/placeholder.svg"}
                        alt={userProfile.username}
                        className="w-20 h-20 md:w-24 md:h-24 rounded-md object-cover border-2 border-yellow-400 bg-white/10"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.src = "/placeholder.svg";
                        }}
                      />
                    </div>
                    <div className="text-left flex-1">
                      <h1 className="text-xl md:text-2xl font-bold text-white">
                        @{userProfile.username}
                      </h1>
                      <p className="text-sm md:text-base text-yellow-400 font-semibold capitalize">
                        {userProfile.user_type}
                      </p>
                      <p className="text-sm text-gray-200">
                        {userProfile.city}, {userProfile.state}
                      </p>
                    </div>
                    {/* Title on right of profile info */}
                    <div className="text-right">
                      <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-white">
                        Upcoming Events
                      </h2>
                      <p className="text-sm md:text-base text-gray-200 mt-1">
                        All upcoming events - purchase tickets from any event page
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        <div className={getContentClasses("px-4")}>
          {/* Events attending badge */}
          <div className="flex justify-center mb-4">
            {userProfile && (
              <Badge className="bg-yellow-400/20 text-yellow-400 border-yellow-400/50">
                Events attending:{" "}
                {events.filter((event) => event.is_attending).length}
              </Badge>
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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2 sm:gap-3 lg:gap-4 w-full">
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

                    {/* Sold out overlay */}
                    {getAvailableSpots(event) === 0 && (
                      <div className="absolute top-3 left-3">
                        <Badge className="bg-red-600 text-white font-bold">SOLD OUT</Badge>
                      </div>
                    )}


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
                    {/* Free spots + attendance status (below banner, above title) */}
                    <div className="flex flex-wrap items-center gap-2 mb-3">
                      {getAvailableSpots(event) === 0 ? (
                        <Badge className="bg-red-600 text-white font-bold">SOLD OUT</Badge>
                      ) : (() => {
                        const used = getUsedFreeSpots(event);
                        const alloc = resolveFreeAllocation(
                          event as any,
                          { ...(appUser as any), user_type: (appUser as any)?.userType, gender: (appUser as any)?.gender },
                          used,
                        );
                        if (alloc.remaining > 0) {
                          return (
                            <Badge className="bg-green-600 text-white font-bold text-xs">
                              {getFreeBadgeLabel(alloc)}
                            </Badge>
                          );
                        }
                        const configured = listConfiguredFreeAllocations(event as any, used);
                        if (configured.length > 0) {
                          return configured.map((b) => (
                            <Badge key={b.key} className="bg-green-600 text-white font-bold text-xs">
                              {getFreeBadgeLabel(b)}
                            </Badge>
                          ));
                        }
                        return <Badge className="bg-yellow-600 text-white font-bold">PAID ONLY</Badge>;
                      })()}
                      {event.is_attending ? (
                        <Badge className="bg-green-500 text-white font-bold">Going</Badge>
                      ) : (
                        <Badge className="bg-red-500 text-white font-bold">Not Going</Badge>
                      )}
                    </div>

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
                        <span>{event.date_tba ? "To Be Announced" : formatDateForDisplay(event.date)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-yellow-400" />
                        <span>
                          {event.date_tba ? "To Be Announced" : formatTimeRange(event.start_time, event.end_time)}
                        </span>
                      </div>
                      <div className="flex items-start gap-2">
                        <MapPin className="h-4 w-4 text-yellow-400 mt-0.5" />
                        <span className="line-clamp-2">
                          {event.address}, {event.city}, {event.state}
                        </span>
                      </div>
                      {/* Pricing info */}
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                        {((event as any).general_admission_price ?? 0) > 0 ? (
                          <span className="text-green-400 font-bold">
                            General Admission: ${(event as any).general_admission_price}
                          </span>
                        ) : (
                          <>
                            <span className="text-green-400 font-bold">
                              Males: ${(event as any).males_price ?? event.price ?? 0}
                            </span>
                            <span className="text-pink-400 font-bold">
                              Females: ${(event as any).females_price ?? event.price ?? 0}
                            </span>
                          </>
                        )}
                      </div>

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
