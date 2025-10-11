import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import * as bcrypt from 'https://deno.land/x/bcrypt@v0.4.1/mod.ts';
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};
async function sha256Hash(message) {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  return Array.from(new Uint8Array(hashBuffer)).map((b)=>b.toString(16).padStart(2, '0')).join('');
}
serve(async (req)=>{
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: corsHeaders
    });
  }
  try {
    const supabaseClient = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');
    const { username, oldHash, newPassword } = await req.json();
    // Verify the request has required data
    if (!username || !oldHash) {
      throw new Error('Missing required fields');
    }
    // Get user's current password hash
    const { data: userData, error: userError } = await supabaseClient.from('users').select('password_hash').eq('username', username).single();
    if (userError || !userData) {
      throw new Error('User not found');
    }
    // Verify old SHA-256 hash matches
    const oldHashVerification = await sha256Hash(oldHash);
    if (oldHashVerification !== userData.password_hash) {
      throw new Error('Invalid old password');
    }
    // Generate new bcrypt hash
    let newHash;
    if (newPassword) {
      // If new password provided, hash it
      newHash = await bcrypt.hash(newPassword);
    } else {
      // Otherwise, hash the old password
      newHash = await bcrypt.hash(oldHash);
    }
    // Update user's password hash
    const { error: updateError } = await supabaseClient.from('users').update({
      password_hash: newHash,
      hash_type: 'bcrypt',
      updated_at: new Date().toISOString()
    }).eq('username', username);
    if (updateError) {
      throw new Error('Failed to update password hash');
    }
    return new Response(JSON.stringify({
      success: true,
      message: 'Password hash migrated successfully'
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      status: 200
    });
  } catch (error) {
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      status: 400
    });
  }
});
