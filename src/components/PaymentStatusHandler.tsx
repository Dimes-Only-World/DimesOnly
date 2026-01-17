import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle, Loader2, AlertCircle, RefreshCw } from "lucide-react";
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

// Helper to get upgrade page URL from tier
const getUpgradePageUrl = (tier: string | null | undefined): string => {
  if (!tier) return "/upgrade";
  const tierLower = tier.toLowerCase();
  if (tierLower === "silver_plus") return "/upgrade-silver-plus";
  if (tierLower === "silver") return "/upgrade-silver";
  if (tierLower === "gold") return "/upgrade-gold";
  if (tierLower === "diamond") return "/upgrade-diamond-monthly";
  if (tierLower === "elite") return "/elite";
  return "/upgrade";
};

const PaymentStatusHandler: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [processing, setProcessing] = useState(true);
  const [status, setStatus] = useState<"success" | "error" | "processing">(
    "processing"
  );
  const [message, setMessage] = useState("");
  const [tier, setTier] = useState<string | null>(null);

  useEffect(() => {
    const handlePaymentReturn = async () => {
      const paymentType = searchParams.get("payment");
      let upgradeId = searchParams.get("upgrade_id");
      const eventPaymentId = searchParams.get("payment_id");
      const paypalToken = searchParams.get("token");
      const payerId = searchParams.get("PayerID");

      // Fallback: get upgrade_id from sessionStorage if not in URL
      let storedUpgrade: { upgrade_id?: string; tier?: string } | null = null;
      if (!upgradeId) {
        try {
          const stored = sessionStorage.getItem("membership_upgrade");
          if (stored) {
            storedUpgrade = JSON.parse(stored);
            upgradeId = storedUpgrade?.upgrade_id || null;
          }
        } catch (e) {
          console.warn("Failed to parse sessionStorage membership_upgrade:", e);
        }
      }

      // Also try to get tier from sessionStorage
      if (storedUpgrade?.tier) {
        setTier(storedUpgrade.tier);
      }

      // Handle cancelled payment with improved UX
      if (paymentType === "cancelled") {
        // Try to determine tier from sessionStorage for better redirect
        let cancelTier: string | null = null;
        try {
          const stored = sessionStorage.getItem("membership_upgrade");
          if (stored) {
            const parsed = JSON.parse(stored);
            cancelTier = parsed?.tier || null;
          }
        } catch (e) {
          console.warn("Failed to get tier from sessionStorage:", e);
        }

        setTier(cancelTier);
        setStatus("error");
        setMessage("Payment was cancelled. You can try again anytime.");
        setProcessing(false);
        return;
      }

      // Handle membership upgrade payment success
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

          // Store tier for potential retry button
          if (upgrade?.upgrade_type) {
            setTier(upgrade.upgrade_type);
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

            // If we have PayPal token, the user approved the payment
            // Let's manually trigger the membership activation via membership-webhook
            // We no longer require PayerID since PayPal v2 checkout may not always return it
            if (paypalToken || upgrade.paypal_order_id) {
              try {
                console.log("Manually triggering membership activation...");
                console.log("Using order ID:", upgrade.paypal_order_id || paypalToken);

                // Call the membership-webhook function directly
                const { data: webhookResult, error: webhookError } =
                  await supabase.functions.invoke("membership-webhook", {
                    body: {
                      event_type: "CHECKOUT.ORDER.APPROVED",
                      resource: {
                        id: upgrade.paypal_order_id || paypalToken,
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
      // Handle success without upgrade_id - try to find from paypal token
      else if (paymentType === "success" && paypalToken && !upgradeId && !eventPaymentId) {
        try {
          // Look up upgrade by PayPal order ID
          const { data: upgrade, error } = await supabase
            .from("membership_upgrades")
            .select("*")
            .eq("paypal_order_id", paypalToken)
            .single();

          if (error || !upgrade) {
            console.error("Could not find upgrade for token:", paypalToken);
            setStatus("error");
            setMessage("Could not verify payment. Please contact support.");
            setProcessing(false);
            return;
          }

          // Store tier and redirect with proper upgrade_id
          setTier(upgrade.upgrade_type);
          sessionStorage.setItem("membership_upgrade", JSON.stringify({
            upgrade_id: upgrade.id,
            tier: upgrade.upgrade_type,
          }));

          // Re-run with the found upgrade_id
          const newUrl = new URL(window.location.href);
          newUrl.searchParams.set("upgrade_id", upgrade.id);
          window.history.replaceState({}, "", newUrl.toString());

          // Recurse with the upgrade_id now set
          setTimeout(handlePaymentReturn, 100);
          return;
        } catch (error) {
          console.error("Error looking up upgrade by token:", error);
          setStatus("error");
          setMessage("Could not verify payment. Please contact support.");
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
      // No payment parameters
      else {
        navigate("/dashboard");
        return;
      }

      setProcessing(false);
    };

    handlePaymentReturn();
  }, [searchParams, navigate]);

  const handleRetry = () => {
    const retryUrl = getUpgradePageUrl(tier);
    sessionStorage.removeItem("membership_upgrade");
    navigate(retryUrl);
  };

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
                {status === "success" ? "Payment Successful" : "Payment Cancelled"}
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

          {/* Show retry button for cancelled payments */}
          {status === "error" && (
            <div className="mt-4 flex flex-col gap-2">
              <Button 
                onClick={handleRetry}
                className="w-full"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Try Again
              </Button>
              <Button 
                variant="outline"
                onClick={() => navigate("/dashboard")}
                className="w-full"
              >
                Go to Dashboard
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default PaymentStatusHandler;
