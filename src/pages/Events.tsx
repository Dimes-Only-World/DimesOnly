import React, { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
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

const Events: React.FC = () => {
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const username = searchParams.get("events") || "";
  const ref = searchParams.get("ref") || "";

  const [events, setEvents] = useState<Event[]>([]);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAttendeesDialog, setShowAttendeesDialog] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [attendeeSearch, setAttendeeSearch] = useState("");
  const [attendeeTypeFilter, setAttendeeTypeFilter] = useState("all");
  const [filters, setFilters] = useState({
    location: "",
    date: "",
  });

  useEffect(() => {
    if (username) {
      fetchUserProfile();
      fetchEvents();
    }
  }, [username]);

  const fetchUserProfile = async () => {
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
  };

  const fetchEvents = async () => {
    try {
      // First get all events
      const { data: allEvents, error: eventsError } = await supabase
        .from("events")
        .select("*")
        .gte("date", new Date().toISOString().split("T")[0])
        .order("date");

      if (eventsError) throw eventsError;

      // Get user's event attendance
      const { data: userEvents, error: userEventsError } = await supabase
        .from("user_events")
        .select("event_id")
        .eq("username", username);

      if (userEventsError) throw userEventsError;

      const attendingEventIds = userEvents?.map((ue) => ue.event_id) || [];

      // Get attendee counts for each event
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
  };

  const fetchEventAttendees = async (eventId: string) => {
    try {
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
        .eq("event_id", eventId);

      if (error) throw error;

      return (data as unknown as EventAttendee[]) || [];
    } catch (error) {
      console.error("Error fetching attendees:", error);
      return [];
    }
  };

  const handleViewAttendees = async (event: Event) => {
    const attendees = await fetchEventAttendees(event.id);
    setSelectedEvent({ ...event, attendees });
    setShowAttendeesDialog(true);
  };

  const getFilteredAttendees = (attendees: EventAttendee[]) => {
    return attendees.filter((attendee) => {
      const matchesSearch =
        !attendeeSearch ||
        attendee.users.username
          .toLowerCase()
          .includes(attendeeSearch.toLowerCase()) ||
        attendee.users.city
          ?.toLowerCase()
          .includes(attendeeSearch.toLowerCase()) ||
        attendee.users.state
          ?.toLowerCase()
          .includes(attendeeSearch.toLowerCase());

      const matchesType =
        attendeeTypeFilter === "all" ||
        attendee.users.user_type === attendeeTypeFilter;

      return matchesSearch && matchesType;
    });
  };

  const filteredEvents = events.filter((event) => {
    const matchesLocation =
      !filters.location ||
      event.city.toLowerCase().includes(filters.location.toLowerCase()) ||
      event.state.toLowerCase().includes(filters.location.toLowerCase()) ||
      event.address.toLowerCase().includes(filters.location.toLowerCase());
    const matchesDate = !filters.date || event.date.includes(filters.date);
    return matchesLocation && matchesDate;
  });

  const getAvailableSpots = (event: Event | null) => {
    if (!event) return 0;
    return Math.max(0, event.max_attendees - event.current_attendees);
  };

  const getFreeSpots = (event: Event | null) => {
    if (!event) return 0;
    return (event.free_spots_strippers || 0) + (event.free_spots_exotics || 0);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 text-white">
      {/* Mobile-first full width design */}
      <div className="w-full">
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
                  <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2">
                    <span
                      className={`px-3 py-1 text-xs font-bold rounded-full text-white ${
                        userProfile.user_type === "stripper"
                          ? "bg-pink-500"
                          : "bg-purple-500"
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
                    {ref && (
                      <Badge
                        variant="outline"
                        className="border-yellow-400 text-yellow-400"
                      >
                        Referred by: @{ref}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="px-4 md:px-8 pb-8">
          <div className="text-center mb-6">
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-2">
              {username ? `${username}'s Event Schedule` : "Events"}
            </h2>
            <p className="text-gray-300 text-sm md:text-base">
              Events this performer will be attending
            </p>
          </div>

          {/* Filters - Mobile optimized */}
          <Card className="bg-white/10 backdrop-blur border-white/20 mb-6">
            <CardContent className="p-4 md:p-6">
              <h3 className="text-lg md:text-xl font-bold text-yellow-400 mb-4">
                Filter Events
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                <div className="relative">
                  <MapPin className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Filter by location"
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
              <Card className="bg-white/10 backdrop-blur border-white/20 max-w-md mx-auto">
                <CardContent className="p-8">
                  <h3 className="text-xl font-bold text-yellow-400 mb-4">
                    No Events Available
                  </h3>
                  <p className="text-gray-300 mb-4">
                    {username
                      ? `${username} hasn't selected any events yet.`
                      : "No events match your filters."}
                  </p>
                  <p className="text-gray-400 text-sm">CHECK BACK TOMORROW</p>
                </CardContent>
              </Card>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
              {filteredEvents.map((event) => (
                <Card
                  key={event.id}
                  className="bg-white/10 backdrop-blur border-white/20 hover:bg-white/20 transition-all duration-300 overflow-hidden"
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

                  <CardContent className="p-4">
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
                        className="flex-1 border-white/20 text-white hover:bg-white/10"
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

      {/* Event Details Dialog */}
      <Dialog open={showAttendeesDialog} onOpenChange={setShowAttendeesDialog}>
        <DialogContent className="bg-gray-900 border-gray-700 text-white max-w-4xl max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle className="text-yellow-400 text-xl">
              {selectedEvent?.name}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6 max-h-[70vh] overflow-y-auto">
            {/* Event Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-lg font-semibold text-yellow-400 mb-3">
                  Event Information
                </h3>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-yellow-400" />
                    <span>
                      {selectedEvent &&
                        new Date(selectedEvent.date).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-yellow-400" />
                    <span>
                      {selectedEvent?.start_time} - {selectedEvent?.end_time}
                    </span>
                  </div>
                  <div className="flex items-start gap-2">
                    <MapPin className="h-4 w-4 text-yellow-400 mt-0.5" />
                    <span>
                      {selectedEvent?.address}, {selectedEvent?.city},{" "}
                      {selectedEvent?.state}
                    </span>
                  </div>
                  {selectedEvent?.price && selectedEvent.price > 0 && (
                    <div className="flex items-center gap-2">
                      <span className="text-yellow-400 font-bold">
                        Price: ${selectedEvent.price}
                      </span>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-yellow-400" />
                    <span>
                      {selectedEvent?.current_attendees}/
                      {selectedEvent?.max_attendees} attending
                    </span>
                  </div>
                </div>

                {selectedEvent?.description && (
                  <div className="mt-4">
                    <h4 className="font-semibold text-gray-300 mb-2">
                      Description
                    </h4>
                    <p className="text-gray-300 text-sm">
                      {selectedEvent.description}
                    </p>
                  </div>
                )}
              </div>

              {/* Media Gallery */}
              <div>
                <h3 className="text-lg font-semibold text-yellow-400 mb-3">
                  Media
                </h3>

                {/* Main Photo */}
                <img
                  src={selectedEvent?.photo_url || "/placeholder.svg"}
                  alt={selectedEvent?.name}
                  className="w-full h-32 object-cover rounded-lg mb-3"
                />

                {/* Additional Photos */}
                {selectedEvent?.additional_photos &&
                  selectedEvent.additional_photos.length > 0 && (
                    <div className="mb-3">
                      <h4 className="font-semibold text-gray-300 mb-2 text-sm">
                        Photos ({selectedEvent.additional_photos.length})
                      </h4>
                      <div className="grid grid-cols-3 gap-2">
                        {selectedEvent.additional_photos
                          .slice(0, 6)
                          .map((photo, index) => (
                            <img
                              key={index}
                              src={photo}
                              alt={`Event photo ${index + 1}`}
                              className="w-full h-16 object-cover rounded"
                            />
                          ))}
                      </div>
                    </div>
                  )}

                {/* Videos */}
                {selectedEvent?.video_urls &&
                  selectedEvent.video_urls.length > 0 && (
                    <div className="mb-3">
                      <h4 className="font-semibold text-gray-300 mb-2 text-sm">
                        Videos ({selectedEvent.video_urls.length})
                      </h4>
                      <div className="space-y-2">
                        {selectedEvent.video_urls
                          .slice(0, 2)
                          .map((video, index) => (
                            <div key={index} className="relative">
                              <video
                                src={video}
                                className="w-full h-20 object-cover rounded"
                                controls
                              />
                            </div>
                          ))}
                      </div>

                      {/* Watch Live Button */}
                      <Button
                        variant="outline"
                        className="w-full mt-3 border-red-400 text-red-400 hover:bg-red-400/10"
                        disabled
                      >
                        <Play className="h-4 w-4 mr-1" />
                        Watch Live (Coming Soon)
                      </Button>
                    </div>
                  )}
              </div>
            </div>

            {/* Attendees Section */}
            <div>
              <h3 className="text-lg font-semibold text-yellow-400 mb-3">
                Attendees ({selectedEvent?.attendees?.length || 0})
              </h3>

              {/* Search and Filter */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
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

              {/* Attendees Thumbnails Grid */}
              {selectedEvent?.attendees &&
              selectedEvent.attendees.length > 0 ? (
                <div className="grid grid-cols-4 md:grid-cols-8 gap-3">
                  {getFilteredAttendees(selectedEvent.attendees)
                    .slice(0, 16)
                    .map((attendee) => (
                      <div key={attendee.user_id} className="text-center">
                        <img
                          src={
                            attendee.users.profile_photo || "/placeholder.svg"
                          }
                          alt={attendee.users.username}
                          className="w-12 h-12 rounded-full object-cover border border-yellow-400 mx-auto mb-1"
                        />
                        <p className="text-xs text-yellow-400 truncate">
                          @{attendee.users.username}
                        </p>
                        <p className="text-xs text-gray-400">
                          {attendee.users.user_type}
                        </p>
                      </div>
                    ))}
                </div>
              ) : (
                <p className="text-center text-gray-400 py-8">
                  No attendees yet. Be the first to join!
                </p>
              )}

              {selectedEvent?.attendees &&
                getFilteredAttendees(selectedEvent.attendees).length > 16 && (
                  <p className="text-center text-gray-400 text-sm mt-3">
                    +{getFilteredAttendees(selectedEvent.attendees).length - 16}{" "}
                    more attendees
                  </p>
                )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Events;
