import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import { useMobileLayout } from "@/hooks/use-mobile";
import PayPalEventButton from "@/components/PayPalEventButton";
import {
  Calendar,
  MapPin,
  Clock,
  Users,
  Play,
  Image as ImageIcon,
  ChevronLeft,
  ChevronRight,
  ArrowLeft,
  CheckCircle,
  Ticket,
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
  description?: string;
  video_urls?: string[];
  additional_photos?: string[];
  host_user_id?: string;
}

interface CurrentUser {
  id: string;
  username: string;
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

const EventDetails: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { getContainerClasses, getContentClasses, getCardClasses } =
    useMobileLayout();
  
  const eventId = searchParams.get("id") || "";

  const [event, setEvent] = useState<Event | null>(null);
  const [attendees, setAttendees] = useState<EventAttendee[]>([]);
  const [loading, setLoading] = useState(true);
  const [attendeesLoading, setAttendeesLoading] = useState(false);
  const [attendeeSearch, setAttendeeSearch] = useState("");
  const [attendeeTypeFilter, setAttendeeTypeFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [isUserRegistered, setIsUserRegistered] = useState(false);
  const [checkingRegistration, setCheckingRegistration] = useState(false);

  const ATTENDEES_PER_PAGE = 24;

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(attendeeSearch);
      setCurrentPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [attendeeSearch]);

  // Fetch current user from localStorage
  useEffect(() => {
    const storedUser = localStorage.getItem("currentUser");
    if (storedUser) {
      try {
        const userData = JSON.parse(storedUser);
        setCurrentUser({ id: userData.id, username: userData.username });
      } catch (e) {
        console.error("Error parsing user data:", e);
      }
    }
  }, []);

  // Check if user is already registered for this event
  useEffect(() => {
    const checkRegistration = async () => {
      if (!currentUser?.id || !eventId) return;
      
      setCheckingRegistration(true);
      try {
        const { data, error } = await supabase
          .from("user_events")
          .select("id")
          .eq("user_id", currentUser.id)
          .eq("event_id", eventId)
          .single();
        
        if (!error && data) {
          setIsUserRegistered(true);
        }
      } catch (e) {
        // User not registered, that's fine
      } finally {
        setCheckingRegistration(false);
      }
    };

    checkRegistration();
  }, [currentUser?.id, eventId]);

  useEffect(() => {
    if (eventId) {
      fetchEventDetails();
      fetchEventAttendees();
    }
  }, [eventId]);

