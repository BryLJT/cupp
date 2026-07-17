import { createClient } from '@supabase/supabase-js';

// App-side Supabase client. Uses the publishable key, which is safe to ship:
// row-level security decides what it may actually do.
// Values come from .env (EXPO_PUBLIC_* vars are inlined by Expo at build time).

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error(
    'Missing Supabase config: copy .env.example to .env and fill in the values (see README).'
  );
}

export const supabase = createClient(supabaseUrl, supabaseKey);
