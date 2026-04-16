// Supabase client — reads keys from environment variables
import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

let supabase: SupabaseClient;

if (supabaseUrl && supabaseUrl.startsWith('http')) {
  supabase = createClient(supabaseUrl, supabaseAnonKey);
} else {
  // During build or when keys aren't set yet, create a dummy client
  // that won't crash the app at import time.
  console.warn(
    'Supabase not configured. Set EXPO_PUBLIC_SUPABASE_URL and ' +
    'EXPO_PUBLIC_SUPABASE_ANON_KEY in .env.local'
  );
  // Create with a placeholder so the module still exports a valid object.
  // All calls will fail gracefully at runtime until real keys are provided.
  supabase = createClient('https://placeholder.supabase.co', 'placeholder');
}

export { supabase };
