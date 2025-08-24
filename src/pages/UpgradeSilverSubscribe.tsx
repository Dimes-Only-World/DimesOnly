import React, { useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { CheckCircle, Loader2, ArrowLeft, CreditCard } from "lucide-react";
import AppLayout from "@/components/AppLayout";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function UpgradeSilverSubscribe() {
  const [searchParams] = useSearchParams();
  const cadence = (searchParams.get("cadence") || "monthly").toLowerCase();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState("");
  const { toast } = useToast();

  const priceLabel = cadence === "yearly" ? "$49.99" : "$4.99";
  const priceSuffix = cadence === "yearly" ? "per year" : "per month";

  const handleSubscribe = async () => {
    setLoading(true);
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError) throw authError;
      if (!user) throw new Error("Please log in and try again.");
      if (!phoneNumber) throw new Error("Please provide your phone number");

      await supabase.from("users").update({ phone_number: phoneNumber }).eq("id", user.id);

      const returnUrl = `${window.location.origin}/payment-return?payment=success&tier=silver&cadence=${cadence}`;
      const cancelUrl = `${window.location.origin}/payment-return?payment=cancelled&tier=silver&cadence=${cadence}`;

      const { data, error } = await supabase.functions.invoke("create-paypal-subscription", {
        body: {
          user_id: user.id,
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
          <div className="mx-6 mb-2 rounded-md bg-yellow-50 border border-yellow-300 text-yellow-800 text-sm p-3">
            <b>Tip:</b> For the best video experience, rotate your device to <b>Landscape</b>. On some devices, open the video’s 3‑dot menu to switch to Landscape.
          </div>

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

                  <Button className="w-full py-6 text-lg" size="lg" onClick={handleSubscribe} disabled={loading || !phoneNumber}>
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing...
                      </>
                    ) : (
                      <>
                        <CreditCard className="mr-2 h-5 w-5" /> Subscribe with PayPal
                      </>
                    )}
                  </Button>
                </div>

                <div className="text-center text-xs text-muted-foreground">
                  <p>Secure subscription processed by PayPal</p>
                  <p className="mt-1">Cancel anytime</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
