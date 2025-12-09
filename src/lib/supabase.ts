import { createClient } from '@supabase/supabase-js';

// Global singleton to prevent multiple instances
let globalSupabaseInstance: ReturnType<typeof createClient> | null = null;

// Exported constants for use across the app (e.g., calling Edge Functions)
export const SUPABASE_URL = 'https://qkcuykpndrolrewwnkwb.supabase.co';
export const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFrY3V5a3BuZHJvbHJld3dua3diIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkzODIwNzAsImV4cCI6MjA2NDk1ODA3MH0.gamp40tIrDSMaI5_YMIrn3qCR-oVdx__YtvBl75yOJs';

const getSupabaseClient = () => {
  if (!globalSupabaseInstance) {
    globalSupabaseInstance = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storageKey: 'dimes-only-auth'
      }
    });
  }
  
  return globalSupabaseInstance;
};

// Export the singleton instance
export const supabase = getSupabaseClient();

// SECURITY: supabaseAdmin has been removed - it exposed the service role key in client code
// All operations that previously used supabaseAdmin should now use:
// 1. The regular supabase client with proper RLS policies, OR
// 2. Edge Functions for admin operations (recommended)
// The supabase client is aliased as supabaseAdmin for backward compatibility during migration
// TODO: Migrate all supabaseAdmin usages to use proper authenticated client or edge functions
export const supabaseAdmin = supabase;

// For backward compatibility
export default supabase;