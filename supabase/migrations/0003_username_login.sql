-- 0003_username_login.sql
-- Resolves a username to its auth email, for the "log in with username"
-- Edge Function. Runs as SECURITY DEFINER (owner has auth.users access) but
-- is intentionally NOT granted to anon/authenticated: usernames are public
-- handles in this app (/user/[username]), so letting the client call this
-- directly would let anyone harvest real email addresses by username. Only
-- the login-with-username Edge Function (via service_role) may call it.

create or replace function public.get_email_for_username(lookup_username text)
returns text
language sql
security definer
set search_path = public, auth
as $$
  select u.email::text
  from auth.users u
  join public.profiles p on p.id = u.id
  where p.username = lower(lookup_username)
  limit 1;
$$;

revoke all on function public.get_email_for_username(text) from public;
grant execute on function public.get_email_for_username(text) to service_role;
