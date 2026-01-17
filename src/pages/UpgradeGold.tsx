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
import PaymentMethodSelector, { CardData } from "@/components/PaymentMethodSelector";

export default function UpgradeGold() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const userIdFromUrl = searchParams.get("user_id");
  const cadence = (searchParams.get("cadence") || "monthly").toLowerCase();
  const [loading, setLoading] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState("");
  const { toast } = useToast();

  const AMOUNT = cadence === 'yearly' ? 99.99 : 11.99;

  const resolveUserId = async (): Promise<string | null> => {
    let userIdToUse: string | undefined = userIdFromUrl ?? undefined;
    if (!userIdToUse) {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error) {
        toast({ title: "Auth Error", description: error.message, variant: "destructive" });
        return null;
      }
      userIdToUse = user?.id;
    }
    if (!userIdToUse) {
      toast({ title: "Error", description: "User ID is missing. Please log in and try again.", variant: "destructive" });
      return null;
    }
    return userIdToUse;
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

      const returnUrl = `${window.location.origin}/payment-return?payment=success&tier=gold&cadence=${cadence}`;
      const cancelUrl = `${window.location.origin}/payment-return?payment=cancelled&tier=gold&cadence=${cadence}`;

      const { data, error } = await supabase.functions.invoke("create-paypal-subscription", {
        body: {
          user_id: userId,
          tier: "gold",
          cadence,
          return_url: returnUrl,
          cancel_url: cancelUrl,
          description: `Gold Membership - ${cadence === 'yearly' ? 'Annual' : 'Monthly'} Subscription`,
        },
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Failed to create PayPal subscription");

      toast({ title: "Redirecting to PayPal", description: "Please approve your subscription..." });
      window.location.href = data.approval_url as string;
    } catch (err: any) {
      console.error("Gold subscribe error:", err);
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

      const returnUrl = `${window.location.origin}/payment-return?payment=success&tier=gold&cadence=${cadence}`;
      const cancelUrl = `${window.location.origin}/payment-return?payment=cancelled&tier=gold&cadence=${cadence}`;

      const { data, error } = await supabase.functions.invoke("create-paypal-subscription", {
        body: {
          user_id: userId,
          tier: "gold",
          cadence,
          return_url: returnUrl,
          cancel_url: cancelUrl,
          description: `Gold Membership - ${cadence === 'yearly' ? 'Annual' : 'Monthly'} Subscription`,
        },
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Failed to create PayPal subscription");

      toast({ title: "Redirecting to PayPal", description: "Please approve your subscription..." });
      const approvalUrl = data.approval_url + "&fundingSource=paylater";
      window.location.href = approvalUrl;
    } catch (err: any) {
      console.error("Gold subscribe error:", err);
      toast({ title: "Subscription Error", description: err?.message || "Failed to start subscription", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleCardPayment = async (cardData: CardData) => {
    if (!phoneNumber) {
      toast({ title: "Missing Information", description: "Please provide your phone number", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const userId = await resolveUserId();
      if (!userId) return;

      await supabase.from("users").update({ phone_number: phoneNumber }).eq("id", userId);

      const { data, error } = await supabase.functions.invoke("process-card-membership", {
        body: {
          user_id: userId,
          tier: "gold",
          amount: AMOUNT,
          cadence,
          card_number: cardData.cardNumber,
          expiry_month: cardData.expiryMonth,
          expiry_year: cardData.expiryYear,
          cvv: cardData.cvv,
          card_holder_name: cardData.cardHolderName,
        },
      });

      if (error) throw error;
      if (!data?.success) {
        if (data?.requires_action) {
          toast({ title: "Authentication Required", description: "Please complete 3D Secure verification", variant: "destructive" });
          if (data.action_url) window.location.href = data.action_url;
          return;
        }
        throw new Error(data?.error || "Payment failed");
      }

      toast({ title: "Payment Successful!", description: "Your Gold membership is now active." });
      navigate("/dashboard");
    } catch (error: any) {
      console.error("Card payment error:", error);
      toast({ title: "Payment Failed", description: error.message || "Failed to process card payment", variant: "destructive" });
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
            <CardTitle className="text-3xl font-bold text-amber-500">Upgrade to Gold Membership</CardTitle>
            <CardDescription>{cadence === 'yearly' ? 'Annual subscription' : 'Monthly subscription'}. Immediate activation after approval.</CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h3 className="text-xl font-semibold">Membership Benefits</h3>
                <ul className="space-y-2">
                  {[
                    "All the benefits of the Silver Package",
                    "Lifetime FREE admission to events surrounding the show",
                    "Lifetime subscription to FLAME FLIX affiliated platforms",
                    "Increased chances for semi-finals selection",
                    "Get featured on our Instagram page along with cast members",
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
                  <div className="text-4xl font-bold text-amber-600">{cadence === 'yearly' ? '$99.99' : '$11.99'}</div>
                  <p className="text-muted-foreground">{cadence === 'yearly' ? 'per year' : 'per month'}</p>
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
                    onCardSubmit={handleCardPayment}
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
