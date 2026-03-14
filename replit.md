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

- **Quests**: View, create, update status (active/completed/failed), delete quests with difficulty levels and XP rewards
- **Creatures**: Sea creature collection gallery with rarity badges (common → legendary)
- **Achievements**: Achievement panel with category badges and unlock status
- **Dashboard**: Overview of active quests, stats, and progress

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
│           ├── quests.ts       # Quests table (difficulty, status, xp, depth)
│           ├── creatures.ts    # Sea creatures table (rarity, depth, emoji)
│           └── achievements.ts # Achievements table (category, unlocked_at)
└── scripts/
```

## API Routes

- `GET /api/healthz` — Health check
- `GET /api/quests` — List all quests
- `POST /api/quests` — Create quest
- `GET /api/quests/:id` — Get quest
- `PATCH /api/quests/:id` — Update quest
- `DELETE /api/quests/:id` — Delete quest
- `GET /api/creatures` — List discovered creatures
- `GET /api/achievements` — List achievements

## TypeScript & Composite Projects

Every package extends `tsconfig.base.json` which sets `composite: true`. Root `tsconfig.json` lists all lib packages as project references.

## Root Scripts

- `pnpm run build` — runs `typecheck` first, then recursively runs `build` in all packages
- `pnpm run typecheck` — runs `tsc --build --emitDeclarationOnly` using project references

## Database

Run codegen and schema push:
- `pnpm --filter @workspace/api-spec run codegen`
- `pnpm --filter @workspace/db run push`
