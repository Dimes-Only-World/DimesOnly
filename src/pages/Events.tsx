import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
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
  User,
  Check,
  X,
  Users,
  Eye,
  Play,
  Image as ImageIcon,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

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
  attendees?: EventAttendee[];
}

interface EventAttendee {
  user_id: string;
  users: {
    username: string;
    profile_photo: string;
    user_type: string;
    city: string;
    state: string;
  };
}

interface UserProfile {
  username: string;
  profile_photo: string;
  banner_photo: string;
  city: string;
  state: string;
  user_type: string;
}

// Memoized Attendee Card Component
const AttendeeCard = React.memo(({ attendee }: { attendee: EventAttendee }) => (
  <div className="text-center">
    <img
      src={attendee.users.profile_photo || "/placeholder.svg"}
      alt={attendee.users.username}
      className="w-12 h-12 md:w-16 md:h-16 rounded-full object-cover border-2 border-yellow-400 mx-auto mb-2"
      loading="lazy"
      onError={(e) => {
        const target = e.target as HTMLImageElement;
        target.src = "/placeholder.svg";
      }}
    />
    <p className="text-xs text-yellow-400 truncate font-medium">
      @{attendee.users.username}
    </p>
    <p className="text-xs text-gray-400 mt-1">{attendee.users.user_type}</p>
  </div>
));

AttendeeCard.displayName = "AttendeeCard";

