-- 0002_phase_b.sql
-- Phase B schema: profiles, logs (bean + brew + rating), and the social layer
-- (follows, likes, comments) plus brew templates.
--
-- HOW TO APPLY: Dashboard -> SQL Editor -> paste this whole file -> Run.
-- Never run automatically from the app; migrations are applied by humans.
-- This file is written to be re-runnable: tables use "if not exists" and every
-- policy is dropped before being recreated.
--
-- Social was un-cut on 17 Jul (see design/wireframes-v2.html decision log):
-- logs are PUBLIC by default with a per-log private toggle, follows are one-way,
-- likes and comments both ship.

-- ---------------------------------------------------------------------------
-- profiles — one row per auth user; the public handle social hangs off.
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id           uuid primary key references auth.users on delete cascade,
  username     text unique not null check (username ~ '^[a-z0-9_.]{3,24}$'),
  display_name text,
  bio          text,
  avatar_path  text,
  created_at   timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Everyone signed in can read every profile (usernames are public handles).
drop policy if exists "profiles are readable by authenticated" on public.profiles;
create policy "profiles are readable by authenticated"
  on public.profiles for select to authenticated
  using (true);

-- You may only edit your own row.
drop policy if exists "users update own profile" on public.profiles;
create policy "users update own profile"
  on public.profiles for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- Insert is normally handled by the trigger below (which runs as definer), but
-- allow an authenticated user to insert their own row as a fallback.
drop policy if exists "users insert own profile" on public.profiles;
create policy "users insert own profile"
  on public.profiles for insert to authenticated
  with check (id = (select auth.uid()));

