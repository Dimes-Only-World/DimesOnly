import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, CreditCard, AlertCircle, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";

interface PayPalTipButtonProps {
  tipAmount: number;
  tippedUsername: string;
  tipperUserId: string;
  tipperUsername: string;
  referrerUsername?: string;
  tipMessage?: string;
  onSuccess?: (transactionId?: string) => void;
  onError?: (error: string) => void;
  disabled?: boolean;
  className?: string;
}

const PayPalTipButton: React.FC<PayPalTipButtonProps> = ({
  tipAmount,
  tippedUsername,
  tipperUserId,
  tipperUsername,
  referrerUsername,
  tipMessage,
  onSuccess,
  onError,
  disabled = false,
  className = "",
}) => {
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [lotteryTickets, setLotteryTickets] = useState<number>(0);

  // Create PayPal order and redirect
  const handlePayPalRedirect = async (usePayLater = false) => {
    setIsProcessing(true);
    setError(null);

    try {
      const baseUrl = window.location.origin;
      const returnUrl = `${baseUrl}/tip-paypal-return?tipper_id=${tipperUserId}&tipper_username=${tipperUsername}&tipped_username=${tippedUsername}&amount=${tipAmount}&referrer_username=${referrerUsername || ""}&tip_message=${encodeURIComponent((tipMessage || "").slice(0, 60))}`;
      const cancelUrl = `${baseUrl}/tip-girls?tip=${tippedUsername}${referrerUsername ? `&ref=${referrerUsername}` : ""}`;

      // Create PayPal order via edge function
      const { data, error: fnError } = await supabase.functions.invoke(
        "create-paypal-order",
        {
          body: {
            payment_type: "tip",
            tipper_id: tipperUserId,
            tipper_username: tipperUsername,
            tipped_username: tippedUsername,
            amount: tipAmount,
            tip_message: tipMessage || "",
            referrer_username: referrerUsername || null,
            return_url: returnUrl,
            cancel_url: cancelUrl,
          },
        }
      );

      if (fnError || !data?.success || !data?.approval_url) {
        throw new Error(data?.error || "Failed to create payment order");
      }

      // Append funding source parameter
      let redirectUrl = data.approval_url;
      if (usePayLater) {
        redirectUrl = `${data.approval_url}&fundingSource=paylater`;
      }

      // Redirect to PayPal
      if (window.top && window.top !== window) {
        window.top.location.assign(redirectUrl);
      } else {
        window.location.assign(redirectUrl);
      }
    } catch (err: any) {
      console.error("PayPal redirect error:", err);
      setError(err.message || "Failed to create order");
      setIsProcessing(false);
      onError?.(err.message);

      toast({
        title: "Payment Error",
        description: err.message || "Something went wrong. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Card payment redirect (uses PayPal Hosted Checkout with card funding source)
  const handleCardRedirect = async () => {
    setIsProcessing(true);
    setError(null);

    try {
      const baseUrl = window.location.origin;
      const returnUrl = `${baseUrl}/tip-paypal-return?tipper_id=${tipperUserId}&tipper_username=${tipperUsername}&tipped_username=${tippedUsername}&amount=${tipAmount}&referrer_username=${referrerUsername || ""}&tip_message=${encodeURIComponent((tipMessage || "").slice(0, 60))}`;
      const cancelUrl = `${baseUrl}/tip-girls?tip=${tippedUsername}${referrerUsername ? `&ref=${referrerUsername}` : ""}`;

      // Create PayPal order via edge function
      const { data, error: fnError } = await supabase.functions.invoke(
        "create-paypal-order",
        {
          body: {
            payment_type: "tip",
            tipper_id: tipperUserId,
            tipper_username: tipperUsername,
            tipped_username: tippedUsername,
            amount: tipAmount,
            tip_message: tipMessage || "",
            referrer_username: referrerUsername || null,
            return_url: returnUrl,
            cancel_url: cancelUrl,
          },
        }
      );

      if (fnError || !data?.success || !data?.approval_url) {
        throw new Error(data?.error || "Failed to create payment order");
      }

      // Append fundingSource=card to redirect to PayPal's card checkout
      const redirectUrl = `${data.approval_url}&fundingSource=card`;

      // Redirect to PayPal
      if (window.top && window.top !== window) {
        window.top.location.assign(redirectUrl);
      } else {
        window.location.assign(redirectUrl);
      }
    } catch (err: any) {
      console.error("Card redirect error:", err);
      setError(err.message || "Failed to create order");
      setIsProcessing(false);
      onError?.(err.message);

      toast({
        title: "Payment Error",
        description: err.message || "Something went wrong. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Minimum tip amount check
  if (tipAmount < 5) {
    return (
      <div className={`text-center p-4 bg-yellow-500/20 rounded-lg border border-yellow-500/50 ${className}`}>
        <p className="text-yellow-300">Please select a tip amount of at least $5</p>
      </div>
    );
  }

  // Payment success state
  if (paymentSuccess) {
    return (
      <div className={`space-y-3 ${className}`}>
        <div className="flex items-center justify-center gap-2 p-4 bg-green-500/20 rounded-lg border border-green-500/50">
          <CheckCircle className="h-5 w-5 text-green-400" />
          <span className="text-green-400 font-medium">Payment Complete!</span>
        </div>
        <p className="text-yellow-200 text-sm text-center">
          🎟️ You received {lotteryTickets} lottery tickets!
        </p>
      </div>
    );
  }

  // Error state with retry
  if (error && !isProcessing) {
    return (
      <div className={`space-y-3 ${className}`}>
        <div className="flex items-center gap-2 p-3 bg-red-500/20 rounded-lg border border-red-500/50">
          <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0" />
          <span className="text-red-400 text-sm">{error}</span>
        </div>
        <Button
          onClick={() => setError(null)}
          className="w-full bg-yellow-400 text-black hover:bg-yellow-500"
        >
          Try Again
        </Button>
      </div>
    );
  }

  // 3-button payment layout
  return (
    <div className={`space-y-3 ${className}`}>
      <div className="bg-gradient-to-r from-yellow-500/20 to-yellow-600/20 rounded-xl p-6 border border-yellow-500/30">
        <h3 className="text-white font-bold mb-4 text-center">
          Complete Your Tip
        </h3>

        <p className="text-center text-gray-300 text-sm mb-4">
          You'll be charged ${tipAmount.toFixed(2)} USD
        </p>

        {/* Blue PayPal Button */}
        <Button
          onClick={() => handlePayPalRedirect(false)}
          disabled={isProcessing || disabled}
          className="w-full bg-paypal hover:bg-paypal-hover text-primary-foreground font-bold py-4 text-lg rounded-xl mb-3"
        >
          {isProcessing ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Redirecting to PayPal...
            </>
          ) : (
            <>Pay ${tipAmount.toFixed(2)} with PayPal</>
          )}
        </Button>

        {/* Purple Card Button - Redirect to PayPal Card Checkout */}
        <Button
          onClick={handleCardRedirect}
          disabled={isProcessing || disabled}
          className="w-full bg-gradient-to-r from-card-start to-card-end hover:from-card-start/90 hover:to-card-end/90 text-primary-foreground font-bold py-4 text-lg rounded-xl mb-3"
        >
          {isProcessing ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Redirecting...
            </>
          ) : (
            <>
              <CreditCard className="w-5 h-5 mr-2" />
              Pay with Card
            </>
          )}
        </Button>

        {/* Yellow Pay Later Button */}
        <Button
          variant="outline"
          onClick={() => handlePayPalRedirect(true)}
          disabled={isProcessing || disabled}
          className="w-full border-2 border-paylater text-paylater bg-background/5 hover:bg-paylater/10 hover:text-paylater py-4 font-bold text-lg rounded-xl"
        >
          {isProcessing ? (
            <span className="inline-flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Redirecting to PayPal...
            </span>
          ) : (
            "Pay Later"
          )}
        </Button>

        <p className="text-yellow-200 text-sm text-center mt-4">
          🎟️ You'll receive {tipAmount} lottery tickets!
        </p>
      </div>
    </div>
  );
};

export default PayPalTipButton;
