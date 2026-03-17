/**
 * Seed script to load TACO CSV data into Convex.
 *
 * Usage: npx tsx scripts/seed-taco.ts
 *
 * Requires CONVEX_URL environment variable or .env.local file.
 */

import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api";
import * as fs from "fs";
import * as path from "path";
import Papa from "papaparse";

function normalize(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[,\s]+/g, " ")
    .trim();
}

function parseNum(val: string | undefined): number | undefined {
  if (!val || val === "NA" || val === "*" || val === "Tr" || val === "-") {
    return undefined;
  }
  const n = parseFloat(val);
  if (isNaN(n)) return undefined;
  // Treat trace amounts (1e-05) as 0
  if (n < 0.001) return 0;
  return n;
}

function parseNumRequired(val: string | undefined): number {
  const n = parseNum(val);
  return n ?? 0;
}

async function main() {
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!convexUrl) {
    // Try reading from .env.local
    const envPath = path.join(__dirname, "..", ".env.local");
    if (fs.existsSync(envPath)) {
      const envContent = fs.readFileSync(envPath, "utf-8");
      const match = envContent.match(
        /NEXT_PUBLIC_CONVEX_URL=(.+)/
      );
      if (match) {
        process.env.NEXT_PUBLIC_CONVEX_URL = match[1].trim();
      }
    }
  }

  const url = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!url) {
    console.error(
      "NEXT_PUBLIC_CONVEX_URL not set. Run 'npx convex dev' first."
    );
    process.exit(1);
  }

  const client = new ConvexHttpClient(url);

  // Check if already seeded
  const count = await client.query(api.foods.count);
  if (count > 0) {
    console.log(`Database already has ${count} foods. Skipping seed.`);
    return;
  }

  // Read CSV
  const csvPath = path.join(
    __dirname,
    "..",
    "..",
    "taco-main",
    "formatados",
    "alimentos.csv"
  );

  if (!fs.existsSync(csvPath)) {
    console.error(`CSV not found at ${csvPath}`);
    process.exit(1);
  }

  const csvContent = fs.readFileSync(csvPath, "utf-8");
  const parsed = Papa.parse(csvContent, {
    header: true,
    skipEmptyLines: true,
  });

  console.log(`Parsed ${parsed.data.length} rows from CSV`);

  // Map rows to food objects
  const foods = (parsed.data as Record<string, string>[]).map((row) => {
    const name = (
      row["Descrição dos alimentos"] ||
      row["Descri..o.dos.alimentos"] ||
      row["Descrição.dos.alimentos"] ||
      // Fallback: try the third column key
      Object.values(row)[2] ||
      ""
    ).replace(/^"|"$/g, "");

    const category = (
      row["Categoria do alimento"] ||
      row["Categoria.do.alimento"] ||
      Object.values(row)[1] ||
      ""
    ).replace(/^"|"$/g, "");

    return {
      tacoId: parseInt(Object.values(row)[0]) || 0,
      category,
      name,
      nameNormalized: normalize(name),
      energy_kcal: parseNumRequired(
        row["Energia..kcal."] || row["Energia (kcal)"]
      ),
      energy_kj: parseNumRequired(
        row["Energia..kJ."] || row["Energia (kJ)"]
      ),
      protein_g: parseNumRequired(
        row["Proteína..g."] || row["Proteína (g)"]
      ),
      lipids_g: parseNumRequired(
        row["Lipídeos..g."] || row["Lipídeos (g)"]
      ),
      carbs_g: parseNumRequired(
        row["Carboidrato..g."] || row["Carboidrato (g)"]
      ),
      fiber_g: parseNumRequired(
        row["Fibra.Alimentar..g."] || row["Fibra Alimentar (g)"]
      ),
      cholesterol_mg: parseNum(
        row["Colesterol..mg."] || row["Colesterol (mg)"]
      ),
      sodium_mg: parseNum(row["Sódio..mg."] || row["Sódio (mg)"]),
      calcium_mg: parseNum(row["Cálcio..mg."] || row["Cálcio (mg)"]),
      iron_mg: parseNum(row["Ferro..mg."] || row["Ferro (mg)"]),
      potassium_mg: parseNum(
        row["Potássio..mg."] || row["Potássio (mg)"]
      ),
    };
  });

  // Filter out any invalid entries
  const validFoods = foods.filter((f) => f.name && f.tacoId > 0);
  console.log(`${validFoods.length} valid foods to insert`);

  // Batch insert (50 at a time to avoid payload limits)
  const BATCH_SIZE = 50;
  for (let i = 0; i < validFoods.length; i += BATCH_SIZE) {
    const batch = validFoods.slice(i, i + BATCH_SIZE);
    await client.mutation(api.foods.batchInsert, { foods: batch });
    console.log(
      `Inserted batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(
        validFoods.length / BATCH_SIZE
      )}`
    );
  }

  console.log(`Done! Seeded ${validFoods.length} foods.`);

  // Seed user profiles
  console.log("Seeding user profiles...");

  await client.mutation(api.userProfiles.upsert, {
    userId: "giovanna",
    name: "Giovanna",
    sex: "F",
    age: 29,
    weight_kg: 112,
    height_cm: 169,
    activityFactor: 1.2,
    deficitKcal: 500,
    proteinPct: 35,
    carbsPct: 40,
    fatPct: 25,
    modules: {
      cafeDaManha: 350,
      almoco: 500,
      lanche: 150,
      jantar: 550,
      doce: 150,
    },
  });

  await client.mutation(api.userProfiles.upsert, {
    userId: "ricardo",
    name: "Ricardo",
    sex: "M",
    age: 30,
    weight_kg: 112,
    height_cm: 178,
    activityFactor: 1.2,
    deficitKcal: 500,
    proteinPct: 30,
    carbsPct: 42,
    fatPct: 28,
    modules: {
      cafeDaManha: 450,
      almoco: 600,
      lanche: 200,
      jantar: 650,
      doce: 150,
    },
  });

  console.log("User profiles seeded!");
}

main().catch(console.error);
