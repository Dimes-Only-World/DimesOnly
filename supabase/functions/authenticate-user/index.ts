export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

// Rate limiter with exponential backoff for failed attempts
const rateLimitMap = new Map<string, { 
  attempts: number; 
  lastAttempt: number; 
  lockoutUntil: number;
}>();

const MAX_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes lockout
const ATTEMPT_WINDOW_MS = 5 * 60 * 1000; // 5 minute window
const encoder = new TextEncoder();

function toBase64Url(bytes: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(bytes)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

async function createCustomSessionToken(userId: string, secret: string): Promise<string> {
  if (!secret) return '';
  const issuedAt = String(Date.now());
  const payload = `${userId}.${issuedAt}`;
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = toBase64Url(await crypto.subtle.sign('HMAC', key, encoder.encode(payload)));
  return `${payload}.${signature}`;
}

function getClientIP(req: Request): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
         req.headers.get('x-real-ip') ||
         'unknown';
}

function checkRateLimit(ip: string): { allowed: boolean; retryAfter?: number } {
  const now = Date.now();
  const record = rateLimitMap.get(ip);
  
  if (!record) {
    return { allowed: true };
  }
  
  // Check if currently locked out
  if (record.lockoutUntil > now) {
    const retryAfter = Math.ceil((record.lockoutUntil - now) / 1000);
    return { allowed: false, retryAfter };
  }
  
  // Reset if outside attempt window
  if (now - record.lastAttempt > ATTEMPT_WINDOW_MS) {
    rateLimitMap.delete(ip);
    return { allowed: true };
  }
  
  return { allowed: true };
}

function recordFailedAttempt(ip: string): void {
  const now = Date.now();
  const record = rateLimitMap.get(ip);
  
  if (!record || now - record.lastAttempt > ATTEMPT_WINDOW_MS) {
    rateLimitMap.set(ip, { attempts: 1, lastAttempt: now, lockoutUntil: 0 });
    return;
  }
  
  record.attempts++;
  record.lastAttempt = now;
  
  if (record.attempts >= MAX_ATTEMPTS) {
    record.lockoutUntil = now + LOCKOUT_DURATION_MS;
    console.log(`IP ${ip} locked out until ${new Date(record.lockoutUntil).toISOString()}`);
  }
}

function clearFailedAttempts(ip: string): void {
  rateLimitMap.delete(ip);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: corsHeaders,
      status: 200
    });
  }

  const clientIP = getClientIP(req);
  
  // Rate limiting check
  const rateCheck = checkRateLimit(clientIP);
  if (!rateCheck.allowed) {
    console.log(`Rate limit: IP ${clientIP} is locked out`);
    return new Response(JSON.stringify({
      message: 'Too many failed login attempts. Please try again later.',
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
    const body = await req.json();
    console.log('Incoming login request from IP:', clientIP);
    
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

    // Normalize identifier and look up user by either username OR email (case-insensitive)
    const identifier = String(username).trim();
    const SELECT_COLS = 'id, username, email, first_name, last_name, user_type, profile_photo, banner_photo, mobile_number, address, city, state, zip, gender, membership_type, membership_tier, tips_earned, referral_fees, overrides, weekly_hours, is_ranked, rank_number, created_at, password_hash, hash_type, is_active';

    // Escape commas/parens for PostgREST .or() filter
    const safe = identifier.replace(/[,()]/g, '');

    let user: any = null;
    let error: any = null;

    const { data: users, error: searchError } = await supabase
      .from('users')
      .select(SELECT_COLS)
      .or(`username.ilike.${safe},email.ilike.${safe}`)
      .limit(2);

    if (!searchError && users && users.length > 0) {
      // Prefer an exact case-insensitive match on either field
      user = users.find((u: any) =>
        (u.username && u.username.toLowerCase() === identifier.toLowerCase()) ||
        (u.email && u.email.toLowerCase() === identifier.toLowerCase())
      ) || users[0];
    } else {
      error = searchError;
    }

    if (error || !user) {
      recordFailedAttempt(clientIP);
      console.log('User not found - failed attempt recorded');
      return new Response(JSON.stringify({
        success: false,
        error: 'Invalid credentials'
      }), {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }

    // Password validation - ONLY accept bcrypt or SHA256 hashes
    let passwordMatch = false;
    
    const storedHash = user.password_hash;

    if (!storedHash) {
      recordFailedAttempt(clientIP);
      console.log('No password hash stored for user');
      return new Response(JSON.stringify({
        success: false,
        error: 'Invalid credentials'
      }), {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }

    // bcrypt hash check (starts with $2a$ or $2b$)
    if (storedHash.startsWith('$2b$') || storedHash.startsWith('$2a$')) {
      try {
        // Use bcryptjs which is compatible with edge runtime (no Worker dependency)
        const bcryptModule = await import('https://esm.sh/bcryptjs@2.4.3');
        const bcrypt = bcryptModule.default || bcryptModule;
        console.log('Attempting bcrypt comparison, hash length:', storedHash.length);
        passwordMatch = bcrypt.compareSync(password, storedHash);
        console.log('Bcrypt comparison result:', passwordMatch);
      } catch (e) {
        console.error('Bcrypt error:', e);
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
    } else {
      // Unknown hash format - reject for security
      console.log('Unknown password hash format - rejecting login');
    }

    if (!passwordMatch) {
      recordFailedAttempt(clientIP);
      console.log('Password validation failed - failed attempt recorded');
      return new Response(JSON.stringify({
        success: false,
        error: 'Invalid credentials'
      }), {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }

    // Check if account is deactivated
    if (user.is_active === false) {
      console.log('Login blocked - account deactivated:', user.username);
      return new Response(JSON.stringify({
        success: false,
        error: 'Your account has been deactivated. Please contact support to file an appeal.'
      }), {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }

    // Clear failed attempts on successful login
    clearFailedAttempts(clientIP);
    console.log('Login successful for user:', user.username);
    
    const pushAuthToken = await createCustomSessionToken(
      user.id,
      Deno.env.get('CUSTOM_AUTH_SIGNING_SECRET') || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '',
    );

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
        membership_tier: user.membership_tier,
        tips_earned: user.tips_earned,
        referral_fees: user.referral_fees,
        overrides: user.overrides,
        weekly_hours: user.weekly_hours,
        is_ranked: user.is_ranked,
        rank_number: user.rank_number,
        created_at: user.created_at
      },
      token: `authenticated_${user.id}`,
      push_auth_token: pushAuthToken
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
