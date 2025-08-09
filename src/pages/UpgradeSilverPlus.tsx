import React, { useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, Loader2, ArrowLeft } from "lucide-react";
import AppLayout from "@/components/AppLayout";

interface PaymentResponse {
  success: boolean;
  paymentId: string;
  error?: string;
}

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
  const { toast } = useToast();

  const handleUpgrade = async () => {
    if (!effectiveUserId) {
      toast({ 
        title: "Error", 
        description: "User ID is missing", 
        variant: "destructive" 
      });
      return;
    }

    setLoading(true);
    try {
      // 1. Check availability
      const { data: availability, error: availabilityError } = await supabase
        .rpc('check_silver_plus_availability');
      
      if (availabilityError) throw availabilityError;
      
      if (!availability || !availability[0]?.available) {
        throw new Error("No more lifetime Silver+ memberships available. It will be available as a monthly subscription soon.");
      }

      // 2. Process payment (simulated for now - replace with actual payment processing)
      const paymentResponse = await processPayment();
      
      if (!paymentResponse.success) {
        throw new Error(paymentResponse.error || "Payment processing failed");
      }

      // 3. Get the next membership number
      const { count: currentMembersCount } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .eq('silver_plus_active', true);
      
      const membershipNumber = (currentMembersCount || 0) + 1;

      // 4. Update user's membership in the database
      const updates = {
        silver_plus_active: true,
        silver_plus_joined_at: new Date().toISOString(),
        silver_plus_membership_number: membershipNumber,
        silver_plus_payment_id: paymentResponse.paymentId,
        membership_tier: 'silver_plus',
        membership_type: 'Silver+',
        updated_at: new Date().toISOString()
      };

      // First try with the standard case
      const { error: updateError } = await supabase
        .from('users')
        .update(updates)
        .eq('id', effectiveUserId);

      // If update failed, try with RPC function as fallback
      if (updateError) {
        console.warn("Standard update failed, trying RPC fallback:", updateError);
        const { error: rpcError } = await supabase
          .rpc('update_user_silver_plus', {
            user_id: effectiveUserId,
            payment_id: paymentResponse.paymentId,
            membership_number: membershipNumber
          });
        
        if (rpcError) {
          console.error("RPC update error:", rpcError);
          throw new Error("Failed to update user membership");
        }
      }

      // 4. Record the payment in the payments table
      const paymentRecord = {
        id: paymentResponse.paymentId, // Use the generated UUID as the primary key
        user_id: effectiveUserId,
        amount: 74.99,
        currency: 'USD',
        payment_type: 'silver_plus_upgrade',
        payment_status: 'completed',
        paypal_payment_id: `pay_${paymentResponse.paymentId.substring(0, 8)}`, // Shorter ID for PayPal reference
        platform_fee: 0, // Adjust as needed
        created_at: new Date().toISOString()
      };

      const { error: paymentRecordError } = await supabase
        .from('payments')
        .insert(paymentRecord);

      if (paymentRecordError) {
        console.error("Payment record error:", paymentRecordError);
        // Don't fail the upgrade if payment recording fails
      }

      // 5. Update user context/state
      if (onMembershipUpdate) {
        onMembershipUpdate({
          silver_plus_active: true,
          silver_plus_joined_at: new Date().toISOString(),
          membership_tier: 'silver_plus'
        });
      }

      toast({ 
        title: "Success!", 
        description: "You've been upgraded to Silver+ membership!" 
      });
      
      // 6. Redirect to dashboard after a short delay
      setTimeout(() => navigate('/dashboard'), 2000);
      
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
  
  // Simulated payment processing - replace with actual payment integration
  const processPayment = async (): Promise<PaymentResponse> => {
    // Generate a UUID v4
    const generateUUID = () => {
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
      });
    };

    // For now, simulate a successful payment
    return {
      success: true,
      paymentId: generateUUID() // Now this will be a valid UUID
    };
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
              
              <div className="bg-gray-50 p-6 rounded-lg border">
                <div className="text-center mb-6">
                  <div className="text-4xl font-bold text-blue-600">$74.99</div>
                  <p className="text-muted-foreground">One-time payment</p>
                </div>
                
                <Button 
                  className="w-full py-6 text-lg" 
                  size="lg"
                  onClick={handleUpgrade}
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    'Complete Upgrade Now'
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
