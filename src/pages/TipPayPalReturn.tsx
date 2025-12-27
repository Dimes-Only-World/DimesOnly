import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle, XCircle, Ticket } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";

interface CaptureResult {
  success: boolean;
  capture_id?: string;
  order_id?: string;
  amount?: number;
  tipped_username?: string;
  tickets?: string[];
  error?: string;
  warning?: string;
}

const TipPayPalReturn: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [result, setResult] = useState<CaptureResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>("");

  useEffect(() => {
    const capturePayment = async () => {
      const token = searchParams.get("token"); // PayPal order ID
      const tipperIdParam = searchParams.get("tipper_id");
      const tipperUsernameParam = searchParams.get("tipper_username");
      const tippedUsernameParam = searchParams.get("tipped_username");
      const amountParam = searchParams.get("amount");
      const referrerParam = searchParams.get("referrer_username");
      const messageParam = searchParams.get("tip_message");

      if (!token) {
        setStatus("error");
        setErrorMessage("No payment token found. Please try again.");
        return;
      }

      if (!tipperIdParam || !tippedUsernameParam || !amountParam) {
        setStatus("error");
        setErrorMessage("Missing payment details. Please try again.");
        return;
      }

      try {
        console.log("Capturing tip payment:", {
          order_id: token,
          tipper_id: tipperIdParam,
          tipped_username: tippedUsernameParam,
          amount: amountParam,
        });

        const { data, error } = await supabase.functions.invoke("capture-tip-order", {
          body: {
            order_id: token,
            tipper_id: tipperIdParam,
            tipper_username: tipperUsernameParam || "anonymous",
            tipped_username: tippedUsernameParam,
            amount: Number(amountParam),
            referrer_username: referrerParam || null,
            tip_message: messageParam || "",
          },
        });

        if (error) {
          console.error("Capture error:", error);
          setStatus("error");
          setErrorMessage(error.message || "Failed to process payment");
          return;
        }

        if (!data?.success) {
          setStatus("error");
          setErrorMessage(data?.error || "Payment capture failed");
          return;
        }

        setResult(data);
        setStatus("success");

        toast({
          title: "Tip Sent Successfully!",
          description: `You tipped $${amountParam} to ${tippedUsernameParam}`,
        });
      } catch (err) {
        console.error("Error capturing payment:", err);
        setStatus("error");
        setErrorMessage("An unexpected error occurred. Please contact support.");
      }
    };

    capturePayment();
  }, [searchParams, toast]);

  const handleGoToDashboard = () => {
    navigate("/dashboard");
  };

  const handleTipAgain = () => {
    const tippedUsername = searchParams.get("tipped_username");
    const referrer = searchParams.get("referrer_username");
    if (tippedUsername) {
      navigate(`/tip-girls?tip=${tippedUsername}${referrer ? `&ref=${referrer}` : ""}`);
    } else {
      navigate("/tip-girls");
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">
            {status === "loading" && "Processing Payment..."}
            {status === "success" && "Tip Sent Successfully!"}
            {status === "error" && "Payment Failed"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {status === "loading" && (
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="h-16 w-16 animate-spin text-primary" />
              <p className="text-muted-foreground text-center">
                Please wait while we confirm your payment with PayPal...
              </p>
            </div>
          )}

          {status === "success" && result && (
            <div className="flex flex-col items-center gap-4">
              <CheckCircle className="h-16 w-16 text-green-500" />
              
              <div className="text-center space-y-2">
                <p className="text-lg font-semibold">
                  ${result.amount?.toFixed(2)} sent to {result.tipped_username}
                </p>
                
                {result.tickets && result.tickets.length > 0 && (
                  <div className="bg-muted p-4 rounded-lg mt-4">
                    <div className="flex items-center justify-center gap-2 mb-2">
                      <Ticket className="h-5 w-5 text-primary" />
                      <span className="font-semibold">Jackpot Tickets Earned!</span>
                    </div>
                    <div className="flex flex-wrap justify-center gap-2">
                      {result.tickets.map((ticket, index) => (
                        <span
                          key={index}
                          className="bg-primary text-primary-foreground px-3 py-1 rounded-full text-sm font-mono"
                        >
                          {ticket}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-3 mt-4 w-full">
                <Button
                  variant="outline"
                  onClick={handleTipAgain}
                  className="flex-1"
                >
                  Tip Again
                </Button>
                <Button
                  onClick={handleGoToDashboard}
                  className="flex-1"
                >
                  Go to Dashboard
                </Button>
              </div>
            </div>
          )}

          {status === "error" && (
            <div className="flex flex-col items-center gap-4">
              <XCircle className="h-16 w-16 text-destructive" />
              
              <p className="text-center text-muted-foreground">
                {errorMessage}
              </p>

              <div className="flex gap-3 mt-4 w-full">
                <Button
                  variant="outline"
                  onClick={() => navigate("/tip-girls")}
                  className="flex-1"
                >
                  Try Again
                </Button>
                <Button
                  onClick={handleGoToDashboard}
                  className="flex-1"
                >
                  Go to Dashboard
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default TipPayPalReturn;
