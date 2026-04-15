/**
 * Atualiza só o perfil da Giovanna (sem re-seedar TACO).
 *
 * Contexto: semaglutida 0,25mg SC semanal (abr/2026)
 * TDEE estimada ~2.220 kcal · alvo 1.400 kcal/dia (faixa 1.300–1.500)
 * Proteína 132g (1,2 g/kg) · Carb 75–95g · Gordura 50–58g
 *
 * Uso: npx tsx scripts/update-giovanna.ts
 */

import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api";

async function main() {
  const url = process.env.CONVEX_URL || process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!url) {
    throw new Error("CONVEX_URL ou NEXT_PUBLIC_CONVEX_URL não definida");
  }

  const client = new ConvexHttpClient(url);

  await client.mutation(api.userProfiles.upsert, {
    userId: "giovanna",
    name: "Giovanna",
    sex: "F",
    age: 29,
    weight_kg: 110,
    height_cm: 169,
    activityFactor: 1.2,
    deficitKcal: 820,
    proteinPct: 40,
    carbsPct: 25,
    fatPct: 35,
    modules: {
      cafeDaManha: 280,
      almoco: 420,
      lanche: 200,
      jantar: 380,
      doce: 120,
    },
  });

  console.log("Perfil da Giovanna atualizado.");
  console.log("  Peso: 110 kg");
  console.log("  Target: ~1.400 kcal/dia");
  console.log("  Macros: 40% proteína / 25% carb / 35% gordura");
  console.log("  Módulos: café 280 · almoço 420 · lanche 200 · jantar 380 · doce 120");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
