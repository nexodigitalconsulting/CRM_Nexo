// Supabase client - supports both Supabase Cloud and self-hosted instances
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

// Default Lovable Supabase configuration (fallback)
const DEFAULT_SUPABASE_URL = 'https://honfwrfkiukckyoelsdm.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhvbmZ3cmZraXVrY2t5b2Vsc2RtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIyNTYyOTEsImV4cCI6MjA3NzgzMjI5MX0.GaCzMajZURM2eJn41qRk-Z1RA6uAlk4SPIbsOtwxx6A';

// Get Supabase configuration - supports self-hosted via env vars with Lovable fallback
// NOTE: In production self-hosted deployments, these are injected at build time.
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || DEFAULT_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || DEFAULT_SUPABASE_ANON_KEY;

// Create and export the Supabase client
// localStorage guard: en SSR (Next.js server) no existe window/localStorage
const authStorage = typeof window !== "undefined" ? localStorage : undefined;

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: authStorage,
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
