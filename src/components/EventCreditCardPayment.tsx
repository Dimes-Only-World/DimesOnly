import React, { useState } from "react";
import CreditCardForm from "@/components/CreditCardForm";
import { supabase } from "@/integrations/supabase/client";
import { CheckCircle, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

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
      <div className="text-center py-8 space-y-4">
        <CheckCircle className="w-16 h-16 text-green-500 mx-auto" />
        <h3 className="text-xl font-bold text-green-400">Payment Successful!</h3>
        <p className="text-gray-300">
          Your tickets for <span className="text-yellow-400">{eventName}</span> have been confirmed.
        </p>
        <p className="text-sm text-gray-400">
          {ticketQuantity}x {ticketType.replace("_", " ")} ticket(s) - ${totalPrice.toFixed(2)}
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8 space-y-4">
        <XCircle className="w-16 h-16 text-red-500 mx-auto" />
        <h3 className="text-xl font-bold text-red-400">Payment Failed</h3>
        <p className="text-gray-300">{error}</p>
        <Button
          onClick={() => setError(null)}
          className="bg-yellow-400 text-black hover:bg-yellow-500"
        >
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="text-center mb-4">
        <p className="text-sm text-gray-400">
          {ticketQuantity}x {ticketType.replace("_", " ")} ticket(s)
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
  );
};

export default EventCreditCardPayment;
