export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders, status: 200 });
  }

  try {
    const bcryptModule = await import('https://esm.sh/bcryptjs@2.4.3');
    const bcrypt = bcryptModule.default || bcryptModule;
    
    // Generate bcrypt hash for the admin password
    const password = 'abc123!!!';
    const hash = bcrypt.hashSync(password, 12);
    
    console.log('Generated hash:', hash);
    console.log('Hash length:', hash.length);
    
    // Verify it works
    const verifyResult = bcrypt.compareSync(password, hash);
    console.log('Verification result:', verifyResult);
    
    // Update the admin user's password
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    
    const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    const { error } = await supabase
      .from('users')
      .update({ 
        password_hash: hash,
        hash_type: 'bcrypt'
      })
      .eq('username', 'admin');
    
    if (error) {
      console.error('Update error:', error);
      return new Response(JSON.stringify({ success: false, error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Admin password updated successfully',
      hashPrefix: hash.substring(0, 10) + '...'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ success: false, error: String(error) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});