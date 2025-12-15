import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Tip allocation rates (must match process-tip and tip-webhook)
const PAYPAL_FEE_PERCENT = 0.015; // 1.5%
const PAYPAL_FEE_FIXED = 0.50;    // $0.50
const PERFORMER_RATE = 0.20;      // 20% of net
const REFERRER_RATE = 0.10;       // 10% of net
const JACKPOT_RATE = 0.25;        // 25% of net

function roundCurrency(value: number): number {
  return Math.round(value * 100) / 100;
}

function calculateExpectedAllocation(grossAmount: number, hasReferrer: boolean) {
  const paypalFee = roundCurrency((grossAmount * PAYPAL_FEE_PERCENT) + PAYPAL_FEE_FIXED);
  const netAmount = roundCurrency(grossAmount - paypalFee);
  
  const performerShare = roundCurrency(netAmount * PERFORMER_RATE);
  const referrerShare = hasReferrer ? roundCurrency(netAmount * REFERRER_RATE) : 0;
  const jackpotContribution = roundCurrency(netAmount * JACKPOT_RATE);
  const companyShare = roundCurrency(netAmount - performerShare - referrerShare - jackpotContribution);
  
  return {
    grossAmount,
    paypalFee,
    netAmount,
    performerShare,
    referrerShare,
    jackpotContribution,
    companyShare,
    ticketsGenerated: Math.min(5, Math.floor(grossAmount))
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { action, tipAmount = 10 } = await req.json();

    // Action: setup - Create test accounts
    if (action === "setup") {
      console.log("Setting up test accounts...");
      
      // Test user definitions
      const testUsers = [
        { email: "test_tipper@dimesonly.test", username: "test_tipper", user_type: "normal", referred_by: "company" },
        { email: "test_referrer@dimesonly.test", username: "test_referrer", user_type: "normal", referred_by: "company" },
        { email: "test_performer@dimesonly.test", username: "test_performer", user_type: "exotic", referred_by: "test_referrer" }
      ];

      const createdUsers: any[] = [];

      // Step 1: Force delete ALL existing test accounts (auth + public)
      console.log("Force cleaning existing test accounts...");
      
      // Get all auth users and find test ones
      const { data: allAuthUsers, error: listError } = await supabase.auth.admin.listUsers();
      if (listError) {
        console.error("Failed to list auth users:", listError);
      } else {
        console.log(`Found ${allAuthUsers?.users?.length || 0} total auth users`);
      }
      
      for (const user of testUsers) {
        // Delete from public.users by username first
        const { data: existingPublicUser, error: publicFetchError } = await supabase
          .from("users")
          .select("id")
          .eq("username", user.username)
          .maybeSingle();
        
        if (publicFetchError) {
          console.error(`Error checking public user ${user.username}:`, publicFetchError);
        }
        
        if (existingPublicUser) {
          console.log(`Deleting existing public.users record for ${user.username} (id: ${existingPublicUser.id})`);
          const { error: publicDeleteError } = await supabase
            .from("users")
            .delete()
            .eq("id", existingPublicUser.id);
          
          if (publicDeleteError) {
            console.error(`Failed to delete public user ${user.username}:`, publicDeleteError);
          } else {
            console.log(`Deleted public.users record for ${user.username}`);
          }
        }
        
        // Delete from auth.users by email
        const existingAuthUser = allAuthUsers?.users?.find(u => u.email === user.email);
        if (existingAuthUser) {
          console.log(`Deleting existing auth.users record for ${user.email} (id: ${existingAuthUser.id})`);
          const { error: authDeleteError } = await supabase.auth.admin.deleteUser(existingAuthUser.id);
          if (authDeleteError) {
            console.error(`Failed to delete auth user ${user.email}:`, authDeleteError);
          } else {
            console.log(`Deleted auth.users record for ${user.email}`);
          }
        }
      }

      // Wait a moment for deletions to propagate
      await new Promise(resolve => setTimeout(resolve, 500));

      // Step 2: Create fresh test users
      console.log("Creating fresh test accounts...");
      
      for (const user of testUsers) {
        console.log(`Creating user: ${user.username}`);
        
        // Create auth user
        const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
          email: user.email,
          password: "TestPassword123!",
          email_confirm: true,
          user_metadata: { username: user.username }
        });

        if (authError) {
          console.error(`Failed to create auth user ${user.username}:`, authError);
          continue;
        }
        
        console.log(`Created auth user ${user.username} with id: ${authUser.user.id}`);

        // Create public.users record
        const { error: userError } = await supabase
          .from("users")
          .insert({
            id: authUser.user.id,
            username: user.username,
            email: user.email,
            password_hash: "$2a$12$placeholder",
            user_type: user.user_type,
            referred_by: user.referred_by,
            first_name: "Test",
            last_name: user.username.replace("test_", ""),
            tips_earned: 0,
            referral_fees: 0
          });

        if (userError) {
          console.error(`Failed to create public user ${user.username}:`, userError);
          // Try to clean up the auth user we just created
          await supabase.auth.admin.deleteUser(authUser.user.id);
          continue;
        }

        createdUsers.push({ id: authUser.user.id, username: user.username, status: "created" });
        console.log(`Successfully created user: ${user.username}`);
      }

      // Clean up any existing test data
      await supabase.from("tips_transactions").delete().eq("tipped_username", "test_performer");
      await supabase.from("tips").delete().eq("tipped_username", "test_performer");
      
      const userIds = createdUsers.map(u => u.id).filter(Boolean);
      if (userIds.length > 0) {
        await supabase.from("weekly_earnings").delete().in("user_id", userIds);
        await supabase.from("jackpot_tickets").delete().in("tipper_id", userIds);
      }

      return new Response(JSON.stringify({
        success: true,
        message: "Test accounts ready",
        users: createdUsers
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Action: test - Run a test tip
    if (action === "test") {
      console.log(`Running test tip of $${tipAmount}...`);

      // Get test user IDs
      const { data: tipper } = await supabase
        .from("users")
        .select("id, username")
        .eq("username", "test_tipper")
        .single();

      const { data: performer } = await supabase
        .from("users")
        .select("id, username, referred_by")
        .eq("username", "test_performer")
        .single();

      const { data: referrer } = await supabase
        .from("users")
        .select("id, username")
        .eq("username", "test_referrer")
        .single();

      if (!tipper || !performer || !referrer) {
        return new Response(JSON.stringify({
          success: false,
          error: "Test accounts not found. Run 'setup' first."
        }), { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 });
      }

      // Calculate expected allocation
      const expected = calculateExpectedAllocation(tipAmount, true);
      console.log("Expected allocation:", expected);

      // Simulate a completed tip (like the webhook would)
      const paymentId = crypto.randomUUID();
      const tipId = crypto.randomUUID();

      // Insert payment record
      await supabase.from("payments").insert({
        id: paymentId,
        user_id: tipper.id,
        amount: tipAmount,
        payment_type: "tip",
        payment_status: "completed",
        platform_fee: expected.paypalFee,
        referrer_commission: expected.referrerShare,
        referred_by: referrer.username
      });

      // Insert tip record
      await supabase.from("tips").insert({
        id: tipId,
        user_id: tipper.id,
        tip_amount: tipAmount,
        tipper_username: tipper.username,
        tipped_username: performer.username,
        referrer_username: referrer.username,
        tickets_generated: expected.ticketsGenerated,
        status: "completed"
      });

      // Insert tips_transactions record
      await supabase.from("tips_transactions").insert({
        tipper_user_id: tipper.id,
        tipped_user_id: performer.id,
        tip_amount: tipAmount,
        tipped_username: performer.username,
        referrer_username: referrer.username,
        referrer_commission: expected.referrerShare,
        tickets_generated: expected.ticketsGenerated,
        payment_method: "test",
        payment_status: "completed",
        payment_id: paymentId,
        completed_at: new Date().toISOString()
      });

      // Update performer's tips_earned
      await supabase.rpc("increment_tips_earned", {
        p_user_id: performer.id,
        p_amount: expected.performerShare
      });

      // Update referrer's referral_fees
      await supabase.rpc("increment_referral_fees", {
        p_user_id: referrer.id,
        p_amount: expected.referrerShare
      });

      // Update weekly earnings for performer
      const weekStart = getWeekStart(new Date());
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);

      // Performer weekly earnings
      const { data: existingPerformerWeek } = await supabase
        .from("weekly_earnings")
        .select("id, amount, tip_earnings")
        .eq("user_id", performer.id)
        .eq("week_start", weekStart.toISOString().split("T")[0])
        .single();

      if (existingPerformerWeek) {
        await supabase
          .from("weekly_earnings")
          .update({
            amount: (existingPerformerWeek.amount || 0) + expected.performerShare,
            tip_earnings: (existingPerformerWeek.tip_earnings || 0) + expected.performerShare
          })
          .eq("id", existingPerformerWeek.id);
      } else {
        await supabase.from("weekly_earnings").insert({
          user_id: performer.id,
          week_start: weekStart.toISOString().split("T")[0],
          week_end: weekEnd.toISOString().split("T")[0],
          amount: expected.performerShare,
          tip_earnings: expected.performerShare,
          referral_earnings: 0,
          bonus_earnings: 0
        });
      }

      // Referrer weekly earnings
      const { data: existingReferrerWeek } = await supabase
        .from("weekly_earnings")
        .select("id, amount, referral_earnings")
        .eq("user_id", referrer.id)
        .eq("week_start", weekStart.toISOString().split("T")[0])
        .single();

      if (existingReferrerWeek) {
        await supabase
          .from("weekly_earnings")
          .update({
            amount: (existingReferrerWeek.amount || 0) + expected.referrerShare,
            referral_earnings: (existingReferrerWeek.referral_earnings || 0) + expected.referrerShare
          })
          .eq("id", existingReferrerWeek.id);
      } else {
        await supabase.from("weekly_earnings").insert({
          user_id: referrer.id,
          week_start: weekStart.toISOString().split("T")[0],
          week_end: weekEnd.toISOString().split("T")[0],
          amount: expected.referrerShare,
          tip_earnings: 0,
          referral_earnings: expected.referrerShare,
          bonus_earnings: 0
        });
      }

      // Generate jackpot tickets
      const ticketCodes: string[] = [];
      for (let i = 0; i < expected.ticketsGenerated; i++) {
        const code = generateTicketCode();
        ticketCodes.push(code);
        
        await supabase.from("jackpot_tickets").insert({
          tip_id: tipId,
          tipper_id: tipper.id,
          dime_id: performer.id,
          referred_dime_id: referrer.id,
          code: code,
          tickets_count: 1,
          source: "test_tip"
        });
      }

      return new Response(JSON.stringify({
        success: true,
        tipAmount,
        expected,
        ticketCodes,
        message: `Test tip of $${tipAmount} processed. Run 'verify' to check results.`
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Action: verify - Check the results
    if (action === "verify") {
      console.log("Verifying test results...");

      // Get test users with their current balances
      const { data: users } = await supabase
        .from("users")
        .select("id, username, tips_earned, referral_fees, referred_by")
        .in("username", ["test_tipper", "test_performer", "test_referrer"]);

      // Get tips_transactions
      const { data: transactions } = await supabase
        .from("tips_transactions")
        .select("*")
        .eq("tipped_username", "test_performer")
        .order("created_at", { ascending: false });

      // Get weekly earnings
      const userIds = users?.map(u => u.id) || [];
      const { data: weeklyEarnings } = await supabase
        .from("weekly_earnings")
        .select("*")
        .in("user_id", userIds)
        .order("week_start", { ascending: false });

      // Get jackpot tickets
      const { data: tickets } = await supabase
        .from("jackpot_tickets")
        .select("*")
        .eq("source", "test_tip");

      return new Response(JSON.stringify({
        success: true,
        users,
        transactions,
        weeklyEarnings,
        tickets,
        summary: {
          performerBalance: users?.find(u => u.username === "test_performer")?.tips_earned || 0,
          referrerBalance: users?.find(u => u.username === "test_referrer")?.referral_fees || 0,
          totalTransactions: transactions?.length || 0,
          totalTickets: tickets?.length || 0
        }
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Action: cleanup - Remove test data AND user accounts
    if (action === "cleanup") {
      console.log("Cleaning up test data and user accounts...");

      // Get test user IDs
      const { data: users } = await supabase
        .from("users")
        .select("id, username")
        .in("username", ["test_tipper", "test_performer", "test_referrer"]);

      const userIds = users?.map(u => u.id) || [];
      const deletedUsers: string[] = [];
      const errors: string[] = [];

      if (userIds.length > 0) {
        // Clean up transaction data first
        console.log("Deleting transaction data...");
        await supabase.from("tips_transactions").delete().eq("tipped_username", "test_performer");
        await supabase.from("tips").delete().eq("tipped_username", "test_performer");
        await supabase.from("weekly_earnings").delete().in("user_id", userIds);
        await supabase.from("jackpot_tickets").delete().in("tipper_id", userIds);
        await supabase.from("jackpot_tickets").delete().in("dime_id", userIds);
        await supabase.from("payments").delete().in("user_id", userIds);
        console.log("Transaction data deleted");

        // Delete from public.users
        console.log("Deleting from public.users...");
        const { error: usersDeleteError } = await supabase
          .from("users")
          .delete()
          .in("id", userIds);
        
        if (usersDeleteError) {
          console.error("Failed to delete from public.users:", usersDeleteError);
          errors.push(`public.users: ${usersDeleteError.message}`);
        } else {
          console.log(`Deleted ${userIds.length} records from public.users`);
        }

        // Delete from auth.users
        console.log("Deleting from auth.users...");
        for (const userId of userIds) {
          const username = users?.find(u => u.id === userId)?.username || userId;
          const { error: authDeleteError } = await supabase.auth.admin.deleteUser(userId);
          
          if (authDeleteError) {
            console.error(`Failed to delete auth user ${username}:`, authDeleteError);
            errors.push(`auth.users ${username}: ${authDeleteError.message}`);
          } else {
            console.log(`Deleted auth user: ${username}`);
            deletedUsers.push(username);
          }
        }
      }

      return new Response(JSON.stringify({
        success: errors.length === 0,
        message: errors.length === 0 
          ? "Test accounts and data fully cleaned up" 
          : "Cleanup completed with some errors",
        deletedUsers,
        deletedCount: deletedUsers.length,
        errors: errors.length > 0 ? errors : undefined
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({
      error: "Invalid action. Use: setup, test, verify, or cleanup"
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 });

  } catch (error: unknown) {
    console.error("Error:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return new Response(JSON.stringify({
      success: false,
      error: errorMessage
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 });
  }
});

function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function generateTicketCode(): string {
  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  let code = "";
  const usedLetters = new Set<string>();
  
  while (code.length < 5) {
    const letter = letters[Math.floor(Math.random() * 26)];
    if (!usedLetters.has(letter)) {
      usedLetters.add(letter);
      code += letter;
    }
  }
  return code;
}
