# Cupp ☕

Specialty-coffee logging app with an AI bag-scan: photograph a coffee bag, the vision model prefills the bean details, you add your brew and score. LaunchPad Challenge entry, submission 31 Jul 2026.

**New teammate? Read [`handover.md`](./handover.md) first** — it has every decision, the AI pipeline design, and what's in/out of scope. This file is just "get it running."

## Get running in 15 minutes

**Prerequisites**

- **Node 22 LTS** (not 23/25 — Expo targets LTS). With nvm: `nvm install 22 && nvm use` (reads `.nvmrc`).
- **Expo Go** app installed on your physical phone (App Store / Play Store).
- Phone and laptop on the **same Wi-Fi**.

**Run it**

```bash
npm install
npx expo start
```

Scan the QR code with your phone (iPhone: Camera app; Android: inside Expo Go). The app loads live; code edits appear in seconds.

**QR connects but app never loads?** Your network blocks device-to-laptop traffic (common on uni/office Wi-Fi). Use tunnel mode:

```bash
npx expo start --tunnel
```

## Environment variables

```bash
cp .env.example .env          # app config (Supabase URL + anon key)
```

Get the real values from Bryan (private channel, never committed). **The AI/Agnes key is NOT needed to run the app** — it exists only in `scripts/.env` for the Python harness and, later, as a server-side secret.

## The Python harness (optional — AI pipeline testing)

```bash
cd scripts
cp .env.example .env          # fill in values from Bryan
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
python scan_spike.py <public-image-url>
```

## Repo map

| Path | What |
|---|---|
| `src/app/` | App screens (expo-router file-based routing) |
| `src/components/`, `src/hooks/` | Shared UI + hooks (template-provided) |
| `supabase/migrations/` | Database/storage SQL — source of truth |
| `scripts/` | Validated Python AI harness + test bag photos |
| `handover.md` | Full project context — read it |

## House rules

- `main` always boots. Verify `npx expo start` works before pushing.
- Never commit `.env` files (gitignore blocks them; don't fight it).
- Scope questions → group chat, not unilateral building. Cut list lives in `handover.md` §9.
