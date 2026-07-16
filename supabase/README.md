# Supabase configuration

We use a **hosted** Supabase project (free tier) — no local Docker stack, no Supabase CLI required. Reason: the Agnes vision model can only fetch images from public URLs, so Storage must be internet-reachable (see `handover.md` §5).

`migrations/` holds the SQL source of truth. To recreate or update the project: paste each migration file, in order, into **Dashboard → SQL Editor** and run it.

Migrations land here starting Phase A Block 2 (`0001_init_storage.sql`: private `bag-scans` bucket).