  const fetchEventDetails = async () => {
    try {
      const { data: eventData, error: eventError } = await supabase
        .from("events")
        .select("*")
        .eq("id", eventId)
        .single();

      if (eventError) throw eventError;

      // Get attendee count
      const { count } = await supabase
        .from("user_events")
        .select("*", { count: "exact", head: true })
        .eq("event_id", eventId);

      setEvent({
        ...eventData,
        current_attendees: count || 0,
      } as Event);
    } catch (error) {
      console.error("Error fetching event details:", error);
      toast({
        title: "Error",
        description: "Failed to fetch event details",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchEventAttendees = async () => {
    setAttendeesLoading(true);
    try {
      // First get the user_events
      const { data: eventUsers, error: eventError } = await supabase
        .from("user_events")
        .select("user_id")
        .eq("event_id", eventId)
        .limit(200);

      if (eventError) throw eventError;

      if (!eventUsers || eventUsers.length === 0) {
        setAttendees([]);
        return;
      }

      // Get user IDs
      const userIds = eventUsers.map(eu => eu.user_id);

      // Fetch user profiles from public_user_profiles view (bypasses RLS)
      const { data: profiles, error: profileError } = await supabase
        .from("public_user_profiles")
        .select("id, username, profile_photo, user_type, city, state")
        .in("id", userIds);

      if (profileError) throw profileError;

      // Map profiles to attendee format
      const attendeesData: EventAttendee[] = (profiles || []).map(profile => ({
        user_id: profile.id,
        users: {
          username: profile.username || '',
          profile_photo: profile.profile_photo || '',
          user_type: profile.user_type || '',
          city: profile.city || '',
          state: profile.state || '',
        }
      }));

      setAttendees(attendeesData);
    } catch (error) {
      console.error("Error fetching attendees:", error);
      toast({
        title: "Error",
        description: "Failed to load attendees",
        variant: "destructive",
      });
    } finally {
      setAttendeesLoading(false);
    }
  };

  const filteredAttendees = useMemo(() => {
    const searchTerm = debouncedSearch.toLowerCase().trim();
    return attendees.filter((attendee) => {
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
  }, [attendees, debouncedSearch, attendeeTypeFilter]);

  const paginatedAttendees = useMemo(() => {
    const startIndex = (currentPage - 1) * ATTENDEES_PER_PAGE;
    const endIndex = startIndex + ATTENDEES_PER_PAGE;
    return filteredAttendees.slice(startIndex, endIndex);
  }, [filteredAttendees, currentPage]);

  const totalPages = Math.ceil(filteredAttendees.length / ATTENDEES_PER_PAGE);

  const handleGoBack = () => {
    navigate(-1);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-400 mx-auto mb-4"></div>
          <p className="text-gray-400 text-lg">Loading event details...</p>
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <Card className="bg-white/10 backdrop-blur border-white/20 max-w-md mx-4">
          <CardContent className="p-8 text-center">
            <h2 className="text-2xl font-bold text-yellow-400 mb-4">Event Not Found</h2>
            <p className="text-gray-300 mb-6">The event you're looking for doesn't exist.</p>
            <Button onClick={handleGoBack} className="bg-yellow-400 text-black hover:bg-yellow-500">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Go Back
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 text-white">
      <div className={getContainerClasses()}>
        {/* Back Button */}
        <div className="p-4">
          <Button
            onClick={handleGoBack}
            variant="outline"
            className="border-yellow-400/50 text-yellow-400 hover:bg-yellow-400/10 hover:text-yellow-400 bg-transparent"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Events
          </Button>
        </div>

        {/* Event Header */}
        <div className="px-4 pb-6">
          <h1 className="text-2xl md:text-3xl font-bold text-yellow-400 mb-2">{event.name}</h1>
          <div className="flex flex-wrap gap-2">
            {event.genre && (
              <Badge className="bg-purple-500/50 text-white">{event.genre}</Badge>
            )}
            <Badge className="bg-yellow-400/20 text-yellow-400 border-yellow-400/50">
              {event.current_attendees}/{event.max_attendees} Attending
            </Badge>
          </div>
        </div>

        <div className={getContentClasses()}>
          <div className="space-y-6">
            {/* Event Details Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Event Information */}
              <Card className={`bg-white/10 backdrop-blur border-white/20 ${getCardClasses()}`}>
                <CardContent className="p-4 md:p-6">
                  <h3 className="text-lg font-semibold text-yellow-400 mb-4">Event Information</h3>
                  <div className="space-y-3 text-sm">
                    <div className="flex items-center gap-3 p-3 bg-white/5 rounded-lg">
                      <Calendar className="h-5 w-5 text-yellow-400 flex-shrink-0" />
                      <span>{new Date(event.date).toLocaleDateString()}</span>
                    </div>
                    <div className="flex items-center gap-3 p-3 bg-white/5 rounded-lg">
                      <Clock className="h-5 w-5 text-yellow-400 flex-shrink-0" />
                      <span>{event.start_time} - {event.end_time}</span>
                    </div>
                    <div className="flex items-start gap-3 p-3 bg-white/5 rounded-lg">
                      <MapPin className="h-5 w-5 text-yellow-400 mt-0.5 flex-shrink-0" />
                      <span className="break-words">
                        {event.address}, {event.city}, {event.state}
                      </span>
                    </div>
                    {event.price > 0 && (
                      <div className="flex items-center gap-3 p-3 bg-white/5 rounded-lg">
                        <span className="text-yellow-400 font-bold text-lg">${event.price}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-3 p-3 bg-white/5 rounded-lg">
                      <Users className="h-5 w-5 text-yellow-400 flex-shrink-0" />
                      <span>{event.current_attendees}/{event.max_attendees} attending</span>
                    </div>
                  </div>

                  {event.description && (
                    <div className="mt-6">
                      <h4 className="font-semibold text-gray-300 mb-3">Description</h4>
                      <p className="text-gray-300 text-sm leading-relaxed p-3 bg-white/5 rounded-lg">
                        {event.description}
                      </p>
                    </div>
                  )}

                  {/* Ticket Purchase Section */}
                  <div className="mt-6 pt-6 border-t border-white/10">
                    <h4 className="font-semibold text-gray-300 mb-4 flex items-center gap-2">
                      <Ticket className="h-4 w-4 text-yellow-400" />
                      Get Your Ticket
                    </h4>

                    {/* Already Registered */}
                    {isUserRegistered ? (
                      <div className="flex items-center gap-2 p-4 bg-green-500/20 rounded-lg border border-green-500/50">
                        <CheckCircle className="h-5 w-5 text-green-400" />
                        <span className="text-green-400 font-medium">You're registered for this event!</span>
                      </div>
                    ) : event.current_attendees >= event.max_attendees ? (
                      /* Sold Out */
                      <div className="p-4 bg-red-500/20 rounded-lg border border-red-500/50 text-center">
                        <span className="text-red-400 font-medium">This event is sold out</span>
                      </div>
                    ) : event.price > 0 ? (
                      /* Paid Event - Show PayPal Button */
                      currentUser ? (
                        <PayPalEventButton
                          eventId={event.id}
                          eventName={event.name}
                          eventPrice={event.price}
                          eventOwnerId={event.host_user_id}
                          buyerId={currentUser.id}
                          buyerUsername={currentUser.username}
                          onSuccess={(transactionId) => {
                            setIsUserRegistered(true);
                            // Refresh attendees
                            fetchEventAttendees();
                            // Update attendee count
                            setEvent(prev => prev ? {
                              ...prev,
                              current_attendees: prev.current_attendees + 1
                            } : null);
                          }}
                          onError={(error) => {
                            toast({
                              title: "Payment Failed",
                              description: error,
                              variant: "destructive",
                            });
                          }}
                          disabled={checkingRegistration}
                        />
                      ) : (
                        <div className="space-y-3">
                          <p className="text-gray-400 text-sm text-center">
                            Please log in to purchase a ticket
                          </p>
                          <Button
                            onClick={() => navigate("/login")}
                            className="w-full bg-yellow-400 text-black hover:bg-yellow-500"
                          >
                            Log In to Purchase
                          </Button>
                        </div>
                      )
                    ) : (
                      /* Free Event */
                      currentUser ? (
                        <Button
                          onClick={async () => {
                            try {
                              const { error } = await supabase
                                .from("user_events")
                                .insert({
                                  user_id: currentUser.id,
                                  event_id: event.id,
                                  username: currentUser.username,
                                  payment_status: "free",
                                });
                              
                              if (error) throw error;
                              
                              setIsUserRegistered(true);
                              toast({
                                title: "Registered!",
                                description: `You're now registered for ${event.name}`,
                              });
                              fetchEventAttendees();
                              setEvent(prev => prev ? {
                                ...prev,
                                current_attendees: prev.current_attendees + 1
                              } : null);
                            } catch (err: any) {
                              toast({
                                title: "Registration Failed",
                                description: err.message || "Unable to register",
                                variant: "destructive",
                              });
                            }
                          }}
                          className="w-full bg-yellow-400 text-black hover:bg-yellow-500"
                        >
                          Register for Free
                        </Button>
                      ) : (
                        <div className="space-y-3">
                          <p className="text-gray-400 text-sm text-center">
                            Please log in to register
                          </p>
                          <Button
                            onClick={() => navigate("/login")}
                            className="w-full bg-yellow-400 text-black hover:bg-yellow-500"
                          >
                            Log In to Register
                          </Button>
                        </div>
                      )
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Media Gallery */}
              <Card className={`bg-white/10 backdrop-blur border-white/20 ${getCardClasses()}`}>
                <CardContent className="p-4 md:p-6">
                  <h3 className="text-lg font-semibold text-yellow-400 mb-4">Media</h3>

                  {/* Main Photo */}
                  <img
                    src={event.photo_url || "/placeholder.svg"}
                    alt={event.name}
                    className="w-full h-48 md:h-56 object-cover rounded-lg mb-4"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.src = "/placeholder.svg";
                    }}
                  />

                  {/* Additional Photos */}
                  {event.additional_photos && event.additional_photos.length > 0 && (
                    <div className="mb-4">
                      <h4 className="font-semibold text-gray-300 mb-3 text-sm flex items-center gap-2">
                        <ImageIcon className="h-4 w-4" />
                        Photos ({event.additional_photos.length})
                      </h4>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                        {event.additional_photos.map((photo, index) => (
                          <img
                            key={index}
                            src={photo}
                            alt={`Event photo ${index + 1}`}
                            className="w-full h-20 md:h-24 object-cover rounded-lg"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.src = "/placeholder.svg";
                            }}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Videos */}
                  {event.video_urls && event.video_urls.length > 0 && (
                    <div>
                      <h4 className="font-semibold text-gray-300 mb-3 text-sm flex items-center gap-2">
                        <Play className="h-4 w-4" />
                        Videos ({event.video_urls.length})
                      </h4>
                      <div className="space-y-3">
                        {event.video_urls.map((video, index) => (
                          <div key={index} className="relative">
                            <video
                              src={video}
                              className="w-full h-40 md:h-48 object-cover rounded-lg"
                              controls
                            />
                          </div>
                        ))}
                      </div>

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

                  {/* No media message */}
                  {!event.additional_photos?.length && !event.video_urls?.length && (
                    <p className="text-gray-400 text-sm text-center py-4">
                      No additional media uploaded for this event.
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Attendees Section */}
            <Card className={`bg-white/10 backdrop-blur border-white/20 ${getCardClasses()}`}>
              <CardContent className="p-4 md:p-6">
                <h3 className="text-lg font-semibold text-yellow-400 mb-4">
                  Attendees ({attendees.length})
                </h3>

                {/* Search and Filter */}
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

                {/* Attendees Grid */}
                {attendeesLoading ? (
                  <div className="text-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-400 mx-auto mb-4"></div>
                    <p className="text-gray-400">Loading attendees...</p>
                  </div>
                ) : filteredAttendees.length > 0 ? (
                  <>
                    <div className="grid grid-cols-3 md:grid-cols-6 lg:grid-cols-8 gap-4">
                      {paginatedAttendees.map((attendee) => (
                        <AttendeeCard key={attendee.user_id} attendee={attendee} />
                      ))}
                    </div>

                    {/* Pagination Controls */}
                    {totalPages > 1 && (
                      <div className="flex items-center justify-center gap-4 mt-6 p-4 bg-white/5 rounded-lg">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                          disabled={currentPage === 1}
                          className="border-yellow-400/50 text-yellow-400 hover:bg-yellow-400/10 disabled:opacity-50"
                        >
                          <ChevronLeft className="h-4 w-4 mr-1" />
                          Previous
                        </Button>

                        <span className="text-gray-400 text-sm">
                          Page {currentPage} of {totalPages} ({filteredAttendees.length} total)
                        </span>

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                          disabled={currentPage === totalPages}
                          className="border-yellow-400/50 text-yellow-400 hover:bg-yellow-400/10 disabled:opacity-50"
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
                          ? "Try adjusting your filters"
                          : "Be the first to join this event!"}
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EventDetails;
