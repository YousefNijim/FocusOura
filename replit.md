# FocusOura - Workspace

## Overview

**FocusOura** is a gamified productivity web app for students that makes studying fun with virtual plants, AI coaching insights, focus sessions, a virtual wallet/coins system, a social friends system with competitive challenges, a study pet companion, ambient sounds, and analytics.

pnpm workspace monorepo using TypeScript.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **Frontend**: React + Vite (mobile-first web app, served at `/`)
- **Auth**: JWT-based (bcryptjs + jsonwebtoken), Email/password + Google OAuth (Firebase)
- **AI**: Google Gemini (`gemini-3-flash-preview`) via `@workspace/integrations-gemini-ai`
- **Build**: esbuild (ESM bundle for API), Vite (frontend)

## Workflow

```
PORT=8080 pnpm --filter @workspace/api-server run dev & PORT=22333 BASE_PATH=/ pnpm --filter @workspace/web run dev
```

## Structure

```text
artifacts/
├── api-server/     # Express API server (port 8080)
└── web/            # React + Vite frontend (port 22333)
lib/
├── db/             # Drizzle ORM schema + DB connection
└── integrations-gemini-ai/  # Gemini AI integration
```

## Database Tables

`users`, `subjects`, `plants`, `sessions`, `wallets`, `transactions`, `motivation_messages`, `ai_insights`, `friends`, `challenges`, `store_items`, `user_inventory`

**Key user fields**: `selectedPetId` (default: "mochi"), `unlockedPetIds` (JSON array), `avatarUrl`, `studyMode` (light/night)

## API Routes (`/api/...`)

- `auth.ts` — `/api/auth/login`, `/api/auth/register`, `/api/auth/google`
- `users.ts` — `/api/users/me` (GET/PATCH), `/api/stats`
- `subjects.ts` — CRUD for study subjects
- `plants.ts` — CRUD for plants
- `sessions.ts` — Create/complete/stop focus sessions
- `wallet.ts` — Wallet balance + transactions
- `messages.ts` — `GET /random`, `POST /` (motivation messages)
- `insights.ts` — AI coaching insights after sessions
- `friends.ts` — Friend requests, list, search
- `challenges.ts` — Challenges (hour-based, deadline-driven; competitive=most hours wins, cooperative=all must hit target; entry fee prize pool; auto-resolves on deadline; progress auto-updated when sessions complete)
- `pets.ts` — `GET /`, `POST /select`, `POST /unlock` (pet system)
- `analytics.ts` — Rich analytics: daily breakdown, subject breakdown, session type stats
- `store.ts` — `GET /items`, `POST /buy`, `POST /equip`, `GET /inventory` (cosmetic shop)

## Frontend Pages

- `/` — Dashboard (streak, quick start, pet card, plant card)
- `/session` — Focus Session timer (countdown/stopwatch, plant carousel, ambient sound, human messages)
- `/garden` — Isometric garden + subject management
- `/arena` — Friends + Challenges (tabbed: Challenges tab with create/join/view cards, filter by status; Friends tab with search/add/accept/profile)
- `/profile` — Profile, stats, settings, avatar upload, night mode
- `/analytics` — Charts: weekly bar chart, subject breakdown, session type split
- `/store` — Cosmetic shop (Avatar Frames, Focus Backgrounds, Pet Outfits) — buy with coins
- `/welcome` — Multi-step onboarding (4 slides)
- `/login`, `/register` — Authentication

## Key Features

### Night Mode
Toggle in Profile → Settings. Applies `.dark` class to `<html>`, persisted in localStorage.

### Deep Focus Lock
When Deep Focus session is active, `beforeunload` + `popstate` handlers prevent accidental navigation.

### Human Motivation Messages
After session completion: user receives a random message from another student, then gets prompted to write their own (optional, skippable, content-filtered).

### Pet System
5 pets (Mochi 🐱, Sprout 🐸, Luna 🐰, Ember 🦊, Cosmo 🐻).
- Unlock via: free / study minutes / coins
- Dynamic moods: excited/happy/neutral/sleepy/bored based on today's study activity + streak
- Clickable pet card on Dashboard opens selection modal

### Analytics
`/analytics` page: 7-day bar chart, subject breakdown bars, session type stacked bar, hero stats.

### Ambient Sound
5 procedurally-generated soundscapes via Web Audio API (Rain, Ocean, Café, Forest, White noise).
- Toggle button in FocusSession header
- Volume control in picker modal
- Persisted in localStorage

### Onboarding
4-slide carousel with skip + progress dots. Slides cover: plants, pets, challenges, ambient sound.

## Design

- **Colors**: Warm Cream (#F5F0E8) + Forest Green (#2D6A4F), gold for wallet
- **Style**: Glassmorphism (`.glass`, `.glass-strong`) + Soft Minimalism
- **Icons**: Lucide React
- **Font**: DM Serif Display (headings) + system sans-serif

## TypeScript

- Zero TS errors across all packages
- Each package extends `tsconfig.base.json`

## Development Notes

- DB migrations: use `executeSql` (drizzle-kit push requires TTY)
- Bottom sheet modals need `pb-28` to clear the bottom navigation bar
- `fetchApi` utility auto-injects JWT Bearer token from localStorage
- Vite dev server: `allowedHosts: true` (Replit iframe proxy)
