# AquaQuest Workspace

## Overview

pnpm workspace monorepo using TypeScript. An ocean exploration quest-tracking app called **AquaQuest** with a dark navy/teal theme.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **Frontend**: React + Vite + Tailwind CSS + Framer Motion
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Theme

- Background: `#0A1628` (dark navy)
- Primary/Accent: `#0E7490` (teal)

## Features

- **Goals** (formerly Quests): View, create, update status (active/completed/failed), delete goals with category badges (Fitness/teal, Wellness/purple, Productivity/gold), type labels, streak counters, progress bars, and dual filters (category + type)
- **Aquarium** (formerly Creatures): Ocean Summon gacha system + fish collection
  - **Ocean Summon**: Two banners — "Ocean Depths" (all rarities) and "Tidal Surge" (featured fish, boosted Legendary 5%)
  - Pull costs: 1x = 1 Spin Ticket or 100 Coins; 10x = 8 Spin Tickets or 800 Coins
  - Rarity rates: Common 60% / Rare 25% / Epic 12% / Legendary 2.75% / Mythical 0.25% (true random, no pity)
  - Pity system: guaranteed Epic+ every 50 pulls, guaranteed Legendary every 100 pulls; tracked per user in DB
  - 24 fish seeded across 5 rarities; featured fish (Anglerfish) boosted on Tidal Surge banner
  - Duplicate fish → 10 Stardust each
  - Summon animation: chest shake → light burst → rarity-glowing fish cards fan out (1x: single card; 10x: grid fan)
  - **My Collection**: filterable grid with rarity glow borders/colors, total fish count, stardust balance
  - **Stardust Shop**: 100 ✨ Stardust → 1 🎟️ Spin Ticket
  - All pull logic runs server-side; frontend only sends banner/count/currency
- **Achievements**: Achievement panel with category badges and unlock status
- **Dashboard**: Overview of active goals, stats, and progress
- **Workouts** (redesigned, web + mobile):
  - AI-powered 7-day personalized workout plan via Anthropic
  - Workout streak counter with flame icon
  - 7-day horizontal scrollable day selector (today highlighted teal, rest=moon, completed=checkmark)
  - Expandable exercise cards: muscle group badge (colored per group), sets/reps, numbered form guide steps, checkbox, per-exercise regenerate button
  - "Complete Workout" button (all exercises checked): awards 200 XP + 50 Coins + 3 Gems + 2 Spin Tickets, increments streak
  - History tab: past completed workouts with date, focus, exercise count
  - Profile setup modal (age, height, weight, goal, experience level)
  - New backend endpoints: `POST /workouts/complete-day`, `POST /workouts/regenerate-exercise`, `GET /workouts/completions`
- **Currency Header**: Persistent bar showing Coins 🪙, Gems 💎, Spin Tickets 🎟️ on every screen (web + mobile)
- **Deen Screen** (web + mobile):
  - Prayer times (Aladhan API, location-based) with per-prayer checkboxes
  - Hijri calendar with important Islamic dates highlighted
  - Quran tracker with daily goal and streak
  - Dhikr counter (SubhanAllah / Alhamdulillah / Allahu Akbar × 33)
  - Dua journal (create/expand/delete, stored in PostgreSQL)
  - Daily Hadith rotating from 30 authentic hadiths
  - 3 daily Sunnah act checkboxes
  - Deen Score circular progress ring (prayers 40% + quran 25% + dhikr 20% + sunnah 15%)

## Structure

```text
artifacts-monorepo/
├── artifacts/
│   ├── api-server/         # Express API server
│   └── aquaquest/          # React + Vite frontend (served at /)
├── lib/
│   ├── api-spec/           # OpenAPI spec + Orval codegen config
│   ├── api-client-react/   # Generated React Query hooks
│   ├── api-zod/            # Generated Zod schemas from OpenAPI
│   └── db/                 # Drizzle ORM schema + DB connection
│       └── src/schema/
│           ├── quests.ts       # Goals table (category, type, streak, progress, target_date)
│           ├── creatures.ts    # Sea creatures table (rarity, depth, emoji)
│           ├── achievements.ts # Achievements table (category, unlocked_at)
│           ├── workouts.ts     # user_profiles (+ workout_streak), workout_plans, workout_logs, workout_completions
│           ├── deen.ts         # user_currency, duas, deen_progress tables
│           └── ocean.ts        # fish_pool, user_fish, ocean_summons, user_stardust, user_summon_pity
└── scripts/
```

## API Routes

- `GET /api/healthz` — Health check
- `GET /api/quests` — List all goals (category, type, streak, progress, target_date)
- `POST /api/quests` — Create goal
- `GET /api/quests/:id` — Get goal
- `PATCH /api/quests/:id` — Update goal
- `DELETE /api/quests/:id` — Delete goal
- `GET /api/workouts/profile` — Get user workout profile (includes workoutStreak)
- `POST /api/workouts/profile` — Create/update workout profile
- `POST /api/workouts/generate` — Generate AI 7-day plan (with muscleGroup + formGuide per exercise)
- `GET /api/workouts/plans` — List all workout plans
- `GET /api/workouts/plans/:id` — Get specific plan
- `POST /api/workouts/logs` — Log exercise completion
- `GET /api/workouts/logs/:planId` — Get exercise logs for plan
- `POST /api/workouts/complete-day` — Complete a workout day (awards 50 Coins, 3 Gems, 2 Spin Tickets, increments streak)
- `GET /api/workouts/completions` — Get all completed workout days
- `POST /api/workouts/regenerate-exercise` — AI-regenerate a single exercise in the plan
- `GET /api/creatures` — List discovered creatures (old compendium)
- `GET /api/ocean-summon/pool` — All active fish in the pool
- `GET /api/ocean-summon/collection` — User's collected fish + stardust + pity counters
- `GET /api/ocean-summon/stardust` — User's stardust balance
- `POST /api/ocean-summon/pull` — Perform summon pull (banner, count 1|10, currency tickets|coins); full server-side logic including pity, deduplication, stardust, currency deduction
- `POST /api/ocean-summon/stardust-shop` — Spend 100 Stardust to get 1 Spin Ticket
- `GET /api/achievements` — List achievements
- `GET/PATCH /api/currency` — User currency (coins, gems, spin tickets)
- `GET/PATCH /api/deen/progress?date=YYYY-MM-DD` — Today's Deen progress
- `GET/POST /api/deen/duas` — Dua journal entries
- `DELETE /api/deen/duas/:id` — Delete a dua

## TypeScript & Composite Projects

Every package extends `tsconfig.base.json` which sets `composite: true`. Root `tsconfig.json` lists all lib packages as project references.

## Root Scripts

- `pnpm run build` — runs `typecheck` first, then recursively runs `build` in all packages
- `pnpm run typecheck` — runs `tsc --build --emitDeclarationOnly` using project references

## Database

Run codegen and schema push:
- `pnpm --filter @workspace/api-spec run codegen`
- `pnpm --filter @workspace/db run push`
