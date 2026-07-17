import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// App-side Supabase client. Uses the publishable key, which is safe to ship:
// row-level security decides what it may actually do.
// Values come from .env (EXPO_PUBLIC_* vars are inlined by Expo at build time).
//
// Demo mode: when the env vars are absent, we do NOT crash the import — the app
// falls back to the in-memory demo repo (see lib/data/index.ts) instead.

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

export const hasSupabaseEnv = Boolean(supabaseUrl && supabaseKey);

export const supabase: SupabaseClient | null = hasSupabaseEnv
  ? createClient(supabaseUrl!, supabaseKey!, {
      auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    })
  : null;
