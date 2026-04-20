import { NextRequest, NextResponse } from "next/server";

const BASE = "https://search.openfoodfacts.org/search";
const FIELDS = "product_name,brands,nutriments,countries_tags";
const PAGE_SIZE = 25;

async function runSearch(q: string, brazilOnly: boolean) {
  const url = new URL(BASE);
  const query = brazilOnly ? `${q} countries_tags:"en:brazil"` : q;
  url.searchParams.set("q", query);
  url.searchParams.set("page_size", String(PAGE_SIZE));
  url.searchParams.set("fields", FIELDS);

  const res = await fetch(url.toString(), {
    headers: {
      "User-Agent": "FoodTracker/1.0 (github.com/giallegretti/Food_Tracker)",
    },
  });

  if (!res.ok) return null;
  const data = await res.json();
  return Array.isArray(data.hits) ? data.hits : [];
}

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q");
  if (!q) return NextResponse.json({ products: [] });

  let hits = await runSearch(q, true);
  if (!hits || hits.length === 0) {
    hits = await runSearch(q, false);
  }

  if (!hits) return NextResponse.json({ products: [] }, { status: 502 });

  return NextResponse.json({ products: hits });
}
