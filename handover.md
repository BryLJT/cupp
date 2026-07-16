# Cupp — Team Handover Document

> **Audience:** Bryan's two teammates and their AI coding agents, joining 21 Jul 2026.
> **Purpose:** everything you need to contribute from your first hour — product context, every decision already made, the validated AI pipeline, what to build, and what NOT to build.
> **Maintained by:** Bryan + Alfred (Bryan's agent). Last updated: 2026-07-16 (end of Phase A Block 1).

---

## 1. What Cupp is

Cupp is a specialty-coffee logging app: users log the coffees they drink (bean, brew method, tasting scores, notes, photo) and can later compare the same bean across brew methods. Think "Vivino for coffee" long-term; for this hackathon it is a personal coffee journal with one standout AI feature.

**The AI centrepiece — bag scan:** snap a photo of a coffee bag → a vision model reads the label → the log form arrives prefilled with the bean's identity (roaster, origin, process, variety, etc.) → the user reviews it, fills in their own brew details and score by hand, and saves. Manual entry remains as the fallback.

Key design idea: **the bag is the bean's identity card.** The scan fills ONLY the bean half of a log. Brew method, dose, grind, water temp, score, and the user's own tasting notes are always human-entered.

## 2. The competition (why deadlines are hard)

- **Event:** The LaunchPad Challenge (Acacia AI Society), 4-week open sprint.
- **Submission deadline: 31 Jul 2026.** Winners 7 Aug; top 20 present at the NUS AI Symposium 18 Aug.
- **Judging: problem comprehension + working functionality over polish.** A thin app whose scan flow works end-to-end on a real phone beats a wide app of half-features. Every scope decision below follows from this.
- Team: Bryan + 2 teammates (you). Participants keep full ownership of what they build.

## 3. Timeline and phases

| Phase | Dates | What | Status |
|---|---|---|---|
| A | 16–20 Jul | De-risk the AI pipeline + scaffold this repo (Bryan + Alfred) | In progress |
| B | 21–25 Jul | Build the app around the scan — **you join here** | Target: full happy path on a phone by 25 Jul |
| C | 26–29 Jul | Demo hardening: honesty case, seed data, comparison view | |
| D | 29–31 Jul | Submission write-up + demo video (Bryan directs framing) | |

Phase A blocks: (1) this scaffold + rescue of the validated spike ✅; (2) hosted Supabase project + private storage bucket; (3) upload → signed URL → Agnes harness run on Bryan's real phone photos; (4) latency/resize experiment. Sections below marked **[updated after Block N]** get filled in as those land.

## 4. What has already been PROVEN (don't re-validate)

A Python spike on 14 Jul validated the vision model on two real coffee bags:

- **Sey Huila Decaf (legible label):** correctly extracted roaster SEY, coffee Huila, Colombia/Huila origin, process Washed (from the printed "FIELD BLEND - WASHED"), decaf true (from "DECAFFEINATED"); correctly nulled variety/altitude/notes/weight that weren't printed. The cited `source_text` for each field was real text from the bag.
- **Onyx Worka (honesty stress test — olive bag showing ONLY a skull logo):** returned roaster "Onyx" and marked everything else `not_visible`/null. It did NOT hallucinate the coffee's true Ethiopia/washed/heirloom identity that it had no way to see. This is the grounding guardrail working, and it's demo gold.
- JSON mode (`response_format: json_object`) is honored; valid JSON both runs.
- **Known weakness: latency.** 13.5s on a 43KB image, 21.8s on a 2.1MB image. Phase A Block 4 measures whether client-side downsizing fixes this. **[updated after Block 4: resize spec goes here]**

The spike script is preserved verbatim at `scripts/scan_spike.py`. Treat it as the validated reference for the prompt, contract, and guardrails — read it, import from it, don't rewrite it.

## 5. Architecture

```
┌──────────┐   1. photo    ┌──────────────────┐
│  Phone    │ ────────────▶ │ Supabase Storage │  private bucket "bag-scans"
│ (Expo app)│               └────────┬─────────┘
└────┬─────┘                         │ 2. signed URL (temporary link, ~10 min)
     │                               ▼
     │                    ┌─────────────────────┐   3. fetches image via URL
     │                    │ Agnes vision model   │ ◀── (OpenAI-compatible API)
     │                    └────────┬────────────┘
     │ 5. prefilled form           │ 4. JSON: {is_coffee_bag, fields{...}}
     ▼                             ▼
  user reviews ◀──────────── app parses JSON
```

**Why this shape (the constraint that decided everything):** Agnes accepts images **only as a publicly fetchable URL** — no base64, no direct upload. So the photo must first land somewhere on the public internet. That's why:

1. **Supabase is HOSTED (free tier), not local Docker.** A localhost Storage URL is unreachable from Agnes's servers. (This supersedes an older local-Docker plan from April. Don't "simplify" back to local.)
2. **The bucket is private + we mint signed URLs** — temporary links (10 min TTL) that let exactly one image be read briefly. Users' photos are never publicly browsable.
3. **In Phase B the Agnes call moves into a Supabase Edge Function** (server-side), so the API key never ships inside the app bundle. The Python harness in `scripts/` is the reference implementation of that Edge Function's logic.

