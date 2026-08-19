import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import { useAppContext } from "@/contexts/AppContext";
import { useMobileLayout } from "@/hooks/use-mobile";
import EventTicketSelector from "@/components/EventTicketSelector";
import PhotoLightbox from "@/components/PhotoLightbox";
import VideoPlayerModal, { VideoThumbnail } from "@/components/VideoPlayerModal";
import { formatTime12Hour, formatTimeRange, formatDateForDisplay } from "@/lib/timeUtils";
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
  X,
  XCircle,
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
  males_price?: number;
  females_price?: number;
  max_attendees: number;
  current_attendees: number;
  free_spots_strippers: number;
  free_spots_exotics: number;
  free_normal: number;
  free_spots_males: number;
  free_spots_females: number;
  vip_tickets: number;
  vip_price: number;
  vip_sections: number;
  vip_section_price: number;
  vip_section_attendees: number;
  group_discount_price: number;
  group_capacity: number;
  description?: string;
  video_urls?: string[];
  additional_photos?: string[];
  host_user_id?: string;
  banner_video_url?: string;
}

interface HostProfile {
  id: string;
  username: string;
  profile_photo?: string;
  video_urls?: string[];
}

interface CurrentUser {
  id: string;
  username: string;
  user_type?: string;
  gender?: string;
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
  const { user: appUser, loading: appUserLoading } = useAppContext();
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
  const [hostProfile, setHostProfile] = useState<HostProfile | null>(null);

