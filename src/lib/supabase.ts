import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Exported constants for use across the app (e.g., calling Edge Functions)
export const SUPABASE_URL = 'https://qkcuykpndrolrewwnkwb.supabase.co';
export const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFrY3V5a3BuZHJvbHJld3dua3diIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkzODIwNzAsImV4cCI6MjA2NDk1ODA3MH0.gamp40tIrDSMaI5_YMIrn3qCR-oVdx__YtvBl75yOJs';

// SECURITY: Service role key has been removed from client-side code.
// Admin operations must be performed through Edge Functions.

// Force untyped clients to bypass Database type issues
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyDatabase = any;

// Global singleton to prevent multiple instances
let globalSupabaseInstance: SupabaseClient<AnyDatabase> | null = null;

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

// Export the singleton instance
export const supabase: SupabaseClient<AnyDatabase> = getSupabaseClient();

// DEPRECATED: supabaseAdmin has been removed for security reasons.
// Use Edge Functions for admin operations instead.
// This export is kept temporarily for backward compatibility but will throw an error.
export const supabaseAdmin = new Proxy({} as SupabaseClient<AnyDatabase>, {
  get() {
    console.error('SECURITY ERROR: supabaseAdmin has been removed. Use Edge Functions for admin operations.');
    throw new Error('supabaseAdmin has been removed for security. Use Edge Functions instead.');
  }
});

// For backward compatibility
export default supabase;
