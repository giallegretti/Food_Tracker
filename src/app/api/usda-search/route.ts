import { NextRequest, NextResponse } from "next/server";

const BASE = "https://api.nal.usda.gov/fdc/v1/foods/search";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q");
  if (!q) return NextResponse.json({ foods: [] });

  const apiKey = process.env.USDA_API_KEY || "DEMO_KEY";

  const url = new URL(BASE);
  url.searchParams.set("query", q);
  url.searchParams.set("pageSize", "25");
  url.searchParams.set("dataType", "Foundation,SR Legacy,Survey (FNDDS),Branded");
  url.searchParams.set("api_key", apiKey);

  const res = await fetch(url.toString());
  if (!res.ok) {
    return NextResponse.json({ foods: [] }, { status: 502 });
  }

  const data = await res.json();
  return NextResponse.json({ foods: data.foods ?? [] });
}
