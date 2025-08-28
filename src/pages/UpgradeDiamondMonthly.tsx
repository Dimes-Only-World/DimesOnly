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

export default function UpgradeDiamondMonthly() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const userIdFromUrl = searchParams.get("user_id");
  const cadence = (searchParams.get("cadence") || "monthly").toLowerCase();
  const [loading, setLoading] = useState(false);
  const [billingOption, setBillingOption] = useState<'full'|'split'>('split');
  const [phoneNumber, setPhoneNumber] = useState("");
  const { toast } = useToast();

  const handleSubscribe = async () => {
    setLoading(true);
    try {
      // Resolve user id from auth if not provided
      let userIdToUse: string | undefined = userIdFromUrl ?? undefined;
      if (!userIdToUse) {
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError) {
          toast({ title: "Auth Error", description: authError.message, variant: "destructive" });
          return;
        }
        userIdToUse = user?.id;
      }
      if (!userIdToUse) {
        toast({ title: "Error", description: "User ID is missing. Please log in and try again.", variant: "destructive" });
        return;
      }

      if (!phoneNumber) {
        toast({ title: "Missing Information", description: "Please provide your phone number", variant: "destructive" });
        return;
      }

      // Update phone number on user profile
      await supabase.from("users").update({ phone_number: phoneNumber }).eq("id", userIdToUse);

      const returnUrl = `${window.location.origin}/payment-return?payment=success&tier=diamond&cadence=${cadence}&billing_option=${cadence==='yearly' ? billingOption : ''}`;
      const cancelUrl = `${window.location.origin}/payment-return?payment=cancelled&tier=diamond&cadence=${cadence}&billing_option=${cadence==='yearly' ? billingOption : ''}`;

      // Invoke subscription creator (generalized edge function)
      const { data, error } = await supabase.functions.invoke("create-paypal-subscription", {
        body: {
          user_id: userIdToUse,
          tier: "diamond",
          cadence,
          ...(cadence === 'yearly' ? { billing_option: billingOption } : {}),
          return_url: returnUrl,
          cancel_url: cancelUrl,
          description: `Diamond Membership - ${cadence === 'yearly' ? (billingOption === 'full' ? 'Annual (one payment)' : 'Annual (split every 4 months)') : 'Monthly'} Subscription`,
        },
      });

      if (error) throw error;
      if (!data?.success) {
        throw new Error(data?.error || "Failed to create PayPal subscription");
      }

      toast({ title: "Redirecting to PayPal", description: "Please approve your subscription..." });
      window.location.href = data.approval_url as string;
    } catch (err: any) {
      console.error("Diamond monthly subscribe error:", err);
      const msg = typeof err?.message === "string" ? err.message : "Failed to start subscription";
      toast({ title: "Subscription Error", description: msg, variant: "destructive" });
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
            <CardTitle className="text-3xl font-bold text-cyan-400">Upgrade to Diamond ({cadence === 'yearly' ? 'Yearly' : 'Monthly'})</CardTitle>
            <CardDescription>
              {cadence === 'yearly'
                ? (billingOption === 'full' ? 'Annual subscription (one payment).' : 'Annual subscription billed in split cycles.')
                : 'Monthly subscription.'}
              {' '}Immediate activation after approval.
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h3 className="text-xl font-semibold">Membership Benefits</h3>
                <ul className="space-y-2">
                  {[
                    "GET ALL THE BENEFITS OF FREE, SILVER AND GOLD",
                    "VIP Access & VIP Section 4 times a year + 1 guest FREE",
                    "Profit share 10% of company gross sales among first 300",
                    "Featured on our Instagram page along with cast members",
                    "Featured on the opening page of the App every day for 3 years",
                  ].map((benefit) => (
                    <li key={benefit} className="flex items-start">
                      <CheckCircle className="w-5 h-5 text-green-500 mr-2 mt-0.5" />
                      <span>{benefit}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="bg-gray-50 p-6 rounded-lg border space-y-6">
                {cadence === 'yearly' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <button
                      type="button"
                      className={`p-3 rounded border text-left ${billingOption==='full' ? 'border-cyan-600 bg-cyan-50' : 'border-gray-300 hover:border-cyan-400'}`}
                      onClick={() => setBillingOption('full')}
                    >
                      <div className="font-semibold">Full Payment</div>
                      <div className="text-sm text-gray-600">$150.00 once per year</div>
                    </button>
                    <button
                      type="button"
                      className={`p-3 rounded border text-left ${billingOption==='split' ? 'border-cyan-600 bg-cyan-50' : 'border-gray-300 hover:border-cyan-400'}`}
                      onClick={() => setBillingOption('split')}
                    >
                      <div className="font-semibold">Split Payment</div>
                      <div className="text-sm text-gray-600">$53.25 every 4 months (3x per year)</div>
                    </button>
                  </div>
                )}
                <div className="text-center">
                  <div className="text-4xl font-bold text-cyan-600">{cadence === 'yearly' ? (billingOption==='full' ? '$150.00' : '$150.00') : '$14.99'}</div>
                  <p className="text-muted-foreground">{cadence === 'yearly' ? (billingOption==='full' ? 'one payment per year' : 'per year (split)') : 'per month'}</p>
                  {cadence === 'yearly' && billingOption==='split' && (
                    <p className="text-xs text-gray-500 mt-1">Billed as $53.25 every 4 months (3x per year)</p>
                  )}
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
