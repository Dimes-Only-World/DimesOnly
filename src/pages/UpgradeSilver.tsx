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

interface UpgradeSilverProps {
  userId?: string;
}

export default function UpgradeSilver({ userId }: UpgradeSilverProps) {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const userIdFromUrl = searchParams.get('user_id');
  const effectiveUserId = userId || userIdFromUrl || undefined;
  const [loading, setLoading] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState("");
  const { toast } = useToast();

  const handleUpgrade = async () => {
    // Resolve the user ID from auth if not provided via prop or URL
    let userIdToUse = effectiveUserId;
    if (!userIdToUse) {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();
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
      toast({
        title: "Missing Information",
        description: "Please provide your phone number",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      // Create membership upgrade record for Silver (non-plus)
      const upgradePayload = {
        user_id: userIdToUse,
        upgrade_type: 'silver',
        payment_amount: 49.99,
        payment_method: 'paypal_full',
        installment_plan: false,
        installment_count: 1,
        phone_number: phoneNumber,
        payment_status: 'pending',
        upgrade_status: 'pending',
      } as const;

      const { data: upgrade, error: upgradeError } = await supabase
        .from("membership_upgrades")
        .insert(upgradePayload)
        .select()
        .single();

      if (upgradeError) throw upgradeError;

      // Update phone number on user profile
      await supabase
        .from("users")
        .update({ phone_number: phoneNumber })
        .eq("id", userIdToUse);

      // Create PayPal order via edge function
      const returnUrl = `${window.location.origin}/payment-return?payment=success&upgrade_id=${upgrade.id}`;
      const cancelUrl = `${window.location.origin}/payment-return?payment=cancelled`;

      const { data: orderData, error: orderError } = await supabase.functions.invoke(
        "create-paypal-order",
        {
          body: {
            payment_type: "membership",
            membership_upgrade_id: upgrade.id,
            user_id: userIdToUse,
            amount: 49.99,
            installment_number: 1,
            return_url: returnUrl,
            cancel_url: cancelUrl,
            description: "Silver Membership - One-time Payment",
          },
        }
      );

      if (orderError) throw orderError;
      if (!orderData?.success) throw new Error("Failed to create PayPal order");

      toast({
        title: "Redirecting to PayPal",
        description: "Please complete your payment...",
      });

      // Store upgrade info in session storage for the return page
      sessionStorage.setItem(
        "membership_upgrade",
        JSON.stringify({
          upgrade_id: upgrade.id,
          payment_option: "full",
          amount: 49.99,
        })
      );

      // Redirect to PayPal
      window.location.href = orderData.approval_url as string;

    } catch (error: any) {
      console.error("Upgrade error:", error);
      toast({
        title: "Upgrade Failed",
        description: error.message || "Failed to process upgrade",
        variant: "destructive",
      });
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
              Upgrade to Silver Membership
            </CardTitle>
            <CardDescription>One-time payment. Immediate activation after successful payment.</CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h3 className="text-xl font-semibold">Membership Benefits</h3>
                <ul className="space-y-2">
                  {[
                    'View nudes from strippers and exotics',
                    'Revenue share benefits per program terms',
                    'Do not wait to get sponsored and pay for a profit-sharing position',
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
                  <div className="text-4xl font-bold text-blue-600">$49.99</div>
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

                  <Button 
                    className="w-full py-6 text-lg" 
                    size="lg"
                    onClick={handleUpgrade}
                    disabled={loading || !phoneNumber}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <CreditCard className="mr-2 h-5 w-5" />
                        Pay with PayPal
                      </>
                    )}
                  </Button>
                </div>

                <div className="text-center text-xs text-muted-foreground">
                  <p>Secure payment processed by PayPal</p>
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
