import * as bcrypt from 'https://deno.land/x/bcrypt@v0.4.1/mod.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: corsHeaders
    });
  }

  try {
    const { 
      firstName, 
      lastName, 
      username, 
      email, 
      password, 
      confirmPassword, 
      mobileNumber, 
      address, 
      city, 
      state, 
      zip, 
      gender, 
      userType, 
      referredBy, 
      profilePhotoUrl, 
      bannerPhotoUrl, 
      frontPagePhotoUrl 
    } = await req.json();

    // Validate required fields
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

    // Validate password match
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

    // Validate password strength
    if (password.length < 6) {
      return new Response(JSON.stringify({
        error: 'Password must be at least 6 characters long'
      }), {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return new Response(JSON.stringify({
        error: 'Invalid email format'
      }), {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }

    // Validate username format (alphanumeric, underscores, 3-30 chars)
    const usernameRegex = /^[a-zA-Z0-9_]{3,30}$/;
    if (!usernameRegex.test(username)) {
      return new Response(JSON.stringify({
        error: 'Username must be 3-30 characters and contain only letters, numbers, and underscores'
      }), {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }

    // Initialize Supabase client with service role key for admin operations
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check if username or email already exists using Supabase client
    const { data: existingUsers, error: checkError } = await supabase
      .from('users')
      .select('username, email')
      .or(`username.eq.${username},email.eq.${email}`);

    if (checkError) {
      console.error('Error checking existing users:', checkError);
      return new Response(JSON.stringify({
        error: 'Registration failed: Could not verify user availability'
      }), {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }

    if (existingUsers && existingUsers.length > 0) {
      const existingUsername = existingUsers.find(u => u.username?.toLowerCase() === username.toLowerCase());
      const existingEmail = existingUsers.find(u => u.email?.toLowerCase() === email.toLowerCase());
      
      if (existingUsername) {
        return new Response(JSON.stringify({
          error: 'Username already exists'
        }), {
          status: 400,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json'
          }
        });
      }
      
      if (existingEmail) {
        return new Response(JSON.stringify({
          error: 'Email already registered'
        }), {
          status: 400,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json'
          }
        });
      }
    }

    // Hash password using bcrypt with 12 rounds (secure, per-user salt generated automatically)
    const password_hash = await bcrypt.hash(password);
    console.log('Password hashed with bcrypt');

    // Insert user using Supabase client
    const { data: newUser, error: insertError } = await supabase
      .from('users')
      .insert({
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
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error inserting user:', insertError);
      return new Response(JSON.stringify({
        error: 'Registration failed: ' + insertError.message
      }), {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }

    console.log('User registered successfully:', username);

    return new Response(JSON.stringify({
      success: true,
      message: 'Registration successful',
      user: {
        id: newUser.id,
        username: newUser.username,
        email: newUser.email
      },
      token: 'user_' + username + '_' + Date.now()
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    return new Response(JSON.stringify({
      error: 'Server error: ' + (error instanceof Error ? error.message : 'Unknown error')
    }), {
      status: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  }
});
