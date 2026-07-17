-- 0001_init_storage.sql
-- Private storage bucket for bag-scan photos.
-- NOTE: this bucket was created via the Dashboard on 2026-07-17; this file is the
-- committed record so the setup is reproducible (Dashboard -> SQL Editor -> run).
-- on conflict do nothing makes it safe to run against the existing project.

insert into storage.buckets (id, name, public)
values ('bag-scans', 'bag-scans', false)
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- Phase B placeholder (uncomment + adapt when auth lands):
-- app users upload their own scans with the publishable key; RLS scopes them
-- to their own folder. The Python harness uses the secret key, which bypasses
-- RLS entirely, so Phase A needs no policies at all.
-- ---------------------------------------------------------------------------
-- create policy "users upload own scans"
--   on storage.objects for insert to authenticated
--   with check (bucket_id = 'bag-scans' and (storage.foldername(name))[1] = auth.uid()::text);
--
-- create policy "users read own scans"
--   on storage.objects for select to authenticated
--   using (bucket_id = 'bag-scans' and (storage.foldername(name))[1] = auth.uid()::text);
