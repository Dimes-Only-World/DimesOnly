import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Exported constants for use across the app (e.g., calling Edge Functions)
export const SUPABASE_URL = 'https://qkcuykpndrolrewwnkwb.supabase.co';
export const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFrY3V5a3BuZHJvbHJld3dua3diIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkzODIwNzAsImV4cCI6MjA2NDk1ODA3MH0.gamp40tIrDSMaI5_YMIrn3qCR-oVdx__YtvBl75yOJs';
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFrY3V5a3BuZHJvbHJld3dua3diIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0OTM4MjA3MCwiZXhwIjoyMDY0OTU4MDcwfQ.ayaH1xWQQU-KzPkS5Zufk_Ss6wHns95u6DBhtdLKFN8';

// Force untyped clients to bypass Database type issues
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyDatabase = any;

// Global singleton to prevent multiple instances
let globalSupabaseInstance: SupabaseClient<AnyDatabase> | null = null;
let globalSupabaseAdminInstance: SupabaseClient<AnyDatabase> | null = null;

const getSupabaseClient = (): SupabaseClient<AnyDatabase> => {
  if (!globalSupabaseInstance) {
    globalSupabaseInstance = createClient<AnyDatabase>(SUPABASE_URL, SUPABASE_ANON_KEY, {
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

const getSupabaseAdminClient = (): SupabaseClient<AnyDatabase> => {
  if (!globalSupabaseAdminInstance) {
    globalSupabaseAdminInstance = createClient<AnyDatabase>(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        storageKey: 'dimes-only-admin-auth'
      }
    });
  }
  return globalSupabaseAdminInstance;
};

// Export the singleton instances
export const supabase: SupabaseClient<AnyDatabase> = getSupabaseClient();
export const supabaseAdmin: SupabaseClient<AnyDatabase> = getSupabaseAdminClient();

// For backward compatibility
export default supabase;
