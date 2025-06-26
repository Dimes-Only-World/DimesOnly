import { createClient } from '@supabase/supabase-js';

// Global singleton to prevent multiple instances
let globalSupabaseInstance: ReturnType<typeof createClient> | null = null;
let globalSupabaseAdminInstance: ReturnType<typeof createClient> | null = null;

const getSupabaseClient = () => {
  if (!globalSupabaseInstance) {
    const supabaseUrl = 'https://qkcuykpndrolrewwnkwb.supabase.co';
    const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFrY3V5a3BuZHJvbHJld3dua3diIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkzODIwNzAsImV4cCI6MjA2NDk1ODA3MH0.gamp40tIrDSMaI5_YMIrn3qCR-oVdx__YtvBl75yOJs';

    globalSupabaseInstance = createClient(supabaseUrl, supabaseAnonKey, {
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

const getSupabaseAdminClient = () => {
  if (!globalSupabaseAdminInstance) {
    const supabaseUrl = 'https://qkcuykpndrolrewwnkwb.supabase.co';
    const supabaseServiceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFrY3V5a3BuZHJvbHJld3dua3diIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0OTM4MjA3MCwiZXhwIjoyMDY0OTU4MDcwfQ.ayaH1xWQQU-KzPkS5Zufk_Ss6wHns95u6DBhtdLKFN8';

    globalSupabaseAdminInstance = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        storageKey: 'dimes-only-admin-auth'
      }
    });
  }
  
  return globalSupabaseAdminInstance;
};

// Export the singleton instances
export const supabase = getSupabaseClient();
export const supabaseAdmin = getSupabaseAdminClient();

// For backward compatibility
export default supabase;