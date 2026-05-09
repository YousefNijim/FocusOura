# FocusOura — Design Document

## Done (Production Bug Fixes — 2026-05-09)

- **Fix: Onboarding 403** — `requireVerified` now bypasses the email-verification check when `onboarding_completed = false`. New users can create subjects and plants during onboarding before their email is verified. Once onboarding is complete the gate re-engages normally. (`middleware/requireVerified.ts`)
- **Fix: Calendar 500** — All four calendar route handlers lacked try/catch; any DB error (most likely `calendar_items` table missing in production) produced a silent 500. Added error handling with `logger.error` on every handler so the real error message appears in Railway logs. Also fixed a latent bug where `subjectId === "general"` was checked instead of falsy — changed to `subjectId || null`. Run the migration SQL below before deploying. (`routes/calendar.ts`)
- **Fix: Health check route** — Frontend was polling `HEAD /api/` which returned 404. Added `HEAD /` and `GET /health` to the health router. (`routes/health.ts`)
- **Fix: COOP header for Google OAuth popup** — Added `Cross-Origin-Opener-Policy: unsafe-none` middleware on the auth router so the Google sign-in popup can communicate back to the opener window via `window.closed`. (`routes/auth.ts`)

### Pending migration SQL (run on Railway Postgres before deploying)

```sql
-- Add columns that may be missing on the production users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMP;

-- Add columns that may be missing on the production sessions table
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS paused_at TIMESTAMP;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS total_paused_ms INTEGER NOT NULL DEFAULT 0;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS pause_count INTEGER NOT NULL DEFAULT 0;

-- Create calendar_items if it doesn't exist (most likely cause of the /calendar 500)
CREATE TABLE IF NOT EXISTS calendar_items (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  subject_id TEXT,
  title TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'homework',
  due_date TIMESTAMP NOT NULL,
  completed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS calendar_user_id_idx ON calendar_items(user_id);
CREATE INDEX IF NOT EXISTS calendar_subject_id_idx ON calendar_items(subject_id);
CREATE INDEX IF NOT EXISTS calendar_due_date_idx ON calendar_items(due_date);

-- Create push_tokens if it doesn't exist
CREATE TABLE IF NOT EXISTS push_tokens (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  token TEXT NOT NULL,
  device_id TEXT,
  platform TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  last_used TIMESTAMP
);
CREATE INDEX IF NOT EXISTS push_tokens_user_id_idx ON push_tokens(user_id);
CREATE UNIQUE INDEX IF NOT EXISTS push_tokens_user_token_idx ON push_tokens(user_id, token);

-- Create password_reset_tokens if it doesn't exist
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMP NOT NULL,
  used_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS prt_token_hash_idx ON password_reset_tokens(token_hash);
CREATE INDEX IF NOT EXISTS prt_user_id_idx ON password_reset_tokens(user_id);

-- Create email_verification_tokens if it doesn't exist
CREATE TABLE IF NOT EXISTS email_verification_tokens (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMP NOT NULL,
  used_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS evt_token_hash_idx ON email_verification_tokens(token_hash);
CREATE INDEX IF NOT EXISTS evt_user_id_idx ON email_verification_tokens(user_id);
```

## 1. Tech Stack

### Workspace
| Tool | Version |
|------|---------|
| TypeScript | ~5.9.2 |
| pnpm | latest (workspace monorepo) |
| Node.js | runtime |

### API Server (`artifacts/api-server`)
| Package | Version |
|---------|---------|
| Express.js | ^5 |
| Drizzle ORM | 0.45.1 |
| bcryptjs | ^3.0.3 |
| jsonwebtoken | ^9.0.3 |
| pino | ^9 |
| pino-http | ^10 |
| cors | ^2 |
| cookie-parser | ^1.4.7 |
| @google/genai | ^1.46.0 |
| zod | 3.25.76 |

### Web App (`artifacts/web`)
| Package | Version |
|---------|---------|
| React | 19.1.0 |
| Vite | 7.3.0 |
| TailwindCSS | 4.1.14 |
| React Router DOM | ^7.13.2 |
| TanStack React Query | 5.90.21 |
| Framer Motion | 12.23.24 |
| Radix UI | full suite |
| React Hook Form | ^7.55.0 |
| Firebase | ^12.11.0 |
| Lucide React | 0.545.0 |
| Recharts | ^2.15.2 |
| Sonner | ^2.0.7 |
| date-fns | ^3.6.0 |
| Capacitor (Android) | ^8.3.1 |

### Mobile App (`artifacts/mobile`)
| Package | Version |
|---------|---------|
| Expo | ~54.0.0 |
| `EXPO_PUBLIC_WEB_URL` | Set per environment — local IP for dev, production domain for release |
| React Native | 0.81.5 |
| React | 19.1.0 |
| React Native WebView | 13.15.0 |
| @react-native-community/netinfo | 11.4.1 |
| TanStack React Query | ^5.90.0 |
| Axios | ^1.7.0 |
| Lucide React Native | ^0.470.0 |

**Mobile build: EAS Build — preview=APK (internal distribution), production=AAB (Google Play)**
Bundle ID: `com.focusoura.app` | EAS Project: `660e5d47-78e3-4d62-982a-04136054c625`

**Web deploy: Vercel — https://focusoura.vercel.app**
**API deploy: Needs separate hosting (Railway/Render recommended) — see §6 for env vars**

### Database / Shared Libs
| Package | Version |
|---------|---------|
| Drizzle Kit | ^0.31.9 |
| pg (PostgreSQL driver) | ^8.20.0 |
| Zod | 3.25.76 |

---

## 2. Folder Structure

