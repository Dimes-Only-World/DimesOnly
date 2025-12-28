import React, { useState } from "react";
import CreditCardForm from "@/components/CreditCardForm";
import { supabase } from "@/integrations/supabase/client";
import { CheckCircle, XCircle, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface EventCreditCardPaymentProps {
  eventId: string;
  eventName: string;
  totalPrice: number;
  ticketType: string;
  ticketQuantity: number;
  buyerId: string;
  buyerUsername: string;
  eventOwnerId?: string;
  onSuccess: (transactionId?: string) => void;
  onError: (error: string) => void;
}

const EventCreditCardPayment: React.FC<EventCreditCardPaymentProps> = ({
  eventId,
  eventName,
  totalPrice,
  ticketType,
  ticketQuantity,
  buyerId,
  buyerUsername,
  eventOwnerId,
  onSuccess,
  onError,
}) => {
  const [showCardDialog, setShowCardDialog] = useState(false);
  const [cardNumber, setCardNumber] = useState("");
  const [expiryMonth, setExpiryMonth] = useState("");
  const [expiryYear, setExpiryYear] = useState("");
  const [cvv, setCvv] = useState("");
  const [cardHolderName, setCardHolderName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke(
        "process-card-event-payment",
        {
          body: {
            event_id: eventId,
            event_name: eventName,
            buyer_id: buyerId,
            buyer_username: buyerUsername,
            event_owner_id: eventOwnerId,
            amount: totalPrice,
            ticket_type: ticketType,
            ticket_quantity: ticketQuantity,
            card_number: cardNumber.replace(/\s/g, ""),
            expiry_month: expiryMonth,
            expiry_year: expiryYear,
            cvv,
            card_holder_name: cardHolderName,
          },
        }
      );

      if (fnError) {
        throw new Error(fnError.message || "Payment processing failed");
      }

      if (!data?.success) {
        throw new Error(data?.error || "Payment failed");
      }

      setPaymentSuccess(true);
      setShowCardDialog(false);
      onSuccess(data.capture_id || data.order_id);
    } catch (err: any) {
      console.error("Event card payment error:", err);
      const errorMessage = err.message || "Payment failed. Please try again.";
      setError(errorMessage);
      onError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (paymentSuccess) {
    return (
      <div className="flex items-center justify-center gap-2 p-4 bg-green-500/20 rounded-lg border border-green-500/50">
        <CheckCircle className="h-5 w-5 text-green-400" />
        <span className="text-green-400 font-medium">Payment Complete!</span>
      </div>
    );
  }

  if (error && !showCardDialog) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2 p-3 bg-red-500/20 rounded-lg border border-red-500/50">
          <XCircle className="h-5 w-5 text-red-400 flex-shrink-0" />
          <span className="text-red-400 text-sm">{error}</span>
        </div>
        <Button
          onClick={() => {
            setError(null);
            setShowCardDialog(true);
          }}
          className="w-full bg-gradient-to-r from-pink-500 to-pink-600 hover:from-pink-600 hover:to-pink-700 text-white font-bold py-4 text-lg"
        >
          <CreditCard className="w-5 h-5 mr-2" />
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <>
      {/* Custom styled Card button - Pink/Magenta to match TipGirls */}
      <Button
        onClick={() => setShowCardDialog(true)}
        disabled={isSubmitting}
        className="w-full bg-gradient-to-r from-pink-500 to-pink-600 hover:from-pink-600 hover:to-pink-700 text-white font-bold py-4 text-lg"
      >
        <CreditCard className="w-5 h-5 mr-2" />
        Pay ${totalPrice.toFixed(2)} with Card
      </Button>

      {/* Card Form Dialog */}
      <Dialog open={showCardDialog} onOpenChange={setShowCardDialog}>
        <DialogContent className="bg-gray-900 border-gray-700 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-yellow-400 text-xl">
              Pay ${totalPrice.toFixed(2)} with Card
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="text-center">
              <p className="text-sm text-gray-400">
                {ticketQuantity}x {ticketType.replace("_", " ")} ticket(s) for {eventName}
              </p>
            </div>
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
              onSubmit={handleSubmit}
              isSubmitting={isSubmitting}
            />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default EventCreditCardPayment;
