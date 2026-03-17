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

## TACO Data
597 foods from Brazilian food composition table, seeded via `scripts/seed-taco.ts`.
Source CSV: `../taco-main/formatados/alimentos.csv`
