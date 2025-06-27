import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import AuthGuard from "@/components/AuthGuard";
import {
  Search,
  MapPin,
  Users,
  Calendar,
  Check,
  X,
  Eye,
  DollarSign,
  Clock,
  Play,
  Image as ImageIcon,
} from "lucide-react";

interface Attendee {
  user_id: string;
  users: {
    username: string;
    profile_photo: string;
    user_type: "stripper" | "exotic" | "male" | "female" | "normal";
    city: string;
    state: string;
  };
}

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
  free_spots_strippers: number;
  free_spots_exotics: number;
  max_attendees: number;
  current_attendees: number;
  description?: string;
  video_urls?: string[];
  additional_photos?: string[];
  attendees?: Attendee[];
  isUserAttending?: boolean;
}

const EventsDimesOnly: React.FC = () => {
  const { user, setUser, loading: userLoading } = useAppContext();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const [events, setEvents] = useState<Event[]>([]);
  const [filteredEvents, setFilteredEvents] = useState<Event[]>([]);
  const [searchCity, setSearchCity] = useState("");
  const [searchState, setSearchState] = useState("");
  const [searchMonth, setSearchMonth] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [showAttendDialog, setShowAttendDialog] = useState(false);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [guestName, setGuestName] = useState("");
  const [attendeeSearch, setAttendeeSearch] = useState("");
  const [attendeeFilter, setAttendeeFilter] = useState("all");
  const eventsPerPage = 20;

  // Get referrer from URL params
  const referrer = searchParams.get("ref") || "";
  const paymentStatus = searchParams.get("payment");
  const paypalToken = searchParams.get("token");
  const payerId = searchParams.get("PayerID");
  const guestNameFromUrl = searchParams.get("guestName") || "";

  // Check access control - only strippers and exotics
  const canViewPage =
    !userLoading &&
    user &&
    (user.userType === "stripper" || user.userType === "exotic");

  console.log("EventsDimesOnly access control check:", {
    userLoading,
    user: user
      ? { id: user.id, username: user.username, userType: user.userType }
      : null,
    canViewPage,
    referrer,
  });

  // Handle payment success from PayPal return
  useEffect(() => {
    const handlePaymentSuccess = async () => {
      if (paymentStatus === "success" && paypalToken && payerId && user) {
        console.log("Processing PayPal return:", {
          paymentStatus,
          paypalToken,
          payerId,
        });

        try {
          // Find the most recent payment for this user
          const { data: payments, error: fetchError } = await supabase
            .from("payments")
            .select("*")
            .eq("user_id", user.id)
            .in("payment_status", ["pending", "completed"])
            .order("created_at", { ascending: false })
            .limit(3);

          if (fetchError) throw fetchError;

          if (payments && payments.length > 0) {
            const payment = payments[0];
            console.log(
              "Found payment:",
              payment.id,
              "Status:",
              payment.payment_status
            );

            // If payment is still pending, show processing message and wait
            if (payment.payment_status === "pending") {
              toast({
                title: "Payment Processing",
                description:
                  "Your payment is being processed by PayPal. Please wait...",
              });

              // Poll for payment completion (webhook should update it)
              let pollAttempts = 0;
              const maxPollAttempts = 15; // 30 seconds total

              const pollPaymentStatus = async () => {
                pollAttempts++;

                const { data: updatedPayment } = await supabase
                  .from("payments")
                  .select(
                    "payment_status, referrer_commission, event_host_commission"
                  )
                  .eq("id", payment.id)
                  .single();

                console.log(
                  "Poll attempt",
                  pollAttempts,
                  "Payment status:",
                  updatedPayment?.payment_status
                );

                if (updatedPayment?.payment_status === "completed") {
                  // Check if user is already in the event
                  const { data: existingEntry } = await supabase
                    .from("user_events")
                    .select("id")
                    .eq("user_id", payment.user_id)
                    .eq("event_id", payment.event_id)
                    .single();

                  if (existingEntry) {
                    toast({
                      title: "Payment Successful!",
                      description: "You have successfully joined the event.",
                    });
                    fetchEvents();
                    window.history.replaceState(
                      {},
                      document.title,
                      window.location.pathname
                    );
                    return;
                  }
                }

                if (pollAttempts < maxPollAttempts) {
                  setTimeout(pollPaymentStatus, 2000); // Check every 2 seconds
                } else {
                  // Fallback: manually process the payment
                  console.log("Webhook timeout, processing payment manually");

                  // Calculate commission amounts
                  const totalAmount = Number(payment.amount) || 0;
                  const referrerAmount = payment.referred_by
                    ? totalAmount * 0.2
                    : 0; // 20%
                  const hostAmount = totalAmount * 0.1; // 10%

                  console.log("Calculated commissions:", {
                    referrer: referrerAmount,
                    host: hostAmount,
                    total: totalAmount,
                  });

                  const { error: updateError } = await supabase
                    .from("payments")
                    .update({
                      payment_status: "completed",
                      referrer_commission: referrerAmount,
                      event_host_commission: hostAmount,
                      updated_at: new Date().toISOString(),
                    })
                    .eq("id", payment.id);

                  if (!updateError) {
                    // Check if user is already in the event
                    const { data: existingEntry } = await supabase
                      .from("user_events")
                      .select("id")
                      .eq("user_id", payment.user_id)
                      .eq("event_id", payment.event_id)
                      .single();

                    if (!existingEntry) {
                      const { error } = await supabase
                        .from("user_events")
                        .insert({
                          user_id: payment.user_id,
                          event_id: payment.event_id,
                          username: user.username,
                          payment_status: "paid",
                          payment_id: payment.id,
                          referred_by: payment.referred_by,
                          guest_name: guestNameFromUrl || guestName || null,
                        });

                      if (!error) {
                        toast({
                          title: "Payment Successful!",
                          description:
                            "You have successfully joined the event.",
                        });
                        fetchEvents();
                        window.history.replaceState(
                          {},
                          document.title,
                          window.location.pathname
                        );
                      }
                    }
                  }
                }
              };

              // Start polling after 2 seconds
              setTimeout(pollPaymentStatus, 2000);
              return;
            }

            // If payment is already completed, just check if user is in event
            if (payment.payment_status === "completed") {
              const { data: existingEntry } = await supabase
                .from("user_events")
                .select("id")
                .eq("user_id", payment.user_id)
                .eq("event_id", payment.event_id)
                .single();

              if (existingEntry) {
                toast({
                  title: "Payment Successful!",
                  description: "You have successfully joined the event.",
                });
                fetchEvents();
                window.history.replaceState(
                  {},
                  document.title,
                  window.location.pathname
                );
              } else {
                toast({
                  title: "Processing Complete",
                  description: "Adding you to the event...",
                });
                // Refresh after a short delay
                setTimeout(() => {
                  fetchEvents();
                  window.location.reload();
                }, 2000);
              }
            }
          }
        } catch (error) {
          console.error("Error processing payment return:", error);
          toast({
            title: "Payment Processing Error",
            description:
              "There was an issue processing your payment. Please contact support.",
            variant: "destructive",
          });
        }
      }
    };

    if (paymentStatus) {
      handlePaymentSuccess();
    }
  }, [paymentStatus, paypalToken, payerId, user, guestName, guestNameFromUrl]);

  useEffect(() => {
    if (canViewPage) {
      fetchEvents();
    }
  }, [canViewPage]);

  useEffect(() => {
    filterEvents();
  }, [events, searchCity, searchState, searchMonth]);

  const fetchEvents = async () => {
    try {
      const { data: eventsData, error: eventsError } = await supabase
        .from("events")
        .select("*")
        .gte("date", new Date().toISOString().split("T")[0])
        .order("date");

      if (eventsError) throw eventsError;

      // Get user's attending events
      const { data: userEvents, error: userEventsError } = await supabase
        .from("user_events")
        .select("event_id")
        .eq("user_id", user?.id);

      if (userEventsError) throw userEventsError;

      const attendingEventIds = userEvents?.map((ue) => ue.event_id) || [];

      // Get current attendee counts for each event
      const eventsWithCounts = await Promise.all(
        (eventsData || []).map(async (event) => {
          const { count } = await supabase
            .from("user_events")
            .select("*", { count: "exact", head: true })
            .eq("event_id", event.id);

          return {
            ...event,
            current_attendees: count || 0,
            isUserAttending: attendingEventIds.includes(event.id),
            video_urls: event.video_urls || [],
            additional_photos: event.additional_photos || [],
          };
        })
      );

      setEvents(eventsWithCounts as Event[]);
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

  const filterEvents = () => {
    let filtered = events;

    if (searchCity) {
      filtered = filtered.filter((event) =>
        event.city.toLowerCase().includes(searchCity.toLowerCase())
      );
    }

    if (searchState) {
      filtered = filtered.filter((event) =>
        event.state.toLowerCase().includes(searchState.toLowerCase())
      );
    }

    if (searchMonth && searchMonth !== "all") {
      filtered = filtered.filter((event) => {
        const eventDate = new Date(event.date);
        const eventMonth = eventDate.getMonth() + 1; // getMonth() returns 0-11
        return eventMonth.toString() === searchMonth;
      });
    }

    setFilteredEvents(filtered);
    setCurrentPage(1);
  };

  const handleDetailsClick = async (event: Event) => {
    const attendees = await fetchEventAttendees(event.id);
    setSelectedEvent({ ...event, attendees });
    setShowDetailsDialog(true);
  };

  const handleAttendClick = async (event: Event) => {
    if (event.isUserAttending) {
      toast({
        title: "Already Attending",
        description: "You are already registered for this event.",
        variant: "destructive",
      });
      return;
    }

    setSelectedEvent(event);

    // Check if event is full
    const availableSpots = Math.max(
      0,
      event.max_attendees - event.current_attendees
    );
    if (availableSpots === 0) {
      toast({
        title: "Event Full",
        description: "This event is sold out.",
        variant: "destructive",
      });
      return;
    }

    // Always show the attendance dialog for confirmation
    setShowAttendDialog(true);
  };

  const handleConfirmAttendance = async () => {
    if (!selectedEvent || !user) return;

    try {
      const freeSpots =
        (selectedEvent.free_spots_strippers || 0) +
        (selectedEvent.free_spots_exotics || 0);

      if (freeSpots > 0) {
        // Free attendance
        const { error } = await supabase.from("user_events").insert({
          user_id: user.id,
          event_id: selectedEvent.id,
          username: user.username,
          payment_status: "free",
          referred_by: referrer || null,
          guest_name: guestName || null,
        });

        if (error) throw error;

        // Update free spots
        const userType = user.userType;
        const updateField =
          userType === "stripper"
            ? "free_spots_strippers"
            : "free_spots_exotics";
        const currentSpots = selectedEvent[updateField] || 0;

        if (currentSpots > 0) {
          const { error: updateError } = await supabase
            .from("events")
            .update({
              [updateField]: Math.max(0, currentSpots - 1),
            })
            .eq("id", selectedEvent.id);

          if (updateError) throw updateError;
        }

        toast({
          title: "Success!",
          description: "You have successfully joined the event for free!",
        });

        setShowAttendDialog(false);
        setGuestName("");
        fetchEvents();
      } else {
        // Paid attendance - redirect to PayPal
        await handlePayPalPayment();
      }
    } catch (error) {
      console.error("Error joining event:", error);
      toast({
        title: "Error",
        description: "Failed to join event. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handlePayPalPayment = async () => {
    if (!selectedEvent || !user) return;

    try {
      // Create payment record
      const { data: payment, error: paymentError } = await supabase
        .from("payments")
        .insert({
          user_id: user.id,
          event_id: selectedEvent.id,
          amount: selectedEvent.price,
          payment_status: "pending",
          referred_by: referrer || null,
          payment_type: "event_ticket",
        })
        .select()
        .single();

      if (paymentError) throw paymentError;

      // Create PayPal order using Supabase Edge Function
      const { data: paypalData, error: paypalError } =
        await supabase.functions.invoke("create-paypal-order", {
          body: {
            eventId: selectedEvent.id,
            userId: user.id,
            paymentId: payment.id,
            amount: selectedEvent.price,
            referrer: referrer || null,
            guestName: guestName || null,
            description: `Event Ticket: ${selectedEvent.name}`,
            returnUrl: `${
              window.location.origin
            }/events-dimes-only?payment=success&guestName=${encodeURIComponent(
              guestName || ""
            )}`,
            cancelUrl: `${window.location.origin}/events-dimes-only?payment=cancelled`,
          },
        });

      if (paypalError) {
        console.error("PayPal API Error:", paypalError);
        throw new Error(
          `Failed to create PayPal order: ${paypalError.message}`
        );
      }

      console.log("PayPal API Response:", paypalData);
      const { approval_url } = paypalData;

      if (approval_url) {
        // Redirect to PayPal
        window.location.href = approval_url;
      } else {
        throw new Error("No approval URL received from PayPal");
      }
    } catch (error) {
      console.error("Error creating PayPal payment:", error);
      toast({
        title: "Payment Error",
        description: "Failed to create payment. Please try again.",
        variant: "destructive",
      });
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

      return (data as unknown as Attendee[]) || [];
    } catch (error) {
      console.error("Error fetching attendees:", error);
      return [];
    }
  };

  const getFilteredAttendees = (attendees: Attendee[]) => {
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

      const matchesFilter =
        attendeeFilter === "all" ||
        (attendeeFilter === "stripper" &&
          attendee.users.user_type === "stripper") ||
        (attendeeFilter === "exotic" &&
          attendee.users.user_type === "exotic") ||
        (attendeeFilter === "male" && attendee.users.user_type === "male") ||
        (attendeeFilter === "female" &&
          ["female", "normal"].includes(attendee.users.user_type));

      return matchesSearch && matchesFilter;
    });
  };

  // Check if user is in the first 300 (diamond+ tier)
  const isDiamondPlus = user?.membershipType === "diamond_plus" || false;

  const getAttendanceMessage = () => {
    const freeSpots =
      (selectedEvent?.free_spots_strippers || 0) +
      (selectedEvent?.free_spots_exotics || 0);

    if (isDiamondPlus) {
      // Diamond+ members (first 300) always get the $500 guaranteed pay message
      return "By confirming your participation to this event you agree to being deducted $500 from your guaranteed pay of $6,250 if you do not attend. If you agree, type in your 1 guest first and last name that will attend with you free or 'none' to receive your ticket(s).";
    } else {
      // Regular strippers/exotics (after first 300)
      if (freeSpots > 0) {
        // First 5 get free spots for each event
        return "By confirming your participation to this event you agree to attend. Type the first and last name of your 1 guest that will attend with you free or 'none' to receive your ticket(s).";
      } else {
        // Free positions are gone, must purchase
        return "Free positions are gone! Do you want to purchase this ticket? Click yes to proceed. Type the first and last name of your 1 guest that will attend with you or 'none' to receive your ticket(s).";
      }
    }
  };

  const getAvailableSpots = (event: Event | null) => {
    if (!event) return 0;
    return Math.max(0, event.max_attendees - event.current_attendees);
  };

  const getFreeSpots = (event: Event | null) => {
    if (!event) return 0;
    return (event.free_spots_strippers || 0) + (event.free_spots_exotics || 0);
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
              <p className="text-white mb-4">
                This page is only available to Strippers and Exotic dancers.
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
              Events for Strippers & Exotics
            </h1>
            <p className="text-gray-300 text-sm md:text-base">
              Choose which events you want to attend
            </p>
            {referrer && (
              <p className="text-yellow-300 text-sm mt-2">
                Referred by: @{referrer}
              </p>
            )}
            {isDiamondPlus && (
              <div className="mt-4 p-3 bg-gradient-to-r from-yellow-400/20 to-yellow-600/20 rounded-lg border border-yellow-400/30">
                <p className="text-yellow-300 font-semibold text-sm">
                  💎 Diamond+ Member - Guaranteed $6,250 Quarterly Pay
                </p>
              </div>
            )}
          </div>

          {/* Search Filters - Mobile optimized with Month filter */}
          <Card className="bg-white/10 backdrop-blur border-white/20 mb-6">
            <CardContent className="p-4 md:p-6">
              <h2 className="text-lg md:text-xl font-bold text-yellow-400 mb-4 flex items-center gap-2">
                <Search className="h-5 w-5" />
                Filter Events
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
                <div className="relative">
                  <MapPin className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search by city"
                    value={searchCity}
                    onChange={(e) => setSearchCity(e.target.value)}
                    className="pl-10 bg-white/10 border-white/20 text-white placeholder-gray-400"
                  />
                </div>
                <Input
                  placeholder="Search by state"
                  value={searchState}
                  onChange={(e) => setSearchState(e.target.value)}
                  className="bg-white/10 border-white/20 text-white placeholder-gray-400"
                />
                <Select value={searchMonth} onValueChange={setSearchMonth}>
                  <SelectTrigger className="bg-white/10 border-white/20 text-white">
                    <SelectValue placeholder="Filter by month" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-700">
                    <SelectItem value="all">All Months</SelectItem>
                    <SelectItem value="1">January</SelectItem>
                    <SelectItem value="2">February</SelectItem>
                    <SelectItem value="3">March</SelectItem>
                    <SelectItem value="4">April</SelectItem>
                    <SelectItem value="5">May</SelectItem>
                    <SelectItem value="6">June</SelectItem>
                    <SelectItem value="7">July</SelectItem>
                    <SelectItem value="8">August</SelectItem>
                    <SelectItem value="9">September</SelectItem>
                    <SelectItem value="10">October</SelectItem>
                    <SelectItem value="11">November</SelectItem>
                    <SelectItem value="12">December</SelectItem>
                  </SelectContent>
                </Select>
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
                  <p className="text-gray-300">
                    No events match your search criteria or there are no
                    upcoming events.
                  </p>
                </CardContent>
              </Card>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 mb-8">
                {filteredEvents
                  .slice(
                    (currentPage - 1) * eventsPerPage,
                    currentPage * eventsPerPage
                  )
                  .map((event) => (
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
                          {event.isUserAttending ? (
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
                            <div className="bg-red-600 text-white px-2 py-1 rounded-full text-xs font-bold">
                              SOLD OUT
                            </div>
                          ) : getFreeSpots(event) > 0 ? (
                            <div className="bg-green-600 text-white px-2 py-1 rounded-full text-xs font-bold">
                              FREE: {getFreeSpots(event)}
                            </div>
                          ) : (
                            <div className="bg-yellow-600 text-white px-2 py-1 rounded-full text-xs font-bold">
                              ${event.price}
                            </div>
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
                          <h3 className="text-lg font-bold text-yellow-400 line-clamp-2 flex-1">
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
                            <span>
                              {new Date(event.date).toLocaleDateString()}
                            </span>
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
                              {event.city}, {event.state}
                            </span>
                          </div>
                        </div>

                        {/* Separate Details and Attend buttons */}
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1 border-white/20 text-white hover:bg-white/10 bg-transparent"
                            onClick={() => handleDetailsClick(event)}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            Details
                          </Button>
                          <Button
                            size="sm"
                            className={`flex-1 font-bold ${
                              event.isUserAttending
                                ? "bg-green-600 hover:bg-green-700 text-white"
                                : "bg-gradient-to-r from-yellow-400 to-yellow-600 hover:from-yellow-500 hover:to-yellow-700 text-black"
                            }`}
                            onClick={() => handleAttendClick(event)}
                            disabled={getAvailableSpots(event) === 0}
                          >
                            {event.isUserAttending
                              ? "Attending"
                              : getAvailableSpots(event) === 0
                              ? "Sold Out"
                              : getFreeSpots(event) > 0
                              ? "Attend"
                              : `Pay $${event.price}`}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
              </div>

              {/* Pagination - Mobile optimized */}
              {Math.ceil(filteredEvents.length / eventsPerPage) > 1 && (
                <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                  <p className="text-gray-300 text-sm text-center">
                    Showing {(currentPage - 1) * eventsPerPage + 1} to{" "}
                    {Math.min(
                      currentPage * eventsPerPage,
                      filteredEvents.length
                    )}{" "}
                    of {filteredEvents.length} events
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
                            Math.ceil(filteredEvents.length / eventsPerPage),
                            currentPage + 1
                          )
                        )
                      }
                      disabled={
                        currentPage ===
                        Math.ceil(filteredEvents.length / eventsPerPage)
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

      {/* Attendance Confirmation Dialog */}
      <Dialog open={showAttendDialog} onOpenChange={setShowAttendDialog}>
        <DialogContent className="bg-gray-900 border-gray-700 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-yellow-400">
              Confirm Event Attendance
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <p className="text-gray-300 text-sm leading-relaxed">
              {getAttendanceMessage()}
            </p>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Guest Name (optional - type "none" if no guest)
              </label>
              <Input
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                placeholder="Enter guest first and last name or 'none'"
                className="bg-white/10 border-white/20 text-white placeholder-gray-400"
              />
            </div>

            {!isDiamondPlus &&
              selectedEvent &&
              getFreeSpots(selectedEvent) === 0 && (
                <div className="text-xs text-gray-400 space-y-1">
                  <p>
                    • Referred by (@{referrer || "none"}) receives 20% of ticket
                    sale
                  </p>
                  <p>• Event performer receives 10% of ticket sale</p>
                </div>
              )}
          </div>

          <DialogFooter className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setShowAttendDialog(false);
                setGuestName("");
              }}
              className="border-white/20 text-white hover:bg-white/10 bg-transparent"
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmAttendance}
              className={`${
                selectedEvent && getFreeSpots(selectedEvent) > 0
                  ? "bg-green-600 hover:bg-green-700 text-white"
                  : "bg-yellow-600 hover:bg-yellow-700 text-black font-bold"
              }`}
            >
              {selectedEvent && getFreeSpots(selectedEvent) > 0 ? (
                isDiamondPlus ? (
                  "I Agree - Attend"
                ) : (
                  "I Agree - Attend Free"
                )
              ) : (
                <>
                  <DollarSign className="h-4 w-4 mr-1" />
                  Yes - Purchase Ticket ${selectedEvent?.price}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Event Details Dialog */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
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
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-yellow-400" />
                    <span>${selectedEvent?.price}</span>
                  </div>
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

                      {/* Future Watch Live Button */}
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
                <Select
                  value={attendeeFilter}
                  onValueChange={setAttendeeFilter}
                >
                  <SelectTrigger className="bg-white/10 border-white/20 text-white">
                    <SelectValue placeholder="Filter by type" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-700">
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="stripper">Strippers</SelectItem>
                    <SelectItem value="exotic">Exotics</SelectItem>
                    <SelectItem value="male">Males</SelectItem>
                    <SelectItem value="female">Females</SelectItem>
                  </SelectContent>
                </Select>
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
    </AuthGuard>
  );
};

export default EventsDimesOnly;