**Stack:** Expo (React Native, TypeScript, expo-router) + Supabase (Postgres, Auth, Storage, Edge Functions). One `@supabase/supabase-js` client in the app.

## 6. The extraction contract (the API between AI and app)

The model returns:

```json
{
  "is_coffee_bag": true,
  "fields": {
    "roaster":        {"value": "SEY", "source_text": "SEY", "basis": "read"},
    "coffee_name":    {"value": "Huila", "source_text": "HUILA", "basis": "read"},
    "origin_country": {"value": "Colombia", "source_text": "COLOMBIA", "basis": "read"},
    "variety":        {"value": null, "source_text": null, "basis": "not_visible"},
    "...": "..."
  }
}
```

**The 12 fields:** `roaster, coffee_name, origin_country, origin_region, process, variety, roast_level, altitude, roast_date, roaster_tasting_notes (array), weight, decaf (bool)`.

**The grounding guardrail (default strategy):** every field carries `{value, source_text, basis}` where `basis ∈ read | inferred | not_visible`. The model must cite the exact label text it read a value from, or null the field. We deliberately do NOT use self-reported confidence scores (LLM confidence numbers are uncalibrated theatre); citation-or-null is checkable. Two alternative strategies (`confidence`, `double-check`) exist in the spike for comparison, but grounding is the shipping default.

**UI implication for Phase B:** the prefill form can show a small "read from label" vs "inferred" indicator per field, and `not_visible` fields simply stay empty for the user to fill. `roaster_tasting_notes` (what the roaster printed) is a separate field from the user's own tasting notes — never merge them.

**Failure path (MVP):** if `is_coffee_bag` is false or extraction fails, show what we got and fall back to the blank manual form gracefully. No retake-coaching flow in hackathon scope.

## 7. AI provider details

- **Primary: Agnes** — `agnes-2.0-flash` via OpenAI-compatible API at `https://apihub.agnes-ai.com/v1/chat/completions`. Currently free (promo). **Rate limit ~20 requests/min** — batch scripts must throttle; the spike already handles 429s.
- **Fallback: OpenAI** (~US$50 budget) — same API shape. Switching = change three env vars (`AI_BASE_URL`, `AI_MODEL`, `AI_API_KEY`). Nothing else in the code should know which provider it's talking to.
- Call parameters that matter: `temperature: 0`, `response_format: {"type": "json_object"}` (with a retry-without-it fallback if a gateway 400s on it), `max_tokens: 1500`.

## 8. Phase B scope — what we build together (21–25 Jul)

Target: **one complete happy path on a physical phone by 25 Jul.**

