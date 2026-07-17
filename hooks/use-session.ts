import { useEffect, useState } from 'react';

import { repo, type Session } from '@/lib/data';

export interface SessionState {
  session: Session | null;
  loading: boolean;
}

/**
 * Subscribes to auth changes from the active repo. In demo mode this resolves
 * immediately to the fixture session; with a real backend it reflects supabase
 * auth state. `loading` is true only until the first event arrives.
 */
export function useSession(): SessionState {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const unsubscribe = repo.onAuthChange((next) => {
      if (!mounted) return;
      setSession(next);
      setLoading(false);
    });
    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);

  return { session, loading };
}
