import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import { Loader2, CheckCircle, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

const EventPayPalReturn: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  const [status, setStatus] = useState<"processing" | "success" | "error">("processing");
  const [errorMessage, setErrorMessage] = useState<string>("");

  useEffect(() => {
    const capturePayment = async () => {
      // PayPal returns the order ID as "token"
      const orderId = searchParams.get("token");
      const eventId = searchParams.get("event_id");
      const buyerId = searchParams.get("buyer_id");
      const buyerUsername = searchParams.get("buyer_username");
      const ticketType = searchParams.get("ticket_type") || "general";
      const ticketQuantity = parseInt(searchParams.get("ticket_quantity") || "1", 10);
      const amount = parseFloat(searchParams.get("amount") || "0");

      console.log("EventPayPalReturn - Capturing payment:", {
        orderId,
        eventId,
        buyerId,
        buyerUsername,
        ticketType,
        ticketQuantity,
        amount,
      });

      if (!orderId || !eventId) {
        setErrorMessage("Missing payment information. Please try again.");
        setStatus("error");
        return;
      }

      try {
        const { data, error } = await supabase.functions.invoke("capture-event-payment", {
          body: {
            order_id: orderId,
            event_id: eventId,
            buyer_id: buyerId,
            buyer_username: buyerUsername,
            ticket_type: ticketType,
            ticket_quantity: ticketQuantity,
            amount: amount,
          },
        });

        console.log("Capture response:", data, error);

        if (error || !data?.success) {
          throw new Error(data?.error || error?.message || "Payment capture failed");
        }

        setStatus("success");

        // Redirect to event details with success param after brief delay
        setTimeout(() => {
          navigate(`/event-details?id=${eventId}&payment=success&tx=${data.transaction_id || ""}`, {
            replace: true,
          });
        }, 1500);
      } catch (err: any) {
        console.error("Payment capture error:", err);
        setErrorMessage(err.message || "Failed to process payment");
        setStatus("error");
      }
    };

    capturePayment();
  }, [searchParams, navigate]);

  const handleReturnToEvent = () => {
    const eventId = searchParams.get("event_id");
    if (eventId) {
      navigate(`/event-details?id=${eventId}&payment=error`, { replace: true });
    } else {
      navigate("/events", { replace: true });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
      <div className="text-center p-8 bg-white/10 backdrop-blur rounded-xl border border-white/20 max-w-md mx-4">
        {status === "processing" && (
          <>
            <Loader2 className="h-16 w-16 text-yellow-400 animate-spin mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-white mb-2">Processing Payment</h2>
            <p className="text-gray-300">Please wait while we confirm your payment...</p>
          </>
        )}

        {status === "success" && (
          <>
            <CheckCircle className="h-16 w-16 text-green-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-green-400 mb-2">Payment Successful!</h2>
            <p className="text-gray-300">Redirecting to event details...</p>
          </>
        )}

        {status === "error" && (
          <>
            <XCircle className="h-16 w-16 text-red-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-red-400 mb-2">Payment Failed</h2>
            <p className="text-gray-300 mb-6">{errorMessage}</p>
            <Button
              onClick={handleReturnToEvent}
              className="bg-yellow-400 text-black hover:bg-yellow-500 font-bold"
            >
              Return to Event
            </Button>
          </>
        )}
      </div>
    </div>
  );
};

export default EventPayPalReturn;