-- Auto-create a profile whenever an auth user is created. The username comes
-- from the sign-up metadata (the app passes it in options.data.username); if it
-- is missing or already taken we fall back to a generated handle so sign-up can
-- never hard-fail on the trigger.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  desired text;
begin
  desired := lower(coalesce(new.raw_user_meta_data ->> 'username', ''));

  if desired !~ '^[a-z0-9_.]{3,24}$' or exists (select 1 from public.profiles p where p.username = desired) then
    desired := 'user_' || substr(replace(new.id::text, '-', ''), 1, 12);
  end if;

  insert into public.profiles (id, username, display_name)
  values (
    new.id,
    desired,
    nullif(new.raw_user_meta_data ->> 'display_name', '')
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- logs — one row per logged coffee. Bean half may be scan-filled; brew, rating
-- and notes are always human-entered.
-- ---------------------------------------------------------------------------
create table if not exists public.logs (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles on delete cascade,
  visibility text not null default 'public' check (visibility in ('public', 'private')),

  -- the 12 bean fields (the bag is the bean's identity card)
  roaster               text,
  coffee_name           text,
  origin_country        text,
  origin_region         text,
  process               text,
  variety               text,
  roast_level           text,
  altitude              text,
  roast_date            text,
  roaster_tasting_notes text[],   -- the ROASTER's printed notes; never merged with notes
  weight                text,
  decaf                 boolean,

  -- grounding metadata per bean field: { "<field>": {"source_text": ..., "basis": ...} }
  -- Preserved so the form/detail can show "read from label" vs "inferred".
  bean_basis jsonb,

  photo_path text,

  -- brew (human-entered)
  method       text,
  dose_g       numeric,
  yield_g      numeric,
  grind        text,
  water_temp_c numeric,
  brew_time_s  int,

  -- rating: four cupping characteristics + overall, 1-5, no decimals
  strength   smallint check (strength between 1 and 5),
  acidity    smallint check (acidity between 1 and 5),
  sweetness  smallint check (sweetness between 1 and 5),
  bitterness smallint check (bitterness between 1 and 5),
  overall    smallint check (overall between 1 and 5),

  notes      text,       -- the USER's own tasting notes
  created_at timestamptz not null default now()
);

alter table public.logs enable row level security;

-- Public logs are visible to every signed-in user; private logs only to their owner.
drop policy if exists "logs select public or own" on public.logs;
create policy "logs select public or own"
  on public.logs for select to authenticated
  using (visibility = 'public' or user_id = (select auth.uid()));

drop policy if exists "logs insert own" on public.logs;
create policy "logs insert own"
  on public.logs for insert to authenticated
  with check (user_id = (select auth.uid()));

drop policy if exists "logs update own" on public.logs;
create policy "logs update own"
  on public.logs for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop policy if exists "logs delete own" on public.logs;
create policy "logs delete own"
  on public.logs for delete to authenticated
  using (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- follows — one-way, IG style. No request/accept flow.
-- ---------------------------------------------------------------------------
create table if not exists public.follows (
  follower_id uuid not null references public.profiles on delete cascade,
  followee_id uuid not null references public.profiles on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (follower_id, followee_id),
  check (follower_id <> followee_id)
);

alter table public.follows enable row level security;

drop policy if exists "follows readable by authenticated" on public.follows;
create policy "follows readable by authenticated"
  on public.follows for select to authenticated
  using (true);

drop policy if exists "users follow as themselves" on public.follows;
create policy "users follow as themselves"
  on public.follows for insert to authenticated
  with check (follower_id = (select auth.uid()));

drop policy if exists "users unfollow own follows" on public.follows;
create policy "users unfollow own follows"
  on public.follows for delete to authenticated
  using (follower_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- likes
-- ---------------------------------------------------------------------------
create table if not exists public.likes (
  user_id    uuid not null references public.profiles on delete cascade,
  log_id     uuid not null references public.logs on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, log_id)
);

alter table public.likes enable row level security;

-- Readable by all authenticated users so like COUNTS work on any visible log.
drop policy if exists "likes readable by authenticated" on public.likes;
create policy "likes readable by authenticated"
  on public.likes for select to authenticated
  using (true);

drop policy if exists "users like as themselves" on public.likes;
create policy "users like as themselves"
  on public.likes for insert to authenticated
  with check (user_id = (select auth.uid()));

drop policy if exists "users remove own likes" on public.likes;
create policy "users remove own likes"
  on public.likes for delete to authenticated
  using (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- comments — flat thread, no nesting.
-- ---------------------------------------------------------------------------
create table if not exists public.comments (
  id         uuid primary key default gen_random_uuid(),
  log_id     uuid not null references public.logs on delete cascade,
  user_id    uuid not null references public.profiles on delete cascade,
  body       text not null check (length(body) <= 500),
  created_at timestamptz not null default now()
);

alter table public.comments enable row level security;

-- A comment is visible only if the log it hangs off is visible to the caller.
drop policy if exists "comments select when log visible" on public.comments;
create policy "comments select when log visible"
  on public.comments for select to authenticated
  using (
    exists (
      select 1 from public.logs l
      where l.id = comments.log_id
        and (l.visibility = 'public' or l.user_id = (select auth.uid()))
    )
  );

-- You may comment as yourself, and only on a log you can actually see.
drop policy if exists "users comment as themselves" on public.comments;
create policy "users comment as themselves"
  on public.comments for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.logs l
      where l.id = comments.log_id
        and (l.visibility = 'public' or l.user_id = (select auth.uid()))
    )
  );

drop policy if exists "users delete own comments" on public.comments;
create policy "users delete own comments"
  on public.comments for delete to authenticated
  using (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- brew_templates — saved recipes that prefill the brew section of the form.
-- (The full custom form-field builder stays cut; this is name + method + numbers.)
-- ---------------------------------------------------------------------------
create table if not exists public.brew_templates (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.profiles on delete cascade,
  name         text not null,
  method       text not null,
  dose_g       numeric,
  yield_g      numeric,
  grind        text,
  water_temp_c numeric,
  brew_time_s  int,
  created_at   timestamptz not null default now()
);

alter table public.brew_templates enable row level security;

-- Templates are private working tools: every operation is own-rows-only.
drop policy if exists "templates select own" on public.brew_templates;
create policy "templates select own"
  on public.brew_templates for select to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists "templates insert own" on public.brew_templates;
create policy "templates insert own"
  on public.brew_templates for insert to authenticated
  with check (user_id = (select auth.uid()));

drop policy if exists "templates update own" on public.brew_templates;
create policy "templates update own"
  on public.brew_templates for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop policy if exists "templates delete own" on public.brew_templates;
create policy "templates delete own"
  on public.brew_templates for delete to authenticated
  using (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- Storage — extends the 0001 sketch, now that auth exists.
--
-- TRADEOFF (deliberate, noted per directive): uploads stay scoped to the
-- uploader's own {uid}/ folder, but SELECT is opened to ALL authenticated users
-- rather than just the owner. Public logs display other people's bag photos, so
-- cross-user reads are required for the feed to render. The bucket itself stays
-- private (public=false), so anonymous/internet users still cannot browse it —
-- reads go through signed URLs minted for signed-in users only. The narrower
-- "users read own scans" policy from 0001 would break the social feed.
-- ---------------------------------------------------------------------------
drop policy if exists "users upload own scans" on storage.objects;
create policy "users upload own scans"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'bag-scans'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "users update own scans" on storage.objects;
create policy "users update own scans"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'bag-scans'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "users delete own scans" on storage.objects;
create policy "users delete own scans"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'bag-scans'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

-- Superseded by the cross-user read policy below; drop the 0001 sketch name too.
drop policy if exists "users read own scans" on storage.objects;

drop policy if exists "authenticated read bag scans" on storage.objects;
create policy "authenticated read bag scans"
  on storage.objects for select to authenticated
  using (bucket_id = 'bag-scans');

-- ---------------------------------------------------------------------------
-- Indexes — the feed, profile grid, and social lookups.
-- ---------------------------------------------------------------------------
create index if not exists logs_visibility_created_at_idx on public.logs (visibility, created_at desc);
create index if not exists logs_user_id_created_at_idx    on public.logs (user_id, created_at desc);
create index if not exists follows_follower_id_idx        on public.follows (follower_id);
create index if not exists likes_log_id_idx               on public.likes (log_id);
create index if not exists comments_log_id_created_at_idx on public.comments (log_id, created_at);
