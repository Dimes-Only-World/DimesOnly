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

// Helper to find auth user by email with pagination
async function findAuthUserByEmail(supabase: any, email: string): Promise<any | null> {
  const perPage = 1000;
  let page = 1;
  
  while (page <= 50) { // Max 50 pages = 50,000 users
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
    
    if (error) {
      console.error(`listUsers page ${page} error:`, error);
      return null;
    }
    
    const users = data?.users || [];
    const match = users.find((u: any) => u.email === email);
    if (match) {
      console.log(`Found auth user ${email} on page ${page}`);
      return match;
    }
    
    // No more pages if we got fewer users than requested
    if (users.length < perPage) {
      break;
    }
    
    page++;
  }
  
  return null;
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
      
      const testUsers = [
        { email: "test_tipper@dimesonly.test", username: "test_tipper", user_type: "normal", referred_by: "company" },
        { email: "test_referrer@dimesonly.test", username: "test_referrer", user_type: "normal", referred_by: "company" },
        { email: "test_performer@dimesonly.test", username: "test_performer", user_type: "exotic", referred_by: "test_referrer" }
      ];

      const createdUsers: any[] = [];
      const errors: string[] = [];

      // Step 1: Delete existing test data
      console.log("Cleaning up existing test data...");
      try {
        await supabase.from("tips_transactions").delete().eq("tipped_username", "test_performer");
        await supabase.from("tips").delete().eq("tipped_username", "test_performer");
        await supabase.from("jackpot_tickets").delete().eq("source", "test_tip");
      } catch (e) {
        console.warn("Pre-cleanup warning:", e);
      }

      // Step 2: Delete existing accounts (public + auth) with proper pagination
      console.log("Deleting existing test accounts...");
      
      for (const user of testUsers) {
        // Delete public.users by username first (and dependent records)
        const { data: existingPublic } = await supabase
          .from("users")
          .select("id")
          .eq("username", user.username)
          .maybeSingle();
        
        if (existingPublic?.id) {
          console.log(`Found existing public user ${user.username} (${existingPublic.id}), deleting...`);
          
          // Delete dependent records
          await supabase.from("tips_transactions").delete().or(`tipper_user_id.eq.${existingPublic.id},tipped_user_id.eq.${existingPublic.id}`);
          await supabase.from("tips").delete().eq("user_id", existingPublic.id);
          await supabase.from("weekly_earnings").delete().eq("user_id", existingPublic.id);
          await supabase.from("jackpot_tickets").delete().or(`tipper_id.eq.${existingPublic.id},dime_id.eq.${existingPublic.id},referred_dime_id.eq.${existingPublic.id}`);
          await supabase.from("payments").delete().eq("user_id", existingPublic.id);
          
          const { error: delErr } = await supabase.from("users").delete().eq("id", existingPublic.id);
          if (delErr) {
            console.error(`Failed to delete public user ${user.username}:`, delErr);
            errors.push(`delete public ${user.username}: ${delErr.message}`);
          } else {
            console.log(`Deleted public user ${user.username}`);
          }
        }
        
        // Delete auth.users by email (with pagination search)
        const existingAuth = await findAuthUserByEmail(supabase, user.email);
        if (existingAuth?.id) {
          console.log(`Found existing auth user ${user.email} (${existingAuth.id}), deleting...`);
          const { error: authDelErr } = await supabase.auth.admin.deleteUser(existingAuth.id);
          if (authDelErr) {
            console.error(`Failed to delete auth user ${user.email}:`, authDelErr);
            errors.push(`delete auth ${user.email}: ${authDelErr.message}`);
          } else {
            console.log(`Deleted auth user ${user.email}`);
          }
        }
      }

      // Wait for deletions to propagate
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Step 3: Create fresh test accounts
      console.log("Creating fresh test accounts...");
      
      for (const user of testUsers) {
        console.log(`Creating ${user.username}...`);
        
        // Try to create auth user (with retry if email_exists)
        let authUserId: string | null = null;
        
        for (let attempt = 1; attempt <= 3; attempt++) {
          const { data: authData, error: authErr } = await supabase.auth.admin.createUser({
            email: user.email,
            password: "TestPassword123!",
            email_confirm: true,
            user_metadata: { username: user.username }
          });
          
          if (!authErr && authData?.user?.id) {
            authUserId = authData.user.id;
            console.log(`Created auth user ${user.username} (${authUserId})`);
            break;
          }
          
          console.error(`Auth create attempt ${attempt} failed for ${user.email}:`, authErr);
          
          // If email exists, try to find and delete it then retry
          if (authErr?.code === "email_exists" || authErr?.message?.toLowerCase().includes("already")) {
            console.log(`Attempting to find and delete existing auth user ${user.email}...`);
            const existing = await findAuthUserByEmail(supabase, user.email);
            if (existing?.id) {
              console.log(`Found existing auth ${existing.id}, deleting...`);
              await supabase.auth.admin.deleteUser(existing.id);
              await new Promise(resolve => setTimeout(resolve, 500));
              continue; // Retry creation
            }
          }
          
          errors.push(`auth create ${user.email}: ${authErr?.message || "unknown"}`);
          break;
        }
        
        if (!authUserId) {
          console.error(`Failed to create auth user for ${user.username} after retries`);
          continue;
        }
        
        // Create public.users record
        const { error: publicErr } = await supabase.from("users").insert({
          id: authUserId,
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
        
        if (publicErr) {
          console.error(`Failed to create public user ${user.username}:`, publicErr);
          errors.push(`public create ${user.username}: ${publicErr.message}`);
          // Cleanup auth user we just created
          await supabase.auth.admin.deleteUser(authUserId);
          continue;
        }
        
        createdUsers.push({ id: authUserId, username: user.username, status: "created" });
        console.log(`Successfully created ${user.username}`);
      }

      const success = createdUsers.length === testUsers.length;
      
      return new Response(JSON.stringify({
        success,
        message: success ? "Test accounts ready" : `Created ${createdUsers.length}/${testUsers.length} accounts`,
        users: createdUsers,
        errors: errors.length > 0 ? errors : undefined
      }), { 
        status: success ? 200 : 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      });
    }

    // Action: test - Run a test tip
    if (action === "test") {
      console.log(`Running test tip of $${tipAmount}...`);

      // Get test user IDs
      const { data: tipper } = await supabase
        .from("users")
        .select("id, username")
        .eq("username", "test_tipper")
        .maybeSingle();

      const { data: performer } = await supabase
        .from("users")
        .select("id, username, referred_by")
        .eq("username", "test_performer")
        .maybeSingle();

      const { data: referrer } = await supabase
        .from("users")
        .select("id, username")
        .eq("username", "test_referrer")
        .maybeSingle();

      if (!tipper || !performer || !referrer) {
        console.error("Missing test users - tipper:", !!tipper, "performer:", !!performer, "referrer:", !!referrer);
        return new Response(JSON.stringify({
          success: false,
          error: "Test accounts not found. Run 'setup' first.",
          debug: { tipper: !!tipper, performer: !!performer, referrer: !!referrer }
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
        .maybeSingle();

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
        .maybeSingle();

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

      // Clean up transaction data
      console.log("Deleting transaction data...");
      await supabase.from("tips_transactions").delete().eq("tipped_username", "test_performer");
      await supabase.from("tips").delete().eq("tipped_username", "test_performer");
      await supabase.from("jackpot_tickets").delete().eq("source", "test_tip");
      
      if (userIds.length > 0) {
        await supabase.from("weekly_earnings").delete().in("user_id", userIds);
        await supabase.from("jackpot_tickets").delete().in("tipper_id", userIds);
        await supabase.from("jackpot_tickets").delete().in("dime_id", userIds);
        await supabase.from("payments").delete().in("user_id", userIds);

        // Delete from public.users
        const { error: usersDeleteError } = await supabase
          .from("users")
          .delete()
          .in("id", userIds);
        
        if (usersDeleteError) {
          errors.push(`public.users: ${usersDeleteError.message}`);
        }

        // Delete from auth.users
        for (const userId of userIds) {
          const username = users?.find(u => u.id === userId)?.username || userId;
          const { error: authDeleteError } = await supabase.auth.admin.deleteUser(userId);
          
          if (authDeleteError) {
            errors.push(`auth.users ${username}: ${authDeleteError.message}`);
          } else {
            deletedUsers.push(username);
          }
        }
      }

      // Also try to clean up orphaned auth users by email
      const testEmails = ["test_tipper@dimesonly.test", "test_referrer@dimesonly.test", "test_performer@dimesonly.test"];
      for (const email of testEmails) {
        const existing = await findAuthUserByEmail(supabase, email);
        if (existing?.id && !userIds.includes(existing.id)) {
          console.log(`Found orphaned auth user ${email}, deleting...`);
          await supabase.auth.admin.deleteUser(existing.id);
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
