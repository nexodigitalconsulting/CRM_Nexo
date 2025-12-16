// Supabase client - supports both Supabase Cloud and self-hosted instances
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

// Get Supabase configuration from environment variables
// These are set at build time via Vite (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY)
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Validate configuration
if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('⚠️ Supabase configuration missing. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY environment variables.');
}

// Create and export the Supabase client
export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  }
});

// Export configuration for debugging purposes
export const getSupabaseConfig = () => ({
  url: SUPABASE_URL,
  hasKey: !!SUPABASE_ANON_KEY,
  isConfigured: !!(SUPABASE_URL && SUPABASE_ANON_KEY),
});
