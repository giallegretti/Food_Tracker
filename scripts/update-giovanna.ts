/**
 * Atualiza só o perfil da Giovanna (sem re-seedar TACO).
 *
 * Revisão 29/06/2026 — modelo "meta = basal":
 *   - A meta diária deixa de ser um déficit agressivo (estava ~1.471, ABAIXO
 *     do basal) e passa a ser o PRÓPRIO BASAL. Comer abaixo do basal por meses
 *     sob GLP-1 + perda rápida é o risco (massa magra, vesícula/MASLD).
 *   - targetMode: "basal" → meta do dia = basal, recalculado pelo último peso.
 *   - O emagrecimento vem da diferença basal→sedentária (~350/dia) + medicação
 *     + exercício (lucro, não entra na meta).
 *   - Sedentária (×1,2) fica como referência de manutenção.
 *   - Macros 30/40/30 sobre o basal; com mais kcal a proteína sobe em gramas
 *     (~1,3 g/kg), o que protege massa magra.
 *
 * Peso: NÃO inputa nada — usa o último registro de peso já no app (datas
 * corretas preservadas).
 *
 * Uso: npx tsx scripts/update-giovanna.ts
 */

import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api";
import { computeMetrics } from "../convex/lib/calc";

const PROD_URL = "https://outstanding-aardvark-307.convex.cloud";

async function main() {
  const url = process.env.CONVEX_URL || PROD_URL;
  const client = new ConvexHttpClient(url);

  // Usa o ÚLTIMO peso registrado no app (não cria registro novo).
  const weights = await client.query(api.weightLog.getByUser, {
    userId: "giovanna",
  });
  const latest = [...(weights ?? [])].sort((a, b) =>
    b.date.localeCompare(a.date)
  )[0];
  if (!latest) throw new Error("Sem registro de peso para a Giovanna.");
  const weight_kg = latest.weight_kg;

  const age = 29;
  const height_cm = 169;
  const activityFactor = 1.2;
  const { bmr, tdee } = computeMetrics({
    sex: "F",
    weight_kg,
    height_cm,
    age,
    activityFactor,
    deficitKcal: 0,
    targetMode: "basal",
  });

  // Orçamentos por refeição reescalados para somar o basal atual.
  const frac = {
    cafeDaManha: 0.195,
    almoco: 0.293,
    lanche: 0.161,
    jantar: 0.282,
    doce: 0.069,
  };
  const r = (x: number) => Math.round((bmr * x) / 5) * 5; // múltiplos de 5
  const modules = {
    cafeDaManha: r(frac.cafeDaManha),
    almoco: r(frac.almoco),
    lanche: r(frac.lanche),
    jantar: r(frac.jantar),
    doce: r(frac.doce),
  };

  await client.mutation(api.userProfiles.upsert, {
    userId: "giovanna",
    name: "Giovanna",
    sex: "F",
    age,
    weight_kg,
    height_cm,
    activityFactor,
    deficitKcal: Math.round(tdee - bmr), // referência (sedentária − basal); não usado p/ a meta
    targetMode: "basal",
    proteinPct: 30,
    carbsPct: 40,
    fatPct: 30,
    modules,
  });

  const modSum = Object.values(modules).reduce((s, v) => s + v, 0);
  console.log("Perfil da Giovanna atualizado.");
  console.log(`  URL: ${url}`);
  console.log(`  Peso (último registro ${latest.date}): ${weight_kg} kg`);
  console.log(`  Basal = Meta do dia: ${Math.round(bmr)} kcal`);
  console.log(`  Sedentária (manutenção): ${Math.round(tdee)} kcal`);
  console.log(`  Déficit natural até a sedentária: ${Math.round(tdee - bmr)} kcal/dia`);
  console.log(
    `  Macros: 30% proteína (${Math.round((bmr * 0.3) / 4)} g · ${(
      (bmr * 0.3) / 4 / weight_kg
    ).toFixed(2)} g/kg) / 40% carb (${Math.round(
      (bmr * 0.4) / 4
    )} g) / 30% gordura (${Math.round((bmr * 0.3) / 9)} g)`
  );
  console.log(
    `  Módulos: café ${modules.cafeDaManha} · almoço ${modules.almoco} · lanche ${modules.lanche} · jantar ${modules.jantar} · doce ${modules.doce} (soma ${modSum})`
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
