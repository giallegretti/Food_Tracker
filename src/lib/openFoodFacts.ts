export type ExternalSource = "off" | "usda";

export type ExternalProduct = {
  product_name: string;
  brands?: string;
  energy_kcal: number;
  protein_g: number;
  carbs_g: number;
  lipids_g: number;
  fiber_g: number;
  source: ExternalSource;
};

export type OFFProduct = ExternalProduct;

type USDANutrient = {
  nutrientId?: number;
  nutrientName?: string;
  value?: number;
  unitName?: string;
};

function parseOFF(raw: unknown): ExternalProduct[] {
  const data = raw as { products?: Array<Record<string, unknown>> } | null;
  const out: ExternalProduct[] = [];

  for (const p of data?.products ?? []) {
    const name = p.product_name as string | undefined;
    const brands = p.brands as string | string[] | undefined;
    const n = (p.nutriments ?? {}) as Record<string, number | undefined>;
    const kcal = n["energy-kcal_100g"] ?? n["energy-kcal"];

    if (!name || kcal == null || kcal === 0) continue;

    const brandStr = Array.isArray(brands) ? brands.join(", ") : brands;

    out.push({
      product_name: brandStr ? `${name} (${brandStr})` : name,
      brands: brandStr,
      energy_kcal: Number(kcal),
      protein_g: Number(n.proteins_100g ?? 0),
      carbs_g: Number(n.carbohydrates_100g ?? 0),
      lipids_g: Number(n.fat_100g ?? 0),
      fiber_g: Number(n.fiber_100g ?? 0),
      source: "off",
    });
  }
  return out;
}

function getUSDANutrient(nutrients: USDANutrient[], id: number): number {
  const match = nutrients.find((nu) => nu.nutrientId === id);
  return match?.value ? Number(match.value) : 0;
}

function parseUSDA(raw: unknown): ExternalProduct[] {
  const data = raw as { foods?: Array<Record<string, unknown>> } | null;
  const out: ExternalProduct[] = [];

  for (const f of data?.foods ?? []) {
    const name = (f.description as string) || "";
    const brand = (f.brandName as string) || (f.brandOwner as string) || "";
    const nutrients = (f.foodNutrients ?? []) as USDANutrient[];

    const kcal = getUSDANutrient(nutrients, 1008);
    if (!name || !kcal) continue;

    out.push({
      product_name: brand ? `${name} (${brand})` : name,
      brands: brand || undefined,
      energy_kcal: kcal,
      protein_g: getUSDANutrient(nutrients, 1003),
      carbs_g: getUSDANutrient(nutrients, 1005),
      lipids_g: getUSDANutrient(nutrients, 1004),
      fiber_g: getUSDANutrient(nutrients, 1079),
      source: "usda",
    });
  }
  return out;
}

async function fetchJson(url: string) {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function searchOpenFoodFacts(
  query: string
): Promise<ExternalProduct[]> {
  const q = encodeURIComponent(query);
  const [offRaw, usdaRaw] = await Promise.all([
    fetchJson(`/api/off-search?q=${q}`),
    fetchJson(`/api/usda-search?q=${q}`),
  ]);

  const off = offRaw ? parseOFF(offRaw) : [];
  const usda = usdaRaw ? parseUSDA(usdaRaw) : [];

  return [...off, ...usda];
}
