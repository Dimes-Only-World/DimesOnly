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
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    // Create admin client for reading public data that may be blocked by RLS
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const { action, ...params } = await req.json();
    console.log(`Public data action: ${action}`);

    let result;

    switch (action) {
      // Fetch public user profile by username
      case 'fetchProfile': {
        const { username } = params;
        // Escape SQL LIKE wildcards from user input
        const escapeWildcards = (s: string) => s.replace(/[%_\\]/g, '\\$&');
        const normalizedUsername = escapeWildcards(String(username).trim().toLowerCase());

        // Try exact match first
        let { data, error } = await supabaseAdmin
          .from('users')
          .select('id, username, first_name, last_name, bio, profile_photo, banner_photo, front_page_photo, user_type, gender, city, state')
          .eq('username', normalizedUsername)
          .maybeSingle();

        // Try case-insensitive
        if (!data) {
          const res = await supabaseAdmin
            .from('users')
            .select('id, username, first_name, last_name, bio, profile_photo, banner_photo, front_page_photo, user_type, gender, city, state')
            .ilike('username', normalizedUsername)
            .maybeSingle();
          data = res.data;
          error = res.error;
        }


        // Try contains match
        if (!data) {
          const res = await supabaseAdmin
            .from('users')
            .select('id, username, first_name, last_name, bio, profile_photo, banner_photo, front_page_photo, user_type, gender, city, state')
            .ilike('username', `%${normalizedUsername}%`);
          const rows = res.data as any[] | null;
          if (rows && rows.length > 0) {
            const lower = (u: string) => String(u || '').toLowerCase();
            const exact = rows.find(r => lower(r.username) === normalizedUsername);
            const starts = rows.find(r => lower(r.username).startsWith(normalizedUsername));
            data = exact || starts || rows[0];
          }
        }

        if (error) throw error;
        result = data;
        break;
      }

      // Fetch user media for profile viewing
      case 'fetchUserMedia': {
        const { userId } = params;
        const { data, error } = await supabaseAdmin
          .from('user_media')
          .select('id, media_url, media_type, content_tier, flagged, created_at, storage_path')
          .eq('user_id', userId)
          .eq('flagged', false)
          .order('created_at', { ascending: false });
        if (error) throw error;
        result = data;
        break;
      }

      // Create signed URL for private video
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

      // Fetch media counts for directory
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

      // Fetch user data by ID — requires authenticated JWT matching userId.
      // Sensitive columns (password_hash, hash_type) are NEVER returned.
      case 'getUserById': {
        const { userId } = params;
        const authHeader = req.headers.get('authorization') || req.headers.get('Authorization');
        let callerId: string | null = null;
        if (authHeader?.startsWith('Bearer ')) {
          const token = authHeader.replace('Bearer ', '');
          const { data: userRes } = await supabaseAdmin.auth.getUser(token);
          callerId = userRes?.user?.id ?? null;
        }
        if (!callerId || callerId !== userId) {
          return new Response(
            JSON.stringify({ error: 'Unauthorized' }),
            { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        // Explicit allowlist — exclude password_hash, hash_type, and other secrets
        const { data, error } = await supabaseAdmin
          .from('users')
          .select(`
            id, username, email, first_name, last_name, bio, profile_photo, banner_photo, front_page_photo,
            user_type, gender, city, state, zip, address, phone_number, mobile_number, date_of_birth,
            membership_type, membership_tier, silver_plus_active, silver_plus_joined_at,
            silver_plus_membership_number, diamond_plus_active, paypal_email, referred_by,
            tips_earned, referral_fees, event_total_earnings,
            is_active, is_ranked, rank_number, created_at, updated_at,
            business_owner_elite_active, business_owner_elite_seat_number, business_owner_elite_granted_at
          `)
          .eq('id', userId)
          .maybeSingle();
        if (error) throw error;
        result = data;
        break;
      }

      // Fetch user earnings data — requires authenticated JWT matching userId
      case 'fetchUserEarnings': {
        const { userId } = params;
        const authHeader = req.headers.get('authorization') || req.headers.get('Authorization');
        let callerId: string | null = null;
        if (authHeader?.startsWith('Bearer ')) {
          const token = authHeader.replace('Bearer ', '');
          const { data: userRes } = await supabaseAdmin.auth.getUser(token);
          callerId = userRes?.user?.id ?? null;
        }
        if (!callerId || callerId !== userId) {
          return new Response(
            JSON.stringify({ error: 'Unauthorized' }),
            { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const { data: tips, error: tipsError } = await supabaseAdmin
          .from('tips')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false });
        if (tipsError) throw tipsError;

        const { data: tickets, error: ticketsError } = await supabaseAdmin
          .from('tickets')
          .select('*')
          .eq('user_Id', userId);
        if (ticketsError) throw ticketsError;

        const { data: jackpot, error: jackpotError } = await supabaseAdmin
          .from('jackpot')
          .select('amount')
          .eq('is_active', true)
          .maybeSingle();
        if (jackpotError) throw jackpotError;

        result = { tips, tickets, jackpot };
        break;
      }


      // Check if a username is already taken
      case 'checkUsername': {
        const { username } = params;
        const normalized = String(username || '').trim().toLowerCase();
        if (!normalized) {
          result = { available: false, reason: 'empty' };
          break;
        }
        const { data, error } = await supabaseAdmin
          .from('users')
          .select('username')
          .ilike('username', normalized)
          .maybeSingle();
        if (error) throw error;
        result = { available: !data };
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
    console.error('Public data error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
