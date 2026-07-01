/**
 * Popula o registro de doses do tratamento da Giovanna com o histórico REAL
 * (doses já aplicadas) extraído do relatório analítico (relatorio-tratamento-giovanna.html).
 *
 * Só entra o que foi de fato aplicado — o plano projetado (0,75 → 1,0 mg em jul/ago)
 * NÃO é semeado, porque a ideia é a Giovanna ir alimentando semana a semana com
 * a dose que realmente tomou (aba Peso › Tratamento › "Registrar mudança de dose").
 *
 * A mutation addEntry faz upsert por data: rodar de novo não duplica, só atualiza.
 *
 * Uso:
 *   npx tsx scripts/seed-doses-giovanna.ts
 *   # ou apontando p/ outro backend:
 *   CONVEX_URL=http://127.0.0.1:3210 npx tsx scripts/seed-doses-giovanna.ts
 */

import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api";

const PROD_URL = "https://outstanding-aardvark-307.convex.cloud";

// Doses APLICADAS (linhas em verde do cronograma do relatório).
const DOSES: Array<{
  date: string;
  dose_mg: number;
  medication?: string;
  note?: string;
}> = [
  { date: "2026-04-14", dose_mg: 0.25, medication: "Poviztra", note: "início (terça)" },
  { date: "2026-04-19", dose_mg: 0.25, medication: "Poviztra", note: "ajuste p/ domingo" },
  { date: "2026-04-26", dose_mg: 0.25, medication: "Poviztra" },
  { date: "2026-05-03", dose_mg: 0.25, medication: "Poviztra" },
  { date: "2026-05-10", dose_mg: 0.5, medication: "Poviztra", note: "1ª terapêutica" },
  { date: "2026-05-17", dose_mg: 0.5, medication: "Poviztra" },
  { date: "2026-05-24", dose_mg: 0.5, medication: "Poviztra" },
  { date: "2026-05-31", dose_mg: 0.5, medication: "Poviztra" },
  { date: "2026-06-07", dose_mg: 0.5, medication: "Poviztra" },
  { date: "2026-06-14", dose_mg: 0.38, medication: "Poviztra", note: "parcial — esvaziou a caneta" },
  { date: "2026-06-21", dose_mg: 0.5, medication: "Ozivy A", note: "abriu caneta A" },
  { date: "2026-06-28", dose_mg: 0.75, medication: "Ozivy A", note: "subiu p/ 0,75" },
];

async function main() {
  const url = process.env.CONVEX_URL || PROD_URL;
  const client = new ConvexHttpClient(url);
  console.log(`→ Semeando ${DOSES.length} doses da Giovanna em ${url}\n`);

  for (const d of DOSES) {
    await client.mutation(api.doseLog.addEntry, {
      userId: "giovanna",
      date: d.date,
      dose_mg: d.dose_mg,
      medication: d.medication,
      note: d.note,
    });
    console.log(
      `  ✓ ${d.date}  ${d.dose_mg.toLocaleString("pt-BR")} mg` +
        (d.medication ? `  (${d.medication})` : "")
    );
  }

  console.log("\n✅ Doses semeadas. Abra Peso › Tratamento para ver o gráfico.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
