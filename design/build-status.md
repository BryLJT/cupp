# Cupp Phase B — Build Status (branch `feat/phase-b-app`)

> Snapshot: 2026-07-18 ~04:00 (Etc/GMT-8). Author: Fable (architect) + Opus, continuing after the Opus build lead hit a session limit mid-way. This doc is the cold-start context for anyone (human or cloud agent) resuming the build.

## TL;DR

The demo-mode app is **built and verified**. All screens exist, `tsc` is clean, `expo lint` has 0 errors, and the app bundles through **both** `expo export --platform ios` and `--platform web`, plus a live Metro dev-server bundle (11 MB, includes our modules). It has NOT been run on a physical device/simulator (no device available in the build environment) — that's the main unverified surface.

## What's done (committed on `feat/phase-b-app`, pushed to origin @ 393e7c7)

- **Data layer** (`lib/data/`): `types.ts` (contract), `repo.ts` (interface), `demoRepo.ts` (in-memory fixtures — 8 logs, 4 users, follows, likes, comments, templates, live demo session), `index.ts` (demo/real switch on env presence). Screens speak only to `repo`, never supabase directly.
- **Schema** (`supabase/migrations/0002_phase_b.sql`): profiles, logs, follows, likes, comments, brew_templates + RLS + storage policies. **File only — apply via dashboard SQL editor; never run from code.**
- **Theme + primitives** (`constants/theme.ts`, `components/`): tokens (no hardcoded colors elsewhere), Fraunces+Inter, PressableScale (0.97 press feedback), AppText, Button, Chip, Stars, DotsRating, TextField, FieldRow, Segmented, Card, Avatar, Photo, EmptyState, LogCard, ProfileView, CuppTabBar.
- **Scan pipeline** (`lib/scan.ts`): staged mock (uploading→reading→building) returning the validated SEY Huila extraction; Onyx honesty fixture; `expo-image-manipulator` preprocess (HEIC fix / provisional Block-4 resize). Real path behind `EXPO_PUBLIC_SCAN_LIVE=1` throws until the Edge Function exists (Block 3).
- **Screens** (`app/`): root layout (fonts+splash+modal routes), (auth) sign-in/sign-up with username + session gate, (tabs) 5-slot bar with raised camera → Feed (For You/Following/Mine), Search discovery (origin/roaster/method filters), Profile + sign out; log/new (bean grounding chips, templates, 1–5 ratings, visibility toggle), log/[id] (detail + likes + comment thread), user/[username] (one-way follow), scan/ (camera launcher + staged progress → prefilled form).

## Verification evidence

- `npx tsc --noEmit` → exit 0
- `npx expo lint` → 0 errors (warnings cleaned)
- `npx expo export --platform ios` → 4.91 MB bundle, all routes
- `npx expo export --platform web` → all 11 routes prerendered
- Metro dev bundle (`expo-router/entry.bundle?platform=ios`) → 200, 11 MB valid Hermes bundle referencing our modules

## What's NOT done (remaining work, in priority order)

1. **Run on a real device** (Expo Go) — the one thing the build env couldn't do. `npx expo start`, scan QR. Watch: raised-camera tab-bar layout on a real notch, KeyboardAvoidingView on the form + comment bar, image-picker permission flow.
2. **WP3 `lib/data/supabaseRepo.ts`** — the real backend impl of the `Repo` interface against `0002_phase_b.sql`, plus wiring it in `lib/data/index.ts` (the switch is stubbed with a TODO). Needs a live Supabase project + `.env` (Bryan has keys). Demo mode does NOT need this.
3. **Edge Function `scan-bag`** (Block 3, Bryan's lane) — the real Agnes call. Client call is already stubbed in `lib/scan.ts`; do not build the function here without coordinating.
4. **Block 4 resize spec** — final image downsize matrix; provisional 1280px/0.7 JPEG is marked with a TODO in `lib/scan.ts`.
5. Open a PR `feat/phase-b-app` → `main` for team review. Do NOT merge to main unilaterally (handover §13).

## Guardrails for whoever continues (from the build directive, `design/build-directive.md`)

- Expo SDK 54 pinned — never `expo upgrade`; add packages only via `npx expo install`.
- No `.env` committed; no service_role/AI keys in app code.
- App must keep running with NO env vars (demo mode carries it).
- Theme tokens only; accessibilityLabel on icon-only buttons; press feedback on all pressables; no animation > 300 ms.
- Git via bash, not PowerShell (OneDrive locks make PowerShell git hang here).
