// Resolves a username-or-email identifier to a real email, then signs in.
// The username->email lookup runs server-side (service_role) so the email
// is never exposed to the client -- usernames are public in this app, so a
// client-callable lookup would let anyone harvest real email addresses.

import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { identifier, password } = await req.json();
    if (typeof identifier !== 'string' || typeof password !== 'string' || !identifier || !password) {
      return json({ error: 'identifier and password are required' }, 400);
    }

    const url = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    let email = identifier.trim();
    if (!email.includes('@')) {
      const admin = createClient(url, serviceKey);
      const { data } = await admin.rpc('get_email_for_username', { lookup_username: email.toLowerCase() });
      // No match falls through with the raw identifier, so signInWithPassword
      // below fails the same generic way a wrong password would -- never
      // reveal whether a username exists.
      if (typeof data === 'string' && data) email = data;
    }

    const anon = createClient(url, anonKey);
    const { data: signInData, error: signInError } = await anon.auth.signInWithPassword({ email, password });
    if (signInError || !signInData.session) {
      return json({ error: 'Invalid login credentials' }, 400);
    }

    return json({ session: signInData.session });
  } catch {
    return json({ error: 'Unexpected error' }, 500);
  }
});