```
FocusOura/
├── artifacts/
│   ├── api-server/                  # Express.js REST API
│   │   ├── src/
│   │   │   ├── index.ts             # Entry point — starts HTTP server
│   │   │   ├── app.ts               # Express app setup: middleware, route mounting
│   │   │   ├── lib/
│   │   │   │   └── logger.ts        # Pino logger config
│   │   │   ├── middleware/
│   │   │   │   ├── auth.ts          # JWT auth middleware + token creation helpers
│   │   │   │   └── requireVerified.ts # Guards routes until email is verified
│   │   │   └── routes/
│   │   │       ├── index.ts         # Aggregates and exports all routers
│   │   │       ├── auth.ts          # Register, login, Google OAuth, verify-email, resend-verification
│   │   │       ├── users.ts         # Profile, stats, public profiles
│   │   │       ├── sessions.ts      # Session lifecycle + plant growth logic
│   │   │       ├── subjects.ts      # Study subject CRUD
│   │   │       ├── plants.ts        # Plant queries + growth updates
│   │   │       ├── wallet.ts        # Coin balance + transaction history
│   │   │       ├── messages.ts      # Motivation messages with content filtering
│   │   │       ├── insights.ts      # Gemini AI session insights
│   │   │       ├── friends.ts       # Friend requests, invite links, search
│   │   │       ├── challenges.ts    # Create/join challenges, scoring
│   │   │       ├── pets.ts          # Pet catalog, unlocks, selection
│   │   │       ├── store.ts         # Store items, purchases, inventory
│   │   │       ├── calendar.ts      # Homework/exam calendar items
│   │   │       ├── analytics.ts     # Daily breakdown, streaks, stats
│   │   │       ├── admin.ts         # Moderation tools, platform stats
│   │   │       ├── health.ts        # Health check endpoint
│   │   │       └── config.ts        # Firebase public config endpoint
│   │   ├── build.mjs                # Custom esbuild bundler with pino plugin
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── web/                         # React/Vite frontend (runs in browser + Capacitor)
│   │   └── src/
│   │       ├── pages/               # One file per route
│   │       │   ├── Index.tsx        # Dashboard / home
│   │       │   ├── FocusSession.tsx # Active timer UI
│   │       │   ├── Garden.tsx       # Plant gallery
│   │       │   ├── Arena.tsx        # Challenges UI
│   │       │   ├── Profile.tsx      # User profile page
│   │       │   ├── Analytics.tsx    # Stats and charts
│   │       │   ├── Store.tsx        # Item shop
│   │       │   ├── Login.tsx        # Auth pages
│   │       │   ├── Register.tsx
│   │       │   ├── Welcome.tsx
│   │       │   ├── AdminPanel.tsx   # Admin dashboard
│   │       │   ├── TransactionHistory.tsx
│   │       │   ├── VerifyEmail.tsx  # Email verification link handler
│   │       │   └── not-found.tsx
│   │       ├── components/
│   │       │   ├── MobileLayout.tsx # Outer app shell
│   │       │   ├── BottomNav.tsx    # Mobile-style bottom navigation
│   │       │   ├── NavLink.tsx
│   │       │   ├── PetSelectModal.tsx
│   │       │   ├── AmbientSoundPicker.tsx
│   │       │   ├── ErrorBoundary.tsx
│   │       │   ├── OfflineBanner.tsx
│   │       │   ├── VerificationBanner.tsx
│   │       │   ├── CalendarSection.tsx
│   │       │   └── ui/              # 50+ Radix UI primitives (button, dialog, etc.)
│   │       ├── context/
│   │       │   ├── AuthContext.tsx  # Auth state, token management
│   │       │   ├── UserContext.tsx  # Current user data
│   │       │   └── SessionContext.tsx # Active focus session state
│   │       ├── hooks/
│   │       │   ├── use-mobile.tsx
│   │       │   ├── use-toast.ts
│   │       │   ├── useAmbientSound.ts
│   │       │   └── useInventory.ts
│   │       ├── lib/
│   │       │   ├── firebase.ts      # Firebase SDK init
│   │       │   └── utils.ts         # clsx/tw helpers
│   │       ├── utils/
│   │       │   └── api.ts           # fetchApi wrapper + token injection
│   │       ├── constants/
│   │       │   ├── pets.ts          # Pet catalog definitions
│   │       │   └── plants.ts        # Plant type definitions
│   │       ├── assets/
│   │       │   └── garden/          # Plant images (orchid, fern, rose, etc.)
│   │       ├── App.tsx              # React Router route definitions
│   │       ├── main.tsx             # React root + QueryClient provider
│   │       └── index.css            # Global Tailwind styles
│   │
│   └── mobile/                      # Expo React Native wrapper
│       ├── App.tsx                  # Full-screen WebView pointing at web app
│       ├── app.json                 # Expo project config
│       ├── eas.json                 # EAS build config
│       ├── index.ts                 # Expo entry
│       ├── assets/                  # App icons and splash screen
│       ├── package.json
│       └── tsconfig.json
│
├── lib/                             # Shared internal packages
│   ├── db/                          # Database layer
│   │   ├── src/
│   │   │   ├── index.ts             # Drizzle + pg pool export
│   │   │   └── schema/
│   │   │       ├── index.ts         # Re-exports all tables
│   │   │       ├── focusoura.ts     # Main schema (all tables)
│   │   │       ├── conversations.ts # Conversation threads (unused)
│   │   │       └── messages.ts      # Conversation messages (unused)
│   │   ├── drizzle.config.ts        # Drizzle Kit config
│   │   └── package.json
│   │
│   ├── api-zod/                     # Shared Zod validation schemas
│   │   └── src/
│   │       ├── index.ts
│   │       └── generated/types/     # 40+ auto-generated type files
│   │
│   ├── api-client-react/            # Auto-generated TanStack Query hooks
│   │   └── src/
│   │       ├── index.ts
│   │       ├── custom-fetch.ts      # Fetch adapter
│   │       └── generated/api.ts     # Generated query/mutation hooks
│   │
│   └── integrations-gemini-ai/      # Google Gemini AI integration
│       └── src/
│           ├── index.ts
│           ├── client.ts            # GoogleGenAI instance
│           └── batch/               # Batch processing utilities
│
├── scripts/                         # Build and utility scripts
├── .claude/                         # Claude Code config + skills
├── docker-compose.yml
├── pnpm-workspace.yaml              # Workspace + catalog version pins
├── tsconfig.json
├── tsconfig.base.json
├── .env
└── .env.example
```

---

## 3. Implemented Features

### Authentication
- Email/password registration and login (bcryptjs, 10 rounds)
- Google OAuth via Firebase credential verification
- JWT tokens (90-day expiry) stored in localStorage
- `x-user-id` header accepted for demo/dev users
- Auto-creates user record on first API call (`ensureUser` pattern)

### Focus Sessions
- Session types: `routine` (1× points), `homework` (2×), `deep_focus` (3×)
- State machine: idle → active → paused → active → complete/abort. Pause/resume with accurate study time tracking.
- Points earned = `actualMinutes × multiplier` where `actualMinutes` excludes all paused time
- AI-generated insights on completion (Google Gemini)

### Session Pause / Resume
- `POST /sessions/:id/pause` — records `paused_at`, increments `pause_count`; validates session is active
- `POST /sessions/:id/resume` — accumulates `paused_at → now` into `total_paused_ms`, clears `paused_at`; 2-hour pause timeout auto-aborts with reason `pause_timeout`
- `PUT /sessions/:id` (complete/abort) — if session is paused at completion time, finalizes `total_paused_ms` before recording; `actualMinutes` from client already excludes paused time (computed via `accumulatedSecs` in `SessionContext`)
- Frontend: `handlePause` freezes UI immediately (via `SessionContext`), then syncs to backend; reverts if API call fails. `handleResume` calls backend first, then unfreezes UI; keeps UI paused if API call fails.
- Complete button disabled while paused. Abort works from both active and paused states.
- Completion screen shows "Paused N times — actual study time: X min" when `pauseCount > 0`
- `SessionContext` tracks elapsed time via `accumulatedSecs` + `startTimestamp` — paused time is never included

**Migration SQL**
```sql
ALTER TABLE sessions
  ADD COLUMN IF NOT EXISTS paused_at        TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS total_paused_ms  INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS pause_count      INTEGER NOT NULL DEFAULT 0;
```

### Plant Garden
- One plant per subject; unlimited general plants
- Plant types: fern, succulent, bamboo, rose, cactus, bonsai, orchid, lavender
- Growth: every 25 minutes → 100 growth points added
- Growth cap scales additively (+50 per level: 100 → 150 → 200 → 250…)
- Visual gallery on the Garden page