1. **Manual log form** — bean fields (the 12 above) + brew fields (method, dose, yield/ratio, grind, water temp, time) + overall score + personal notes + photo.
2. **Journal feed** — list of the user's logs, newest first; tap to view detail. Basic filter is a bonus.
3. **Minimal auth** — Supabase email/password only. No Google/Apple sign-in (cut).
4. **Scan flow** — in-app camera/photo picker → downsize image client-side **[spec from Block 4]** → upload to `bag-scans` → Edge Function calls Agnes → prefilled form (this is the same pipeline the Python harness proves; port its logic, don't reinvent it). A visible, honest loading state matters: the call takes seconds, design for that.
5. **Edge Function** — holds the AI key as a Supabase secret; input: storage path; output: the contract JSON. Reference logic: `scripts/upload_and_scan.py` **[lands in Block 3]**.
6. **Data model** — tables for logs (bean fields + brew fields + score + notes + photo path). Keep it one flat `logs` table if that's fastest; normalization (beans/roasters tables) only if time allows.

## 9. Cut list — do NOT build these (agreed 16 Jul)

Offline sync · custom template builder · shared/community bean database · all social features (follows, likes, comments, feeds) · Google/Apple sign-in · price field · café discovery · roaster profiles · notifications · export.

If a task seems to need one of these, raise it in the group chat instead of building it. Post-hackathon roadmap exists; these are deferred, not rejected.

## 10. Repo map

```
cupp/
├─ handover.md            ← you are here
├─ README.md              ← 15-minute setup: clone → app on your phone
├─ .nvmrc                 ← Node 22 LTS (use it — see Gotchas)
├─ .env.example           ← app env template (Supabase URL + anon key)
├─ src/                   ← the Expo app (expo-router: src/app/ = screens)
├─ app.json               ← Expo config
├─ supabase/
│  ├─ migrations/         ← SQL source of truth (apply via dashboard SQL editor)
│  └─ README.md
├─ scripts/               ← Python reference harness (validated AI pipeline)
│  ├─ scan_spike.py       ← VALIDATED spike — reference, do not modify
│  ├─ upload_and_scan.py  ← upload → signed URL → Agnes batch harness [Block 3]
│  ├─ .env.example        ← harness secrets template (service_role + AI key)
│  └─ fixtures/           ← test bag photos (onyx_worka.png = honesty test,
│                            sey_huila.jpg = legible label; phone/ = gitignored)
└─ out/                   ← gitignored harness results (per-photo JSON + summary)
```

## 11. Environment variables — what goes where

| Variable | Lives in | Secret? | Notes |
|---|---|---|---|
| `EXPO_PUBLIC_SUPABASE_URL` | `.env` (app) | No | Ships in app bundle by design |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | `.env` (app) | No | Safe: RLS limits what it can do |
| `SUPABASE_URL` | `scripts/.env` | — | Same URL, harness copy |
| `SUPABASE_SERVICE_ROLE_KEY` | `scripts/.env` ONLY | **YES — master key** | Bypasses all security. Never in the app, never in git, never in an `EXPO_PUBLIC_*` var |
| `AI_BASE_URL` / `AI_MODEL` / `AI_API_KEY` | `scripts/.env`; later an Edge Function secret | **YES** (key) | Never in the app bundle |

Real values are shared person-to-person (Bryan pastes them into the group's private channel), never committed. `.gitignore` already blocks all `.env` files; `.env.example` files document the shape.

## 12. Known gotchas (each of these has already burned time — read once, save hours)

1. **Node version:** Expo targets Node LTS. `.nvmrc` says 22. Node 25 may work but is unsupported; if Metro throws engine errors, switch to 22 rather than debugging.
2. **Expo Go needs phone + laptop on the same Wi-Fi.** If the QR connects but the app never loads (uni Wi-Fi client isolation, VPNs): `npx expo start --tunnel`.
3. **iPhone photos are HEIC**, not JPEG. Agnes can't read HEIC. Any upload path must convert first (harness uses macOS `sips`; the app will capture/export JPEG).
4. **Supabase signed-URL response is a RELATIVE path** (`{"signedURL": "/object/sign/..."}`) — prefix it with `{SUPABASE_URL}/storage/v1` or Agnes gets an unfetchable URL and the error looks like an Agnes bug. Cheap insurance: GET the final URL and require 200 before spending a model call.
5. **Agnes free tier ≈ 20 requests/min.** Throttle batch runs (3–4s sleep between calls); handle 429 with backoff.
6. **Supabase free projects pause after ~1 week idle.** If everything 500s one morning, un-pause the project in the dashboard first.
7. **service_role key discipline:** before any commit that touches env handling, `git status` and confirm no `.env` staged.

## 13. Working agreements

- **`main` stays bootable.** `npm install && npx expo start` must always produce a running app from `main`. Feature work on branches if it risks breaking that.
- **Commits:** small, present-tense, plain descriptions ("add brew fields to log form"). No force-pushing `main`.
- **Decisions that change architecture or scope** (new dependency, schema change, anything touching the cut list) get raised in the group chat before building — Bryan coordinates, and this doc + the cut list get updated so all three agents stay consistent.
- **Agents:** point your AI agent at this file first, then `README.md`, then `scripts/scan_spike.py` before it writes any scan-related code.
- Ownership within Phase B is split when the team syncs on 21 Jul (log form / feed+auth / scan-flow integration are the natural three lanes).

## 14. Current status ledger

- ✅ 2026-07-14 — Agnes validated on real bags (grounding held, JSON honored)
- ✅ 2026-07-16 — Repo scaffolded (Expo SDK 57, TypeScript, expo-router), spike rescued into `scripts/`, this document written
- ⬜ Block 2 — hosted Supabase project + private `bag-scans` bucket **[updated after Block 2: project ref goes here]**
- ⬜ Block 3 — `upload_and_scan.py` + Bryan's real phone photos through the full pipeline **[results summary goes here]**
- ⬜ Block 4 — latency/resize matrix **[client resize spec goes here]**
- ⬜ 21 Jul — team kickoff: environment setup all three machines, lane split
