import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(
        JSON.stringify({ error: 'Supabase admin configuration missing' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create admin client for privileged operations
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    
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
      case 'fetchAgeGateLeads': {
        const trashed = params.view === 'trash';
        let query = supabaseAdmin
          .from('age_gate_leads')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(1000);
        query = trashed ? query.not('deleted_at', 'is', null) : query.is('deleted_at', null);
        const { data, error } = await query;
        if (error) throw error;


        // Determine which leads have completed registration (matched by phone / phone + DOB)
        const { data: registeredUsers, error: usersError } = await supabaseAdmin
          .from('users')
          .select('phone_number, mobile_number, username, first_name, last_name, created_at, date_of_birth')
          .limit(5000);
        if (usersError) throw usersError;

        const digits = (v: string | null | undefined) => (v || '').replace(/\D/g, '').slice(-10);
        const normDob = (v: string | null | undefined) => {
          if (!v) return '';
          const s = String(v);
          const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
          if (m) return `${m[1]}-${m[2]}-${m[3]}`;
          const d = new Date(s);
          return isNaN(d.getTime()) ? '' : d.toISOString().slice(0, 10);
        };
        const normName = (v: string | null | undefined) =>
          (v || '').toLowerCase().replace(/[^a-z]/g, '');

        type UserEntry = { username: string | null; created_at: string | null; dob: string };
        const byPhone = new Map<string, UserEntry>();
        const byName = new Map<string, UserEntry>();
        for (const u of registeredUsers || []) {
          const entry: UserEntry = {
            username: (u as any).username,
            created_at: (u as any).created_at,
            dob: normDob((u as any).date_of_birth),
          };
          for (const raw of [(u as any).phone_number, (u as any).mobile_number]) {
            const key = digits(raw);
            if (key.length === 10 && !byPhone.has(key)) byPhone.set(key, entry);
          }
          const nameKey = normName(`${(u as any).first_name || ''}${(u as any).last_name || ''}`);
          if (nameKey.length >= 4 && !byName.has(nameKey)) byName.set(nameKey, entry);
        }

        result = (data || []).map((lead: any) => {
          const phoneEntry = byPhone.get(digits(lead.phone));
          const leadDob = normDob(lead.date_of_birth);
          const nameEntry = byName.get(normName(lead.full_name));
          // Name matches only count when the date of birth also matches.
          const nameDobEntry = nameEntry && nameEntry.dob && nameEntry.dob === leadDob ? nameEntry : undefined;
          const match = phoneEntry || nameDobEntry;
          const dobMatch = !!match && !!match.dob && match.dob === leadDob;
          return {
            ...lead,
            phone_match: !!phoneEntry,
            dob_match: dobMatch,
            registration_completed: !!match,
            registered_username: match?.username ?? null,
            registered_at: match?.created_at ?? null,
          };
        });



        break;
      }

      case 'softDeleteAgeGateLeads':
      case 'restoreAgeGateLeads':
      case 'permanentlyDeleteAgeGateLeads': {
        const ids: string[] = Array.isArray(params.ids) ? params.ids.filter((v: unknown) => typeof v === 'string') : [];
        if (ids.length === 0) {
          return new Response(
            JSON.stringify({ error: 'No lead ids provided' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        if (action === 'permanentlyDeleteAgeGateLeads') {
          const { error } = await supabaseAdmin.from('age_gate_leads').delete().in('id', ids);
          if (error) throw error;
        } else {
          const { error } = await supabaseAdmin
            .from('age_gate_leads')
            .update({ deleted_at: action === 'softDeleteAgeGateLeads' ? new Date().toISOString() : null })
            .in('id', ids);
          if (error) throw error;
        }
        result = { success: true, count: ids.length };
        break;
      }

      case 'emptyAgeGateLeadsTrash': {
        const { error } = await supabaseAdmin
          .from('age_gate_leads')
          .delete()
          .not('deleted_at', 'is', null);
        if (error) throw error;
        result = { success: true };
        break;
      }



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
        const signedMedia = await Promise.all((data || []).map(async (item: any) => {
          let storagePath = item.storage_path || '';

          if (!storagePath && item.media_url?.includes('/private-media/')) {
            storagePath = decodeURIComponent((item.media_url.split('/private-media/').pop() || '').split('?')[0]);
          }

          if (!storagePath) {
            return { ...item, signed_url: item.media_url };
          }

          const { data: signed, error: signedError } = await supabaseAdmin
            .storage
            .from('private-media')
            .createSignedUrl(storagePath, 3600);

          if (signedError) {
            console.error('Admin media signed URL failed:', {
              mediaId: item.id,
              storagePath,
              message: signedError.message,
            });
            return { ...item, signed_url: item.media_url };
          }

          return { ...item, signed_url: signed?.signedUrl || item.media_url };
        }));

        result = signedMedia;
        break;
      }

      case 'updateMediaTier': {
        const { mediaId, contentTier } = params;
        const allowedTiers = ['free', 'silver', 'gold'];

        if (!mediaId || typeof mediaId !== 'string') {
          return new Response(
            JSON.stringify({ error: 'Valid media ID required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        if (!contentTier || typeof contentTier !== 'string' || !allowedTiers.includes(contentTier)) {
          return new Response(
            JSON.stringify({ error: 'Valid content tier required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const { data, error } = await supabaseAdmin
          .from('user_media')
          .update({
            content_tier: contentTier,
            is_nude: contentTier === 'silver',
            is_xrated: contentTier === 'gold',
            access_restricted: contentTier !== 'free',
          })
          .eq('id', mediaId)
          .select('id, content_tier, is_nude, is_xrated, access_restricted')
          .single();

        if (error) throw error;
        console.log('Admin media tier updated:', { mediaId, contentTier, adminUserId });
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

      // Payout management
      case 'fetchPayoutRequests': {
        const { data: payouts, error: payoutsErr } = await supabaseAdmin
          .from('payout_requests')
          .select('*')
          .order('created_at', { ascending: false });
        if (payoutsErr) throw payoutsErr;

        // Get usernames/emails for all user_ids
        const userIds = [...new Set((payouts || []).map((p: any) => p.user_id))];
        let usersMap: Record<string, any> = {};
        if (userIds.length > 0) {
          const { data: users, error: usersErr } = await supabaseAdmin
            .from('users')
            .select('id, username, email')
            .in('id', userIds);
          if (usersErr) throw usersErr;
          for (const u of (users || [])) {
            usersMap[u.id] = u;
          }
        }

        result = (payouts || []).map((p: any) => ({
          ...p,
          username: usersMap[p.user_id]?.username || 'Unknown',
          email: usersMap[p.user_id]?.email || '',
        }));
        break;
      }

      case 'approvePayoutRequest': {
        const { requestId, adminNotes } = params;
        const { error } = await supabaseAdmin
          .from('payout_requests')
          .update({
            request_status: 'processing',
            processed_date: new Date().toISOString(),
            notes: adminNotes || 'Approved by admin',
          })
          .eq('id', requestId);
        if (error) throw error;
        result = { success: true };
        break;
      }

      case 'rejectPayoutRequest': {
        const { requestId, reason } = params;
        const { error } = await supabaseAdmin
          .from('payout_requests')
          .update({
            request_status: 'failed',
            processed_date: new Date().toISOString(),
            notes: reason || 'Rejected by admin',
          })
          .eq('id', requestId);
        if (error) throw error;
        result = { success: true };
        break;
      }

      case 'markPayoutPaid': {
        const { requestId, adminNotes } = params;
        const { error } = await supabaseAdmin
          .from('payout_requests')
          .update({
            request_status: 'completed',
            processed_date: new Date().toISOString(),
            notes: adminNotes || 'Marked as paid by admin',
          })
          .eq('id', requestId);
        if (error) throw error;
        result = { success: true };
        break;
      }

      // Performer approval management
      case 'fetchPendingApprovals': {
        const { data, error } = await supabaseAdmin
          .from('users')
          .select('id, username, email, first_name, last_name, user_type, profile_photo, mobile_number, city, state, created_at, approval_status')
          .in('user_type', ['stripper', 'exotic'])
          .order('created_at', { ascending: false });
        if (error) throw error;
        result = data;
        break;
      }

      case 'approvePerformer': {
        const { userId } = params;
        
        // Update user approval status
        const { error: updateError } = await supabaseAdmin
          .from('users')
          .update({ approval_status: 'approved' })
          .eq('id', userId);
        if (updateError) throw updateError;

        // Insert approval record
        const { error: insertError } = await supabaseAdmin
          .from('performer_approvals')
          .insert({
            user_id: userId,
            status: 'approved',
            reviewed_by: adminUserId,
            reviewed_at: new Date().toISOString(),
          });
        if (insertError) throw insertError;

        // Get user email for notification
        const { data: userData, error: userError } = await supabaseAdmin
          .from('users')
          .select('email, username')
          .eq('id', userId)
          .single();
        if (userError) throw userError;

        // Fetch dynamic approval video URL from page_videos
        let approvalVideoUrl = 'https://dimesonlyworld.s3.us-east-2.amazonaws.com/Vid3o.mp4';
        const { data: approvalVideoData } = await supabaseAdmin
          .from('page_videos')
          .select('video_url')
          .eq('page_key', 'email_performer_approved')
          .single();
        if (approvalVideoData?.video_url) {
          approvalVideoUrl = approvalVideoData.video_url;
        }

        // Send approval email via Mailtrap
        let emailSent = false;
        if (userData?.email) {
          const mailtrapToken = Deno.env.get('MAILTRAP_API_TOKEN');
          const senderEmail = Deno.env.get('MAILTRAP_SENDER_EMAIL') || 'noreply@dimelot.com';
          if (mailtrapToken) {
            try {
              const mailtrapResponse = await fetch('https://send.api.mailtrap.io/api/send', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${mailtrapToken}`,
                },
                body: JSON.stringify({
                  from: { email: senderEmail, name: 'Dimes Only World' },
                  to: [{ email: userData.email }],
                  subject: "Dimes Only World — You're Approved!",
                  html: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                    <h1 style="color: #D35400;">Congratulations, ${userData.username}!</h1>
                    <p>You have been approved as a performer on Dimes Only World!</p>
                    <p>Watch this video to learn about your next steps:</p>
                    <p><a href="${approvalVideoUrl}" style="color: #D35400; font-weight: bold;">Watch Video — Dimes Only World</a></p>
                    <p>You now have the option to upgrade to <strong>Diamond+ membership</strong> for exclusive benefits.</p>
                    <p><a href="https://dimesonly.world/upgrade-diamond" style="display: inline-block; padding: 12px 24px; background-color: #D35400; color: white; text-decoration: none; border-radius: 6px; font-weight: bold;">Upgrade to Diamond+</a></p>
                    <p style="color: #666; font-size: 12px; margin-top: 30px;">— Dimes Only World Team</p>
                  </div>`,
                }),
              });
              if (mailtrapResponse.ok) {
                emailSent = true;
                console.log('Approval email sent to', userData.email);
              } else {
                console.error('Mailtrap error:', await mailtrapResponse.text());
              }
            } catch (emailErr) {
              console.error('Failed to send approval email:', emailErr);
            }
          }
        }

        // Update email_sent status
        if (emailSent) {
          await supabaseAdmin
            .from('performer_approvals')
            .update({ email_sent: true })
            .eq('user_id', userId)
            .eq('status', 'approved')
            .order('created_at', { ascending: false })
            .limit(1);
        }

        result = { success: true, emailSent };
        break;
      }

      case 'rejectPerformer': {
        const { userId } = params;
        
        // Update user approval status
        const { error: updateError } = await supabaseAdmin
          .from('users')
          .update({ approval_status: 'not_approved' })
          .eq('id', userId);
        if (updateError) throw updateError;

        // Insert rejection record
        const { error: insertError } = await supabaseAdmin
          .from('performer_approvals')
          .insert({
            user_id: userId,
            status: 'not_approved',
            reviewed_by: adminUserId,
            reviewed_at: new Date().toISOString(),
          });
        if (insertError) throw insertError;

        // Get user email for notification
        const { data: userData, error: userError } = await supabaseAdmin
          .from('users')
          .select('email, username')
          .eq('id', userId)
          .single();
        if (userError) throw userError;

        // Fetch dynamic rejection video URL from page_videos
        let rejectionVideoUrl = 'https://dimesonly.world';
        const { data: rejectionVideoData } = await supabaseAdmin
          .from('page_videos')
          .select('video_url')
          .eq('page_key', 'email_performer_not_approved')
          .single();
        if (rejectionVideoData?.video_url) {
          rejectionVideoUrl = rejectionVideoData.video_url;
        }

        // Send rejection email via Mailtrap
        let emailSent = false;
        if (userData?.email) {
          const mailtrapToken = Deno.env.get('MAILTRAP_API_TOKEN');
          const senderEmail = Deno.env.get('MAILTRAP_SENDER_EMAIL') || 'noreply@dimelot.com';
          if (mailtrapToken) {
            try {
              const mailtrapResponse = await fetch('https://send.api.mailtrap.io/api/send', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${mailtrapToken}`,
                },
                body: JSON.stringify({
                  from: { email: senderEmail, name: 'Dimes Only World' },
                  to: [{ email: userData.email }],
                  subject: 'Dimes Only World — Next Steps',
                  html: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                    <h1 style="color: #D35400;">Hi ${userData.username},</h1>
                    <p>Thank you for your interest in Dimes Only World.</p>
                    <p>After reviewing your application, we'd like to share next steps with you:</p>
                    <p><a href="${rejectionVideoUrl}" style="color: #D35400; font-weight: bold;">DimesOnly.World — Watch Video for next step</a></p>
                    <p>You remain a valued Diamond member. Feel free to reapply in the future.</p>
                    <p style="color: #666; font-size: 12px; margin-top: 30px;">— Dimes Only World Team</p>
                  </div>`,
                }),
              });
              if (mailtrapResponse.ok) {
                emailSent = true;
                console.log('Rejection email sent to', userData.email);
              } else {
                console.error('Mailtrap error:', await mailtrapResponse.text());
              }
            } catch (emailErr) {
              console.error('Failed to send rejection email:', emailErr);
            }
          }
        }

        if (emailSent) {
          await supabaseAdmin
            .from('performer_approvals')
            .update({ email_sent: true })
            .eq('user_id', userId)
            .eq('status', 'not_approved')
            .order('created_at', { ascending: false })
            .limit(1);
        }

        result = { success: true, emailSent };
        break;
      }

      case 'upsertPageVideo': {
        const { pageKey, videoUrl } = params;
        const { error } = await supabaseAdmin
          .from('page_videos')
          .upsert(
            {
              page_key: pageKey,
              video_url: videoUrl || null,
              updated_at: new Date().toISOString(),
              updated_by: adminUserId,
            },
            { onConflict: 'page_key' }
          );
        if (error) throw error;
        result = { success: true };
        break;
      }

      case 'addShortFormBackground': {
        const { device, mediaType, url } = params;
        if (!['desktop', 'mobile'].includes(device) || !['image', 'video'].includes(mediaType) || !url) {
          return new Response(
            JSON.stringify({ error: 'device, mediaType and url are required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        const { data: existing } = await supabaseAdmin
          .from('short_form_backgrounds')
          .select('sort_order')
          .eq('device', device)
          .order('sort_order', { ascending: false })
          .limit(1);
        const nextOrder = existing && existing.length ? (existing[0].sort_order ?? 0) + 1 : 0;
        const { data, error } = await supabaseAdmin
          .from('short_form_backgrounds')
          .insert({ device, media_type: mediaType, url, sort_order: nextOrder })
          .select()
          .single();
        if (error) throw error;
        result = data;
        break;
      }

      case 'deleteShortFormBackground': {
        const { id } = params;
        const { error } = await supabaseAdmin
          .from('short_form_backgrounds')
          .delete()
          .eq('id', id);
        if (error) throw error;
        result = { success: true };
        break;
      }

      case 'reorderShortFormBackgrounds': {
        const { items } = params;
        if (!Array.isArray(items)) {
          return new Response(
            JSON.stringify({ error: 'items array required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        for (const item of items) {
          const { error } = await supabaseAdmin
            .from('short_form_backgrounds')
            .update({ sort_order: item.sort_order })
            .eq('id', item.id);
          if (error) throw error;
        }
        result = { success: true };
        break;
      }

      case 'insertPageVideoHistory': {

        const { pageKey, videoUrl } = params;
        const { error } = await supabaseAdmin
          .from('page_video_history')
          .insert({ page_key: pageKey, video_url: videoUrl });
        if (error) throw error;

        const { data: rows } = await supabaseAdmin
          .from('page_video_history')
          .select('id, replaced_at')
          .eq('page_key', pageKey)
          .order('replaced_at', { ascending: true });
        if (rows && rows.length > 5) {
          const toDelete = rows.slice(0, rows.length - 5).map((r: any) => r.id);
          await supabaseAdmin.from('page_video_history').delete().in('id', toDelete);
        }
        result = { success: true };
        break;
      }

      case 'deletePageVideoHistory': {
        const { pageKey, videoUrl, historyId } = params;
        let query = supabaseAdmin.from('page_video_history').delete();
        if (historyId) {
          query = query.eq('id', historyId);
        } else {
          query = query.eq('page_key', pageKey).eq('video_url', videoUrl);
        }
        const { error } = await query;
        if (error) throw error;
        result = { success: true };
        break;
      }

      case 'fetchEventAttendees': {
        const { eventId } = params;
        if (!eventId) {
          return new Response(
            JSON.stringify({ error: 'eventId required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        const { data, error } = await supabaseAdmin
          .from('user_events')
          .select(`
            id, user_id, event_id, username, payment_status, created_at,
            first_name, last_name, phone_number, ticket_quantity, ticket_type,
            amount_paid, checked_in, checked_in_at, guest_name,
            users ( username, profile_photo, user_type, first_name, last_name, phone_number, mobile_number, membership_tier, gender )
          `)
          .eq('event_id', eventId)
          .order('created_at', { ascending: false });
        if (error) throw error;
        result = data || [];
        break;
      }

      case 'checkInAttendee': {
        const { attendeeId, checkedIn } = params;
        if (!attendeeId) {
          return new Response(
            JSON.stringify({ error: 'attendeeId required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        const { error } = await supabaseAdmin
          .from('user_events')
          .update({
            checked_in: !!checkedIn,
            checked_in_at: checkedIn ? new Date().toISOString() : null,
          })
          .eq('id', attendeeId);
        if (error) throw error;
        result = { success: true };
        break;
      }


      case 'createEvent': {
        const { eventData } = params;
        if (!eventData || typeof eventData !== 'object') {
          return new Response(
            JSON.stringify({ error: 'eventData required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        const { data, error } = await supabaseAdmin
          .from('events')
          .insert(eventData)
          .select()
          .single();
        if (error) throw error;
        result = data;
        break;
      }

      case 'updateEvent': {
        const { eventId, updates } = params;
        if (!eventId || !updates || typeof updates !== 'object') {
          return new Response(
            JSON.stringify({ error: 'eventId and updates required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        const { data, error } = await supabaseAdmin
          .from('events')
          .update(updates)
          .eq('id', eventId)
          .select()
          .single();
        if (error) throw error;
        result = data;
        break;
      }

      case 'deleteEvent': {
        const { eventId } = params;
        if (!eventId) {
          return new Response(
            JSON.stringify({ error: 'eventId required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        const { error } = await supabaseAdmin.from('events').delete().eq('id', eventId);
        if (error) throw error;
        result = { success: true };
        break;
      }

      case 'getAppSetting': {
        const { key } = params as { key?: string };
        if (!key) {
          return new Response(
            JSON.stringify({ error: 'key is required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        const { data, error } = await supabaseAdmin
          .from('app_settings')
          .select('key, value')
          .eq('key', key)
          .maybeSingle();
        if (error) throw error;
        result = data;
        break;
      }

      case 'setAppSetting': {
        const { key, value } = params as { key?: string; value?: unknown };
        if (!key) {
          return new Response(
            JSON.stringify({ error: 'key is required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        const { data, error } = await supabaseAdmin
          .from('app_settings')
          .upsert({ key, value: value ?? {}, updated_at: new Date().toISOString() }, { onConflict: 'key' })
          .select('key, value')
          .single();
        if (error) throw error;
        result = data;
        break;
      }

      case 'updateMembership': {
        const { userId, tier } = params as { userId?: string; tier?: string };
        const allowed = ['free', 'silver', 'silver_plus', 'gold', 'diamond', 'diamond_plus', 'elite', 'elite_plus'];
        if (!userId || !tier || !allowed.includes(tier)) {
          return new Response(
            JSON.stringify({ error: 'userId and a valid tier are required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const rank = allowed.indexOf(tier);
        const freeTierForUser = ['diamond', 'diamond_plus'].includes(tier) ? 'diamond' : 'silver';
        const isFreePromoTier = tier === 'free';
        const updates: Record<string, unknown> = {
          membership_tier: tier,
          membership_type: tier,
          silver_plus_active: rank >= allowed.indexOf('silver_plus'),
          diamond_plus_active: rank >= allowed.indexOf('diamond_plus'),
          business_owner_elite_active: tier === 'elite_plus',
          // Admin override counts as a completed payment for entitlement purposes.
          membership_source: isFreePromoTier ? 'free_promo' : 'admin',
          membership_paid_tier: isFreePromoTier ? null : tier,
          membership_reverted_at: null,
          free_membership_tier: freeTierForUser,
          updated_at: new Date().toISOString(),
        };
        if (tier === 'elite_plus') {
          updates.business_owner_elite_granted_at = new Date().toISOString();
        }

        const { data, error } = await supabaseAdmin
          .from('users')
          .update(updates)
          .eq('id', userId)
          .select('id, username, membership_tier, membership_type, silver_plus_active, diamond_plus_active, business_owner_elite_active')
          .single();
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
