import React, { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, ArrowLeft } from "lucide-react";
import AppLayout from "@/components/AppLayout";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import PaymentMethodSelector from "@/components/PaymentMethodSelector";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import MembershipAgreementSection from "@/components/MembershipAgreementSection";

interface MembershipUpdate {
  silver_plus_active: boolean;
  silver_plus_joined_at: string;
  membership_tier: string;
}

interface UpgradeSilverPlusProps {
  userId?: string;
  onMembershipUpdate?: (update: MembershipUpdate) => void;
}

export default function UpgradeSilverPlus({ userId, onMembershipUpdate }: UpgradeSilverPlusProps) {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const userIdFromUrl = searchParams.get('user_id');
  const effectiveUserId = userId || userIdFromUrl;
  const [loading, setLoading] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [plan, setPlan] = useState<"full" | "monthly">("full");
  const [showRefundPolicy, setShowRefundPolicy] = useState(true);
  const [agreementComplete, setAgreementComplete] = useState(false);
  const { toast } = useToast();

  const FULL_AMOUNT = 249.99;
  const MONTHLY_AMOUNT = 62.50;
  const AMOUNT = plan === "full" ? FULL_AMOUNT : MONTHLY_AMOUNT;

  const resolveUserId = async (): Promise<string | null> => {
    if (effectiveUserId) return effectiveUserId;
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) {
      toast({ title: "Auth Error", description: error.message, variant: "destructive" });
      return null;
    }
    if (!user?.id) {
      toast({ title: "Error", description: "User ID is missing", variant: "destructive" });
      return null;
    }
    return user.id;
  };

  const checkAvailability = async (): Promise<boolean> => {
    const { data: availability, error } = await supabase.rpc('check_silver_plus_availability');
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return false;
    }
    if (!availability || !availability[0]?.available) {
      toast({ title: "Not Available", description: "No more lifetime Silver+ memberships available.", variant: "destructive" });
      return false;
    }
    return true;
  };

  const handlePayPal = async () => {
    if (!phoneNumber) {
      toast({ title: "Missing Information", description: "Please provide your phone number", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const returnUrl = `${window.location.origin}/payment-return?payment=success`;
      const cancelUrl = `${window.location.origin}/payment-return?payment=cancelled`;

      const { data, error } = await supabase.functions.invoke("start-membership-paypal", {
        body: {
          tier: "silver_plus",
          amount: AMOUNT,
          phone_number: phoneNumber,
          payment_method: plan === "monthly" ? "paypal_monthly" : "paypal_full",
          check_availability: true,
          return_url: returnUrl,
          cancel_url: cancelUrl,
        },
      });

      if (error) throw error;
      if (!data?.success) {
        if (data?.code === "SOLD_OUT") {
          toast({ title: "Not Available", description: "No more lifetime Silver+ memberships available.", variant: "destructive" });
          return;
        }
        throw new Error(data?.error || "Failed to start payment");
      }

      toast({ title: "Redirecting to PayPal", description: "Please complete your payment..." });
      sessionStorage.setItem("membership_upgrade", JSON.stringify({ 
        upgrade_id: data.upgrade_id, 
        tier: "silver_plus",
        payment_option: plan, 
        amount: AMOUNT 
      }));
      window.location.href = data.approval_url;
    } catch (error: any) {
      console.error("Upgrade error:", error);
      toast({ title: "Upgrade Failed", description: error.message || "Failed to process upgrade", variant: "destructive" });
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
      const returnUrl = `${window.location.origin}/payment-return?payment=success`;
      const cancelUrl = `${window.location.origin}/payment-return?payment=cancelled`;

      const { data, error } = await supabase.functions.invoke("start-membership-paypal", {
        body: {
          tier: "silver_plus",
          amount: AMOUNT,
          phone_number: phoneNumber,
          payment_method: plan === "monthly" ? "paypal_monthly" : "paypal_paylater",
          check_availability: true,
          return_url: returnUrl,
          cancel_url: cancelUrl,
        },
      });

      if (error) throw error;
      if (!data?.success) {
        if (data?.code === "SOLD_OUT") {
          toast({ title: "Not Available", description: "No more lifetime Silver+ memberships available.", variant: "destructive" });
          return;
        }
        throw new Error(data?.error || "Failed to start payment");
      }

      toast({ title: "Redirecting to PayPal", description: "Please complete your payment..." });
      sessionStorage.setItem("membership_upgrade", JSON.stringify({ 
        upgrade_id: data.upgrade_id, 
        tier: "silver_plus",
        payment_option: plan, 
        amount: AMOUNT 
      }));
      const approvalUrl = data.approval_url + "&fundingSource=paylater";
      window.location.href = approvalUrl;
    } catch (error: any) {
      console.error("Upgrade error:", error);
      toast({ title: "Upgrade Failed", description: error.message || "Failed to process upgrade", variant: "destructive" });
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
      if (!(await checkAvailability())) {
        setLoading(false);
        return;
      }

      const returnUrl = `${window.location.origin}/payment-return?payment=success`;
      const cancelUrl = `${window.location.origin}/payment-return?payment=cancelled`;

      const { data, error } = await supabase.functions.invoke("start-membership-paypal", {
        body: {
          tier: "silver_plus",
          amount: AMOUNT,
          phone_number: phoneNumber,
          payment_method: plan === "monthly" ? "paypal_monthly" : "paypal_card",
          check_availability: true,
          return_url: returnUrl,
          cancel_url: cancelUrl,
        },
      });

      if (error) throw error;
      if (!data?.success) {
        if (data?.code === "SOLD_OUT") {
          toast({ title: "Not Available", description: "No more lifetime Silver+ memberships available.", variant: "destructive" });
          return;
        }
        throw new Error(data?.error || "Failed to start payment");
      }

      toast({ title: "Redirecting to PayPal", description: "Please complete your card payment..." });
      sessionStorage.setItem("membership_upgrade", JSON.stringify({ 
        upgrade_id: data.upgrade_id, 
        tier: "silver_plus",
        payment_option: plan, 
        amount: AMOUNT 
      }));
      // Redirect to PayPal with card funding source
      const approvalUrl = data.approval_url + "&fundingSource=card";
      window.location.href = approvalUrl;
    } catch (error: any) {
      console.error("Card redirect error:", error);
      toast({ title: "Payment Failed", description: error.message || "Failed to start card payment", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppLayout>
      <Dialog open={showRefundPolicy} onOpenChange={setShowRefundPolicy}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Silver Plus Membership Agreement</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 text-sm">
            <p>
              After you pay, you can only be refunded if you do not notarize your agreement within 30 days.
            </p>
            <p>
              We will keep the prorated amount of days you use the membership divided by 365 days, or 30 days from your monthly payment.
            </p>
            <p className="font-semibold">
              If the agreement is signed and notarized, the membership fee is non-refundable.
            </p>
            <Button className="w-full" onClick={() => setShowRefundPolicy(false)}>
              I Understand
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <div className="container mx-auto p-4 max-w-4xl">
        <Button variant="ghost" className="mb-4" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-4 h-4 mr-2" /> Back
        </Button>
        
        <div className="mb-8">
          <MembershipAgreementSection
            tier="silver_plus"
            onSubmitted={() => setAgreementComplete(true)}
          />
        </div>

        <Card className="border-0 shadow-lg">
          <CardHeader className="text-center">
            <CardTitle className="text-3xl font-bold text-blue-600">
              Upgrade to Silver+ Membership
            </CardTitle>
          </CardHeader>
          
          <CardContent className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h3 className="text-xl font-semibold">Membership Benefits</h3>
                <ul className="space-y-2">
                  {['Lifetime access', 'Exclusive content', 'Priority support', 'Member-only events', 'Profit share up to $75,000 a year max in tier 1', 'Profit share $1,170,000 a year minimum in tier 2'].map((benefit) => (
                    <li key={benefit} className="flex items-start">
                      <CheckCircle className="w-5 h-5 text-green-500 mr-2 mt-0.5" />
                      <span>{benefit}</span>
                    </li>
                  ))}
                </ul>
              </div>
              
              <div className="bg-gray-50 p-6 rounded-lg border space-y-6">
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setPlan("full")}
                    className={`rounded-lg border-2 p-4 text-center transition-all ${
                      plan === "full" ? "border-blue-600 bg-blue-50" : "border-muted"
                    }`}
                  >
                    <div className="text-2xl font-bold text-blue-600">${FULL_AMOUNT}</div>
                    <p className="text-xs text-muted-foreground">One-time payment</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPlan("monthly")}
                    className={`rounded-lg border-2 p-4 text-center transition-all ${
                      plan === "monthly" ? "border-blue-600 bg-blue-50" : "border-muted"
                    }`}
                  >
                    <div className="text-2xl font-bold text-blue-600">$62.50<span className="text-sm">/mo</span></div>
                    <p className="text-xs text-muted-foreground">12 months = $750 total</p>
                  </button>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-blue-600">${AMOUNT.toFixed(2)}</div>
                  <p className="text-muted-foreground">
                    {plan === "full" ? "One-time payment" : "First of 12 monthly payments"}
                  </p>
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
                    <p className="text-xs text-muted-foreground">
                      Required for payment verification
                    </p>
                  </div>

                  {agreementComplete ? (
                    <PaymentMethodSelector
                      amount={AMOUNT}
                      onPayPal={handlePayPal}
                      onPayLater={handlePayLater}
                      onCardRedirect={handleCardRedirect}
                      cardMode="redirect"
                      isProcessing={loading}
                      disabled={!phoneNumber}
                    />
                  ) : (
                    <div className="rounded-lg border border-yellow-500 bg-yellow-50 p-4 text-sm text-yellow-900 text-center font-semibold">
                      Complete Silver Plus Membership Agreement above to continue...
                    </div>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

      </div>
    </AppLayout>
  );
}
