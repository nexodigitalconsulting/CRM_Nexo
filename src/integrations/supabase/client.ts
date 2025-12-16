// Supabase client - supports both Supabase Cloud and self-hosted instances
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

// Get Supabase configuration from environment variables
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Optional: Basic auth for self-hosted Supabase behind proxy (Easypanel/Kong)
const BASIC_AUTH_USER = import.meta.env.VITE_SUPABASE_BASIC_AUTH_USER || '';
const BASIC_AUTH_PASSWORD = import.meta.env.VITE_SUPABASE_BASIC_AUTH_PASSWORD || '';

// Validate configuration
if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('⚠️ Supabase configuration missing. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY environment variables.');
}

// Build headers with optional basic auth
const buildHeaders = (): Record<string, string> => {
  const headers: Record<string, string> = {};
  
  // Add basic auth if credentials are provided (for self-hosted behind proxy)
  if (BASIC_AUTH_USER && BASIC_AUTH_PASSWORD) {
    const basicAuth = 'Basic ' + btoa(`${BASIC_AUTH_USER}:${BASIC_AUTH_PASSWORD}`);
    headers['Authorization'] = basicAuth;
    console.log('🔐 Basic auth enabled for self-hosted Supabase');
  }
  
  return headers;
};

const customHeaders = buildHeaders();

// Create and export the Supabase client
export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  },
  global: {
    headers: Object.keys(customHeaders).length > 0 ? customHeaders : undefined,
  },
});

// Export configuration for debugging purposes
export const getSupabaseConfig = () => ({
  url: SUPABASE_URL,
  hasKey: !!SUPABASE_ANON_KEY,
  hasBasicAuth: !!(BASIC_AUTH_USER && BASIC_AUTH_PASSWORD),
  isConfigured: !!(SUPABASE_URL && SUPABASE_ANON_KEY),
});
