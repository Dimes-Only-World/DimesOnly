import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

// Orphaned Auth user IDs identified from database query
const ORPHANED_AUTH_USER_IDS = [
  '7884a60e-cdac-42f6-9dde-23b722d9209b', // blackjackonelif@gmail.com
  'c4d0cf9f-a0c5-46bd-b92c-aac46ae680ce', // amnyepat@live.com
  '6284c908-961f-4e1d-b2f2-38570354cfd5', // yvett.vettlove.adams.ya@gmail.com
  'c864cda4-2589-4f1c-9e41-45b02e23e3f1', // chibuze68@gmail.com
  '5721d3af-ccab-4951-811b-5e16216e8bd0', // blackjackonelie@gmail.com
  '8944f077-bb0c-4b05-99f0-e56f5d14dd7b', // blackjckonelife@gmail.com
  '890f0660-5b11-41e7-aaa3-1d81557de6eb', // hdunphy@gmail.com
  'ac96f50c-3a6f-47a6-a9cc-773def18dc6e', // diamondchecker@gmail.com
  'fd9870ca-2eee-452b-9d2b-6f6e80d900f6', // blackjakonelife@gmail.com
  '8597608b-b70f-4688-8573-4109b189d500', // onelifeorldwide2012@gmail.com
  'bd3461f7-22e6-45b3-8415-541a24ddcce6', // travare080@gmail.com
  'cf93c79a-c183-4c21-b02f-ba404528fdf5', // m.marielewis26@gmail.com
  '158bb028-68f0-40bb-8f85-9887c6933b4b', // gtech3922@gmail.com
  'f7c8770a-c475-46dc-a9f6-4c2eee710dee', // test_tipper+mj7t0xz1-d27d75@dimesonly.test
  '1d851187-b74b-4911-ba39-9983c09cfc04', // test_referrer+mj7m5s72-4a211f@dimesonly.test
  'ab6e511c-2a96-4161-a034-edb904f7bbe4', // test_performer@dimesonly.test
  'a2f31780-bbde-413e-bc17-517669cc6719', // test_performer+mj7t0xz1-d27d75@dimesonly.test
  'adbc2922-43f4-4085-82fc-012def1ce35c', // test_tipper@dimesonly.test
  '3b3d1fae-8ea4-412b-8a7b-0985738ea72c', // test_referrer+mj7t0xz1-d27d75@dimesonly.test
  '162a7a8e-ac89-4a34-bca3-2de5a842d68e', // test_performer+mj7m5s72-4a211f@dimesonly.test
  '2620f80b-2c3f-4470-994a-263a9a4e59db', // test_referrer@dimesonly.test
  'e75c5997-a363-4509-aa1a-913ea453fb8b', // test_tipper+mj7m5s72-4a211f@dimesonly.test
  'c1257135-aad4-4249-b4ba-573f38dc6bde', // test_tipper+mje9htc6-b97c51@dimesonly.test
  '660decc1-b81f-4b60-941b-4feea9c9a2da', // test_referrer+mje9htc6-b97c51@dimesonly.test
  '0626509a-5ce8-441f-87f0-43e3e17ef242', // test_performer+mje9htc6-b97c51@dimesonly.test
  '3f9e4766-458e-46ab-a829-db55a14ee075', // onelifeworldwide2012@gmail.com
];

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    
    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    console.log(`Starting cleanup of ${ORPHANED_AUTH_USER_IDS.length} orphaned Auth users`);

    const deleted: string[] = [];
    const failed: { id: string; error: string }[] = [];

    // Delete each orphaned auth user by ID
    for (const userId of ORPHANED_AUTH_USER_IDS) {
      try {
        console.log(`Deleting orphaned Auth user: ${userId}`);
        const { error: deleteError } = await supabaseClient.auth.admin.deleteUser(userId);
        
        if (deleteError) {
          console.error(`Failed to delete ${userId}:`, deleteError);
          failed.push({ id: userId, error: deleteError.message });
        } else {
          console.log(`Successfully deleted: ${userId}`);
          deleted.push(userId);
        }
      } catch (err) {
        console.error(`Exception deleting ${userId}:`, err);
        failed.push({ id: userId, error: String(err) });
      }
    }

    console.log(`Cleanup complete: ${deleted.length} deleted, ${failed.length} failed`);

    return new Response(JSON.stringify({
      success: true,
      total_orphaned: ORPHANED_AUTH_USER_IDS.length,
      deleted_count: deleted.length,
      deleted,
      failed_count: failed.length,
      failed
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Server error:', error);
    return new Response(JSON.stringify({ error: 'Server error occurred' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
