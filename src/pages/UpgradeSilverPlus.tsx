import React, { useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, ArrowLeft } from "lucide-react";
import AppLayout from "@/components/AppLayout";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import PaymentMethodSelector, { CardData } from "@/components/PaymentMethodSelector";

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
  const { toast } = useToast();

  const AMOUNT = 74.99;

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
      const userIdToUse = await resolveUserId();
      if (!userIdToUse) return;

      if (!(await checkAvailability())) return;

      const { data: upgrade, error: upgradeError } = await supabase
        .from("membership_upgrades")
        .insert({
          user_id: userIdToUse,
          upgrade_type: 'silver_plus',
          payment_amount: AMOUNT,
          payment_method: 'paypal_full',
          installment_plan: false,
          installment_count: 1,
          phone_number: phoneNumber,
          payment_status: 'pending',
          upgrade_status: 'pending',
        })
        .select()
        .single();

      if (upgradeError) throw upgradeError;

      await supabase.from("users").update({ phone_number: phoneNumber }).eq("id", userIdToUse);

      const returnUrl = `${window.location.origin}/payment-return?payment=success&upgrade_id=${upgrade.id}`;
      const cancelUrl = `${window.location.origin}/payment-return?payment=cancelled`;

      const { data: orderData, error: orderError } = await supabase.functions.invoke("create-paypal-order", {
        body: {
          payment_type: "membership",
          membership_upgrade_id: upgrade.id,
          user_id: userIdToUse,
          amount: AMOUNT,
          installment_number: 1,
          return_url: returnUrl,
          cancel_url: cancelUrl,
          description: "Silver+ Lifetime Membership - One-time Payment",
        },
      });

      if (orderError) throw orderError;
      if (!orderData?.success) throw new Error("Failed to create PayPal order");

      toast({ title: "Redirecting to PayPal", description: "Please complete your payment..." });
      sessionStorage.setItem("membership_upgrade", JSON.stringify({ upgrade_id: upgrade.id, payment_option: "full", amount: AMOUNT }));
      window.location.href = orderData.approval_url;
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
      const userIdToUse = await resolveUserId();
      if (!userIdToUse) return;

      if (!(await checkAvailability())) return;

      const { data: upgrade, error: upgradeError } = await supabase
        .from("membership_upgrades")
        .insert({
          user_id: userIdToUse,
          upgrade_type: 'silver_plus',
          payment_amount: AMOUNT,
          payment_method: 'paypal_paylater',
          installment_plan: false,
          installment_count: 1,
          phone_number: phoneNumber,
          payment_status: 'pending',
          upgrade_status: 'pending',
        })
        .select()
        .single();

      if (upgradeError) throw upgradeError;

      await supabase.from("users").update({ phone_number: phoneNumber }).eq("id", userIdToUse);

      const returnUrl = `${window.location.origin}/payment-return?payment=success&upgrade_id=${upgrade.id}`;
      const cancelUrl = `${window.location.origin}/payment-return?payment=cancelled`;

      const { data: orderData, error: orderError } = await supabase.functions.invoke("create-paypal-order", {
        body: {
          payment_type: "membership",
          membership_upgrade_id: upgrade.id,
          user_id: userIdToUse,
          amount: AMOUNT,
          installment_number: 1,
          return_url: returnUrl,
          cancel_url: cancelUrl,
          description: "Silver+ Lifetime Membership - One-time Payment",
        },
      });

      if (orderError) throw orderError;
      if (!orderData?.success) throw new Error("Failed to create PayPal order");

      toast({ title: "Redirecting to PayPal", description: "Please complete your payment..." });
      sessionStorage.setItem("membership_upgrade", JSON.stringify({ upgrade_id: upgrade.id, payment_option: "full", amount: AMOUNT }));
      const approvalUrl = orderData.approval_url + "&fundingSource=paylater";
      window.location.href = approvalUrl;
    } catch (error: any) {
      console.error("Upgrade error:", error);
      toast({ title: "Upgrade Failed", description: error.message || "Failed to process upgrade", variant: "destructive" });
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
      const userIdToUse = await resolveUserId();
      if (!userIdToUse) return;

      if (!(await checkAvailability())) return;

      await supabase.from("users").update({ phone_number: phoneNumber }).eq("id", userIdToUse);

      const { data, error } = await supabase.functions.invoke("process-card-membership", {
        body: {
          user_id: userIdToUse,
          tier: "silver_plus",
          amount: AMOUNT,
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

      toast({ title: "Payment Successful!", description: "Your Silver+ membership is now active." });
      onMembershipUpdate?.({
        silver_plus_active: true,
        silver_plus_joined_at: new Date().toISOString(),
        membership_tier: 'silver_plus',
      });
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
            <CardTitle className="text-3xl font-bold text-blue-600">
              Upgrade to Silver+ Membership
            </CardTitle>
          </CardHeader>
          
          <CardContent className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h3 className="text-xl font-semibold">Membership Benefits</h3>
                <ul className="space-y-2">
                  {['Lifetime access', 'Exclusive content', 'Priority support', 'Member-only events'].map((benefit) => (
                    <li key={benefit} className="flex items-start">
                      <CheckCircle className="w-5 h-5 text-green-500 mr-2 mt-0.5" />
                      <span>{benefit}</span>
                    </li>
                  ))}
                </ul>
              </div>
              
              <div className="bg-gray-50 p-6 rounded-lg border space-y-6">
                <div className="text-center">
                  <div className="text-4xl font-bold text-blue-600">${AMOUNT}</div>
                  <p className="text-muted-foreground">One-time payment</p>
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

                  <PaymentMethodSelector
                    amount={AMOUNT}
                    onPayPal={handlePayPal}
                    onPayLater={handlePayLater}
                    onCardSubmit={handleCardPayment}
                    isProcessing={loading}
                    disabled={!phoneNumber}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
