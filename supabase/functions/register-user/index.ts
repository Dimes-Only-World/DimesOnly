export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};
Deno.serve(async (req)=>{
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: corsHeaders
    });
  }
  try {
    const { firstName, lastName, username, email, password, confirmPassword, mobileNumber, address, city, state, zip, gender, userType, referredBy, profilePhotoUrl, bannerPhotoUrl, frontPagePhotoUrl } = await req.json();
    if (!firstName || !lastName || !username || !email || !password) {
      return new Response(JSON.stringify({
        error: 'Missing required fields'
      }), {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    if (password !== confirmPassword) {
      return new Response(JSON.stringify({
        error: 'Passwords do not match'
      }), {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    // Simple hash function for password (not for production use)
    const encoder = new TextEncoder();
    const data = encoder.encode(password + 'salt123');
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const password_hash = hashArray.map((b)=>b.toString(16).padStart(2, '0')).join('');
    const checkResult = await fetch('https://qkcuykpndrolrewwnkwb.supabase.co/rest/v1/users?select=username,email&or=(username.eq.' + username + ',email.eq.' + email + ')', {
      method: 'GET',
      headers: {
        'apikey': Deno.env.get('SUPABASE_ANON_KEY'),
        'Content-Type': 'application/json'
      }
    });
    if (checkResult.ok) {
      const existingUsers = await checkResult.json();
      if (existingUsers && existingUsers.length > 0) {
        return new Response(JSON.stringify({
          error: 'Username or email already exists'
        }), {
          status: 400,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json'
          }
        });
      }
    }
    const insertResult = await fetch('https://qkcuykpndrolrewwnkwb.supabase.co/rest/v1/users', {
      method: 'POST',
      headers: {
        'apikey': Deno.env.get('SUPABASE_ANON_KEY'),
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify({
        username,
        email,
        password_hash,
        first_name: firstName,
        last_name: lastName,
        mobile_number: mobileNumber,
        address,
        city,
        state,
        zip,
        gender,
        user_type: userType,
        referred_by: referredBy,
        profile_photo: profilePhotoUrl || null,
        banner_photo: bannerPhotoUrl || null,
        front_page_photo: frontPagePhotoUrl || null,
        created_at: new Date().toISOString()
      })
    });
    if (!insertResult.ok) {
      const error = await insertResult.text();
      return new Response(JSON.stringify({
        error: 'Registration failed: ' + error
      }), {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    const newUser = await insertResult.json();
    return new Response(JSON.stringify({
      success: true,
      message: 'Registration successful',
      user: newUser[0],
      token: 'user_' + username + '_' + Date.now()
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    return new Response(JSON.stringify({
      error: 'Server error: ' + error.message
    }), {
      status: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  }
});
