import React, { useState, useEffect, useRef, useCallback } from "react";
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
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [paypalClientId, setPaypalClientId] = useState<string | null>(null);
  const [lotteryTickets, setLotteryTickets] = useState<number>(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRenderedRef = useRef(false);

  // Render PayPal button
  const renderButton = useCallback(() => {
    const paypal = (window as any).paypal;
    if (!paypal || !containerRef.current || buttonRenderedRef.current) {
      return;
    }

    // Clear container before rendering
    containerRef.current.innerHTML = "";
    buttonRenderedRef.current = true;

    try {
      paypal
        .Buttons({
          style: {
            layout: "vertical",
            color: "gold",
            shape: "rect",
            label: "pay",
            height: 45,
          },
          fundingSource: undefined, // Allow all funding sources including Pay Later
          createOrder: async () => {
            setIsProcessing(true);
            setError(null);

            console.log("Creating PayPal order for tip:", tippedUsername);

            try {
              const baseUrl = window.location.origin;
              const returnUrl = `${baseUrl}/tip-paypal-return?tipper_id=${tipperUserId}&tipper_username=${tipperUsername}&tipped_username=${tippedUsername}&amount=${tipAmount}&referrer_username=${referrerUsername || ""}&tip_message=${encodeURIComponent((tipMessage || "").slice(0, 60))}`;
              const cancelUrl = `${baseUrl}/tip-girls?tip=${tippedUsername}${referrerUsername ? `&ref=${referrerUsername}` : ""}`;

              // Create PayPal order via edge function
              const { data, error } = await supabase.functions.invoke(
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

              if (error || !data?.success) {
                console.error("Create order error:", error || data?.error);
                throw new Error(data?.error || "Failed to create payment order");
              }

              console.log("PayPal order created:", data.order_id);
              return data.order_id;
            } catch (err: any) {
              console.error("PayPal createOrder error:", err);
              setError(err.message || "Failed to create order");
              setIsProcessing(false);
              throw err;
            }
          },
          onApprove: async (data: any) => {
            console.log("Payment approved, capturing...", data);

            try {
              // Capture the payment via edge function
              const { data: captureData, error: captureError } =
                await supabase.functions.invoke("capture-tip-order", {
                  body: {
                    order_id: data.orderID,
                    tipper_id: tipperUserId,
                    tipper_username: tipperUsername,
                    tipped_username: tippedUsername,
                    amount: tipAmount,
                    tip_message: tipMessage || "",
                    referrer_username: referrerUsername || null,
                  },
                });

              if (captureError || !captureData?.success) {
                console.error(
                  "Capture error:",
                  captureError || captureData?.error
                );
                throw new Error(captureData?.error || "Payment capture failed");
              }

              console.log("Payment captured successfully:", captureData);

              setPaymentSuccess(true);
              setLotteryTickets(captureData.lottery_tickets || tipAmount);
              setIsProcessing(false);

              toast({
                title: "Tip Successful! 🎉",
                description: `Your tip of $${tipAmount} to @${tippedUsername} was processed. You received ${captureData.lottery_tickets || tipAmount} lottery tickets!`,
              });

              onSuccess?.(captureData.transaction_id);
            } catch (err: any) {
              console.error("Payment capture error:", err);
              setError(err.message || "Payment processing failed");
              setIsProcessing(false);
              onError?.(err.message);

              toast({
                title: "Payment Failed",
                description: err.message || "Unable to process payment",
                variant: "destructive",
              });
            }
          },
          onCancel: () => {
            console.log("Payment cancelled by user");
            setIsProcessing(false);
            toast({
              title: "Payment Cancelled",
              description: "You cancelled the payment process",
              variant: "destructive",
            });
          },
          onError: (err: any) => {
            console.error("PayPal error:", err);
            setError("Payment system error. Please try again.");
            setIsProcessing(false);
            onError?.("Payment system error");

            toast({
              title: "Payment Error",
              description: "Something went wrong. Please try again.",
              variant: "destructive",
            });
          },
        })
        .render(containerRef.current);
    } catch (e) {
      console.error("Failed to render PayPal button:", e);
      buttonRenderedRef.current = false;
      setError("Failed to load payment system");
      setIsLoading(false);
    }
  }, [
    tipAmount,
    tippedUsername,
    tipperUserId,
    tipperUsername,
    referrerUsername,
    tipMessage,
    onSuccess,
    onError,
    toast,
  ]);

  // Load PayPal config (client id) then load PayPal SDK
  useEffect(() => {
    let cancelled = false;

    const fetchPayPalConfig = async () => {
      if (tipAmount < 5 || disabled) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const { data, error } = await supabase.functions.invoke("paypal-config", {
          body: {},
        });

        if (cancelled) return;

        if (error || !data?.clientId) {
          console.error("Failed to load PayPal config:", error || data);
          setError("Failed to load payment system");
          setIsLoading(false);
          return;
        }

        setPaypalClientId(data.clientId);
      } catch (e) {
        console.error("Failed to load PayPal config:", e);
        setError("Failed to load payment system");
        setIsLoading(false);
      }
    };

    fetchPayPalConfig();

    return () => {
      cancelled = true;
    };
  }, [tipAmount, disabled]);

  useEffect(() => {
    if (!paypalClientId || tipAmount < 5 || disabled) return;

    // Reset button rendered state when tip amount changes
    buttonRenderedRef.current = false;

    const loadPayPalScript = () => {
      const existingScript =
        document.querySelector('script[data-paypal-sdk="true"]') ||
        document.querySelector('script[src*="paypal.com/sdk/js"]');

      // If PayPal is already available, just render.
      if (existingScript && (window as any).paypal) {
        setIsLoading(false);
        renderButton();
        return;
      }

      // If a previous attempt left a script tag behind (or it failed), remove it and try fresh.
      if (existingScript) {
        existingScript.remove();
      }

      const script = document.createElement("script");
      script.setAttribute("data-paypal-sdk", "true");
      // Enable Pay Later and card funding sources
      script.src = `https://www.paypal.com/sdk/js?client-id=${encodeURIComponent(paypalClientId)}&currency=USD&intent=capture&enable-funding=paylater,card`;
      script.async = true;

      script.onload = () => {
        console.log("PayPal SDK loaded with Pay Later enabled");
        setIsLoading(false);
        renderButton();
      };

      script.onerror = () => {
        console.error("Failed to load PayPal SDK");
        setError("Failed to load payment system");
        setIsLoading(false);
      };

      document.body.appendChild(script);
    };

    loadPayPalScript();

    return () => {
      buttonRenderedRef.current = false;
    };
  }, [paypalClientId, tipAmount, disabled, renderButton]);

  // Ensure we render the PayPal button after React has mounted the container
  useEffect(() => {
    if (tipAmount < 5 || disabled) return;
    if (isLoading || error || paymentSuccess) return;

    const paypal = (window as any).paypal;
    if (!paypal) return;
    if (!containerRef.current) return;
    if (buttonRenderedRef.current) return;

    // Defer to the next frame to ensure layout is ready
    window.requestAnimationFrame?.(() => renderButton());
  }, [tipAmount, disabled, isLoading, error, paymentSuccess, renderButton]);

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
          onClick={() => {
            setError(null);
            buttonRenderedRef.current = false;
            setIsLoading(true);
            window.location.reload();
          }}
          className="w-full bg-yellow-400 text-black hover:bg-yellow-500"
        >
          Try Again
        </Button>
      </div>
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <div className={`flex items-center justify-center gap-2 p-4 bg-white/5 rounded-lg ${className}`}>
        <Loader2 className="h-5 w-5 animate-spin text-yellow-400" />
        <span className="text-gray-300">Loading payment options...</span>
      </div>
    );
  }

  // Processing state overlay
  if (isProcessing) {
    return (
      <div className={`relative ${className}`}>
        <div ref={containerRef} className="opacity-50 pointer-events-none" />
        <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-lg">
          <div className="flex items-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin text-yellow-400" />
            <span className="text-white">Processing...</span>
          </div>
        </div>
      </div>
    );
  }

  // Normal PayPal button with all payment options
  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex items-center gap-2 mb-2">
        <CreditCard className="h-4 w-4 text-yellow-400" />
        <span className="text-sm text-gray-300">Secure Payment - PayPal, Card, or Pay Later</span>
      </div>
      <div ref={containerRef} className="paypal-button-container" />
      <p className="text-xs text-gray-400 text-center mt-2">
        You'll be charged ${tipAmount.toFixed(2)} USD
      </p>
      <p className="text-yellow-200 text-sm text-center">
        🎟️ You'll receive {tipAmount} lottery tickets!
      </p>
    </div>
  );
};

export default PayPalTipButton;
