import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Create admin client for privileged operations
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    
    const body = await req.json();
    const { action, adminUserId, ...params } = body;
    
    // Verify admin user ID is provided
    if (!adminUserId) {
      return new Response(
        JSON.stringify({ error: 'Admin user ID required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify the user is an admin using the check_admin_by_user_id function
    const { data: isAdmin, error: roleError } = await supabaseAdmin
      .rpc('check_admin_by_user_id', { _user_id: adminUserId });
    
    if (roleError || !isAdmin) {
      console.error('Admin check failed:', roleError);
      return new Response(
        JSON.stringify({ error: 'Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Admin action: ${action} by user: ${adminUserId}`);

    let result;

    switch (action) {
      // User management
      case 'fetchAllUsers': {
        const { data, error } = await supabaseAdmin
          .from('users')
          .select('*')
          .order('created_at', { ascending: false });
        if (error) throw error;
        result = data;
        break;
      }

      case 'deactivateUser': {
        const { userId } = params;
        console.log('deactivateUser called for userId:', userId);

        // Fetch user email and username before deactivating
        const { data: userData, error: fetchErr } = await supabaseAdmin
          .from('users')
          .select('email, username')
          .eq('id', userId)
          .single();
        if (fetchErr) throw fetchErr;
        console.log('User data fetched:', { email: userData?.email, username: userData?.username });

        const { error: deactivateError } = await supabaseAdmin
          .from('users')
          .update({ is_active: false, deactivated_at: new Date().toISOString() })
          .eq('id', userId);
        if (deactivateError) throw deactivateError;
        console.log('User deactivated in DB');

        // Send deactivation email
        if (userData?.email) {
          const mailtrapToken = Deno.env.get('MAILTRAP_API_TOKEN');
          const senderEmail = Deno.env.get('MAILTRAP_SENDER_EMAIL') || 'noreply@dimelot.com';
          console.log('Mailtrap config:', { hasToken: !!mailtrapToken, senderEmail });

          if (!mailtrapToken) {
            console.error('MAILTRAP_API_TOKEN is not set - cannot send email');
          } else {
            try {
              const mailtrapResponse = await fetch('https://send.api.mailtrap.io/api/send', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${mailtrapToken}`,
                },
                body: JSON.stringify({
                  from: { email: senderEmail, name: 'Dimelot' },
                  to: [{ email: userData.email }],
                  subject: 'Your Account Has Been Deactivated',
                  text: `Hi ${userData.username},\n\nYour account on Dimelot has been deactivated by an administrator.\n\nIf you believe this was a mistake, please send an appeal by contacting our support team.\n\nRegards,\nDimelot Team`,
                  html: `<p>Hi ${userData.username},</p><p>Your account on Dimelot has been deactivated by an administrator.</p><p>If you believe this was a mistake, please send an appeal by contacting our support team.</p><p>Regards,<br/>Dimelot Team</p>`,
                }),
              });
              const responseText = await mailtrapResponse.text();
              if (!mailtrapResponse.ok) {
                console.error('Mailtrap API error:', mailtrapResponse.status, responseText);
              } else {
                console.log('Deactivation email sent successfully to', userData.email, responseText);
              }
            } catch (emailErr) {
              console.error('Failed to send deactivation email:', emailErr);
            }
          }
        }

        result = { success: true };
        break;
      }

      case 'reactivateUser': {
        const { userId } = params;
        const { error: reactivateError } = await supabaseAdmin
          .from('users')
          .update({ is_active: true, deactivated_at: null })
          .eq('id', userId);
        if (reactivateError) throw reactivateError;
        result = { success: true };
        break;
      }

      case 'deleteUser': {
        const { userId } = params;
        const { error: dbError } = await supabaseAdmin
          .from('users')
          .delete()
          .eq('id', userId);
        if (dbError) throw dbError;
        const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(userId);
        if (authError) console.error('Auth deletion failed (may not exist):', authError);
        result = { success: true };
        break;
      }

      // Jackpot management
      case 'updateMaxTickets': {
        const { poolId, maxTickets } = params;
        const { error } = await supabaseAdmin
          .from('jackpot_pools')
          .update({ max_tickets: maxTickets })
          .eq('id', poolId);
        if (error) throw error;
        result = { success: true };
        break;
      }

      case 'updatePoolStatus': {
        const { poolId, status, soldOutAt, salesResumeAt, guaranteedDraw } = params;
        const updateData: any = { status };
        if (soldOutAt !== undefined) updateData.sold_out_at = soldOutAt;
        if (salesResumeAt !== undefined) updateData.sales_resume_at = salesResumeAt;
        if (guaranteedDraw !== undefined) updateData.guaranteed_draw = guaranteedDraw;
        
        const { error } = await supabaseAdmin
          .from('jackpot_pools')
          .update(updateData)
          .eq('id', poolId);
        if (error) throw error;
        result = { success: true };
        break;
      }

      case 'getPoolTicketCount': {
        const { poolId } = params;
        const { count, error } = await supabaseAdmin
          .from('jackpot_tickets')
          .select('id', { count: 'exact', head: true })
          .eq('pool_id', poolId);
        if (error) throw error;
        result = { count: count || 0 };
        break;
      }

      case 'updateWinnerStatus': {
        const { drawId, visitorId, status } = params;
        const { error } = await supabaseAdmin
          .from('jackpot_winners')
          .update({ status })
          .match({ draw_id: drawId, user_id: visitorId });
        if (error) throw error;
        result = { success: true };
        break;
      }

      // Earnings/Payroll
      case 'fetchPayrollData': {
        const { startDate, endDate } = params;

        // Fetch users
        const { data: users, error: usersError } = await supabaseAdmin
          .from('users')
          .select('id, username, user_type')
          .order('username');
        if (usersError) throw usersError;

        // Fetch referral commissions
        const subscriptionReferralTypes = [
          'subscription_referral_commission',
          'subscription_upline_referral_commission',
          'referral_commission',
          'upline_referral_commission',
          'diamond_plus_referral_commission',
          'diamond_plus_upline_referral_commission',
        ];

        const { data: referralCommissions, error: referralError } = await supabaseAdmin
          .from('payments')
          .select('referred_by, referrer_commission, created_at, payment_type')
          .not('referrer_commission', 'is', null)
          .in('payment_type', subscriptionReferralTypes)
          .gte('created_at', startDate)
          .lte('created_at', endDate)
          .eq('payment_status', 'completed');
        if (referralError) throw referralError;

        // Fetch tips
        const { data: tips, error: tipsError } = await supabaseAdmin
          .from('tips')
          .select('tipped_username, tip_amount, created_at, status')
          .eq('status', 'completed')
          .gte('created_at', startDate)
          .lte('created_at', endDate);
        if (tipsError) throw tipsError;

        // Fetch tip referrals
        const { data: tipReferrals, error: tipReferralError } = await supabaseAdmin
          .from('tips_transactions')
          .select('referrer_username, referrer_commission, completed_at')
          .not('referrer_commission', 'is', null)
          .eq('payment_status', 'completed')
          .gte('completed_at', startDate)
          .lte('completed_at', endDate);
        if (tipReferralError) throw tipReferralError;

        // Fetch event commissions
        const { data: eventCommissions, error: eventError } = await supabaseAdmin
          .from('payments')
          .select('user_id, event_host_commission, created_at')
          .not('event_host_commission', 'is', null)
          .eq('payment_status', 'completed')
          .gte('created_at', startDate)
          .lte('created_at', endDate);
        if (eventError) throw eventError;

        result = {
          users,
          referralCommissions,
          tips,
          tipReferrals,
          eventCommissions
        };
        break;
      }

      // User media for admin viewing
      case 'fetchUserMedia': {
        const { userId } = params;
        const { data, error } = await supabaseAdmin
          .from('user_media')
          .select('id, media_url, media_type, content_tier, flagged, created_at, storage_path, warning_message')
          .eq('user_id', userId)
          .order('created_at', { ascending: false });
        if (error) throw error;
        result = data;
        break;
      }

      case 'flagMedia': {
        const { mediaId, message } = params;
        const { error } = await supabaseAdmin
          .from('user_media')
          .update({ flagged: true, warning_message: message })
          .eq('id', mediaId);
        if (error) throw error;
        result = { success: true };
        break;
      }

      // Public profile media counts (for directory)
      case 'fetchMediaCounts': {
        const { userIds } = params;
        const { data, error } = await supabaseAdmin
          .from('user_media')
          .select('user_id, content_tier, is_nude, is_xrated')
          .in('user_id', userIds)
          .eq('flagged', false);
        if (error) throw error;
        result = data;
        break;
      }

      // Signed URL for private media
      case 'createSignedUrl': {
        const { storagePath, expiresIn } = params;
        const { data, error } = await supabaseAdmin
          .storage
          .from('private-media')
          .createSignedUrl(storagePath, expiresIn || 3600);
        if (error) throw error;
        result = data;
        break;
      }

      default:
        return new Response(
          JSON.stringify({ error: `Unknown action: ${action}` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }

    return new Response(
      JSON.stringify({ data: result }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Admin data error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
