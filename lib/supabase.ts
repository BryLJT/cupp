import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';

// App-side Supabase client. Uses the publishable key, which is safe to ship:
// row-level security decides what it may actually do.
// Values come from .env (EXPO_PUBLIC_* vars are inlined by Expo at build time).
//
// Demo mode: when the env vars are absent, we do NOT crash the import — the app
// falls back to the in-memory demo repo (see lib/data/index.ts) instead.

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

export const hasSupabaseEnv = Boolean(supabaseUrl && supabaseKey);

// AsyncStorage's web build reads `window.localStorage` unconditionally, which
// crashes expo-router's Node-side SSR pass (no `window` there). Native ignores
// `window` entirely (its storage is backed by native modules), and real
// browsers always have `window`, so this only ever falls through during SSR —
// where omitting storage is safe: auth-js falls back to an in-memory store.
const authStorage = Platform.OS !== 'web' || typeof window !== 'undefined' ? AsyncStorage : undefined;

export const supabase: SupabaseClient | null = hasSupabaseEnv
  ? createClient(supabaseUrl!, supabaseKey!, {
      auth: {
        storage: authStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    })
  : null;