const Events: React.FC = () => {
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const { getContainerClasses, getContentClasses, getCardClasses } =
    useMobileLayout();
  const username = searchParams.get("events") || "";
  const ref = searchParams.get("ref") || "";

  const [events, setEvents] = useState<Event[]>([]);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAttendeesDialog, setShowAttendeesDialog] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [attendeeSearch, setAttendeeSearch] = useState("");
  const [attendeeTypeFilter, setAttendeeTypeFilter] = useState("all");
  const [attendeesLoading, setAttendeesLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [filters, setFilters] = useState({
    location: "",
    date: "",
  });

  // Constants for pagination
  const ATTENDEES_PER_PAGE = 24;

  // Debounced search to prevent excessive filtering
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(attendeeSearch);
      setCurrentPage(1); // Reset to first page on search
    }, 300);

    return () => clearTimeout(timer);
  }, [attendeeSearch]);

  useEffect(() => {
    if (username) {
      fetchUserProfile();
      fetchEvents();
    }
  }, [username]);

  // Cleanup function to cancel ongoing requests
  useEffect(() => {
    return () => {
      // Cleanup any ongoing operations
      setLoading(false);
      setAttendeesLoading(false);
    };
  }, []);

  const fetchUserProfile = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("users")
        .select("username, profile_photo, banner_photo, city, state, user_type")
        .eq("username", username)
        .single();

      if (error) throw error;
      setUserProfile(data as UserProfile);
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

  const fetchEventAttendees = useCallback(
    async (eventId: string) => {
      if (!eventId) return [];

      setAttendeesLoading(true);
      try {
        // Use pagination and limit to prevent overwhelming the browser
        const { data, error } = await supabase
          .from("user_events")
          .select(
            `
          user_id,
          users (
            username,
            profile_photo,
            user_type,
            city,
            state
          )
        `
          )
          .eq("event_id", eventId)
          .limit(200); // Limit to 200 attendees max to prevent crashes

        if (error) throw error;

        return (data as unknown as EventAttendee[]) || [];
      } catch (error) {
        console.error("Error fetching attendees:", error);
        toast({
          title: "Error",
          description: "Failed to load attendees. Please try again.",
          variant: "destructive",
        });
        return [];
      } finally {
        setAttendeesLoading(false);
      }
    },
    [toast]
  );

  const handleViewAttendees = useCallback(
    async (event: Event) => {
      if (!event?.id) return;

      try {
        setSelectedEvent(event);
        setShowAttendeesDialog(true);
        setCurrentPage(1);
        setAttendeeSearch("");
        setAttendeeTypeFilter("all");

        const attendees = await fetchEventAttendees(event.id);
        setSelectedEvent((prev) => (prev ? { ...prev, attendees } : null));
      } catch (error) {
        console.error("Error handling view attendees:", error);
        toast({
          title: "Error",
          description: "Failed to load event details",
          variant: "destructive",
        });
      }
    },
    [fetchEventAttendees, toast]
  );

  // Memoized filtered attendees with debounced search
  const filteredAttendees = useMemo(() => {
    if (!selectedEvent?.attendees) return [];

    const searchTerm = debouncedSearch.toLowerCase().trim();

    return selectedEvent.attendees.filter((attendee) => {
      if (!attendee?.users) return false;

      const matchesSearch =
        !searchTerm ||
        attendee.users.username?.toLowerCase().includes(searchTerm) ||
        attendee.users.city?.toLowerCase().includes(searchTerm) ||
        attendee.users.state?.toLowerCase().includes(searchTerm);

      const matchesType =
        attendeeTypeFilter === "all" ||
        attendee.users.user_type === attendeeTypeFilter;

      return matchesSearch && matchesType;
    });
  }, [selectedEvent?.attendees, debouncedSearch, attendeeTypeFilter]);

  // Memoized paginated attendees
  const paginatedAttendees = useMemo(() => {
    const startIndex = (currentPage - 1) * ATTENDEES_PER_PAGE;
    const endIndex = startIndex + ATTENDEES_PER_PAGE;
    return filteredAttendees.slice(startIndex, endIndex);
  }, [filteredAttendees, currentPage]);

  const totalPages = Math.ceil(filteredAttendees.length / ATTENDEES_PER_PAGE);

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
      return matchesLocation && matchesDate;
    });
  }, [events, filters]);

  const getAvailableSpots = useCallback((event: Event | null) => {
    if (!event) return 0;
    return Math.max(0, event.max_attendees - event.current_attendees);
  }, []);

  const getFreeSpots = useCallback((event: Event | null) => {
    if (!event) return 0;
    return (event.free_spots_strippers || 0) + (event.free_spots_exotics || 0);
  }, []);

  // Handle dialog close with cleanup
  const handleCloseDialog = useCallback(() => {
    setShowAttendeesDialog(false);
    setSelectedEvent(null);
    setAttendeeSearch("");
    setAttendeeTypeFilter("all");
    setCurrentPage(1);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 text-white">
      {/* Mobile-first full width design */}
      <div className={getContainerClasses()}>
        {/* User Profile Header with Banner */}
        {userProfile && (
          <div className="relative mb-6">
            {/* Banner Photo */}
            <div className="h-48 md:h-64 relative overflow-hidden">
              <img
                src={userProfile.banner_photo || "/placeholder.svg"}
                alt={`${userProfile.username} banner`}
                className="w-full h-full object-cover"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.src = "/placeholder.svg";
                }}
              />
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
                        <div className="bg-green-500 rounded-full p-2 shadow-lg">
                          <Check className="h-4 w-4 text-white" />
                        </div>
                      ) : (
                        <div className="bg-red-500 rounded-full p-2 shadow-lg">
                          <X className="h-4 w-4 text-white" />
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
                          FREE SPOTS: {getFreeSpots(event)}
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
                        onClick={() => handleViewAttendees(event)}
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

      {/* Event Details Dialog - Optimized Performance */}
      <Dialog open={showAttendeesDialog} onOpenChange={handleCloseDialog}>
        <DialogContent
          className={`bg-gray-900 border-gray-700 text-white max-w-5xl max-h-[95vh] overflow-hidden p-0 ${getCardClasses()}`}
        >
          <div className={`border-b border-gray-700 ${getContentClasses()}`}>
            <DialogHeader>
              <DialogTitle className="text-yellow-400 text-xl md:text-2xl">
                {selectedEvent?.name}
              </DialogTitle>
            </DialogHeader>
            {attendeesLoading && (
              <div className="flex items-center gap-2 text-yellow-400 text-sm">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-yellow-400"></div>
                Loading attendees...
              </div>
            )}
          </div>

          <div className={`flex-1 overflow-y-auto ${getContentClasses()}`}>
            <div className="space-y-6">
              {/* Event Details - Mobile Optimized */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-yellow-400 mb-3">
                    Event Information
                  </h3>
                  <div className="space-y-3 text-sm">
                    <div className="flex items-center gap-3 p-3 bg-white/5 rounded-lg">
                      <Calendar className="h-5 w-5 text-yellow-400 flex-shrink-0" />
                      <span>
                        {selectedEvent &&
                          new Date(selectedEvent.date).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 p-3 bg-white/5 rounded-lg">
                      <Clock className="h-5 w-5 text-yellow-400 flex-shrink-0" />
                      <span>
                        {selectedEvent?.start_time} - {selectedEvent?.end_time}
                      </span>
                    </div>
                    <div className="flex items-start gap-3 p-3 bg-white/5 rounded-lg">
                      <MapPin className="h-5 w-5 text-yellow-400 mt-0.5 flex-shrink-0" />
                      <span className="break-words">
                        {selectedEvent?.address}, {selectedEvent?.city},{" "}
                        {selectedEvent?.state}
                      </span>
                    </div>
                    {selectedEvent?.price && selectedEvent.price > 0 && (
                      <div className="flex items-center gap-3 p-3 bg-white/5 rounded-lg">
                        <span className="text-yellow-400 font-bold text-lg">
                          ${selectedEvent.price}
                        </span>
                      </div>
                    )}
                    <div className="flex items-center gap-3 p-3 bg-white/5 rounded-lg">
                      <Users className="h-5 w-5 text-yellow-400 flex-shrink-0" />
                      <span>
                        {selectedEvent?.current_attendees}/
                        {selectedEvent?.max_attendees} attending
                      </span>
                    </div>
                  </div>

                  {selectedEvent?.description && (
                    <div className="mt-6">
                      <h4 className="font-semibold text-gray-300 mb-3">
                        Description
                      </h4>
                      <p className="text-gray-300 text-sm leading-relaxed p-3 bg-white/5 rounded-lg">
                        {selectedEvent.description}
                      </p>
                    </div>
                  )}
                </div>

                {/* Media Gallery - Mobile Optimized */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-yellow-400 mb-3">
                    Media
                  </h3>

                  {/* Main Photo */}
                  <img
                    src={selectedEvent?.photo_url || "/placeholder.svg"}
                    alt={selectedEvent?.name}
                    className="w-full h-48 md:h-56 object-cover rounded-lg"
                  />

                  {/* Additional Photos */}
                  {selectedEvent?.additional_photos &&
                    selectedEvent.additional_photos.length > 0 && (
                      <div className="mb-4">
                        <h4 className="font-semibold text-gray-300 mb-3 text-sm">
                          Photos ({selectedEvent.additional_photos.length})
                        </h4>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                          {selectedEvent.additional_photos
                            .slice(0, 6)
                            .map((photo, index) => (
                              <img
                                key={index}
                                src={photo}
                                alt={`Event photo ${index + 1}`}
                                className="w-full h-20 md:h-24 object-cover rounded-lg"
                              />
                            ))}
                        </div>
                      </div>
                    )}

                  {/* Videos */}
                  {selectedEvent?.video_urls &&
                    selectedEvent.video_urls.length > 0 && (
                      <div className="mb-4">
                        <h4 className="font-semibold text-gray-300 mb-3 text-sm">
                          Videos ({selectedEvent.video_urls.length})
                        </h4>
                        <div className="space-y-3">
                          {selectedEvent.video_urls
                            .slice(0, 2)
                            .map((video, index) => (
                              <div key={index} className="relative">
                                <video
                                  src={video}
                                  className="w-full h-32 md:h-40 object-cover rounded-lg"
                                  controls
                                />
                              </div>
                            ))}
                        </div>

                        {/* Watch Live Button */}
                        <Button
                          variant="outline"
                          className="w-full mt-4 border-red-400 text-red-400 hover:bg-red-400/10"
                          disabled
                        >
                          <Play className="h-4 w-4 mr-2" />
                          Watch Live (Coming Soon)
                        </Button>
                      </div>
                    )}
                </div>
              </div>

              {/* Attendees Section - Mobile Optimized */}
              <div className="border-t border-gray-700 pt-6">
                <h3 className="text-lg font-semibold text-yellow-400 mb-4">
                  Attendees ({selectedEvent?.attendees?.length || 0})
                </h3>

                {/* Search and Filter - Mobile Stack */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
                  <Input
                    placeholder="Search by username, city, or state"
                    value={attendeeSearch}
                    onChange={(e) => setAttendeeSearch(e.target.value)}
                    className="bg-white/10 border-white/20 text-white placeholder-gray-400"
                  />
                  <select
                    value={attendeeTypeFilter}
                    onChange={(e) => setAttendeeTypeFilter(e.target.value)}
                    className="bg-white/10 border border-white/20 rounded-md px-3 py-2 text-white"
                  >
                    <option value="all">All Types</option>
                    <option value="stripper">Strippers</option>
                    <option value="exotic">Exotics</option>
                    <option value="male">Males</option>
                    <option value="female">Females</option>
                    <option value="normal">Normal</option>
                  </select>
                </div>

                {/* Attendees Grid - Optimized with Pagination */}
                {attendeesLoading ? (
                  <div className="text-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-400 mx-auto mb-4"></div>
                    <p className="text-gray-400">Loading attendees...</p>
                  </div>
                ) : filteredAttendees.length > 0 ? (
                  <>
                    <div className="grid grid-cols-3 md:grid-cols-6 lg:grid-cols-8 gap-4">
                      {paginatedAttendees.map((attendee) => (
                        <AttendeeCard
                          key={attendee.user_id}
                          attendee={attendee}
                        />
                      ))}
                    </div>

                    {/* Pagination Controls */}
                    {totalPages > 1 && (
                      <div className="flex items-center justify-center gap-4 mt-6 p-4 bg-white/5 rounded-lg">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            setCurrentPage(Math.max(1, currentPage - 1))
                          }
                          disabled={currentPage === 1}
                          className="border-yellow-400/50 text-yellow-400 hover:bg-yellow-400/10 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <ChevronLeft className="h-4 w-4 mr-1" />
                          Previous
                        </Button>

                        <span className="text-gray-400 text-sm">
                          Page {currentPage} of {totalPages} (
                          {filteredAttendees.length} total)
                        </span>

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            setCurrentPage(
                              Math.min(totalPages, currentPage + 1)
                            )
                          }
                          disabled={currentPage === totalPages}
                          className="border-yellow-400/50 text-yellow-400 hover:bg-yellow-400/10 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Next
                          <ChevronRight className="h-4 w-4 ml-1" />
                        </Button>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-center py-12">
                    <div className="bg-white/5 rounded-lg p-8">
                      <p className="text-gray-400 text-lg mb-2">
                        {attendeeSearch || attendeeTypeFilter !== "all"
                          ? "No attendees match your search"
                          : "No attendees yet"}
                      </p>
                      <p className="text-gray-500 text-sm">
                        {attendeeSearch || attendeeTypeFilter !== "all"
                          ? "Try adjusting your search filters"
                          : "Be the first to join this event!"}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Events;
