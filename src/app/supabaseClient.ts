// supabaseClient.ts
import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://jmxcrkagefzlcudzxpuk.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpteGNya2FnZWZ6bGN1ZHp4cHVrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ0MjQzNjIsImV4cCI6MjA3MDAwMDM2Mn0.IMyq3sucGXgM5hMbWLhBOoskf6a88ngyqzZSE_4r9mw';

let browserClient: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient { 
  if (typeof window === 'undefined') {
    // ✅ SSR-safe: no locks, no localStorage
    return createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: false,       // ⬅️ must be false
        autoRefreshToken: false,     // ⬅️ must be false
        detectSessionInUrl: false,   // ⬅️ must be false
      },
    });
  }

  if (!browserClient) {
    // ✅ Browser client with persistence
    browserClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        flowType: 'pkce', // optional, reduces tab lock issues
      },
    });
  }

  return browserClient;
}