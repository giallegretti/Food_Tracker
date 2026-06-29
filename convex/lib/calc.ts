/**
 * Cálculo de gasto energético — Mifflin-St Jeor.
 * Fonte única usada por userProfiles e weightLog para manter
 * basal/TDEE/meta sempre coerentes com o último peso registrado.
 */

export function calcBMR(
  sex: string,
  weight_kg: number,
  height_cm: number,
  age: number
): number {
  return sex === "F"
    ? 10 * weight_kg + 6.25 * height_cm - 5 * age - 161
    : 10 * weight_kg + 6.25 * height_cm - 5 * age + 5;
}

/**
 * targetMode:
 *   "basal"   → meta do dia = o próprio basal (Giovanna). O déficit vem da
 *               diferença até a sedentária + medicação + exercício (lucro).
 *   default   → meta = TDEE − déficit fixo (Ricardo / comportamento original).
 */
export function computeMetrics(opts: {
  sex: string;
  weight_kg: number;
  height_cm: number;
  age: number;
  activityFactor: number;
  deficitKcal: number;
  targetMode?: string;
}): { bmr: number; tdee: number; targetKcal: number } {
  const bmr = calcBMR(opts.sex, opts.weight_kg, opts.height_cm, opts.age);
  const tdee = bmr * opts.activityFactor;
  const targetKcal =
    opts.targetMode === "basal" ? bmr : tdee - opts.deficitKcal;
  return { bmr, tdee, targetKcal };
}
