import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle, XCircle, Loader2, AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "./ui/alert";
import { toast } from "@/hooks/use-toast";

// Helper to format membership tier into Title Case (e.g. "diamond_plus" -> "Diamond Plus")
const formatTierName = (tier: string | null | undefined) => {
  if (!tier) return "Membership";
  return tier
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
};

const PaymentStatusHandler: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [processing, setProcessing] = useState(true);
  const [status, setStatus] = useState<"success" | "error" | "processing">(
    "processing"
  );
  const [message, setMessage] = useState("");

  useEffect(() => {
    const handlePaymentReturn = async () => {
      const paymentType = searchParams.get("payment");
      const upgradeId = searchParams.get("upgrade_id");
      const eventPaymentId = searchParams.get("payment_id");
      const paypalToken = searchParams.get("token");
      const payerId = searchParams.get("PayerID");

      // Handle Diamond Plus upgrade
      if (paymentType === "success" && upgradeId) {
        try {
          // Check upgrade status
          const { data: upgrade, error } = await supabase
            .from("membership_upgrades")
            .select("*")
            .eq("id", upgradeId)
            .single();

          if (error) {
            throw new Error("Failed to verify upgrade");
          }

          if (upgrade.upgrade_status === "completed") {
            const tierLabel = formatTierName(upgrade.upgrade_type as string);

            setStatus("success");
            setMessage(
              `${tierLabel} membership activated successfully! Redirecting...`
            );

            // Clean up session storage
            sessionStorage.removeItem("membership_upgrade");

            // Show success toast
            toast({
              title: `${tierLabel} Activated!`,
              description: `Your ${tierLabel} membership has been activated. Redirecting to dashboard...`,
            });

            // Redirect to dashboard after 3 seconds
            setTimeout(() => {
              navigate("/dashboard");
            }, 3000);
          } else if (upgrade.payment_status === "partially_paid") {
            const tierLabel = formatTierName(upgrade.upgrade_type as string);

            setStatus("success");
            setMessage(
              `First installment payment successful! Complete remaining payments to activate ${tierLabel}.`
            );

            toast({
              title: "Payment Received",
              description:
                "Installment paid. Complete remaining payments to activate your membership.",
            });

            setTimeout(() => {
              navigate("/upgrade");
            }, 3000);
          } else {
            // Payment is still pending, try to manually trigger the webhook logic
            setStatus("processing");
            setMessage("Payment is being processed. Please wait a moment...");

            // If we have PayPal token and PayerID, the payment was successful
            // Let's manually trigger the membership activation
            if (paypalToken && payerId) {
              try {
                console.log("Manually triggering membership activation...");

                // Call the membership-webhook function directly
                const { data: webhookResult, error: webhookError } =
                  await supabase.functions.invoke("membership-webhook", {
                    body: {
                      event_type: "CHECKOUT.ORDER.APPROVED",
                      resource: {
                        id: upgrade.paypal_order_id,
                      },
                    },
                  });

                if (webhookError) {
                  console.error("Webhook trigger error:", webhookError);
                  // If webhook fails, wait a bit and check again
                  setTimeout(handlePaymentReturn, 5000);
                  return;
                }

                console.log("Webhook triggered successfully:", webhookResult);

                // Check upgrade status again after webhook
                setTimeout(handlePaymentReturn, 2000);
                return;
              } catch (error) {
                console.error("Error triggering webhook:", error);
                // Fall back to periodic checking
                setTimeout(handlePaymentReturn, 5000);
                return;
              }
            } else {
              // No PayPal tokens, just wait and check again
              setTimeout(handlePaymentReturn, 5000);
              return;
            }
          }
        } catch (error) {
          console.error("Payment verification error:", error);
          setStatus("error");
          setMessage(
            "Failed to verify payment status. Please contact support."
          );
        }
      }
      // Handle event payment
      else if (paymentType === "success" && eventPaymentId) {
        try {
          const { data: payment } = await supabase
            .from("payments")
            .select("*")
            .eq("id", eventPaymentId)
            .single();

          if (payment?.payment_status === "completed") {
            setStatus("success");
            setMessage("Event ticket purchased successfully!");

            toast({
              title: "Ticket Purchased!",
              description: "You're all set for the event.",
            });

            setTimeout(() => {
              navigate("/events");
            }, 3000);
          } else {
            setStatus("processing");
            setMessage("Payment is being processed...");
            setTimeout(handlePaymentReturn, 5000);
            return; // Don't set processing to false yet
          }
        } catch (error) {
          setStatus("error");
          setMessage("Failed to verify event payment.");
        }
      }
      // Handle cancelled payment
      else if (paymentType === "cancelled") {
        setStatus("error");
        setMessage("Payment was cancelled. You can try again anytime.");

        setTimeout(() => {
          navigate(-1); // Go back
        }, 3000);
      }
      // No payment parameters
      else {
        navigate("/dashboard");
        return;
      }

      setProcessing(false);
    };

    handlePaymentReturn();
  }, [searchParams, navigate]);

  if (processing && status === "processing") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="p-6">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
              <h2 className="text-xl font-semibold text-gray-800 mb-2">
                Processing Payment
              </h2>
              <p className="text-gray-600 mb-4">
                Please wait while we verify your payment...
              </p>
              <p className="text-sm text-gray-500">
                This may take a few moments. Please do not close this page.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <CardContent className="p-6">
          <Alert
            className={`border-2 ${
              status === "success"
                ? "border-green-500 bg-green-50"
                : "border-red-500 bg-red-50"
            }`}
          >
            <div className="flex items-center gap-2">
              {status === "success" && (
                <CheckCircle className="h-5 w-5 text-green-600" />
              )}
              {status === "error" && (
                <AlertCircle className="h-5 w-5 text-red-600" />
              )}
              <AlertTitle
                className={
                  status === "success" ? "text-green-800" : "text-red-800"
                }
              >
                {status === "success" ? "Payment Successful" : "Payment Failed"}
              </AlertTitle>
            </div>
            <AlertDescription
              className={`mt-2 ${
                status === "success" ? "text-green-700" : "text-red-700"
              }`}
            >
              {message}
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
};

export default PaymentStatusHandler;
