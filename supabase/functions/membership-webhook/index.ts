// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

// Handle OPTIONS request for CORS preflight
const handleOptions = () => {
  return new Response('ok', { headers: corsHeaders });
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return handleOptions();
  }

  let webhookBody: any = null;
  try {
    console.log("Request received:", {
      method: req.method,
      url: req.url,
      headers: Object.fromEntries(req.headers.entries())
    });

    // Log request body for debugging
    const body = await req.text();
    console.log("Request body:", body);
    webhookBody = JSON.parse(body);
    console.log("Diamond Plus webhook received:", webhookBody);

    // Environment variables
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const paypalClientId = Deno.env.get("PAYPAL_CLIENT_ID");
    const paypalClientSecret = Deno.env.get("PAYPAL_CLIENT_SECRET");
    const paypalEnvironment = Deno.env.get("PAYPAL_ENVIRONMENT") || "sandbox";

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Handle PayPal webhook events
    const eventType = webhookBody.event_type;
    const orderId = webhookBody.resource?.id;

    console.log("Processing webhook event:", { eventType, orderId });

    if (
      eventType === "CHECKOUT.ORDER.APPROVED" ||
      eventType === "PAYMENT.CAPTURE.COMPLETED"
    ) {
      // Find the membership upgrade by PayPal order ID
      const { data: upgrade, error: upgradeError } = await supabase
        .from("membership_upgrades")
        .select("*")
        .eq("paypal_order_id", orderId)
        .single();

      if (upgradeError || !upgrade) {
        console.log("No membership upgrade found for order:", orderId);
        const errorMessage = `Order not found for ID: ${orderId}`;
        console.error(errorMessage);
        return new Response(JSON.stringify({ 
          error: "Order not found",
          details: errorMessage,
          orderId,
          upgradeError: upgradeError?.message
        }), {
          status: 404,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders
          }
        });
      }

      console.log("Found membership upgrade:", upgrade.id);

      // Capture the PayPal payment if approved
      if (eventType === "CHECKOUT.ORDER.APPROVED") {
        const PAYPAL_BASE_URL =
          paypalEnvironment === "production" || paypalEnvironment === "live"
            ? "https://api-m.paypal.com"
            : "https://api-m.sandbox.paypal.com";

        // Get PayPal access token
        const auth = btoa(`${paypalClientId}:${paypalClientSecret}`);
        const tokenResponse = await fetch(
          `${PAYPAL_BASE_URL}/v1/oauth2/token`,
          {
            method: "POST",
            headers: {
              Authorization: `Basic ${auth}`,
              "Content-Type": "application/x-www-form-urlencoded",
            },
            body: "grant_type=client_credentials",
          }
        );

        const { access_token } = await tokenResponse.json();

        // Capture the payment
        const captureResponse = await fetch(
          `${PAYPAL_BASE_URL}/v2/checkout/orders/${orderId}/capture`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${access_token}`,
              "Content-Type": "application/json",
            },
          }
        );

        if (!captureResponse.ok) {
          throw new Error("Failed to capture PayPal payment");
        }

        const captureData = await captureResponse.json();
        console.log("Payment captured:", captureData.id);
      }

      // Update installment payment if applicable
      if (upgrade.installment_plan) {
        const { error: installmentUpdateError } = await supabase
          .from("installment_payments")
          .update({
            payment_status: "completed",
            paid_at: new Date().toISOString(),
            paypal_payment_id: webhookBody.resource?.id,
          })
          .eq("paypal_order_id", orderId);

        if (installmentUpdateError) {
          console.error(
            "Failed to update installment payment:",
            installmentUpdateError
          );
        }

        // Check if all installments are paid
        const { data: installments, error: installmentsError } = await supabase
          .from("installment_payments")
          .select("payment_status")
          .eq("membership_upgrade_id", upgrade.id);

        if (!installmentsError && installments) {
          const allPaid = installments.every(
            (inst) => inst.payment_status === "completed"
          );

          if (allPaid) {
            // Activate membership based on upgrade type
            await activateMembership(supabase, upgrade);
          } else {
            // Mark upgrade as partially paid
            await supabase
              .from("membership_upgrades")
              .update({
                payment_status: "partially_paid",
                updated_at: new Date().toISOString(),
              })
              .eq("id", upgrade.id);
          }
        }
      } else {
        // Full payment - activate immediately
        await activateMembership(supabase, upgrade);
      }

      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      });
    }

    return new Response(JSON.stringify({ message: "Event type not handled" }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders
      }
    });
  } catch (error) {
    console.error("Webhook processing error:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    const stackTrace = error instanceof Error ? error.stack : undefined;
    
    return new Response(JSON.stringify({ 
      error: "Webhook error",
      message: errorMessage,
      stack: stackTrace,
      requestBody: webhookBody
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders
      }
    });
  }
});

/* eslint-disable @typescript-eslint/no-explicit-any */
async function activateMembership(supabase: any, upgrade: any) {
  /* eslint-enable @typescript-eslint/no-explicit-any */
  const tier = upgrade.upgrade_type || "silver";
  console.log(
    `Activating membership tier '${tier}' for user:`,
    upgrade.user_id
  );

  try {
    // Base user update payload
    const userPayload: Record<string, any> = {
      membership_tier: tier,
      updated_at: new Date().toISOString(),
    };

    // Validate user_id is a valid UUID
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(upgrade.user_id)) {
      throw new Error(`Invalid user_id format: ${upgrade.user_id}`);
    }

    // Special handling for membership types
    if (tier === "diamond_plus") {
      userPayload.diamond_plus_active = true;
      userPayload.agreement_signed = true;
    } else if (tier === "silver_plus") {
      // Get the next membership number
      const { data: lastMember, error: memberError } = await supabase
        .from('users')
        .select('silver_plus_membership_number')
        .not('silver_plus_membership_number', 'is', null)
        .order('silver_plus_membership_number', { ascending: false })
        .limit(1)
        .single();
      
      const nextMembershipNumber = (lastMember?.silver_plus_membership_number || 0) + 1;

      // Set all Silver Plus fields
      userPayload.silver_plus_active = true;
      userPayload.membership_tier = "silver_plus";
      userPayload.membership_type = "silver_plus";
      userPayload.silver_plus_payment_id = upgrade.paypal_payment_id || upgrade.paypal_order_id;
      userPayload.silver_plus_joined_at = new Date().toISOString();
      userPayload.silver_plus_membership_number = nextMembershipNumber;
      
      console.log('Updating user with Silver Plus details:', userPayload);
      
      // Check if user was referred by someone
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('referred_by')
        .eq('id', upgrade.user_id)
        .single();
        
      if (userError) {
        console.error('Error fetching user data:', userError);
      } else if (userData?.referred_by) {
        console.log(`User was referred by: ${userData.referred_by}`);
        
        // Get referral fee percentage (default to 20% if not set)
        const { data: referrerData, error: feeError } = await supabase
          .from('users')
          .select('id, referral_fees, referred_by')
          .eq('username', userData.referred_by)
          .single();
          
        if (feeError) {
          console.error('Error fetching referrer data:', feeError);
        } else if (referrerData) {
          const referralPercentage = referrerData.referral_fees?.silver_plus || 20; // Default 20%
          const grossAmount = parseFloat(upgrade.payment_amount || upgrade.amount_paid || '0');
          
          // Calculate PayPal fees: $0.50 flat + 1.5% of gross
          const paypalFlatFee = 0.50;
          const paypalPercentageFee = grossAmount * 0.015;
          const totalPaypalFees = paypalFlatFee + paypalPercentageFee;
          const netAmount = grossAmount - totalPaypalFees;
          
          // Calculate commission on net amount (after PayPal fees)
          const commissionAmount = (netAmount * referralPercentage) / 100;
          
          console.log(`Creating referral commission of $${commissionAmount} (${referralPercentage}% of $${netAmount}) for ${userData.referred_by}`);
          
          // Create payment record for the referrer
          const { data: paymentData, error: paymentError } = await supabase
            .from('payments')
            .insert({
              user_id: referrerData.id,
              amount: commissionAmount,
              payment_type: 'referral_commission',
              payment_status: 'completed',
              paypal_order_id: upgrade.paypal_order_id,
              referred_by: userData.referred_by,
              referrer_commission: commissionAmount,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .select()
            .single();
            
          if (paymentError) {
            console.error('Failed to create referral commission:', paymentError);
          } else {
            console.log('Successfully created referral commission:', paymentData);
            
            // Calculate current week's start date (Sunday)
            const now = new Date();
            const weekStart = new Date(now);
            weekStart.setHours(0, 0, 0, 0);
            weekStart.setDate(weekStart.getDate() - weekStart.getDay()); // Start of current week (Sunday)
            const weekStartStr = weekStart.toISOString().split('T')[0];
            const weekEnd = new Date(weekStart);
            weekEnd.setDate(weekEnd.getDate() + 6);
            const weekEndStr = weekEnd.toISOString().split('T')[0];
            
            try {
              // Check if weekly_earnings record exists
              const { data: existingRecord, error: checkError } = await supabase
                .from('weekly_earnings')
                .select('id, referral_earnings, amount')
                .eq('user_id', referrerData.id)
                .eq('week_start', weekStartStr)
                .single();
              
              if (checkError && checkError.code !== 'PGRST116') {
                console.error('Error checking weekly earnings:', checkError);
              } else if (existingRecord) {
                // Update existing record
                const { error: updateError } = await supabase
                  .from('weekly_earnings')
                  .update({
                    referral_earnings: (existingRecord.referral_earnings || 0) + commissionAmount,
                    amount: (existingRecord.amount || 0) + commissionAmount,
                    updated_at: new Date().toISOString()
                  })
                  .eq('id', existingRecord.id);
                
                if (updateError) {
                  console.error('Failed to update weekly earnings:', updateError);
                } else {
                  console.log('Successfully updated weekly referral earnings');
                }
              } else {
                // Create new record
                const { error: insertError } = await supabase
                  .from('weekly_earnings')
                  .insert({
                    user_id: referrerData.id,
                    week_start: weekStartStr,
                    week_end: weekEndStr,
                    amount: commissionAmount,
                    tip_earnings: 0,
                    referral_earnings: commissionAmount,
                    bonus_earnings: 0
                  });
                
                if (insertError) {
                  console.error('Failed to create weekly earnings record:', insertError);
                } else {
                  console.log('Successfully created weekly referral earnings record');
                }
              }
            } catch (error) {
              console.error('Error updating weekly earnings:', error);
            }
            
            // Check for downline referral (referrer's referrer) - 2nd level commission
            const uplineUsername = String(referrerData.referred_by || '').trim();
            let uplineReferrerData: any | null = null;
            if (uplineUsername) {
              const { data: uplineCandidates, error: uplineFetchError } = await supabase
                .from('users')
                .select('id, username, referral_fees')
                .ilike('username', uplineUsername)
                .limit(2);

              if (uplineFetchError) {
                console.log('No upline referrer found or error:', uplineFetchError.message);
              } else if (Array.isArray(uplineCandidates) && uplineCandidates.length > 0) {
                if (uplineCandidates.length > 1) {
                  console.warn(`Multiple users found for upline username '${uplineUsername}', using the first match with id ${uplineCandidates[0].id}`);
                }
                uplineReferrerData = uplineCandidates[0];
              } else {
                console.log(`No upline user matched username '${uplineUsername}'`);
              }
            }

            if (uplineReferrerData) {
              console.log(`Found upline referrer: ${uplineReferrerData.username} (referred ${userData.referred_by})`);
              
              // Calculate 10% commission for upline referrer
              const uplinePercentage = 10; // Fixed 10% for second level
              const uplineCommissionAmount = (netAmount * uplinePercentage) / 100;
              
              console.log(`Creating upline referral commission of $${uplineCommissionAmount} (${uplinePercentage}% of net $${netAmount}) for ${uplineReferrerData.username}`);
              
              // Create payment record for upline referrer
              const { data: uplinePaymentData, error: uplinePaymentError } = await supabase
                .from('payments')
                .insert({
                  user_id: uplineReferrerData.id,
                  amount: uplineCommissionAmount,
                  payment_type: 'upline_referral_commission',
                  payment_status: 'completed',
                  paypal_order_id: upgrade.paypal_order_id,
                  referred_by: uplineReferrerData.username,
                  referrer_commission: uplineCommissionAmount,
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString()
                })
                .select()
                .single();
              
              if (uplinePaymentError) {
                console.error('Failed to create upline referral commission:', uplinePaymentError);
              } else {
                console.log('Successfully created upline referral commission:', uplinePaymentData);
                
                // Update upline referrer's weekly earnings
                try {
                  // Check if weekly_earnings record exists for upline referrer
                  const { data: uplineExistingRecord, error: uplineCheckError } = await supabase
                    .from('weekly_earnings')
                    .select('id, referral_earnings, amount')
                    .eq('user_id', uplineReferrerData.id)
                    .eq('week_start', weekStartStr)
                    .single();
                  
                  if (uplineCheckError && uplineCheckError.code !== 'PGRST116') {
                    console.error('Error checking upline weekly earnings:', uplineCheckError);
                  } else if (uplineExistingRecord) {
                    // Update existing upline record
                    const { error: uplineUpdateError } = await supabase
                      .from('weekly_earnings')
                      .update({
                        referral_earnings: (uplineExistingRecord.referral_earnings || 0) + uplineCommissionAmount,
                        amount: (uplineExistingRecord.amount || 0) + uplineCommissionAmount,
                        updated_at: new Date().toISOString()
                      })
                      .eq('id', uplineExistingRecord.id);
                    
                    if (uplineUpdateError) {
                      console.error('Failed to update upline weekly earnings:', uplineUpdateError);
                    } else {
                      console.log('Successfully updated upline weekly referral earnings');
                    }
                  } else {
                    // Create new upline record
                    const { error: uplineInsertError } = await supabase
                      .from('weekly_earnings')
                      .insert({
                        user_id: uplineReferrerData.id,
                        week_start: weekStartStr,
                        week_end: weekEndStr,
                        amount: uplineCommissionAmount,
                        tip_earnings: 0,
                        referral_earnings: uplineCommissionAmount,
                        bonus_earnings: 0
                      });
                    
                    if (uplineInsertError) {
                      console.error('Failed to create upline weekly earnings record:', uplineInsertError);
                    } else {
                      console.log('Successfully created upline weekly referral earnings record');
                    }
                  }
                } catch (uplineWeeklyError) {
                  console.error('Error updating upline weekly earnings:', uplineWeeklyError);
                }
              }
            }
          }
        }
      }
    }

    const { data: user, error: userUpdateError } = await supabase
      .from("users")
      .update(userPayload)
      .eq("id", upgrade.user_id)
      .select()
      .single();

    if (userUpdateError || !user) {
      console.error('Failed to update user:', {
        userId: upgrade.user_id,
        error: userUpdateError,
        payload: userPayload
      });
      throw new Error(`Failed to update user: ${userUpdateError?.message || 'User not found'}`);
    }

    if (userUpdateError) {
      throw new Error(`Failed to update user: ${userUpdateError.message}`);
    }

    // Mark upgrade as completed
    const { error: upgradeUpdateError } = await supabase
      .from("membership_upgrades")
      .update({
        payment_status: "completed",
        upgrade_status: "completed",
        updated_at: new Date().toISOString(),
      })
      .eq("id", upgrade.id);

    if (upgradeUpdateError) {
      throw new Error(
        `Failed to update upgrade: ${upgradeUpdateError.message}`
      );
    }

    // Increment membership limits for all tiers

    // Fetch the user's current user_type to ensure we increment the correct limit row
    const { data: userRow, error: userTypeError } = await supabase
      .from("users")
      .select("user_type")
      .eq("id", upgrade.user_id)
      .single();

    if (userTypeError) {
      console.error(
        "Failed to fetch user_type for membership increment:",
        userTypeError
      );
    }

    const userType = (userRow?.user_type as string) || "normal";

    const { error: genericLimitsError } = await supabase.rpc(
      "increment_membership_count",
      {
        membership_type_param: tier,
        user_type_param: userType,
      }
    );

    if (genericLimitsError) {
      console.error(
        "RPC failed to increment membership count:",
        genericLimitsError
      );
      // Fallback: perform direct update (row must exist beforehand)
      const { error: genericFallbackError } = await supabase
        .from("membership_limits")
        .update({
          current_count: supabase.raw("current_count + 1"),
          updated_at: new Date().toISOString(),
        })
        .eq("membership_type", tier)
        .eq("user_type", userType);

      if (genericFallbackError) {
        console.error(
          "Failed to update membership limits via fallback:",
          genericFallbackError
        );
      }
    }

    // Handle additional logic exclusive to diamond_plus
    if (tier === "diamond_plus") {
      // Quarterly requirements tracking
      const currentYear = new Date().getFullYear();
      const quarters = [1, 2, 3, 4];
      for (const q of quarters) {
        await supabase.from("quarterly_requirements").insert({
          user_id: upgrade.user_id,
          year: currentYear,
          quarter: q,
          guaranteed_payout: 6250.0,
        });
      }
    }

    console.log(`${tier} activation completed successfully`);
  } catch (error) {
    console.error(`Error activating ${tier}:`, error);
    throw error;
  }
}
