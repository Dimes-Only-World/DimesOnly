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
        const normalizedUsername = String(username).trim().toLowerCase();

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

      // Fetch full user data by ID (for custom auth users)
      case 'getUserById': {
        const { userId } = params;
        console.log(`Fetching user by ID: ${userId}`);
        const { data, error } = await supabaseAdmin
          .from('users')
          .select('*')
          .eq('id', userId)
          .maybeSingle();
        if (error) throw error;
        result = data;
        break;
      }

      // Fetch user earnings data (for user's own dashboard)
      case 'fetchUserEarnings': {
        const { userId } = params;
        
        // Tips received by user
        const { data: tips, error: tipsError } = await supabaseAdmin
          .from('tips')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false });
        if (tipsError) throw tipsError;

        // Tickets owned
        const { data: tickets, error: ticketsError } = await supabaseAdmin
          .from('tickets')
          .select('*')
          .eq('user_Id', userId);
        if (ticketsError) throw ticketsError;

        // Current jackpot
        const { data: jackpot, error: jackpotError } = await supabaseAdmin
          .from('jackpot')
          .select('amount')
          .eq('is_active', true)
          .maybeSingle();
        if (jackpotError) throw jackpotError;

        result = { tips, tickets, jackpot };
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
