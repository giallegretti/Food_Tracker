import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q");
  if (!q) {
    return NextResponse.json({ products: [] });
  }

  const url = new URL("https://world.openfoodfacts.org/cgi/search.pl");
  url.searchParams.set("search_terms", q);
  url.searchParams.set("search_simple", "1");
  url.searchParams.set("action", "process");
  url.searchParams.set("json", "1");
  url.searchParams.set("page_size", "15");
  url.searchParams.set("countries_tags_en", "brazil");
  url.searchParams.set("fields", "product_name,brands,nutriments");

  const res = await fetch(url.toString(), {
    headers: {
      "User-Agent": "FoodTracker/1.0 (github.com/giallegretti/Food_Tracker)",
    },
  });

  if (!res.ok) {
    return NextResponse.json({ products: [] }, { status: 502 });
  }

  const data = await res.json();
  return NextResponse.json(data);
}
