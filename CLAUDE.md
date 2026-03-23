# Food Tracker

## Quick Start

```bash
cd /Users/giallegretti/Documents/GitHub/Food_Tracker/food-tracker

# 1. Setup Convex (interactive - choose "create new project")
npx convex dev

# 2. In another terminal, seed the TACO database
npx tsx scripts/seed-taco.ts

# 3. Run the app
npm run dev
```

## Tech Stack
- Next.js 15 (App Router) + TypeScript
- shadcn/ui + Tailwind CSS v4
- Convex (real-time database)
- Recharts (charts - to be added)

## Project Structure
- `convex/` - Backend: schema, queries, mutations
- `src/app/` - Pages (App Router)
- `src/components/` - UI components (layout, food, meals, dashboard)
- `src/hooks/` - Custom hooks (useCurrentUser)
- `src/lib/` - Constants, utilities
- `scripts/` - Seed scripts

## Key Files
- `convex/schema.ts` - Database schema (8 tables)
- `convex/foods.ts` - Food search/CRUD
- `convex/dailyLog.ts` - Daily food logging
- `src/components/food/FoodSearch.tsx` - Main food autocomplete
- `src/components/food/PortionInput.tsx` - Portion calculator

## Users
Simple toggle (no auth): "giovanna" | "ricardo" stored in localStorage.

## Deploy Protocol

Every time changes are ready to publish, follow ALL three steps:

1. **git commit** — stage and commit the changes
2. **git push origin main** — triggers Vercel build (frontend)
3. **npx convex deploy --yes** — deploys backend functions to production

Convex deploy is NOT automatic. The `CONVEX_DEPLOY_KEY` is not yet configured on Vercel, so Convex must be deployed manually from the local machine after every push. Skipping step 3 means backend changes won't be reflected in production.

Production URLs:
- Convex: https://outstanding-aardvark-307.convex.cloud
- Vercel: auto-deployed from `main` branch

## TACO Data
597 foods from Brazilian food composition table, seeded via `scripts/seed-taco.ts`.
Source CSV: `../taco-main/formatados/alimentos.csv`
