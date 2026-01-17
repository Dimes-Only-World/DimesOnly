import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, CreditCard } from "lucide-react";
import CreditCardForm from "./CreditCardForm";

interface PaymentMethodSelectorProps {
  amount: number;
  onPayPal: () => void;
  onPayLater: () => void;
  onCardSubmit: (cardData: CardData) => void;
  isProcessing: boolean;
  disabled?: boolean;
  paypalLabel?: string;
}

export interface CardData {
  cardNumber: string;
  expiryMonth: string;
  expiryYear: string;
  cvv: string;
  cardHolderName: string;
}

const PaymentMethodSelector: React.FC<PaymentMethodSelectorProps> = ({
  amount,
  onPayPal,
  onPayLater,
  onCardSubmit,
  isProcessing,
  disabled = false,
  paypalLabel = "Pay with PayPal",
}) => {
  const [showCardForm, setShowCardForm] = useState(false);
  const [cardNumber, setCardNumber] = useState("");
  const [expiryMonth, setExpiryMonth] = useState("");
  const [expiryYear, setExpiryYear] = useState("");
  const [cvv, setCvv] = useState("");
  const [cardHolderName, setCardHolderName] = useState("");

  const handleCardSubmit = () => {
    onCardSubmit({
      cardNumber,
      expiryMonth,
      expiryYear,
      cvv,
      cardHolderName,
    });
  };

  if (showCardForm) {
    return (
      <div className="space-y-4">
        <Button
          variant="ghost"
          className="text-sm text-muted-foreground"
          onClick={() => setShowCardForm(false)}
          disabled={isProcessing}
        >
          ← Back to payment options
        </Button>
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
          amount={amount}
          onSubmit={handleCardSubmit}
          isSubmitting={isProcessing}
        />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* PayPal Button - Blue */}
      <Button
        className="w-full py-6 text-lg bg-[#0070ba] hover:bg-[#005ea6] text-white"
        size="lg"
        onClick={onPayPal}
        disabled={disabled || isProcessing}
      >
        {isProcessing ? (
          <>
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            Processing...
          </>
        ) : (
          <>
            <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M20.067 8.478c.492.88.556 2.014.3 3.327-.74 3.806-3.276 5.12-6.514 5.12h-.5a.805.805 0 0 0-.794.68l-.04.22-.63 3.993-.032.17a.804.804 0 0 1-.794.68H7.72a.483.483 0 0 1-.477-.558L7.418 21h1.518l.95-6.02h1.385c4.678 0 7.75-2.203 8.796-6.502zm-2.96-5.09c.762.868.983 1.81.752 3.285-.019.123-.04.24-.062.36-.735 3.773-3.089 5.446-6.956 5.446H8.957c-.63 0-1.174.414-1.354 1.002l-.014-.002-.93 5.894H3.121a.051.051 0 0 1-.05-.06l2.598-16.51A.95.95 0 0 1 6.607 2h5.976c2.183 0 3.716.469 4.523 1.388z" />
            </svg>
            {paypalLabel}
          </>
        )}
      </Button>

      {/* Pay Later Button - Yellow outline */}
      <Button
        variant="outline"
        className="w-full py-6 text-lg border-2 border-yellow-400 text-yellow-600 hover:bg-yellow-50 hover:border-yellow-500"
        size="lg"
        onClick={onPayLater}
        disabled={disabled || isProcessing}
      >
        {isProcessing ? (
          <>
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            Processing...
          </>
        ) : (
          "Pay Later"
        )}
      </Button>

      {/* Card Button - Pink/Purple gradient */}
      <Button
        className="w-full py-6 text-lg bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-700 hover:to-purple-700 text-white"
        size="lg"
        onClick={() => setShowCardForm(true)}
        disabled={disabled || isProcessing}
      >
        <CreditCard className="mr-2 h-5 w-5" />
        Pay with Card
      </Button>

      <p className="text-xs text-center text-muted-foreground mt-2">
        Secure payment processed by PayPal
      </p>
    </div>
  );
};

export default PaymentMethodSelector;
