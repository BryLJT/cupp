// The active-repo switch. Screens import `repo` from here (never a concrete
// implementation directly), so swapping demo <-> real backend is a one-line change.

import { hasSupabaseEnv } from '@/lib/supabase';
import { demoRepo } from './demoRepo';
import { supabaseRepo } from './supabaseRepo';
import type { Repo } from './repo';

// Demo mode: no Supabase env vars configured, or explicitly forced via
// EXPO_PUBLIC_DEMO=1 (useful for demoing/testing against fixtures even when
// real env vars are present).
const useDemo = !hasSupabaseEnv || process.env.EXPO_PUBLIC_DEMO === '1';

let active: Repo = demoRepo;

if (!useDemo) {
  active = supabaseRepo;
}

export const repo: Repo = active;
export const isDemoMode = useDemo;

export * from './types';
export type { Repo } from './repo';
