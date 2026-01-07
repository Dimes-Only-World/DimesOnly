import React, { useState, useMemo } from "react";
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
import CreditCardForm from "@/components/CreditCardForm";
import { supabase } from "@/lib/supabaseClient";
import { Ticket, Users, Crown, Star, Minus, Plus, CreditCard, Loader2 } from "lucide-react";

type TicketType = "free" | "general" | "vip" | "vip_section";

interface EventTicketSelectorProps {
  event: {
    id: string;
    name: string;
    price: number;
    vip_price: number;
    vip_tickets: number;
    vip_sections: number;
    vip_section_price: number;
    vip_section_attendees: number;
    free_spots_strippers: number;
    free_spots_exotics: number;
    free_normal: number;
    max_attendees: number;
    current_attendees: number;
    host_user_id?: string;
  };
  currentUser: {
    id: string;
    username: string;
  };
  userType?: string;
  usedFreeSpots?: {
    strippers: number;
    exotics: number;
    normal: number;
  };
  onSuccess: (transactionId?: string) => void;
  onError: (error: string) => void;
  onFreeRegister: (guestName?: string) => Promise<void>;
}

const EventTicketSelector: React.FC<EventTicketSelectorProps> = ({
  event,
  currentUser,
  userType,
  usedFreeSpots = { strippers: 0, exotics: 0, normal: 0 },
  onSuccess,
  onError,
  onFreeRegister,
}) => {
  const [selectedType, setSelectedType] = useState<TicketType | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [isRegistering, setIsRegistering] = useState(false);
  const [showGuestDialog, setShowGuestDialog] = useState(false);
  const [guestName, setGuestName] = useState("");
  
  // Payment state
  const [showCardForm, setShowCardForm] = useState(false);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  
  // Credit card form state
  const [cardNumber, setCardNumber] = useState("");
  const [expiryMonth, setExpiryMonth] = useState("");
  const [expiryYear, setExpiryYear] = useState("");
  const [cvv, setCvv] = useState("");
  const [cardHolderName, setCardHolderName] = useState("");

  // Calculate available spots - unified free spots for members (male, female, normal)
  // All events have 10 free spots by default for members
  const availableFreeSpots = useMemo(() => {
    if (userType === "stripper") {
      return Math.max(0, event.free_spots_strippers - usedFreeSpots.strippers);
    } else if (userType === "exotic") {
      return Math.max(0, event.free_spots_exotics - usedFreeSpots.exotics);
    } else if (userType === "male" || userType === "female" || userType === "normal") {
      // All members share the same pool of free spots - always 10
      const totalMemberFreeSpots = 10; // Always 10 free spots for all events
      return Math.max(0, totalMemberFreeSpots - usedFreeSpots.normal);
    } else {
      // Unknown user type - use normal pool
      const totalMemberFreeSpots = event.free_normal || 10;
      return Math.max(0, totalMemberFreeSpots - usedFreeSpots.normal);
    }
  }, [event, userType, usedFreeSpots]);

  const remainingCapacity = event.max_attendees - event.current_attendees;
  const showFreeOption = availableFreeSpots > 0;
  const showGeneralOption = event.price > 0;
  const showVipOption = event.vip_tickets > 0 && event.vip_price > 0;
  const showVipSectionOption = event.vip_sections > 0 && event.vip_section_price > 0;

  // Calculate total price
  const totalPrice = useMemo(() => {
    if (!selectedType) return 0;
    switch (selectedType) {
      case "free":
        return 0;
      case "general":
        return event.price * quantity;
      case "vip":
        return event.vip_price * quantity;
      case "vip_section":
        return event.vip_section_price * quantity;
      default:
        return 0;
    }
  }, [selectedType, quantity, event]);

  // Max quantity based on selection
  const maxQuantity = useMemo(() => {
    if (!selectedType) return 1;
    switch (selectedType) {
      case "free":
        return Math.min(1, availableFreeSpots); // Free is always 1
      case "general":
        return Math.min(10, remainingCapacity);
      case "vip":
        return Math.min(event.vip_tickets, 10);
      case "vip_section":
        return Math.min(event.vip_sections, 5);
      default:
        return 1;
    }
  }, [selectedType, availableFreeSpots, remainingCapacity, event]);

  const handleQuantityChange = (delta: number) => {
    const newQty = Math.max(1, Math.min(maxQuantity, quantity + delta));
    setQuantity(newQty);
  };

  const handleFreeButtonClick = () => {
    setShowGuestDialog(true);
  };

  const handleConfirmFreeRegister = async () => {
    setIsRegistering(true);
    try {
      // Pass the guest name - if "none" or empty, only 1 attendee will be deducted
      await onFreeRegister(guestName.trim().toLowerCase() === "none" ? "" : guestName.trim());
      onSuccess();
      setShowGuestDialog(false);
      setGuestName("");
    } catch (err: any) {
      onError(err.message || "Registration failed");
    } finally {
      setIsRegistering(false);
    }
  };

  // PayPal redirect handler
  const handlePayWithPayPal = async (usePayLater = false) => {
    setIsProcessingPayment(true);
    setPaymentError(null);

    try {
      const baseUrl = window.location.origin;
      const returnParams = new URLSearchParams({
        event_id: event.id,
        buyer_id: currentUser.id,
        buyer_username: currentUser.username,
        ticket_type: selectedType || "general",
        ticket_quantity: quantity.toString(),
        amount: totalPrice.toString(),
      });
      
      const returnUrl = `${baseUrl}/event-payment-return?${returnParams.toString()}`;
      const cancelUrl = `${baseUrl}/event-details?id=${event.id}`;

      const { data, error } = await supabase.functions.invoke("create-paypal-order", {
        body: {
          payment_type: "event",
          event_id: event.id,
          user_id: currentUser.id,
          amount: totalPrice,
          description: `Event Ticket - ${event.name}`,
          return_url: returnUrl,
          cancel_url: cancelUrl,
        },
      });

      if (error || !data?.success || !data?.approval_url) {
        throw new Error(data?.error || "Failed to create PayPal order");
      }

      // Append fundingSource=paylater for Pay Later option
      let redirectUrl = data.approval_url;
      if (usePayLater) {
        redirectUrl = `${data.approval_url}&fundingSource=paylater`;
      }

      // Redirect to PayPal - use top-level window to avoid iframe issues
      if (window.top && window.top !== window) {
        window.top.location.assign(redirectUrl);
      } else {
        window.location.assign(redirectUrl);
      }
    } catch (err: any) {
      setPaymentError(err.message || "Failed to process payment");
      setIsProcessingPayment(false);
    }
  };

  // Card payment handler
  const handleCardPayment = async () => {
    setIsProcessingPayment(true);
    setPaymentError(null);

    try {
      const { data, error } = await supabase.functions.invoke("process-card-event-payment", {
        body: {
          event_id: event.id,
          event_name: event.name,
          buyer_id: currentUser.id,
          buyer_username: currentUser.username,
          event_owner_id: event.host_user_id,
          amount: totalPrice,
          ticket_type: selectedType,
          ticket_quantity: quantity,
          card_number: cardNumber.replace(/\s/g, ""),
          expiry_month: expiryMonth,
          expiry_year: expiryYear,
          cvv,
          card_holder_name: cardHolderName,
        },
      });

      if (error || !data?.success) {
        throw new Error(data?.error || "Card payment failed");
      }

      // Clear form and show success
      setCardNumber("");
      setExpiryMonth("");
      setExpiryYear("");
      setCvv("");
      setCardHolderName("");
      setShowCardForm(false);
      onSuccess(data.capture_id || data.order_id);
    } catch (err: any) {
      setPaymentError(err.message || "Failed to process card payment");
    } finally {
      setIsProcessingPayment(false);
    }
  };

  const ticketOptions = [
    {
      type: "free" as TicketType,
      label: "Free",
      icon: Ticket,
      price: 0,
      available: showFreeOption,
      description: `${availableFreeSpots} free spots remaining`,
      badge: userType ? `For ${userType}s` : undefined,
    },
    {
      type: "general" as TicketType,
      label: "General Admission",
      icon: Users,
      price: event.price,
      available: showGeneralOption,
      description: `${remainingCapacity} spots available`,
    },
    {
      type: "vip" as TicketType,
      label: "VIP Ticket",
      icon: Star,
      price: event.vip_price,
      available: showVipOption,
      description: `${event.vip_tickets} VIP tickets available`,
    },
    {
      type: "vip_section" as TicketType,
      label: "VIP Section",
      icon: Crown,
      price: event.vip_section_price,
      available: showVipSectionOption,
      description: `${event.vip_sections} sections (${event.vip_section_attendees} people each)`,
    },
  ].filter((opt) => opt.available);

  // If no options available
  if (ticketOptions.length === 0) {
    return (
      <div className="text-center p-4 bg-white/5 rounded-lg">
        <p className="text-gray-400">No tickets available at this time.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Ticket Type Selection */}
      <div className="space-y-2">
        <p className="text-sm font-medium text-gray-300">Select Ticket Type</p>
        <div className="grid gap-2">
          {ticketOptions.map((option) => (
            <button
              key={option.type}
              onClick={() => {
                setSelectedType(option.type);
                setQuantity(1);
                setShowCardForm(false);
                setPaymentError(null);
              }}
              className={`flex items-center justify-between p-3 rounded-lg border transition-all ${
                selectedType === option.type
                  ? "border-yellow-400 bg-yellow-400/10"
                  : "border-white/20 bg-white/5 hover:bg-white/10"
              }`}
            >
              <div className="flex items-center gap-3">
                <option.icon
                  className={`h-5 w-5 ${
                    selectedType === option.type
                      ? "text-yellow-400"
                      : "text-gray-400"
                  }`}
                />
                <div className="text-left">
                  <div className="flex items-center gap-2">
                    <span
                      className={`font-medium ${
                        selectedType === option.type
                          ? "text-yellow-400"
                          : "text-white"
                      }`}
                    >
                      {option.label}
                    </span>
                    {option.badge && (
                      <Badge className="bg-purple-500/50 text-white text-xs">
                        {option.badge}
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-gray-400">{option.description}</p>
                </div>
              </div>
              <span
                className={`font-bold ${
                  option.price === 0 ? "text-green-400" : "text-yellow-400"
                }`}
              >
                {option.price === 0 ? "FREE" : `$${option.price}`}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Quantity Selector (for paid tickets) */}
      {selectedType && selectedType !== "free" && maxQuantity > 1 && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-gray-300">Quantity</p>
          <div className="flex items-center justify-center gap-4 p-3 bg-white/5 rounded-lg">
            <Button
              variant="outline"
              size="icon"
              onClick={() => handleQuantityChange(-1)}
              disabled={quantity <= 1}
              className="border-white/20 text-white hover:bg-white/10"
            >
              <Minus className="h-4 w-4" />
            </Button>
            <span className="text-2xl font-bold text-yellow-400 w-12 text-center">
              {quantity}
            </span>
            <Button
              variant="outline"
              size="icon"
              onClick={() => handleQuantityChange(1)}
              disabled={quantity >= maxQuantity}
              className="border-white/20 text-white hover:bg-white/10"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Total Price */}
      {selectedType && totalPrice > 0 && (
        <div className="flex justify-between items-center p-3 bg-white/5 rounded-lg">
          <span className="text-gray-300">Total</span>
          <span className="text-2xl font-bold text-yellow-400">
            ${totalPrice.toFixed(2)}
          </span>
        </div>
      )}

      {/* Action Button */}
      {selectedType && (
        <div className="pt-2 space-y-3">
          {selectedType === "free" ? (
            <Button
              onClick={handleFreeButtonClick}
              disabled={isRegistering}
              className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-3"
            >
              {isRegistering ? "Registering..." : "Register for Free"}
            </Button>
          ) : (
            <>
              {/* Payment Section - Matching Tip Page Design */}
              <div className="bg-gradient-to-r from-yellow-500/20 to-yellow-600/20 rounded-xl p-6 border border-yellow-500/30">
                <h3 className="text-white font-bold mb-4 text-center">
                  Complete Your Purchase
                </h3>

                {/* Info message */}
                <p className="text-center text-gray-300 text-sm mb-4">
                  You'll be charged ${totalPrice.toFixed(2)} USD
                </p>

                {paymentError && (
                  <div className="text-center p-4 bg-red-500/20 rounded-lg border border-red-500/30 mb-4">
                    <p className="text-red-400">{paymentError}</p>
                    <Button
                      onClick={() => setPaymentError(null)}
                      variant="outline"
                      className="mt-2 border-red-400/50 text-red-400 hover:bg-red-400/10"
                    >
                      Try Again
                    </Button>
                  </div>
                )}

                {!paymentError && !showCardForm && (
                  <>
                    {/* Blue PayPal Button */}
                    <Button
                      onClick={() => handlePayWithPayPal(false)}
                      disabled={isProcessingPayment}
                      className="w-full bg-paypal hover:bg-paypal-hover text-primary-foreground font-bold py-4 text-lg rounded-xl mb-3"
                    >
                      {isProcessingPayment ? (
                        <>
                          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                          Redirecting to PayPal...
                        </>
                      ) : (
                        <>Pay ${totalPrice.toFixed(2)} with PayPal</>
                      )}
                    </Button>

                    {/* Purple Card Button */}
                    <Button
                      onClick={() => setShowCardForm(true)}
                      className="w-full bg-gradient-to-r from-card-start to-card-end hover:from-card-start/90 hover:to-card-end/90 text-primary-foreground font-bold py-4 text-lg rounded-xl mb-3"
                    >
                      <CreditCard className="w-5 h-5 mr-2" />
                      Pay with Card
                    </Button>

                    {/* Yellow Pay Later Button */}
                    <Button
                      variant="outline"
                      onClick={() => handlePayWithPayPal(true)}
                      disabled={isProcessingPayment}
                      className="w-full border-2 border-paylater text-paylater bg-background/5 hover:bg-paylater/10 hover:text-paylater py-4 font-bold text-lg rounded-xl"
                    >
                      {isProcessingPayment ? (
                        <span className="inline-flex items-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Redirecting to PayPal...
                        </span>
                      ) : (
                        "Pay Later"
                      )}
                    </Button>
                  </>
                )}

                {!paymentError && showCardForm && (
                  <>
                    {/* Back to PayPal Button */}
                    <Button
                      onClick={() => setShowCardForm(false)}
                      variant="outline"
                      className="w-full bg-white/10 border-white/30 text-white hover:bg-white/20 font-bold py-4 text-lg rounded-xl mb-4"
                    >
                      ← Back to PayPal
                    </Button>
                    
                    {/* Inline Credit Card Form */}
                    <CreditCardForm
                      cardNumber={cardNumber}
                      expiryMonth={expiryMonth}
                      expiryYear={expiryYear}
                      cvv={cvv}
                      cardHolderName={cardHolderName}
                      onCardNumberChange={setCardNumber}
                      onExpiryMonthChange={setExpiryMonth}
                      onExpiryYearChange={setExpiryYear}
                      onCvvChange={setCvv}
                      onCardHolderNameChange={setCardHolderName}
                      amount={totalPrice}
                      onSubmit={handleCardPayment}
                      isSubmitting={isProcessingPayment}
                    />
                  </>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* Guest Name Dialog */}
      <Dialog open={showGuestDialog} onOpenChange={setShowGuestDialog}>
        <DialogContent className="bg-gray-900 border-gray-700 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-yellow-400">
              Confirm Free Registration
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-gray-300 text-sm">
              Enter your guest's name below, or type "none" if attending alone.
            </p>
            <Input
              value={guestName}
              onChange={(e) => setGuestName(e.target.value)}
              placeholder="Guest name or 'none'"
              className="bg-white/10 border-white/20 text-white placeholder-gray-400"
            />
            <p className="text-xs text-gray-400">
              {guestName.trim().toLowerCase() === "none" || guestName.trim() === ""
                ? "You will be registered alone (1 spot deducted)"
                : "You + guest will be registered (2 spots deducted)"}
            </p>
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setShowGuestDialog(false);
                setGuestName("");
              }}
              className="border-white/20 text-white hover:bg-white/10"
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmFreeRegister}
              disabled={isRegistering}
              className="bg-green-500 hover:bg-green-600 text-white font-bold"
            >
              {isRegistering ? "Registering..." : "Confirm"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default EventTicketSelector;