  // Lightbox states
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxPhotos, setLightboxPhotos] = useState<string[]>([]);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  // Video modal states
  const [videoModalOpen, setVideoModalOpen] = useState(false);
  const [selectedVideoUrl, setSelectedVideoUrl] = useState("");

  // Used free spots tracking
  const [usedFreeSpots, setUsedFreeSpots] = useState({ strippers: 0, exotics: 0, normal: 0, males: 0, females: 0 });

  // Payment status popup
  const [showPaymentSuccessDialog, setShowPaymentSuccessDialog] = useState(false);
  const [showPaymentErrorDialog, setShowPaymentErrorDialog] = useState(false);

  const ATTENDEES_PER_PAGE = 24;

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(attendeeSearch);
      setCurrentPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [attendeeSearch]);

  // Resolve current user (source of truth: AppContext)
  useEffect(() => {
    if (appUserLoading) return;

    if (appUser?.id && appUser.username) {
      setCurrentUser({ 
        id: appUser.id, 
        username: appUser.username,
        user_type: appUser.userType || (appUser as any).user_type || undefined,
        gender: appUser.gender || undefined
      });
      return;
    }

    // Fallback for legacy flows
    const savedUserData = sessionStorage.getItem("userData");
    if (savedUserData) {
      try {
        const userData = JSON.parse(savedUserData);
        if (userData?.id && userData?.username) {
          setCurrentUser({ 
            id: userData.id, 
            username: userData.username,
            user_type: userData.userType || userData.user_type || undefined,
            gender: userData.gender || undefined
          });
          return;
        }
      } catch (e) {
        console.error("Error parsing saved user data:", e);
      }
    }

    setCurrentUser(null);
  }, [appUserLoading, appUser?.id, appUser?.username]);

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

  // Handle payment status from PayPal redirect
  useEffect(() => {
    const paymentStatus = searchParams.get("payment");
    
    if (paymentStatus === "success") {
      setShowPaymentSuccessDialog(true);
      setIsUserRegistered(true);
      // Refresh attendees
      if (eventId) {
        fetchEventAttendees();
        fetchEventDetails();
      }
      // Clean URL
      const newParams = new URLSearchParams(searchParams);
      newParams.delete("payment");
      newParams.delete("tx");
      navigate(`/event-details?id=${eventId}`, { replace: true });
    } else if (paymentStatus === "error") {
      setShowPaymentErrorDialog(true);
      // Clean URL
      const newParams = new URLSearchParams(searchParams);
      newParams.delete("payment");
      newParams.delete("message");
      navigate(`/event-details?id=${eventId}`, { replace: true });
    }
  }, [searchParams, eventId, navigate]);

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

      // Get total attendee count including guests (sum of ticket_quantity)
      const { data: attendeeData } = await supabase
        .from("user_events")
        .select("ticket_quantity")
        .eq("event_id", eventId);

      // Sum all ticket quantities to get total attendees + guests
      const totalAttendees = (attendeeData || []).reduce(
        (sum, record) => sum + (record.ticket_quantity || 1), 
        0
      );

      setEvent({
        ...eventData,
        current_attendees: totalAttendees,
      } as Event);

      // Fetch host profile if host_user_id exists
      if (eventData.host_user_id) {
        const { data: hostData } = await supabase
          .from("public_user_profiles")
          .select("id, username, profile_photo, video_urls")
          .eq("id", eventData.host_user_id)
          .single();
        
        if (hostData) {
          setHostProfile(hostData as HostProfile);
        }
      }

      // Calculate used free spots
      await calculateUsedFreeSpots(eventId);
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

  const calculateUsedFreeSpots = async (eventId: string) => {
    try {
      const { data: registrations } = await supabase
        .from("user_events")
        .select("user_id, ticket_type, ticket_quantity")
        .eq("event_id", eventId)
        .eq("payment_status", "free");

      if (!registrations || registrations.length === 0) {
        setUsedFreeSpots({ strippers: 0, exotics: 0, normal: 0, males: 0, females: 0 });
        return;
      }

      // Get user types for free registrations
      const userIds = registrations.map(r => r.user_id);
      const { data: users } = await supabase
        .from("public_user_profiles")
        .select("id, user_type, gender")
        .in("id", userIds);

      const counts = { strippers: 0, exotics: 0, normal: 0, males: 0, females: 0 };
      
      // Count people (1 per registration), not tickets
      (registrations || []).forEach(reg => {
        const user = (users || []).find(u => u.id === reg.user_id);
        
        if (user?.user_type === "stripper") counts.strippers += 1;
        else if (user?.user_type === "exotic") counts.exotics += 1;
        else if (user?.user_type === "male" || user?.gender === "male") counts.males += 1;
        else if (user?.user_type === "female" || user?.user_type === "normal" || user?.gender === "female") counts.females += 1;
        else counts.normal += 1;
      });

      setUsedFreeSpots(counts);
    } catch (error) {
      console.error("Error calculating used free spots:", error);
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
      
      // Type filter - consolidate male/female/normal into "normal"
      let matchesType = attendeeTypeFilter === "all";
      if (attendeeTypeFilter === "normal") {
        const userType = (attendee.users.user_type || '').toLowerCase();
        matchesType = ['male', 'female', 'normal', ''].includes(userType);
      } else if (attendeeTypeFilter !== "all") {
        matchesType = (attendee.users.user_type || '').toLowerCase() === attendeeTypeFilter;
      }
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

  const openPhotoLightbox = (photos: string[], index: number) => {
    setLightboxPhotos(photos);
    setLightboxIndex(index);
    setLightboxOpen(true);
  };

  const openVideoModal = (videoUrl: string) => {
    setSelectedVideoUrl(videoUrl);
    setVideoModalOpen(true);
  };

  const handleFreeRegister = async (guestName?: string) => {
    if (!currentUser || !event) return;
    
    // Determine spots to deduct based on guest name
    const hasGuest = guestName && guestName.trim() !== "" && guestName.trim().toLowerCase() !== "none";
    const spotsToDeduct = hasGuest ? 2 : 1;
    
    const { error } = await supabase
      .from("user_events")
      .insert({
        user_id: currentUser.id,
        event_id: event.id,
        username: currentUser.username,
        payment_status: "free",
        ticket_type: "free",
        guest_name: hasGuest ? guestName.trim() : null,
        ticket_quantity: spotsToDeduct,
      });
    
    if (error) throw error;
    
    // Free spots are now calculated from registrations, no need to update event fields
    
    setIsUserRegistered(true);
    toast({
      title: "Registered!",
      description: `You're now registered for ${event.name}${hasGuest ? ` with ${guestName}` : ""}`,
    });
    fetchEventAttendees();
    setEvent(prev => prev ? {
      ...prev,
      current_attendees: prev.current_attendees + spotsToDeduct
    } : null);
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

  // Collect all photos for lightbox
  const allPhotos = [
    event.photo_url,
    ...(event.additional_photos || []),
  ].filter(Boolean) as string[];

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 text-white overflow-y-auto">
      {/* Payment Success Dialog */}
      <Dialog open={showPaymentSuccessDialog} onOpenChange={setShowPaymentSuccessDialog}>
        <DialogContent className="bg-gray-900 border-gray-700 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-center text-2xl">
              <CheckCircle className="h-16 w-16 text-green-400 mx-auto mb-4" />
              <span className="text-green-400">Payment Successful!</span>
            </DialogTitle>
          </DialogHeader>
          <div className="text-center py-4">
            <p className="text-gray-300 text-lg mb-2">You're going to {event?.name}!</p>
            <p className="text-gray-400">Your ticket has been confirmed.</p>
          </div>
          <DialogFooter>
            <Button
              onClick={() => setShowPaymentSuccessDialog(false)}
              className="w-full bg-green-500 hover:bg-green-600 text-white font-bold"
            >
              Got it!
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Payment Error Dialog */}
      <Dialog open={showPaymentErrorDialog} onOpenChange={setShowPaymentErrorDialog}>
        <DialogContent className="bg-gray-900 border-gray-700 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-center text-2xl">
              <XCircle className="h-16 w-16 text-red-400 mx-auto mb-4" />
              <span className="text-red-400">Payment Failed</span>
            </DialogTitle>
          </DialogHeader>
          <div className="text-center py-4">
            <p className="text-gray-300 text-lg mb-2">Something went wrong with your payment.</p>
            <p className="text-gray-400">Please try again or use a different payment method.</p>
          </div>
          <DialogFooter>
            <Button
              onClick={() => setShowPaymentErrorDialog(false)}
              className="w-full bg-yellow-400 text-black hover:bg-yellow-500 font-bold"
            >
              Try Again
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Photo Lightbox */}
      <PhotoLightbox
        photos={lightboxPhotos}
        initialIndex={lightboxIndex}
        isOpen={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
      />

      {/* Video Modal */}
      <VideoPlayerModal
        videoUrl={selectedVideoUrl}
        isOpen={videoModalOpen}
        onClose={() => setVideoModalOpen(false)}
      />

      <div className={`${getContainerClasses()} pb-8`}>
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

        {/* Event Banner - Photo or Video (prioritize banner_video_url) */}
        <div className="px-4 pb-4">
          <div className="relative rounded-xl overflow-hidden">
            {/* Banner Video (if available - prioritize banner_video_url) */}
            {event.banner_video_url ? (
              <div 
                className="relative w-full cursor-pointer group"
                onClick={() => openVideoModal(event.banner_video_url!)}
              >
                <video
                  className="w-full h-auto"
                  autoPlay
                  loop
                  muted
                  playsInline
                >
                  <source src={event.banner_video_url} type="video/mp4" />
                </video>
                {/* Play Button Overlay */}
                <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/40 transition-colors">
                  <div className="w-20 h-20 rounded-full bg-white/90 flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg">
                    <Play className="h-10 w-10 text-black fill-black ml-1" />
                  </div>
                </div>
              </div>
            ) : (
              /* Photo Banner */
              <img
                src={event.photo_url || "/placeholder.svg"}
                alt={event.name}
                className="w-full h-full object-cover cursor-pointer"
                onClick={() => openPhotoLightbox(allPhotos, 0)}
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.src = "/placeholder.svg";
                }}
              />
            )}
            
            {/* Host Profile Overlay */}
            {hostProfile && (
              <div className="absolute bottom-4 left-4 flex items-center gap-3 bg-black/60 backdrop-blur-sm rounded-lg p-3">
                <img
                  src={hostProfile.profile_photo || "/placeholder.svg"}
                  alt={hostProfile.username}
                  className="w-12 h-12 rounded-full object-cover border-2 border-yellow-400"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.src = "/placeholder.svg";
                  }}
                />
                <div>
                  <p className="text-xs text-gray-300">Hosted by</p>
                  <p className="text-sm font-bold text-yellow-400">@{hostProfile.username}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Event Header */}
        <div className="px-4 pb-6">
          <h1 className="text-2xl md:text-3xl font-bold text-yellow-400 mb-2">{event.name}</h1>
          <div className="flex flex-wrap gap-2 items-center">
            {event.genre && (
              <Badge className="bg-purple-500/50 text-white">{event.genre}</Badge>
            )}
            <Badge className="bg-yellow-400/20 text-yellow-400 border-yellow-400/50">
              {event.current_attendees}/{event.max_attendees} Attending
            </Badge>
            
            {/* Going/Not Going Indicator */}
            {isUserRegistered ? (
              <span className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-green-500 text-white font-bold text-sm">
                <CheckCircle className="h-4 w-4" />
                Going
              </span>
            ) : currentUser && (
              <span className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-red-500 text-white font-bold text-sm">
                <X className="h-4 w-4" />
                Not Going
              </span>
            )}
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
                      <span>{formatDateForDisplay(event.date)}</span>
                    </div>
                    <div className="flex items-center gap-3 p-3 bg-white/5 rounded-lg">
                      <Clock className="h-5 w-5 text-yellow-400 flex-shrink-0" />
                      <span>{formatTimeRange(event.start_time, event.end_time)}</span>
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
                        <span className="text-gray-400 text-sm">General Admission</span>
                      </div>
                    )}
                    <div className="flex items-center gap-3 p-3 bg-white/5 rounded-lg">
                      <Users className="h-5 w-5 text-yellow-400 flex-shrink-0" />
                      <span>{event.current_attendees}/{event.max_attendees} attending</span>
                    </div>
                    {/* Free Spots Display - Filtered by user type */}
                    {(() => {
                      const userType = currentUser?.user_type || 'normal';
                      const userGender = currentUser?.gender || 'male';
                      
                      // Gender-specific free spots for normal/male/female users
                      const remainingFreeMales = Math.max(0, (event.free_spots_males || 0) - (usedFreeSpots.males || 0));
                      const remainingFreeFemales = Math.max(0, (event.free_spots_females || 0) - (usedFreeSpots.females || 0));
                      
                      // Exotic and Stripper from DB values
                      const remainingExoticFree = Math.max(0, (event.free_spots_exotics || 0) - (usedFreeSpots.exotics || 0));
                      const remainingStripperFree = Math.max(0, (event.free_spots_strippers || 0) - (usedFreeSpots.strippers || 0));
                      
                      // Determine which free spots are relevant to this user
                      const showMaleFree = userType !== 'exotic' && userType !== 'stripper' && userGender !== 'female' && remainingFreeMales > 0;
                      const showFemaleFree = userType !== 'exotic' && userType !== 'stripper' && userGender === 'female' && remainingFreeFemales > 0;
                      const showExotic = userType === 'exotic' && remainingExoticFree > 0;
                      const showStripper = userType === 'stripper' && remainingStripperFree > 0;
                      
                      const hasRelevantFreeSpots = showMaleFree || showFemaleFree || showExotic || showStripper;
                      
                      return hasRelevantFreeSpots ? (
                        <div className="space-y-2">
                          {showMaleFree && (
                            <div className="flex items-center gap-3 p-3 bg-green-500/20 rounded-lg">
                              <Ticket className="h-5 w-5 text-green-400 flex-shrink-0" />
                              <span className="text-green-400 font-bold">Free Males: {remainingFreeMales}</span>
                            </div>
                          )}
                          {showFemaleFree && (
                            <div className="flex items-center gap-3 p-3 bg-green-500/20 rounded-lg">
                              <Ticket className="h-5 w-5 text-green-400 flex-shrink-0" />
                              <span className="text-green-400 font-bold">Free Females: {remainingFreeFemales}</span>
                            </div>
                          )}
                          {showExotic && (
                            <div className="flex items-center gap-3 p-3 bg-pink-500/20 rounded-lg">
                              <Ticket className="h-5 w-5 text-pink-400 flex-shrink-0" />
                              <span className="text-pink-400 font-bold">Free Exotic: {remainingExoticFree}</span>
                            </div>
                          )}
                          {showStripper && (
                            <div className="flex items-center gap-3 p-3 bg-purple-500/20 rounded-lg">
                              <Ticket className="h-5 w-5 text-purple-400 flex-shrink-0" />
                              <span className="text-purple-400 font-bold">Free Stripper: {remainingStripperFree}</span>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="flex items-center gap-3 p-3 bg-yellow-500/20 rounded-lg">
                          <Ticket className="h-5 w-5 text-yellow-400 flex-shrink-0" />
                          <span className="text-yellow-400 font-bold">Paid Only</span>
                        </div>
                      );
                    })()}
                  </div>

                  {event.description && (
                    <div className="mt-6">
                      <h4 className="font-semibold text-gray-300 mb-3">Description</h4>
                      <p className="text-gray-300 text-sm leading-relaxed p-3 bg-white/5 rounded-lg whitespace-pre-wrap">
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

                    {/* Debug info - logged in console */}
                    {(() => {
                      console.log("EventDetails Ticket Section Debug:", {
                        currentUser,
                        isUserRegistered,
                        checkingRegistration,
                        appUserLoading,
                        eventCurrentAttendees: event.current_attendees,
                        eventMaxAttendees: event.max_attendees,
                        usedFreeSpots
                      });
                      return null;
                    })()}

                    {/* Already Registered */}
                    {isUserRegistered ? (
                      <div className="flex items-center gap-2 p-4 bg-green-500 rounded-lg">
                        <CheckCircle className="h-5 w-5 text-white" />
                        <span className="text-white font-bold">Going</span>
                      </div>
                    ) : event.current_attendees >= event.max_attendees ? (
                      /* Sold Out */
                      <div className="flex items-center gap-2 p-4 bg-red-500 rounded-lg">
                        <X className="h-5 w-5 text-white" />
                        <span className="text-white font-bold">Sold Out</span>
                      </div>
                    ) : checkingRegistration || appUserLoading ? (
                      /* Loading state - show while checking */
                      <div className="flex items-center justify-center gap-2 p-4 bg-white/5 rounded-lg">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-yellow-400"></div>
                        <span className="text-gray-300 text-sm">Loading tickets...</span>
                      </div>
                    ) : currentUser ? (
                      /* Ticket Selector */
                      <EventTicketSelector
                        event={event}
                        currentUser={currentUser}
                        userType={currentUser.user_type}
                        userGender={currentUser.gender}
                        usedFreeSpots={usedFreeSpots}
                        onSuccess={() => {
                          setIsUserRegistered(true);
                          fetchEventAttendees();
                          setEvent(prev => prev ? {
                            ...prev,
                            current_attendees: prev.current_attendees + 1
                          } : null);
                        }}
                        onError={(error) => {
                          toast({
                            title: "Error",
                            description: error,
                            variant: "destructive",
                          });
                        }}
                        onFreeRegister={handleFreeRegister}
                      />
                    ) : (
                      /* Not logged in - show login button */
                      <div className="space-y-3">
                        <p className="text-gray-400 text-sm text-center">
                          Please log in to purchase a ticket
                        </p>
                        <Button
                          onClick={() => navigate("/login")}
                          className="w-full bg-yellow-400 text-black hover:bg-yellow-500"
                        >
                          Log In to Register
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Media Gallery */}
              <Card className={`bg-white/10 backdrop-blur border-white/20 ${getCardClasses()}`}>
                <CardContent className="p-4 md:p-6">
                  <h3 className="text-lg font-semibold text-yellow-400 mb-4">Media</h3>

                  {/* Main Photo - Clickable */}
                  <img
                    src={event.photo_url || "/placeholder.svg"}
                    alt={event.name}
                    className="w-full h-48 md:h-56 object-cover rounded-lg mb-4 cursor-pointer hover:opacity-90 transition-opacity"
                    onClick={() => openPhotoLightbox(allPhotos, 0)}
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.src = "/placeholder.svg";
                    }}
                  />

                  {/* Additional Photos - Clickable */}
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
                            className="w-full h-20 md:h-24 object-cover rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                            onClick={() => openPhotoLightbox(allPhotos, index + 1)}
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.src = "/placeholder.svg";
                            }}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Videos - With Play Button Overlay */}
                  {event.video_urls && event.video_urls.filter(Boolean).length > 0 && (
                    <div>
                      <h4 className="font-semibold text-gray-300 mb-3 text-sm flex items-center gap-2">
                        <Play className="h-4 w-4" />
                        Videos ({event.video_urls.filter(Boolean).length})
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {event.video_urls.filter(Boolean).map((video, index) => (
                          <VideoThumbnail
                            key={index}
                            videoUrl={video}
                            className="h-32 md:h-40"
                            onClick={() => openVideoModal(video)}
                          />
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
                  Registered Users ({attendees.length})
                  {event && event.current_attendees > attendees.length && (
                    <span className="text-sm text-gray-400 font-normal ml-2">
                      ({event.current_attendees} total including guests)
                    </span>
                  )}
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
                    className="bg-gray-900 border border-white/20 rounded-md px-3 py-2 text-white"
                  >
                    <option value="all" className="bg-gray-900 text-white">All Types</option>
                    <option value="normal" className="bg-gray-900 text-white">Normal Male and Female</option>
                    <option value="exotic" className="bg-gray-900 text-white">Exotic Dancers</option>
                    <option value="stripper" className="bg-gray-900 text-white">Strippers</option>
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
