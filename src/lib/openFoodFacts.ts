export type OFFProduct = {
  product_name: string;
  brands?: string;
  energy_kcal: number;
  protein_g: number;
  carbs_g: number;
  lipids_g: number;
  fiber_g: number;
};

export async function searchOpenFoodFacts(
  query: string,
  limit = 10
): Promise<OFFProduct[]> {
  const url = new URL(
    "https://world.openfoodfacts.org/cgi/search.pl"
  );
  url.searchParams.set("search_terms", query);
  url.searchParams.set("search_simple", "1");
  url.searchParams.set("action", "process");
  url.searchParams.set("json", "1");
  url.searchParams.set("page_size", String(limit));
  url.searchParams.set("countries_tags_en", "brazil");
  url.searchParams.set("fields", "product_name,brands,nutriments");

  const res = await fetch(url.toString());
  if (!res.ok) throw new Error("Erro ao buscar no Open Food Facts");

  const data = await res.json();
  const products: OFFProduct[] = [];

  for (const p of data.products ?? []) {
    const name = p.product_name;
    const n = p.nutriments ?? {};
    const kcal =
      n["energy-kcal_100g"] ?? n["energy-kcal"] ?? null;

    if (!name || kcal == null || kcal === 0) continue;

    products.push({
      product_name: p.brands ? `${name} (${p.brands})` : name,
      brands: p.brands,
      energy_kcal: Number(kcal),
      protein_g: Number(n.proteins_100g ?? 0),
      carbs_g: Number(n.carbohydrates_100g ?? 0),
      lipids_g: Number(n.fat_100g ?? 0),
      fiber_g: Number(n.fiber_100g ?? 0),
    });
  }

  return products;
}
