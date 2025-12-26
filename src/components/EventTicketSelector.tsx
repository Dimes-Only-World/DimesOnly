import React, { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import PayPalEventButton from "@/components/PayPalEventButton";
import { Ticket, Users, Crown, Star, Minus, Plus } from "lucide-react";

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
  onFreeRegister: () => Promise<void>;
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

  // Calculate available spots
  const availableFreeSpots = useMemo(() => {
    if (userType === "stripper") {
      return Math.max(0, event.free_spots_strippers - usedFreeSpots.strippers);
    } else if (userType === "exotic") {
      return Math.max(0, event.free_spots_exotics - usedFreeSpots.exotics);
    } else {
      return Math.max(0, event.free_normal - usedFreeSpots.normal);
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

  const handleFreeRegister = async () => {
    setIsRegistering(true);
    try {
      await onFreeRegister();
      onSuccess();
    } catch (err: any) {
      onError(err.message || "Registration failed");
    } finally {
      setIsRegistering(false);
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
        <div className="pt-2">
          {selectedType === "free" ? (
            <Button
              onClick={handleFreeRegister}
              disabled={isRegistering}
              className="w-full bg-green-500 hover:bg-green-600 text-white font-bold"
            >
              {isRegistering ? "Registering..." : "Register for Free"}
            </Button>
          ) : (
            <PayPalEventButton
              eventId={event.id}
              eventName={event.name}
              eventPrice={totalPrice}
              eventOwnerId={event.host_user_id}
              buyerId={currentUser.id}
              buyerUsername={currentUser.username}
              ticketType={selectedType}
              ticketQuantity={quantity}
              onSuccess={onSuccess}
              onError={onError}
            />
          )}
        </div>
      )}
    </div>
  );
};

export default EventTicketSelector;
