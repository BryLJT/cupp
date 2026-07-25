-- 0004_lock_down_email_lookup.sql
-- 0003's `revoke all ... from public` didn't actually block anon/authenticated:
-- Supabase's default project setup grants EXECUTE on every new public-schema
-- function directly to anon/authenticated at creation time (a separate grant
-- from PUBLIC membership). Revoke those explicitly -- confirmed via a live
-- anon-key REST call that this was still callable before this migration.

revoke execute on function public.get_email_for_username(text) from public, anon, authenticated;
grant execute on function public.get_email_for_username(text) to service_role;
