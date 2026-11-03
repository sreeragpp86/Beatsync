import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
  supabaseAnonKey &&
  supabaseUrl.trim() !== '' &&
  supabaseAnonKey.trim() !== '' &&
  !supabaseUrl.includes('placeholder')
);

// Fallback credentials to prevent app startup crashes when environment variables are not configured
const fallbackUrl = 'https://placeholder-soundwave.supabase.co';
const fallbackKey = 'placeholder-key';

if (!isSupabaseConfigured && process.env.NODE_ENV !== 'production') {
  console.warn(
    '[SoundWave] Supabase credentials not found. Using fallback mock client. Provide NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local to connect to your database.'
  );
}

export const supabase: SupabaseClient = createClient(
  isSupabaseConfigured && supabaseUrl ? supabaseUrl : fallbackUrl,
  isSupabaseConfigured && supabaseAnonKey ? supabaseAnonKey : fallbackKey
);
