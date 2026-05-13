"use client";

import { createContext, useContext, useMemo, ReactNode } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { FoodItem } from "@/components/food/FoodSearch";
import { Doc } from "../../convex/_generated/dataModel";

type TacoLite = {
  _id: Doc<"foods">["_id"];
  name: string;
  nameNormalized: string;
  category: string;
  energy_kcal: number;
  protein_g: number;
  carbs_g: number;
  lipids_g: number;
  fiber_g: number;
};

type CustomLite = Doc<"customFoods">;

type FoodsCache = {
  ready: boolean;
  searchFoods: (term: string, limit?: number) => FoodItem[];
};

const Ctx = createContext<FoodsCache | null>(null);

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim();
}

export function FoodsCacheProvider({ children }: { children: ReactNode }) {
  const taco = useQuery(api.foods.list) as TacoLite[] | undefined;
  const custom = useQuery(api.customFoods.list) as CustomLite[] | undefined;

  const value = useMemo<FoodsCache>(() => {
    const ready = taco !== undefined && custom !== undefined;

    const searchFoods = (term: string, limit = 15): FoodItem[] => {
      if (!ready) return [];
      const q = normalize(term);
      if (!q) return [];
      const tokens = q.split(/\s+/).filter(Boolean);
      const matches = (hay: string) => tokens.every((t) => hay.includes(t));

      const out: FoodItem[] = [];

      for (const f of custom!) {
        if (matches(f.nameNormalized)) {
          out.push({
            _id: f._id,
            name: f.name,
            category: undefined,
            energy_kcal: f.energy_kcal,
            protein_g: f.protein_g,
            carbs_g: f.carbs_g,
            lipids_g: f.lipids_g,
            fiber_g: f.fiber_g,
            isCustom: true,
          });
          if (out.length >= limit) return out;
        }
      }

      for (const f of taco!) {
        if (matches(f.nameNormalized)) {
          out.push({
            _id: f._id,
            name: f.name,
            category: f.category,
            energy_kcal: f.energy_kcal,
            protein_g: f.protein_g,
            carbs_g: f.carbs_g,
            lipids_g: f.lipids_g,
            fiber_g: f.fiber_g,
            isCustom: false,
          });
          if (out.length >= limit) return out;
        }
      }

      return out;
    };

    return { ready, searchFoods };
  }, [taco, custom]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useFoodsCache(): FoodsCache {
  const v = useContext(Ctx);
  if (!v) throw new Error("useFoodsCache must be used inside FoodsCacheProvider");
  return v;
}
