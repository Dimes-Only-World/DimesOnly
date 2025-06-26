import { createClient } from '@supabase/supabase-js';

// Import the singleton from supabase.ts to prevent multiple instances
import { supabase } from './supabase';

// Export the same singleton instance
export { supabase };
export default supabase;