import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import * as bcrypt from 'https://deno.land/x/bcrypt@v0.4.1/mod.ts';

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { 
      firstName, lastName, username, email, password, confirmPassword, 
      mobileNumber, address, city, state, zip, gender, userType, 
      referredBy, profilePhotoUrl, bannerPhotoUrl, frontPagePhotoUrl 
    } = await req.json();

    // Input validation
    if (!firstName || !lastName || !username || !email || !password) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (password !== confirmPassword) {
      return new Response(JSON.stringify({ error: 'Passwords do not match' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Validate password strength
    if (password.length < 8) {
      return new Response(JSON.stringify({ error: 'Password must be at least 8 characters' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // SECURITY: Use bcrypt for password hashing with proper cost factor
    const salt = await bcrypt.genSalt(12);
    const password_hash = await bcrypt.hash(password, salt);

    // Initialize Supabase client with service role key (server-side only)
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Check for existing username or email
    const { data: existingUsers, error: checkError } = await supabaseClient
      .from('users')
      .select('username, email')
      .or(`username.eq.${username},email.eq.${email}`);

    if (checkError) {
      console.error('Error checking existing users:', checkError);
      return new Response(JSON.stringify({ error: 'Database error during validation' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (existingUsers && existingUsers.length > 0) {
      const existingUsername = existingUsers.find(u => u.username === username);
      const existingEmail = existingUsers.find(u => u.email === email);
      
      if (existingUsername) {
        return new Response(JSON.stringify({ error: 'Username already exists' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      if (existingEmail) {
        return new Response(JSON.stringify({ error: 'Email already exists' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    }

    // Insert new user
    const { data: newUser, error: insertError } = await supabaseClient
      .from('users')
      .insert([{
        username,
        email,
        password_hash,
        hash_type: 'bcrypt',
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
      }])
      .select()
      .single();

    if (insertError) {
      console.error('Error inserting user:', insertError);
      return new Response(JSON.stringify({ error: 'Registration failed: ' + insertError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Return success without exposing sensitive data
    // Note: Token generation should use Supabase Auth, not custom tokens
    return new Response(JSON.stringify({
      success: true,
      message: 'Registration successful',
      user: {
        id: newUser.id,
        username: newUser.username,
        email: newUser.email,
        user_type: newUser.user_type
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Server error:', error);
    return new Response(JSON.stringify({ 
      error: 'Server error occurred'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
