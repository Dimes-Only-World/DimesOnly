export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: corsHeaders,
      status: 200
    });
  }

  try {
    const body = await req.json();
    console.log('Incoming login request:', { username: body.username ? '***' : undefined });
    
    const { username, password } = body;
    
    if (!username || !password) {
      console.log('Missing credentials');
      return new Response(JSON.stringify({
        message: 'Username and password are required'
      }), {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    
    const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Try exact username match first
    let { data: user, error } = await supabase
      .from('users')
      .select('id, username, email, first_name, last_name, user_type, profile_photo, banner_photo, mobile_number, address, city, state, zip, gender, membership_type, tips_earned, referral_fees, overrides, weekly_hours, is_ranked, rank_number, password_hash, hash_type')
      .eq('username', username)
      .single();

    // Fallback: case-insensitive username search
    if (error || !user) {
      const { data: users, error: searchError } = await supabase
        .from('users')
        .select('id, username, email, first_name, last_name, user_type, profile_photo, banner_photo, mobile_number, address, city, state, zip, gender, membership_type, tips_earned, referral_fees, overrides, weekly_hours, is_ranked, rank_number, password_hash, hash_type')
        .ilike('username', username);
      
      if (!searchError && users && users.length > 0) {
        user = users[0];
        error = null;
        console.log('Found user via case-insensitive search');
      }
    }

    if (error || !user) {
      console.log('User not found');
      return new Response(JSON.stringify({
        message: 'Invalid credentials'
      }), {
        status: 401,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }

    // Password validation - ONLY accept bcrypt or SHA256 hashes
    let passwordMatch = false;
    
    const hashType = user.hash_type || 'unknown';
    const storedHash = user.password_hash;

    if (!storedHash) {
      console.log('No password hash stored for user');
      return new Response(JSON.stringify({
        message: 'Invalid credentials'
      }), {
        status: 401,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }

    // bcrypt hash check (starts with $2a$ or $2b$ and length 60)
    if (storedHash.startsWith('$2b$') || storedHash.startsWith('$2a$')) {
      if (storedHash.length === 60) {
        try {
          const bcrypt = await import('https://deno.land/x/bcrypt@v0.4.1/mod.ts');
          passwordMatch = await bcrypt.compare(password, storedHash);
          console.log('Bcrypt comparison completed');
        } catch (e) {
          console.error('Bcrypt error:', e);
        }
      }
    } 
    // SHA256 hash check (64 character hex string)
    else if (storedHash.length === 64 && /^[a-f0-9]+$/i.test(storedHash)) {
      const encoder = new TextEncoder();
      const data = encoder.encode(password);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
      passwordMatch = storedHash.toLowerCase() === hashHex.toLowerCase();
      console.log('SHA256 comparison completed');
    } else {
      // Unknown hash format - reject for security
      console.log('Unknown password hash format - rejecting login');
    }

    if (!passwordMatch) {
      console.log('Password validation failed');
      return new Response(JSON.stringify({
        message: 'Invalid credentials'
      }), {
        status: 401,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }

    console.log('Login successful');
    
    // Return user data WITHOUT sensitive fields
    return new Response(JSON.stringify({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        user_type: user.user_type,
        profile_photo: user.profile_photo,
        banner_photo: user.banner_photo,
        mobile_number: user.mobile_number,
        address: user.address,
        city: user.city,
        state: user.state,
        zip: user.zip,
        gender: user.gender,
        membership_type: user.membership_type,
        tips_earned: user.tips_earned,
        referral_fees: user.referral_fees,
        overrides: user.overrides,
        weekly_hours: user.weekly_hours,
        is_ranked: user.is_ranked,
        rank_number: user.rank_number
      },
      token: 'authenticated'
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    console.error('Authentication error:', error);
    return new Response(JSON.stringify({
      message: 'Internal server error'
    }), {
      status: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  }
});