### Coin Economy (Wallet)
- Coins awarded automatically on session completion
- Full transaction history with types: reward, debit, challenge_stake, challenge_win, purchase
- Used for pet unlocks and store purchases

### Pets
- Catalog: Mochi (free), Sprout (180 min), Luna (600 min), Ember (100 coins), Cosmo (250 coins)
- Mood states: happy (session today), neutral (1–2 days ago), sad (3+ days)
- Pet displayed on dashboard with mood animation

### Store
- Categories: avatar frames, focus backgrounds, pet outfits
- Rarities: common, rare, legendary (80–500 coins)
- One item equipped per category at a time

### Social / Friends
- Friend requests (pending → accepted/declined)
- Shareable one-time invite links
- Search by display name or user code
- Public profiles with stats

### Challenges
- Types: competitive (most minutes wins the stake pool) or cooperative (all participants must hit target)
- Entry fee (coins) staked on join
- Lazy resolution: auto-resolves expired challenges on next fetch
- Real-time progress tracking via session completion

### Calendar
- Items: homework, exam, other
- Linked to a subject, with a due date
- Checked off as complete
- Can be linked to a focus session

### Onboarding
- 3-step guided first-run experience triggered on first login, never shown again
- Step 1: Welcome message + subject name + accent color picker (8 presets) with live preview
- Step 2: Plant personality picker (8 plant cards with trait descriptions) → calls `POST /subjects` with name, color, and chosen plant type
- Step 3: Celebration summary (subject ✓ + plant ✓) → "Start my first session" navigates to `/focus` with subject pre-selected; "Explore the app first" just dismisses
- Full-screen overlay with `backdrop-blur-sm` — dashboard visible behind it; cannot be dismissed by clicking outside
- Framer Motion slide transitions between steps; progress indicator (Step X of 3)
- `onboarding_completed` boolean column on `users` table — set to `true` via `PATCH /users/onboarding-complete` on completion
- Each API call waits for success before advancing; inline errors shown on failure; no skipping

### Email Verification
- Sent non-blocking on `POST /auth/register` — never delays or fails registration
- Google OAuth users are auto-verified at account creation (`emailVerified: true`)
- `GET /auth/verify-email?token=<raw-token>` — hashes token with SHA-256, validates, marks user verified
- `POST /auth/resend-verification` — auth-required, DB-based rate limit (max 3/hr per user), invalidates old tokens before creating new one
- Token lifetime: 24 hours; stored hashed in `email_verification_tokens` table
- `requireVerified` middleware applied to: `POST /sessions`, `POST /subjects`, `POST /challenges`, `POST /challenges/:id/join`, `POST /friends/request`, `POST /store/buy`
- `VerifyEmail.tsx` page handles `/verify-email?token=` links; works for both authenticated and unauthenticated users
- `VerificationBanner` — fixed amber top banner shown globally to unverified authenticated users; dismissible per session (sessionStorage); inline resend with 60s cooldown
- `authUser.emailVerified` in `AuthContext` + `user.emailVerified` in `UserContext` track verification state; banner auto-hides when either becomes `true`

**Migration SQL**
```sql
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS email_verified     BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS email_verified_at  TIMESTAMP;

CREATE TABLE IF NOT EXISTS email_verification_tokens (
  id           TEXT PRIMARY KEY,
  user_id      TEXT NOT NULL,
  token_hash   TEXT NOT NULL UNIQUE,
  expires_at   TIMESTAMP NOT NULL,
  used_at      TIMESTAMP,
  created_at   TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS evt_token_hash_idx ON email_verification_tokens (token_hash);
CREATE INDEX IF NOT EXISTS evt_user_id_idx    ON email_verification_tokens (user_id);
```

### Push Notifications
- Expo push token collected on native app launch (permission gated)
- Token passed to the web app via `postMessage { type: 'PUSH_TOKEN', token, platform }`
- Web app registers token via `POST /api/notifications/token` (auth required)
- Tokens stored per-device: `push_tokens` table with composite unique `(user_id, token)`
- `ON CONFLICT DO UPDATE SET last_used` — deduplicates re-registration
- `DELETE /api/notifications/token` removes token on logout
- `sendPushNotification(userIds[], { title, body, data? })` in `lib/push.ts`:
  - Never throws — all errors are logged and swallowed
  - Invalid tokens filtered via `Expo.isExpoPushToken()` before sending
  - Sends in chunks via `expo.chunkPushNotifications()`
  - `DeviceNotRegistered` tickets auto-delete the stale token from DB
- Events wired:
  - Friend request accepted → notify requester
  - Challenge joined → notify challenge creator
  - Challenge auto-resolves → notify all participants
  - Session completes and today's total crosses 60 min → notify user (daily goal reached)

### Analytics
- Daily focus breakdown
- Per-subject breakdown
- Streak tracking (consecutive study days)
- Best day, total minutes, session count

### Motivation Messages
- Random message served per session
- Users can submit their own
- Content filtered for negative terms before storage
- Admin approval workflow

### Admin Panel
- Approve/reject user-submitted messages
- View and change user roles (student/admin)
- Platform-wide stats

---

## 4. Code Patterns & Conventions

