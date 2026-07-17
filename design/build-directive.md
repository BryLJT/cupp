# Cupp Phase B — Build Directive

> **Chain of command:** Chief architect (Fable, this document) → Opus build lead (orchestrates, integrates, verifies) → Sonnet builders (one work package each).
> **Source of truth for product decisions:** `design/wireframes-v2.html` decision log (17 Jul, Bryan signed off) + `handover.md`. If this directive and those conflict, stop and report — do not guess.
> Date: 17 Jul 2026. Target: bootable, demoable app shell with all screens by 25 Jul.

## 0. Non-negotiables (violating any of these fails the build)

1. **Expo SDK 54 pinned.** Never run `expo upgrade`. Add Expo packages only via `npx expo install <pkg>` (it picks SDK-54-compatible versions). Read https://docs.expo.dev/versions/v54.0.0/ before using an unfamiliar Expo API (per `AGENTS.md`).
2. **`main` is untouchable.** All work on branch `feat/phase-b-app`. Push that branch to origin; never push `main`.
3. **Secrets discipline.** Never create or commit any `.env`. Never reference the service_role key or any AI key in app code. The Agnes call happens server-side (Edge Function, Block 3 — stubbed for now).
4. **Git via bash, not PowerShell.** PowerShell git intermittently hangs on this machine (OneDrive locks). Use the Bash tool for all git operations.
5. **Every commit leaves the branch verifiable:** `npx tsc --noEmit` clean and `npx expo export --platform ios` succeeds (that's the boot-equivalent check without a device). Run `npm install` once at the start — node_modules may be absent.
6. **Small commits, present-tense messages**, per handover §13. End commit messages with the Co-Authored-By line for your model.

## 1. What exists (build on it, don't rewrite it)

- `app/` — untouched Expo SDK 54 template (tabs demo). Replace its screens; keep expo-router file-based routing.
- `lib/supabase.ts` — Bryan's client stub; throws if `EXPO_PUBLIC_SUPABASE_URL/ANON_KEY` missing. **There is no `.env` on this machine** — see Demo Mode (§4).
- `supabase/migrations/0001_init_storage.sql` — private `bag-scans` bucket + commented per-user RLS sketch. New schema goes in `0002_phase_b.sql`; migrations are applied by humans via the dashboard SQL editor — never attempt to run them.
- `scripts/scan_spike.py` — the validated extraction contract reference. Do not modify.
- Deps already present: supabase-js, reanimated 4, gesture-handler, expo-image, expo-haptics, @expo/vector-icons.

## 2. Product decisions (locked 17 Jul — do not relitigate)

- Social is IN: one-way follows, likes AND comments at launch, logs **public by default** with per-log Private toggle.
- Home feed tabs: **For You | Following | Mine** (For You = all public logs, default).
- Search tab = discovery: text search + stacking filter rows **origin / roaster / brew method**; filter values derived from data, custom methods included.
- Rating: Strength, Acidity, Sweetness, Bitterness on 1–5 dots + **Overall 1–5 stars** (stars shown on cards). No decimals.
- Brew templates: saved recipes (name + method + dose/yield/grind/temp/time) that prefill the brew section, plus custom method names. **No custom form-field builder** (§9 still cuts that).
- Five-slot tab bar: Feed · Search · **Camera (raised, center)** · Create · Profile. Camera opens the scan flow; Create opens the same log form, blank.
- Scan fills ONLY the 12 bean fields with `{value, source_text, basis}`; brew/rating/notes always human-entered. `roaster_tasting_notes` (roaster's printed notes) never merges with the user's notes.
- Sign in: email/password only. Sign-up also collects a unique **username**.
- Sign out lives on the Profile screen (gear → account sheet or button at bottom).

## 3. Visual system (from wireframes v2.1 — light theme only for MVP)

`constants/theme.ts` exports these tokens; **no hardcoded colors anywhere else**:

```ts
export const colors = {
  ground:  '#EFE7DA', // app background
  surface: '#FBF8F2', // cards, sheets, inputs
  ink:     '#2E2119', // primary text
  taupe:   '#6E6052', // secondary text
  accent:  '#8A5A33', // primary buttons, scan shutter, read-chips, rating marks
  onAccent:'#FBF8F2',
  line:    '#D8CCBB', // borders, dividers
  camera:  '#3A3129', // viewfinder backdrop
};
export const radii = { chip: 999, control: 8, card: 10, sheet: 16 };
export const space = (n: number) => n * 4; // 4pt grid
```

Type: **Fraunces** (wordmark, bean names, big numbers) + **Inter** (everything else) via `npx expo install @expo-google-fonts/fraunces @expo-google-fonts/inter expo-font`. Load in root layout with splash held until ready; system-font fallback must not crash.

Interaction rules (translated from the team's design references — web CSS does not exist here):
- Every pressable: scale to 0.97 on press-in (Reanimated or `Pressable` style fn), 100–160 ms, ease-out. Feedback on press-down, not release.
- Enter animations ≤ 300 ms, ease-out, never from scale 0. No animation on high-frequency actions (tab switches).
- Icon-only buttons get `accessibilityLabel`; inputs get visible labels (never placeholder-only); interactive elements get `accessibilityRole`.
- Loading: never a bare spinner for the scan wait — staged progress (§6).
- One accent per screen: the single primary action is caramel; everything else neutral.

## 4. Data layer & Demo Mode

`lib/data/` with a repository interface so screens never import supabase directly:

- `types.ts` — `Log`, `Profile`, `BrewTemplate`, `Comment`, `BeanFields` (12 fields, each `{ value, sourceText, basis: 'read'|'inferred'|'not_visible' }`), `Ratings` (4 characteristics + overall, 1–5).
- `repo.ts` — interface: auth (signIn/signUp/signOut/session), logs (create, byUser, forYou, following, byId), social (follow/unfollow, like/unlike, comment, counts), templates (list/create/delete), discovery (search + filters), storage (upload photo → path, resolve path → displayable URL).
- `supabaseRepo.ts` — real implementation against the schema in §5.
- `demoRepo.ts` — in-memory fixtures (SEY Huila, Onyx Worka + ~6 more plausible specialty logs across 3 fake users) so the app fully works with **no network and no keys**.
- `index.ts` — exports the active repo: demo when env vars are absent or `EXPO_PUBLIC_DEMO=1`, supabase otherwise. Modify `lib/supabase.ts` minimally so a missing env no longer crashes the import (return null client; repo selection handles it). This is also the demo insurance if conference Wi-Fi dies on the 31st.

## 5. Schema — `supabase/migrations/0002_phase_b.sql`

Tables (all with RLS enabled):

- `profiles` — `id uuid pk references auth.users on delete cascade`, `username text unique not null check (username ~ '^[a-z0-9_.]{3,24}$')`, `display_name text`, `bio text`, `avatar_path text`, `created_at timestamptz default now()`. Trigger to auto-insert on auth.users insert. Select: everyone (authenticated). Update: own row.
- `logs` — `id uuid pk default gen_random_uuid()`, `user_id uuid not null references profiles`, `visibility text not null default 'public' check (visibility in ('public','private'))`, the 12 bean columns (`roaster, coffee_name, origin_country, origin_region, process, variety, roast_level, altitude, roast_date` text; `roaster_tasting_notes text[]`; `weight text`; `decaf boolean`), `bean_basis jsonb` (per-field `{source_text, basis}` — preserve the grounding metadata), `photo_path text`, brew columns (`method text, dose_g numeric, yield_g numeric, grind text, water_temp_c numeric, brew_time_s int`), rating columns (`strength, acidity, sweetness, bitterness, overall` smallint each `check between 1 and 5`), `notes text`, `created_at timestamptz default now()`. Select: `visibility='public' or user_id=auth.uid()`. Insert/update/delete: own.
- `follows` — `(follower_id, followee_id)` pk, both fk profiles, `check (follower_id <> followee_id)`, `created_at`. Select: authenticated. Insert/delete: `follower_id = auth.uid()`.
- `likes` — `(user_id, log_id)` pk, `created_at`. Select: authenticated (counts). Insert/delete: own. 
- `comments` — `id uuid pk`, `log_id fk`, `user_id fk`, `body text not null check (length(body) <= 500)`, `created_at`. Flat thread, no nesting. Select: where the underlying log is visible to the caller. Insert: own; delete: own.
- `brew_templates` — `id uuid pk`, `user_id fk`, `name text not null`, `method text not null`, `dose_g numeric, yield_g numeric, grind text, water_temp_c numeric, brew_time_s int`, `created_at`. All ops: own rows only.
- Storage: extend 0001's sketch — uncommented policies for per-user upload (`{uid}/...` folder), plus `select` for all authenticated users on `bag-scans` (public logs need cross-user photo display; bucket stays closed to anon). Note this tradeoff in a SQL comment.
- Indexes: `logs (visibility, created_at desc)`, `logs (user_id, created_at desc)`, `follows (follower_id)`, `likes (log_id)`, `comments (log_id, created_at)`.

## 6. Scan pipeline — `lib/scan.ts`

Interface: `scanBag(localImageUri, onStage): Promise<ScanResult>` with stages `'uploading' | 'reading' | 'building'`; `ScanResult = { isCoffeeBag: boolean, fields: BeanFields }`.

- **Preprocess (both impls):** `npx expo install expo-image-manipulator` — resize longest edge to 1280 px, JPEG quality 0.7. This handles iPhone HEIC (gotcha §12.4) and is the provisional Block 4 latency fix; mark with `// TODO Block 4: final resize spec`.
- **Mock impl (default):** staged delays (~1 s / 4 s / 1 s), returns the validated SEY Huila extraction (roaster SEY/read, coffee Huila/read, origin Colombia + Huila/read, process Washed/read from "FIELD BLEND - WASHED", decaf true/read from "DECAFFEINATED", everything else not_visible/null). Include an Onyx honesty fixture (roaster Onyx only, all else not_visible) selectable in demo mode.
- **Real impl (behind `EXPO_PUBLIC_SCAN_LIVE=1`):** upload JPEG to `bag-scans/{uid}/{uuid}.jpg` → `supabase.functions.invoke('scan-bag', { body: { path } })` → expect the contract JSON. The Edge Function itself is **Block 3 scope — do NOT build it**; define only this client call.
- Failure path: `isCoffeeBag=false` or any error → route to the blank manual form with a plain-language notice (handover §6 failure path). Cancel during scan → manual form.
- Camera: `npx expo install expo-image-picker` (camera + gallery). Full-screen modal route, corner-bracket overlay, "Fill the frame with the label" hint, "type it in manually" escape hatch.

## 7. Screen map (expo-router)

```
app/
  _layout.tsx            # fonts, auth gate: session ? (tabs) : (auth); demo mode = signed in as demo user
  (auth)/sign-in.tsx, sign-up.tsx
  (tabs)/_layout.tsx     # 5 tabs, raised center camera button opening /scan
  (tabs)/index.tsx       # Feed: For You | Following | Mine top chips
  (tabs)/search.tsx      # Discovery: search + origin/roaster/method chip rows + 2-col tile grid
  (tabs)/create.tsx      # redirects to /log/new (blank form)
  (tabs)/profile.tsx     # own profile: stats, log grid, sign out
  scan/index.tsx         # camera/picker  → scan/progress.tsx (staged) → /log/new?prefill=…
  log/new.tsx            # THE form: bean section (read✓ chips per basis) + templates row +
                         # method segmented (+Custom) + dose/yield + 4×dots + stars + notes +
                         # Public/Private toggle (default Public; button label follows choice)
  log/[id].tsx           # detail: post header, photo, kv grid, notes vs roaster-says, ♡ + comments
  user/[username].tsx    # other users: profile + follow/unfollow
```

## 8. Work packages (Sonnet builders — each self-contained)

| WP | Scope | Depends on |
|---|---|---|
| 1 | `constants/theme.ts`, fonts, shared primitives: `Chip`, `Stars` (display+input), `DotsRating` (display+input), `PressableScale`, `Card`, `Button`, `Screen`, `FieldRow` | — |
| 2 | Types + repo interface + `demoRepo` with fixtures + repo switch + non-throwing supabase client | — |
| 3 | Migration `0002_phase_b.sql` + `supabaseRepo.ts` | 2 |
| 4 | Auth screens + root layout gate | 1, 2 |
| 5 | Log form (`log/new.tsx`) incl. templates, ratings, visibility; prefill via route param | 1, 2 |
| 6 | Feed + log detail + likes/comments UI | 1, 2 |
| 7 | Discovery + user profile pages + follow | 1, 2 |
| 8 | Tab shell + own Profile + sign out | 1, 2, 4 |
| 9 | Scan flow: camera modal, staged progress, mock service, wiring into form prefill | 1, 2, 5 |

Suggested waves: (1, 2) → (3, 4, 5) → (6, 7, 8) → 9 → integration pass. Lead reviews every WP diff, runs the §0.5 checks, fixes integration seams itself, commits per WP.

## 9. Final report (lead → architect)

What shipped per WP; what's stubbed (Edge Function, Block 4 resize spec); verification evidence (tsc/export/lint output summary); any decision made that this directive didn't cover (list explicitly — the architect reviews these); branch name + commit list. Do not merge to main.
