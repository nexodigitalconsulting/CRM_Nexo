// Supabase client - supports both Supabase Cloud and self-hosted instances
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

// Supabase configuration
const SUPABASE_URL = 'https://honfwrfkiukckyoelsdm.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhvbmZ3cmZraXVrY2t5b2Vsc2RtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIyNTYyOTEsImV4cCI6MjA3NzgzMjI5MX0.GaCzMajZURM2eJn41qRk-Z1RA6uAlk4SPIbsOtwxx6A';

// Create and export the Supabase client
export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  },
});

// Export configuration for debugging purposes
export const getSupabaseConfig = () => ({
  url: SUPABASE_URL,
  hasKey: !!SUPABASE_ANON_KEY,
  isConfigured: true,
});