### ID Generation
```typescript
`${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
// Examples: user_1724001200000_abc12, sess_..., plant_..., txn_..., msg_...
```

### API Response Shape
```typescript
// Success
{ ...data }

// Error
{ error: "message string" }
```

### HTTP Status Codes Used
| Code | Meaning |
|------|---------|
| 200 | OK |
| 201 | Created |
| 400 | Bad request / validation failure |
| 401 | Not authenticated |
| 403 | Forbidden (wrong role) |
| 404 | Not found |
| 409 | Conflict (duplicate) |
| 422 | Unprocessable entity |
| 500 | Server error |

### Auth Middleware
```typescript
// Routes requiring auth use the auth middleware
// Token extracted from Authorization: Bearer <token> header
// x-user-id header accepted as bypass for demo mode
```

### Date Handling
- DB: native `Date` objects via Drizzle
- API responses: `.toISOString()` strings
- Streak: naive `YYYY-MM-DD` string comparison (no timezone handling)

### Logging
- Pino logger, pretty in dev / JSON in production
- Auth headers redacted in HTTP logs
- Log level configurable via `LOG_LEVEL` env var

### Database Queries
- Drizzle ORM query builder throughout
- `onConflictDoNothing` for idempotent inserts
- Indexes on all foreign keys and frequently filtered columns

### Frontend State Management
- **Global state**: React Context (Auth, User, Session)
- **Server state**: TanStack React Query (caching, refetching)
- **Forms**: React Hook Form
- **Toasts**: Sonner

### Component Conventions
- Pages in `src/pages/`, one file per route
- Shared primitives in `src/components/ui/` (Radix-based)
- Custom hooks in `src/hooks/`
- All API calls go through `src/utils/api.ts` (`fetchApi` wrapper)

### Styling
- TailwindCSS 4 utility classes throughout
- Dark mode variants inline (`dark:...`)
- Accent colors stored as hex strings per subject
- CSS custom properties: `--color-primary`, `--color-background`

---

## 5. Database Schema

### `users`
| Column | Type | Notes |
|--------|------|-------|
| id | string PK | `user_` prefix |
| userCode | string unique | Short public code |
| displayName | string | |
| email | string unique | |
| passwordHash | string nullable | null for OAuth users |
| avatarUrl | string nullable | |
| role | enum | `student` \| `admin` |
| authProvider | enum | `email` \| `google` |
| providerId | string unique nullable | OAuth provider user ID |
| studyMode | enum | `light` \| `night` |
| notificationsEnabled | boolean | |
| onboardingCompleted | boolean | Default false; set true after first-run flow |
| selectedPetId | string nullable | FK → pet catalog |
| unlockedPetIds | json | Array of pet IDs |
| createdAt | timestamp | |

### `subjects`
| Column | Type | Notes |
|--------|------|-------|
| id | string PK | `subj_` prefix |
| userId | string FK | → users |
| name | string | |
| accentColor | string | Hex color |
| plantId | string nullable | FK → plants |
| totalFocusMinutes | integer | |
| sessionCount | integer | |

### `plants`
| Column | Type | Notes |
|--------|------|-------|
| id | string PK | `plant_` prefix |
| userId | string FK | → users |
| subjectId | string nullable FK | → subjects |
| plantType | enum | fern, succulent, bamboo, rose, cactus, bonsai, orchid, lavender |
| growthLevel | integer | |
| growthPoints | integer | |
| maxGrowthPoints | integer | Starts 100, scales +50/level |

### `sessions`
| Column | Type | Notes |
|--------|------|-------|
| id | string PK | `sess_` prefix |
| userId | string FK | → users |
| subjectId | string nullable FK | → subjects |
| calendarItemId | string nullable FK | → calendarItems |
| plantId | string nullable FK | → plants |
| sessionType | enum | `routine` \| `homework` \| `deep_focus` |
| state | enum | `initialized` \| `started` \| `completed` \| `aborted` |
| durationMinutes | integer | Planned duration |
| pointsEarned | integer | Actual points |
| startTime | timestamp | |
| endTime | timestamp nullable | |

### `sessionEvents`
| Column | Type | Notes |
|--------|------|-------|
| id | string PK | |
| sessionId | string FK | → sessions |
| userId | string FK | → users |
| eventType | enum | `started` \| `completed` \| `aborted` |
| eventTime | timestamp | |
| metadata | json nullable | |

### `wallets`
| Column | Type | Notes |
|--------|------|-------|
| userId | string PK FK | → users |
| balance | integer | Coins |
| lastUpdated | timestamp | |

### `transactions`
| Column | Type | Notes |
|--------|------|-------|
| id | string PK | `txn_` prefix |
| userId | string FK | → users |
| type | enum | `reward` \| `debit` \| `challenge_stake` \| `challenge_win` \| `purchase` |
| amount | integer | |
| description | string | |
| referenceId | string nullable | Related entity ID |
| createdAt | timestamp | |

### `motivationMessages`
| Column | Type | Notes |
|--------|------|-------|
| id | string PK | `msg_` prefix |
| content | string | |
| sessionId | string nullable | |
| approved | boolean | Admin approval gate |

### `aiInsights`
| Column | Type | Notes |
|--------|------|-------|
| id | string PK | |
| sessionId | string FK | → sessions |
| userId | string FK | → users |
| type | enum | `motivation` \| `achievement` \| `warning` |
| content | string | From Gemini API |

### `friendships`
| Column | Type | Notes |
|--------|------|-------|
| id | string PK | |
| requesterId | string FK | → users |
| receiverId | string FK | → users |
| status | enum | `pending` \| `accepted` \| `declined` \| `invite` |
| inviteToken | string nullable unique | Shareable link token |
| createdAt | timestamp | |
| updatedAt | timestamp | |

### `challenges`
| Column | Type | Notes |
|--------|------|-------|
| id | string PK | |
| creatorId | string FK | → users |
| title | string | |
| sessionType | enum | routine, homework, deep_focus |
| durationMinutes | integer | Target minutes |
| stake | integer | Entry fee in coins |
| status | enum | `open` \| `active` \| `completed` |
| challengeType | enum | `competitive` \| `cooperative` |
| durationDays | integer | |
| startTime | timestamp nullable | |
| endTime | timestamp nullable | |
| winnerId | string nullable FK | → users |

### `challengeParticipants`
| Column | Type | Notes |
|--------|------|-------|
| id | string PK | |
| challengeId | string FK | → challenges |
| userId | string FK | → users |
| focusMinutes | integer | Accumulated during challenge |
| joinedAt | timestamp | |

### `storeItems`
| Column | Type | Notes |
|--------|------|-------|
| id | string PK | |
| name | string | |
| description | string | |
| category | enum | `avatar_frame` \| `focus_background` \| `pet_outfit` |
| price | integer | Coins |
| icon | string | |
| rarity | enum | `common` \| `rare` \| `legendary` |
| colorValue | string nullable | Hex color |

### `userInventory`
| Column | Type | Notes |
|--------|------|-------|
| id | string PK | |
| userId | string FK | → users |
| itemId | string FK | → storeItems |
| equipped | boolean | One per category |
| purchasedAt | timestamp | |

### `calendarItems`
| Column | Type | Notes |
|--------|------|-------|
| id | string PK | |
| userId | string FK | → users |
| subjectId | string nullable FK | → subjects |
| title | string | |
| type | enum | `homework` \| `exam` \| `other` |
| dueDate | timestamp | |
| completed | boolean | |

### `push_tokens`
| Column | Type | Notes |
|--------|------|-------|
| id | string PK | `pt_` prefix |
| userId | string FK | → users (ON DELETE CASCADE) |
| token | string | Expo push token (`ExponentPushToken[...]`) |
| deviceId | string nullable | Optional device identifier |
| platform | string nullable | `ios` \| `android` |
| createdAt | timestamp | |
| lastUsed | timestamp nullable | Updated on re-registration |

Composite unique index on `(user_id, token)` — one row per device per user.

### `password_reset_tokens`
| Column | Type | Notes |
|--------|------|-------|
| id | string PK | `prt_` prefix |
| userId | string FK | → users |
| tokenHash | string unique | SHA-256 of the raw token (raw never stored) |
| expiresAt | timestamp | 1 hour after creation |
| usedAt | timestamp nullable | Set when token is consumed |
| createdAt | timestamp | |

---

## 6. API Routes

Base URL: `/api`

### Health & Config
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/healthz` | No | Health check |
| GET | `/config/firebase` | No | Firebase public config |

### Auth
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/auth/register` | No | Email/password registration |
| POST | `/auth/login` | No | Email/password login |
| POST | `/auth/google` | No | Google OAuth login |

### Users
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/users/me` | Yes | Current user profile (auto-creates if missing) |
| PATCH | `/users/me` | Yes | Update displayName, studyMode, notificationsEnabled, avatarUrl |
| PATCH | `/users/onboarding-complete` | Yes | Mark onboarding as completed (sets onboarding_completed = true) |
| PUT | `/users/me` | Yes | Full user update |
| GET | `/users/profile/:userId` | Yes | Public profile with stats |
| GET | `/users` | Yes | Current user stats (focus minutes, streaks, plant count) |

### Sessions
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/sessions/active` | Yes | Currently active session |
| GET | `/sessions` | Yes | Session history (query: limit) |
| POST | `/sessions` | Yes | Start a new session |
| PUT | `/sessions/:sessionId` | Yes | Complete or abort session |
| POST | `/sessions/:sessionId/events` | Yes | Log a session event |

### Subjects
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/subjects` | Yes | List user's subjects |
| POST | `/subjects` | Yes | Create subject (name, accentColor, plantType) |
| PUT | `/subjects/:subjectId` | Yes | Update subject |
| DELETE | `/subjects/:subjectId` | Yes | Delete subject |

### Plants
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/plants` | Yes | All plants with growth data |
| PUT | `/plants/:plantId` | Yes | Update plant growth points |

### Wallet
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/wallet` | Yes | Balance and last updated |
| GET | `/wallet/transactions` | Yes | Transaction history (query: limit) |

### Messages
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/messages/random` | Yes | Random motivation message |
| POST | `/messages` | Yes | Submit a motivation message |

### Insights
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/insights/:sessionId` | Yes | Get cached AI insights for session |
| POST | `/insights/:sessionId` | Yes | Generate new Gemini insights for session |

### Friends
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/friends/search` | Yes | Search users by name or code |
| GET | `/friends` | Yes | List accepted friends |
| GET | `/friends/requests` | Yes | Incoming + outgoing pending requests |
| POST | `/friends/request` | Yes | Send a friend request |
| PUT | `/friends/:id/accept` | Yes | Accept a friend request |
| PUT | `/friends/:id/decline` | Yes | Decline a friend request |
| DELETE | `/friends/:id` | Yes | Remove a friend |
| GET | `/friends/invite-link` | Yes | Generate a shareable invite link |
| POST | `/friends/join/:token` | Yes | Accept invite via link token |

### Challenges
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/challenges` | Yes | My challenges + open challenges (auto-resolves expired) |
| POST | `/challenges` | Yes | Create a challenge |
| GET | `/challenges/:id` | Yes | Challenge details with participants |
| POST | `/challenges/:id/join` | Yes | Join a challenge |
| PUT | `/challenges/:id/progress` | Yes | Update participant minutes |

### Pets
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/pets` | Yes | Pet catalog with unlock status |
| POST | `/pets/select` | Yes | Set active pet |
| POST | `/pets/unlock` | Yes | Unlock a pet (coins or milestone) |

### Store
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/store/items` | Yes | All store items with owned/equipped status |
| GET | `/store/inventory` | Yes | User's owned items |
| POST | `/store/buy` | Yes | Purchase an item |
| POST | `/store/equip` | Yes | Equip or unequip an item |

### Calendar
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/calendar` | Yes | All calendar items sorted by due date |
| POST | `/calendar` | Yes | Create a calendar item |
| PATCH | `/calendar/:id` | Yes | Update a calendar item |
| DELETE | `/calendar/:id` | Yes | Delete a calendar item |

### Analytics
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/analytics` | Yes | Full stats: daily breakdown, subject breakdown, streaks, best day |

### Admin (role: admin only)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/admin/messages` | Admin | List messages (query: status = pending\|approved) |
| PATCH | `/admin/messages/:id` | Admin | Approve or reject a message |
| DELETE | `/admin/messages/:id` | Admin | Delete a message |
| GET | `/admin/users` | Admin | All users with session counts and wallet |
| PATCH | `/admin/users/:id/role` | Admin | Change user role |
| GET | `/admin/stats` | Admin | Platform-wide statistics |

### Notifications
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/notifications/token` | Yes | Register or refresh an Expo push token |
| DELETE | `/notifications/token` | Yes | Remove a push token (call on logout) |

### Auth (additional)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/auth/forgot-password` | No | Request a password reset email (rate-limited 3/hr) |
| POST | `/auth/reset-password` | No | Consume reset token and set new password |

---

## Session Log - 2026-05-08

### Completed
- Fixed JWT secret hardcoded fallback → server throws on missing secret
- Fixed plant growth bug → unified in `lib/constants.ts` + migration query provided for diverged DB rows
- Fixed streak always 0 → shared `getUserStreak()` in `lib/queries.ts`
- Fixed mobile hardcoded IP → `EXPO_PUBLIC_WEB_URL` env variable
- Surfaced motivation messages → `useMotivationMessage` hook in FocusSession
- Fixed silent catch blocks → `logger.warn`/`logger.error` in `sessions.ts`
- Added challenge validation → `targetHours` (1–10000), `durationDays` (1–365)
- Fixed: All `console.log` in `routes/auth.ts` replaced with Pino `logger.error` — `App.tsx` unguarded `console.log` removed (sensitive push token not logged; permission failure upgraded to `console.error`)
- Feature: Linked calendar item title now shown in active Focus Session UI — server-side join in `POST /sessions` and `GET /sessions/active`, stored in `StoredSession`, no extra frontend fetch
- Feature: Full password reset flow — `POST /auth/forgot-password` + `POST /auth/reset-password` endpoints + `ForgotPassword.tsx` + `ResetPassword.tsx` pages + email via Resend + tokens hashed (SHA-256), single-use, 1 hr expiry; existing sessions invalidated via in-memory blocklist checked in `authMiddleware`
- Feature: Full push notifications system — `push_tokens` DB table + `POST/DELETE /notifications/token` endpoints + `lib/push.ts` sender (expo-server-sdk, chunked, never throws, DeviceNotRegistered auto-cleanup) + events wired into friend accept / challenge join / challenge resolve / daily goal reached; mobile App.tsx now retrieves Expo push token and passes to web app via postMessage for backend registration
- Feature: Complete onboarding flow — 3 steps: subject + plant + first session. Triggered on first login, never shown again. Resolves #1 retention issue: empty dashboard. `onboarding_completed` column on users table; `PATCH /users/onboarding-complete` endpoint; Framer Motion slide transitions; inline error handling per step; "Start my first session" pre-selects subject in FocusSession via navigate state.

### New Files Created
- `artifacts/web/src/components/Onboarding/index.tsx` — overlay shell with Framer Motion step transitions
- `artifacts/web/src/components/Onboarding/StepOne.tsx` — welcome + subject name + color picker
- `artifacts/web/src/components/Onboarding/StepTwo.tsx` — plant picker (8 cards with personality traits) + POST /subjects
- `artifacts/web/src/components/Onboarding/StepThree.tsx` — celebration summary + CTA + PATCH /users/onboarding-complete
- `artifacts/api-server/src/lib/constants.ts` — shared plant growth formula
- `artifacts/api-server/src/lib/queries.ts` — shared `getUserStreak()` helper
- `artifacts/web/src/hooks/useMotivationMessage.ts` — React Query hook for motivation messages
- `artifacts/mobile/.env` — local dev URL config
- `artifacts/mobile/.env.example` — environment template for mobile
- `artifacts/api-server/src/lib/email.ts` — Resend REST API helper (no extra dependency)
- `artifacts/api-server/src/lib/sessionInvalidation.ts` — in-memory JWT blocklist for password reset
- `artifacts/web/src/pages/ForgotPassword.tsx` — forgot password page
- `artifacts/web/src/pages/ResetPassword.tsx` — reset password page (reads `?token=`)
- `artifacts/api-server/src/lib/push.ts` — Expo push notification sender (expo-server-sdk, chunked, auto-cleanup)
- `artifacts/api-server/src/routes/notifications.ts` — push token registration endpoints

### Next Session — High Priority
1. Web app PUSH_TOKEN message handler — handle `{ type: 'PUSH_TOKEN', token, platform }` in web app to call `POST /api/notifications/token` and `DELETE` on logout (est. 30 min)
2. Session pause (est. 1 hour)
3. Run migration: `ALTER TABLE users ADD COLUMN onboarding_completed BOOLEAN NOT NULL DEFAULT false;`

## Session Log - 2026-05-09

### Completed
- Fix: Mobile APK auth — CORS configured for Vercel+Railway with origin allowlist (`WEB_URL`, `WEB_URL_PREVIEW`), preview wildcard regex, `credentials: true`, explicit methods/headers; `app.ts` replaced bare `cors()` with `corsOptions`
- Fix: `VITE_API_BASE_URL` documented in `.env.example` as REQUIRED on Vercel — root cause of 405 errors on login/register (calls were hitting Vercel static server instead of Railway API)
- Fix: WebView `sharedCookiesEnabled`+`thirdPartyCookiesEnabled` added to `App.tsx`; `originWhitelist={['*']}` set; `onShouldStartLoadWithRequest` added to allow own domain + Google OAuth; `incognito={false}` set
- Fix: `FRONTEND_URL`, `WEB_URL`, `WEB_URL_PREVIEW` added to `.env.example` with production-correct values

### Root Cause
`VITE_API_BASE_URL` was missing from Vercel environment variables. Since it's a Vite build-time variable, its absence bakes in an empty string, making all `fetchApi()` calls relative (`/api/...`). Vercel serves a static site with no `/api` backend — it returns HTTP 405 on POST. The Railway API is never reached.

---

## Notes

### Fixes Applied
- **Fixed: JWT secret hardcoded fallback removed** — server now throws on missing `JWT_SECRET` (`artifacts/api-server/src/middleware/auth.ts`)
- **Fixed: Plant growth points unified in `lib/constants.ts`** — `sessions.ts` and `plants.ts` now use identical additive calculation via `PLANT_GROWTH.calculateNextMax()`
- **Fixed: `currentStreak` in `GET /users/stats` now returns real value** — via shared `getUserStreak()` helper in `lib/queries.ts`; `longestStreak: 0` hardcode also removed
- **Fixed: Mobile hardcoded IP removed** — URL now loaded from `EXPO_PUBLIC_WEB_URL` env variable; server throws on startup if unset
- **Feature: Motivation messages now displayed in FocusSession** — active session + completion screen via `useMotivationMessage` hook
- **Fixed: All silent catch blocks in `sessions.ts` replaced with structured logger calls** — calendar failure → `logger.warn`, challenge progress failure → `logger.error`; production failures now visible in logs
- **Fixed: Challenge creation now validates `targetHours` (1–10000) and `durationDays` (1–365)** — invalid input returns 400 with per-field details
- **Feature: Calendar ↔ Session linking now fully visible in UI** — `POST /sessions` and `GET /sessions/active` join `calendarItemsTable` server-side; title stored in `StoredSession`; shown in active session card with `CalendarDays` icon as "Linked to: {title}"
- **Feature: Full password reset flow** — `POST /auth/forgot-password` (rate-limited 3/hr, always safe response) + `POST /auth/reset-password` (token hashed, single-use, 1 hr expiry, existing sessions invalidated); email via Resend REST API; `ForgotPassword.tsx` + `ResetPassword.tsx` match Login layout; "Forgot password?" link added to Login; cleanup job runs every 6 hours via `setInterval` in `app.ts`
- **Feature: Session pause/resume** — 4-state machine: idle → active → paused → completed/abort. `POST /sessions/:id/pause` and `POST /sessions/:id/resume` endpoints; paused time excluded from study stats, points, plant growth, and challenge progress; 2-hour pause timeout with auto-abort (`pause_timeout`); Complete button disabled while paused; abort works from both active and paused states; completion screen shows pause count and actual study time.
- **Mobile: Full APK/AAB production build preparation** — `eas.json` configured with development/preview/production profiles (preview=APK, production=AAB); `app.json` complete with bundle ID `com.focusoura.app`, versionCode, expo-notifications plugin, correct permissions; `App.tsx` production-ready with offline screen (NetInfo), error screen with retry, Android BackHandler for WebView history navigation, `renderLoading` spinner, `onError`/`onHttpError` handlers, and `allowsInlineMediaPlayback`/`cacheEnabled` props; all assets present; `expo-doctor` passes 17/17 checks.

### Known Incomplete / Unused
- `conversations` and `messages` tables exist in schema but have no API routes
- `integrations-gemini-ai/src/image/` exists but image generation is not implemented
- `OfflineBanner` component exists but offline sync logic is minimal
- Mobile app is a thin WebView wrapper (not native UI) pointing to the web app via `EXPO_PUBLIC_WEB_URL`

### Environment Variables
| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | Supabase PostgreSQL connection string |
| `GOOGLE_API_KEY` | Firebase + Gemini API key |
| `JWT_SECRET` | JWT signing secret — **required**, server throws on startup if missing |
| `PORT` | API server port (default: 8080) |
| `NODE_ENV` | `development` \| `production` |
| `LOG_LEVEL` | Pino log level (default: info) |
| `FIREBASE_PROJECT_ID` | Firebase project (default: focusoura-99dae) |
| `VITE_API_BASE_URL` | API base URL for web app (empty = Vite proxy) |
| `APP_URL` / `REPLIT_DEV_DOMAIN` | Base URL for friend invite links |

---

## 7. Color System & Theme

### Design Philosophy
FocusOura uses a **nature-inspired, calm palette** built around deep forest greens (primary) and warm parchment tones (background), evoking a productive study garden. Both light and dark modes are supported.

### CSS Custom Properties (HSL-based)
All colors are defined as HSL values in `index.css` and resolved through TailwindCSS 4's `@theme inline` block.

#### Light Mode (`:root`)
| Token | HSL Value | Role |
|-------|-----------|------|
| `--background` | `39 33% 96%` | Warm parchment/cream |
| `--foreground` | `150 20% 15%` | Deep forest near-black |
| `--card` | `39 30% 93%` | Slightly darker parchment |
| `--primary` | `152 45% 28%` | Deep forest green |
| `--primary-foreground` | `39 33% 96%` | Parchment (on primary) |
| `--secondary` | `39 25% 88%` | Muted parchment |
| `--muted` | `39 20% 90%` | Subtle warm gray |
| `--muted-foreground` | `150 10% 45%` | Mid-tone green-gray |
| `--accent` | `36 60% 55%` | Warm amber/gold |
| `--destructive` | `0 65% 55%` | Standard red |
| `--success` | `152 50% 40%` | Medium forest green |
| `--coin` | `45 90% 55%` | Bright gold (coin icon) |
| `--border` | `39 20% 85%` | Soft warm border |
| `--radius` | `1rem` | Base border radius (16px) |

#### Dark Mode (`.dark`)
| Token | HSL Value | Role |
|-------|-----------|------|
| `--background` | `150 15% 8%` | Very dark forest |
| `--foreground` | `39 25% 90%` | Warm off-white |
| `--card` | `150 15% 12%` | Dark card surface |
| `--primary` | `152 45% 40%` | Lighter forest green |
| `--muted` | `150 10% 16%` | Dark muted surface |
| `--accent` | `36 60% 50%` | Amber (slightly darker) |

### Dark Mode Strategy
- Dark mode is toggled via the `.dark` class on a parent element (not `prefers-color-scheme` media query)
- Toggled by user's `studyMode` preference: `light` | `night` (stored in DB)
- Uses TailwindCSS `@custom-variant dark (&:is(.dark *))` syntax

### Semantic Color Usage
| Context | Color Used |
|---------|-----------|
| Primary actions, active states | `--primary` (forest green) |
| Coins / wallet balance | `--coin` (gold) |
| Exam badge | Red (`red-500`) |
| Deep Focus session badge | `--destructive` |
| Homework session badge | `--accent` |
| Routine session badge | `--primary` |
| Subject accent colors | Per-subject hex (stored in DB) |

---

## 8. Existing Components & Their Purpose

### Layout Components (`src/components/`)

| Component | File | Purpose |
|-----------|------|---------|
| **MobileLayout** | `MobileLayout.tsx` | Root page shell. Constrains max-width to `max-w-md`, centers horizontally, renders `<BottomNav>` and the persistent `<ActiveSessionBar>`. All pages are wrapped in this. |
| **ActiveSessionBar** | *(inside MobileLayout.tsx)* | Fixed top banner that appears on all pages except `/focus` when a session is active. Shows plant image, session state (running/paused), timer, and taps to navigate to `/focus`. |
| **BottomNav** | `BottomNav.tsx` | Fixed bottom navigation with 5 tabs: Home, Garden, Focus (elevated center CTA), Arena, Profile. Handles Deep Focus lock — shows a modal if user tries to navigate away during a deep focus session. |
| **NavLink** | `NavLink.tsx` | Simple router-aware link wrapper. |
| **CalendarSection** | `CalendarSection.tsx` | Embedded on Dashboard. Shows up to 3 upcoming tasks with toggle-complete and delete actions. Contains an "Add New" dialog (Radix Dialog + Radix Select) for creating calendar items. |
| **PetSelectModal** | `PetSelectModal.tsx` | Bottom-sheet modal for choosing the active study pet. Shows catalog with unlock status, mood, and cost. Calls `/pets/select` and `/pets/unlock`. |
| **AmbientSoundPicker** | `AmbientSoundPicker.tsx` | Bottom-sheet sound selector for focus sessions. Lets user pick soundscape (rain, ocean, café, etc.) and adjust volume. |
| **OfflineBanner** | `OfflineBanner.tsx` | Thin banner shown when network is offline. Minimal implementation. |
| **ErrorBoundary** | `ErrorBoundary.tsx` | React class error boundary wrapping the app to catch render errors gracefully. |

### UI Primitives (`src/components/ui/` — 55 files)
All Radix UI based. Key ones used in the app:

| Component | Usage |
|-----------|-------|
| `button.tsx` | Primary/secondary/destructive/ghost variants |
| `dialog.tsx` | Modal dialogs (CalendarSection add form, etc.) |
| `select.tsx` | Dropdowns (calendar type, subject picker) |
| `input.tsx` | Text inputs across forms |
| `card.tsx` | Card container |
| `badge.tsx` | Label chips |
| `tabs.tsx` | Tab switching (Analytics, Profile sections) |
| `avatar.tsx` | User avatar display |
| `progress.tsx` | Linear progress bars |
| `chart.tsx` | Recharts wrapper (Analytics page) |
| `sonner.tsx` | Toast notification renderer |
| `sheet.tsx` | Side-drawer / bottom-sheet |
| `scroll-area.tsx` | Custom scrollable regions |
| `skeleton.tsx` | Loading placeholder shimmer |
| `separator.tsx` | Horizontal/vertical dividers |
| `form.tsx` | React Hook Form integration |
| `sidebar.tsx` | Full sidebar component (not used in main nav) |

### Inline Sub-Components (defined inside page files)

| Sub-Component | Defined In | Purpose |
|--------------|------------|---------|
| **CircularPicker** | `FocusSession.tsx` | SVG-based circular drag timer picker (0–120 min) |
| **ProgressRing** | `FocusSession.tsx` | SVG progress ring shown during active session |
| **PlantCarousel** | `FocusSession.tsx` | Swipeable plant selector with dot indicators |
| **WalletModal** | `FocusSession.tsx` | Bottom-sheet plant list view during a session |

---

## 9. Design Patterns Being Followed

### 1. Mobile-First, App-Shell Pattern
- All pages use `<MobileLayout>` which constrains content to `max-w-md mx-auto`
- The app mimics a native mobile app (bottom nav, no sidebar, no top nav bar)
- iOS safe area insets handled via CSS (`env(safe-area-inset-*)`)
- Deployed via Capacitor to Android as a WebView app

### 2. Glassmorphism Cards
Two glass utility classes defined in `index.css`:
- `.glass` — semi-transparent frosted panels (`rgba(255,255,255,0.5)` + `backdrop-filter: blur(12px)`)
- `.glass-strong` — heavier frosted glass (`rgba(245,240,232,0.85)` + `blur(20px)`)
- Used extensively on cards, nav, modals, and session timer panels

### 3. Context + Query Split
- **Global/user state** → React Context (`AuthContext`, `UserContext`, `SessionContext`)
- **Server-fetched data** → TanStack React Query with `queryKey` caching
- Never mixing: Context holds identity/session state; React Query handles all API fetches

### 4. State Machine for Sessions
`SessionContext` manages the focus session as an explicit state machine:
- States: `idle` → `running` → `paused` → `completed` / `aborted`
- Transitions: `startSession`, `pauseSession`, `resumeSession`, `completeSession`, `stopSession`
- A single `elapsedSecs` ticker runs in a `setInterval` inside the context

### 5. Optimistic / Mutation-First UI
- TanStack Query `useMutation` with `onSuccess` cache invalidation (not optimistic update)
- `queryClient.invalidateQueries` triggers refetch after any mutation

### 6. Page-Level Data Loading
Each page fetches its own data via `useQuery`. No global data prefetch. `UserContext` is the exception — it pre-loads user, subjects, plants, stats, and wallet on mount.

### 7. Radix Dialog for All Modals
All overlays (add calendar item, pet select, ambient sound, wallet plant list, deep focus lock warning) use either Radix `Dialog` or custom fixed-position overlays with `backdrop-blur-sm`.

### 8. Accent Color per Subject
Each study subject has a `accentColor` hex string stored in the DB. Used inline as `style={{ color: item.accentColor }}` on subject labels and progress bars — not a Tailwind class.

### 9. `fetchApi` Wrapper Pattern
All API calls go through `src/utils/api.ts`'s `fetchApi`:
- Automatically injects `Authorization: Bearer <token>` header
- Base URL configurable via `VITE_API_BASE_URL` env var
- Returns parsed JSON or throws on non-2xx responses

### 10. Micro-Animations
Defined as CSS `@keyframes` in `index.css` and exposed as Tailwind utility classes:
| Class | Effect |
|-------|--------|
| `animate-float` | Gentle 3s up-down bob (plants, pets) |
| `animate-grow` | Scale in from 0.95 (card entrance) |
| `animate-pulse-glow` | Opacity pulse (glow effects) |
| `animate-night-glow` | Drop-shadow pulse (dark mode plants) |
| `animate-pulse` (Tailwind) | Dot indicator pulse (active session badge) |

---

## 10. Current Screens & User Flow

### Screen Inventory

| Route | File | Screen Name | Requires Auth |
|-------|------|-------------|---------------|
| `/` | `Index.tsx` | **Dashboard** | Yes |
| `/focus` | `FocusSession.tsx` | **Focus Session** | Yes |
| `/garden` | `Garden.tsx` | **Garden** | Yes |
| `/arena` | `Arena.tsx` | **Arena (Challenges)** | Yes |
| `/profile` | `Profile.tsx` | **Profile** | Yes |
| `/analytics` | `Analytics.tsx` | **Analytics** | Yes |
| `/store` | `Store.tsx` | **Store** | Yes |
| `/transactions` | `TransactionHistory.tsx` | **Transaction History** | Yes |
| `/admin` | `AdminPanel.tsx` | **Admin Panel** | Admin role |
| `/login` | `Login.tsx` | **Login** | No |
| `/register` | `Register.tsx` | **Register** | No |
| `/welcome` | `Welcome.tsx` | **Onboarding** | No |
| `*` | `NotFound.tsx` | **404** | No |

### User Flow

```
First Launch
    │
    ▼
[Welcome] ──────────────────────────────────────────────────────┐
  4-slide onboarding carousel                                    │
  Saves "focusoura_onboarded" to localStorage                   │
    │                                                            │
    ▼                                                            │
[Login] ◄──────────── [Register] (email or Google OAuth)        │
    │                                                            │
    └──────────────────────────────────────────────────────────►┘
                         Authenticated
                              │
                              ▼
                        [Dashboard /]
                  ┌───────────────────────┐
                  │ • Greeting + balance  │
                  │ • Streak card         │
                  │ • Calendar section    │
                  │ • Start session CTA   │
                  │ • Pet + plant preview │
                  │ • My Stats shortcut   │
                  └───────────────────────┘
                     Bottom Nav (5 tabs)
          ┌────────┬──────────┬──────────┬────────┐
          ▼        ▼          ▼          ▼        ▼
      [Garden]  [Focus]   [Arena]   [Profile]  [Home]
          │        │          │          │
          │        │          │          ├── Analytics
          │        │          │          ├── Store
          │        │          │          └── Transaction History
          │        │          │
          │        │          ├── My Challenges
          │        │          ├── Open Challenges
          │        │          └── Create Challenge
          │        │
          │        ├── [Idle] Plant picker + timer setup
          │        ├── [Running] Progress ring + controls
          │        ├── [Paused] Resume or stop
          │        └── [Done] Results + message exchange
          │
          ├── Plant gallery (per subject)
          ├── Add subject
          └── Plant growth detail

Focus Session State Machine:
  IDLE ──start──► RUNNING ──pause──► PAUSED ──resume──► RUNNING
    ▲                │                  │
    │           complete/stop      complete/stop
    │                │                  │
    └────reset────  DONE ◄──────────────┘
```

### Bottom Navigation Behaviour
- **Focus tab** is always elevated (raised, `bg-primary`) — primary CTA
- Shows green pulse dot when a session is active and user is on another tab
- Deep Focus sessions lock navigation — attempting to leave triggers a confirmation modal

### Session → Dashboard Feedback Loop
1. Session completes → `refreshData()` in `UserContext` refetches stats
2. Streak, today's minutes, coin balance, and plant growth all update on Dashboard
3. If 5 plants fully grown for first time → pet unlock toast fires once (guarded by `localStorage`)

---

## 11. Typography & Spacing Conventions

### Font Stack
Defined in `index.css` via Google Fonts import:

| Variable | Font | Use Case |
|----------|------|----------|
| `--app-font-sans` | `DM Sans` | All body text, labels, buttons, UI |
| `--app-font-serif` | `DM Serif Display` | Page headings (`<h1>`) only |
| `--app-font-mono` | `Menlo` | Timer display (MM:SS) |

Applied via Tailwind:
- `font-sans` → DM Sans (default on `body`)
- `font-serif` → DM Serif Display (used with `font-serif` class on `<h1>` elements)
- `font-mono` → Menlo (used on timer countdowns with `font-mono`)

### Typographic Scale (in use across pages)

| Size Class | Pixel Equivalent | Usage |
|------------|-----------------|-------|
| `text-[10px]` | 10px | Micro labels, dot indicators, tracking-wider uppercase |
| `text-xs` | 12px | Secondary labels, sub-descriptions |
| `text-sm` | 14px | Body text, card descriptions, nav labels |
| `text-base` | 16px | Standard body (rare) |
| `text-lg` | 18px | Section titles |
| `text-xl` | 20px | Modal headings |
| `text-2xl` | 24px | Page headings (`<h1>` on Dashboard) |
| `text-3xl` | 30px | Timer display, streak count |

### Font Weight Patterns
| Weight Class | Usage |
|-------------|-------|
| `font-normal` / `font-medium` | Body text, descriptions |
| `font-semibold` | Card titles, button labels, nav labels |
| `font-bold` | Timer display, streak numbers, emphasis |

### Letter Spacing
- `tracking-wider` + `uppercase` + `text-[10px]` / `text-xs` = section divider labels (e.g. "UPCOMING TASKS", "SESSION TYPE", "CHOOSE PLANT")

### Spacing System (Tailwind defaults, 4px base unit)

| Context | Spacing Used |
|---------|-------------|
| Page horizontal padding | `px-5` (20px) |
| Page top padding | `pt-6` (24px) |
| Card padding | `p-4` (16px) or `p-5` (20px) |
| Card border radius | `rounded-2xl` (16px) |
| Modal border radius | `rounded-3xl` (24px) |
| Button border radius | `rounded-full` (pill) or `rounded-xl` (12px) |
| Stack gap (vertical) | `space-y-5` (20px) between sections |
| Grid gap | `gap-3` (12px) for card grids |
| Bottom nav safe padding | `pb-24` (96px + safe area inset) |

### Border Radius Tokens
Defined relative to `--radius: 1rem` (16px):
| Token | Value | Tailwind Class |
|-------|-------|----------------|
| `--radius-sm` | 12px | `rounded-md` |
| `--radius-md` | 14px | `rounded-lg` |
| `--radius-lg` | 16px | `rounded-xl` / `rounded-2xl` |
| `--radius-xl` | 20px | `rounded-3xl` |

### Elevation & Shadow Conventions
- Cards: no explicit `box-shadow` — depth achieved through glassmorphism
- Active Focus tab: `shadow-lg shadow-primary/30`
- Modals: `shadow-2xl` on container
- Session bar: `shadow-lg shadow-primary/10`
- Buttons (primary CTA): `shadow-lg` + optional `hover:opacity-90`
