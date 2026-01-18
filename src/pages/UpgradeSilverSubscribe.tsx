import React, { useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { CheckCircle, ArrowLeft } from "lucide-react";
import AppLayout from "@/components/AppLayout";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import PaymentMethodSelector from "@/components/PaymentMethodSelector";

export default function UpgradeSilverSubscribe() {
  const [searchParams] = useSearchParams();
  const cadence = (searchParams.get("cadence") || "monthly").toLowerCase();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState("");
  const { toast } = useToast();

  const AMOUNT = cadence === "yearly" ? 49.99 : 4.99;
  const priceLabel = cadence === "yearly" ? "$49.99" : "$4.99";
  const priceSuffix = cadence === "yearly" ? "per year" : "per month";

  const resolveUserId = async (): Promise<string | null> => {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) {
      toast({ title: "Auth Error", description: error.message, variant: "destructive" });
      return null;
    }
    if (!user?.id) {
      toast({ title: "Error", description: "Please log in and try again.", variant: "destructive" });
      return null;
    }
    return user.id;
  };

  const handlePayPal = async () => {
    if (!phoneNumber) {
      toast({ title: "Missing Information", description: "Please provide your phone number", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const userId = await resolveUserId();
      if (!userId) return;

      await supabase.from("users").update({ phone_number: phoneNumber }).eq("id", userId);

      const returnUrl = `${window.location.origin}/payment-return?payment=success&tier=silver&cadence=${cadence}`;
      const cancelUrl = `${window.location.origin}/payment-return?payment=cancelled&tier=silver&cadence=${cadence}`;

      const { data, error } = await supabase.functions.invoke("create-paypal-subscription", {
        body: {
          user_id: userId,
          tier: "silver",
          cadence,
          return_url: returnUrl,
          cancel_url: cancelUrl,
          description: `Silver Membership - ${cadence}`,
        },
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Failed to create PayPal subscription");

      toast({ title: "Redirecting to PayPal", description: "Please approve your subscription..." });
      window.location.href = data.approval_url as string;
    } catch (err: any) {
      console.error("Silver subscribe error:", err);
      toast({ title: "Subscription Error", description: err?.message || "Failed to start subscription", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handlePayLater = async () => {
    if (!phoneNumber) {
      toast({ title: "Missing Information", description: "Please provide your phone number", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const userId = await resolveUserId();
      if (!userId) return;

      await supabase.from("users").update({ phone_number: phoneNumber }).eq("id", userId);

      const returnUrl = `${window.location.origin}/payment-return?payment=success&tier=silver&cadence=${cadence}`;
      const cancelUrl = `${window.location.origin}/payment-return?payment=cancelled&tier=silver&cadence=${cadence}`;

      const { data, error } = await supabase.functions.invoke("create-paypal-subscription", {
        body: {
          user_id: userId,
          tier: "silver",
          cadence,
          return_url: returnUrl,
          cancel_url: cancelUrl,
          description: `Silver Membership - ${cadence}`,
        },
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Failed to create PayPal subscription");

      toast({ title: "Redirecting to PayPal", description: "Please approve your subscription..." });
      const approvalUrl = data.approval_url + "&fundingSource=paylater";
      window.location.href = approvalUrl;
    } catch (err: any) {
      console.error("Silver subscribe error:", err);
      toast({ title: "Subscription Error", description: err?.message || "Failed to start subscription", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleCardRedirect = async () => {
    if (!phoneNumber) {
      toast({ title: "Missing Information", description: "Please provide your phone number", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const userId = await resolveUserId();
      if (!userId) return;

      const returnUrl = `${window.location.origin}/payment-return?payment=success&tier=silver&cadence=${cadence}`;
      const cancelUrl = `${window.location.origin}/payment-return?payment=cancelled&tier=silver&cadence=${cadence}`;

      const { data, error } = await supabase.functions.invoke("start-membership-paypal", {
        body: {
          user_id: userId,
          tier: "silver",
          amount: AMOUNT,
          cadence,
          phone_number: phoneNumber,
          payment_method: "paypal_card",
          return_url: returnUrl,
          cancel_url: cancelUrl,
        },
      });

      if (error) throw error;
      if (!data?.success || !data?.approval_url) {
        throw new Error(data?.error || "Failed to create payment");
      }

      sessionStorage.setItem("membership_upgrade", JSON.stringify({
        upgrade_id: data.upgrade_id,
        tier: "silver",
        cadence,
      }));

      toast({ title: "Redirecting to PayPal", description: "Complete card payment on PayPal..." });
      const approvalUrl = data.approval_url + "&fundingSource=card";
      window.location.href = approvalUrl;
    } catch (error: any) {
      console.error("Card redirect error:", error);
      toast({ title: "Payment Error", description: error.message || "Failed to start card payment", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppLayout>
      <div className="container mx-auto p-4 max-w-4xl">
        <Button variant="ghost" className="mb-4" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-4 h-4 mr-2" /> Back
        </Button>

        <Card className="border-0 shadow-lg">
          <CardHeader className="text-center">
            <CardTitle className="text-3xl font-bold text-gray-900">Upgrade to Silver</CardTitle>
            <CardDescription>{cadence === 'yearly' ? 'Annual' : 'Monthly'} subscription. Immediate activation after approval.</CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h3 className="text-xl font-semibold">Membership Benefits</h3>
                <ul className="space-y-2">
                  {[
                    "20% override on all the free people that join under your link in phase 2.",
                    "30% of all subscriptions/memberships sold through your link now.",
                    "40% of tips designated to you through your link.",
                    "20% of tips if designated to you through someone else's link.",
                    "20% of tips if they choose you to tip.",
                    "View nudes from strippers and exotics.",
                    "Do not wait to get sponsored and pay for a profit-sharing position.",
                  ].map((benefit) => (
                    <li key={benefit} className="flex items-start">
                      <CheckCircle className="w-5 h-5 text-green-500 mr-2 mt-0.5" />
                      <span>{benefit}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="bg-gray-50 p-6 rounded-lg border space-y-6">
                <div className="text-center">
                  <div className="text-4xl font-bold text-gray-900">{priceLabel}</div>
                  <p className="text-muted-foreground">{priceSuffix}</p>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number</Label>
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="+1 (555) 123-4567"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      disabled={loading}
                      required
                    />
                    <p className="text-xs text-muted-foreground">Required for payment verification</p>
                  </div>

                  <PaymentMethodSelector
                    amount={AMOUNT}
                    onPayPal={handlePayPal}
                    onPayLater={handlePayLater}
                    cardMode="redirect"
                    onCardRedirect={handleCardRedirect}
                    isProcessing={loading}
                    disabled={!phoneNumber}
                    paypalLabel="Subscribe with PayPal"
                  />
                </div>

                <div className="text-center text-xs text-muted-foreground">
                  <p>Cancel anytime</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
