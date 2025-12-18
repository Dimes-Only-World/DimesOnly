import React, { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, CreditCard, AlertCircle, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";

interface PayPalEventButtonProps {
  eventId: string;
  eventName: string;
  eventPrice: number;
  eventOwnerId?: string;
  buyerId?: string;
  buyerUsername?: string;
  onSuccess?: (transactionId: string, paymentId: string) => void;
  onError?: (error: string) => void;
  disabled?: boolean;
  className?: string;
}

// PayPal SDK is loaded dynamically

const PayPalEventButton: React.FC<PayPalEventButtonProps> = ({
  eventId,
  eventName,
  eventPrice,
  eventOwnerId,
  buyerId,
  buyerUsername,
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
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRenderedRef = useRef(false);

  const PAYPAL_CLIENT_ID = "AQVQ2hfnHQo1MBYcsi2";

  // Render PayPal button
  const renderButton = useCallback(() => {
    const paypal = (window as any).paypal;
    if (!paypal || !containerRef.current || buttonRenderedRef.current) {
      return;
    }

    // Clear container before rendering
    containerRef.current.innerHTML = "";
    buttonRenderedRef.current = true;

    paypal.Buttons({
      style: {
        layout: "vertical",
        color: "gold",
        shape: "rect",
        label: "pay",
        height: 45,
      },
      createOrder: async () => {
        setIsProcessing(true);
        setError(null);

        console.log("Creating PayPal order for event:", eventId);

        try {
          // First create a payment record in the database
          const { data: paymentRecord, error: paymentError } = await supabase
            .from("payments")
            .insert({
              user_id: buyerId,
              event_id: eventId,
              amount: eventPrice,
              payment_type: "event",
              payment_status: "pending",
              referred_by: null,
            })
            .select()
            .single();

          if (paymentError) {
            console.error("Failed to create payment record:", paymentError);
            throw new Error("Failed to initialize payment");
          }

          console.log("Payment record created:", paymentRecord.id);

          // Create PayPal order via edge function
          const { data, error } = await supabase.functions.invoke(
            "create-paypal-order",
            {
              body: {
                payment_type: "event",
                event_id: eventId,
                user_id: buyerId,
                payment_id: paymentRecord.id,
                amount: eventPrice,
                description: `Event Ticket - ${eventName}`,
                return_url: `${window.location.origin}/events?payment=success&event=${eventId}`,
                cancel_url: `${window.location.origin}/events?payment=cancelled&event=${eventId}`,
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
            await supabase.functions.invoke("capture-event-payment", {
              body: {
                order_id: data.orderID,
                event_id: eventId,
                event_owner_id: eventOwnerId,
                buyer_id: buyerId,
                buyer_username: buyerUsername,
                amount: eventPrice,
              },
            });

          if (captureError || !captureData?.success) {
            console.error("Capture error:", captureError || captureData?.error);
            throw new Error(captureData?.error || "Payment capture failed");
          }

          console.log("Payment captured successfully:", captureData);

          setPaymentSuccess(true);
          setIsProcessing(false);

          toast({
            title: "Payment Successful!",
            description: `You're now registered for ${eventName}`,
          });

          onSuccess?.(
            captureData.transaction_id,
            captureData.payment_id
          );
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
    }).render(containerRef.current);
  }, [eventId, eventName, eventPrice, eventOwnerId, buyerId, buyerUsername, onSuccess, onError, toast]);

  // Load PayPal SDK
  useEffect(() => {
    if (eventPrice <= 0 || disabled) {
      setIsLoading(false);
      return;
    }

    const loadPayPalScript = () => {
      // Check if script already exists
      const existingScript = document.querySelector(
        'script[src*="paypal.com/sdk/js"]'
      );

      if (existingScript && (window as any).paypal) {
        setIsLoading(false);
        renderButton();
        return;
      }

      if (existingScript) {
        existingScript.addEventListener("load", () => {
          setIsLoading(false);
          renderButton();
        });
        return;
      }

      // Create and append PayPal script
      const script = document.createElement("script");
      script.src = `https://www.paypal.com/sdk/js?client-id=${PAYPAL_CLIENT_ID}&currency=USD&intent=capture`;
      script.async = true;

      script.onload = () => {
        console.log("PayPal SDK loaded");
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
  }, [eventPrice, disabled, renderButton, PAYPAL_CLIENT_ID]);

  // Free event - no payment needed
  if (eventPrice <= 0) {
    return null;
  }

  // Payment success state
  if (paymentSuccess) {
    return (
      <div className={`flex items-center justify-center gap-2 p-4 bg-green-500/20 rounded-lg border border-green-500/50 ${className}`}>
        <CheckCircle className="h-5 w-5 text-green-400" />
        <span className="text-green-400 font-medium">Payment Complete!</span>
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
        <span className="text-gray-300">Loading payment...</span>
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

  // Normal PayPal button
  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex items-center gap-2 mb-2">
        <CreditCard className="h-4 w-4 text-yellow-400" />
        <span className="text-sm text-gray-300">Secure Payment</span>
      </div>
      <div ref={containerRef} className="paypal-button-container" />
      <p className="text-xs text-gray-400 text-center mt-2">
        You'll be charged ${eventPrice.toFixed(2)} USD
      </p>
    </div>
  );
};

export default PayPalEventButton;
