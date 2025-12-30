import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import bcrypt from 'https://esm.sh/bcryptjs@3.0.2';

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

// Simple in-memory rate limiter
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 5; // 5 registrations per minute per IP

function getClientIP(req: Request): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
         req.headers.get('x-real-ip') ||
         'unknown';
}

function checkRateLimit(ip: string): { allowed: boolean; retryAfter?: number } {
  const now = Date.now();
  const record = rateLimitMap.get(ip);
  
  if (!record || now > record.resetTime) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW_MS });
    return { allowed: true };
  }
  
  if (record.count >= MAX_REQUESTS_PER_WINDOW) {
    const retryAfter = Math.ceil((record.resetTime - now) / 1000);
    return { allowed: false, retryAfter };
  }
  
  record.count++;
  return { allowed: true };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // Rate limiting check
  const clientIP = getClientIP(req);
  const rateCheck = checkRateLimit(clientIP);
  
  if (!rateCheck.allowed) {
    console.log(`Rate limit exceeded for IP: ${clientIP}`);
    return new Response(JSON.stringify({ 
      error: 'Too many registration attempts. Please try again later.',
      retryAfter: rateCheck.retryAfter
    }), {
      status: 429,
      headers: { 
        ...corsHeaders, 
        'Content-Type': 'application/json',
        'Retry-After': String(rateCheck.retryAfter)
      }
    });
  }

  try {
    const { 
      firstName, lastName, username, email, password, confirmPassword, 
      mobileNumber, address, city, state, zip, gender, userType, 
      referredBy, profilePhotoUrl, bannerPhotoUrl, frontPagePhotoUrl,
      dateOfBirth, videoUrls, videoMeta
    } = await req.json();

    console.log(`Registration attempt for: ${username} (${email}) from IP: ${clientIP}`);

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
    if (password.length < 6) {
      return new Response(JSON.stringify({ error: 'Password must be at least 6 characters' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return new Response(JSON.stringify({ error: 'Invalid email format' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Initialize Supabase client with service role key (server-side only)
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    
    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

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
        return new Response(JSON.stringify({ error: 'Email already registered' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    }

    // Check if email already exists in Supabase Auth
    const { data: existingAuthUsers } = await supabaseClient.auth.admin.listUsers();
    const emailExistsInAuth = existingAuthUsers?.users?.some(u => u.email?.toLowerCase() === email.toLowerCase());
    
    if (emailExistsInAuth) {
      return new Response(JSON.stringify({ error: 'Email already registered. Please use a different email or try logging in.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // SECURITY: Use bcryptjs for password hashing (compatible with Edge Runtime)
    const salt = bcrypt.genSaltSync(12);
    const password_hash = bcrypt.hashSync(password, salt);

    // Determine membership tier based on gender and user type
    const isFemaleDiamond = gender === 'female' && (userType === 'exotic' || userType === 'stripper');
    const membershipTier = isFemaleDiamond ? 'diamond' : 'free';
    const membershipType = isFemaleDiamond ? 'diamond' : 'free';
    const effectiveUserType = userType || 'normal';

    // Create Supabase Auth user
    const { data: authData, error: authError } = await supabaseClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true
    });

    if (authError || !authData.user) {
      console.error('Error creating auth user:', authError);
      return new Response(JSON.stringify({ error: 'Failed to create authentication: ' + (authError?.message || 'Unknown error') }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const authUserId = authData.user.id;
    const effectiveReferredBy = referredBy && referredBy.trim() !== '' ? referredBy : 'Company';

    // Insert new user with the auth user ID
    const { data: newUser, error: insertError } = await supabaseClient
      .from('users')
      .insert([{
        id: authUserId, // Use the auth user ID
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
        user_type: effectiveUserType,
        membership_tier: membershipTier,
        membership_type: membershipType,
        referred_by: effectiveReferredBy,
        date_of_birth: dateOfBirth || null,
        profile_photo: profilePhotoUrl || null,
        banner_photo: bannerPhotoUrl || null,
        front_page_photo: frontPagePhotoUrl || null,
        video_urls: videoUrls || [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (insertError) {
      console.error('Error inserting user:', insertError);
      // Clean up auth user if database insert fails
      await supabaseClient.auth.admin.deleteUser(authUserId);
      return new Response(JSON.stringify({ error: 'Registration failed: ' + insertError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log(`User record created for: ${newUser.username}`);

    // Insert video media if provided
    if (videoMeta && Array.isArray(videoMeta) && videoMeta.length > 0) {
      const mediaRows = videoMeta.map((meta: any) => ({
        user_id: authUserId,
        media_url: meta.url,
        media_type: 'video',
        filename: meta.storagePath?.split('/').pop() ?? `${username}_${meta.slot}.mp4`,
        storage_path: meta.storagePath,
        content_tier: meta.contentTier || 'free',
        is_nude: meta.isNude || false,
        is_xrated: meta.isXrated || false,
        upload_date: new Date().toISOString(),
        access_restricted: meta.contentTier !== 'free'
      }));

      const { error: mediaInsertError } = await supabaseClient
        .from('user_media')
        .insert(mediaRows);

      if (mediaInsertError) {
        console.error('Failed to insert registration videos:', mediaInsertError);
        // Don't fail registration for media insert errors
      }
    }

    // Increment membership count
    try {
      const limitCategoryForCounting = effectiveUserType === 'normal' ? 'silver' : 'diamond';
      await supabaseClient.rpc('increment_membership_count', {
        membership_type_param: limitCategoryForCounting,
        user_type_param: effectiveUserType
      });
    } catch (incrementError) {
      console.error('Failed to increment membership limits:', incrementError);
      // Don't fail registration for counter errors
    }

    console.log(`User registered successfully: ${newUser.username} from IP: ${clientIP}`);

    // Return success with user data needed for client
    return new Response(JSON.stringify({
      success: true,
      message: 'Registration successful',
      user: {
        id: newUser.id,
        username: newUser.username,
        email: newUser.email,
        user_type: newUser.user_type,
        membership_tier: newUser.membership_tier
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
