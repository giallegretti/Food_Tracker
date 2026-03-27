"use client";

import { useState, useCallback, useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Input } from "@/components/ui/input";
import { Doc, Id } from "../../../convex/_generated/dataModel";

export type FoodItem = {
  _id: Id<"foods"> | Id<"customFoods">;
  name: string;
  category?: string;
  energy_kcal: number;
  protein_g: number;
  carbs_g: number;
  lipids_g: number;
  fiber_g: number;
  isCustom: boolean;
};

function tacoToFoodItem(food: Doc<"foods">): FoodItem {
  return {
    _id: food._id,
    name: food.name,
    category: food.category,
    energy_kcal: food.energy_kcal,
    protein_g: food.protein_g,
    carbs_g: food.carbs_g,
    lipids_g: food.lipids_g,
    fiber_g: food.fiber_g,
    isCustom: false,
  };
}

function customToFoodItem(food: Doc<"customFoods">): FoodItem {
  return {
    _id: food._id,
    name: food.name,
    category: undefined,
    energy_kcal: food.energy_kcal,
    protein_g: food.protein_g,
    carbs_g: food.carbs_g,
    lipids_g: food.lipids_g,
    fiber_g: food.fiber_g,
    isCustom: true,
  };
}

interface FoodSearchProps {
  onSelect: (food: FoodItem) => void;
  placeholder?: string;
}

export function FoodSearch({
  onSelect,
  placeholder = "Buscar alimento...",
}: FoodSearchProps) {
  const [search, setSearch] = useState("");

  const isSearching = search.trim().length >= 2;

  const tacoResults = useQuery(
    api.foods.search,
    isSearching ? { searchTerm: search, limit: 15 } : "skip"
  );

  const customResults = useQuery(
    api.customFoods.search,
    isSearching ? { searchTerm: search, limit: 15 } : "skip"
  );

  const results = useMemo(() => {
    if (!isSearching) return undefined;
    if (tacoResults === undefined && customResults === undefined) return undefined;

    const items: FoodItem[] = [];

    // Custom foods first (user's own foods are more relevant)
    if (customResults) {
      items.push(...customResults.map(customToFoodItem));
    }
    if (tacoResults) {
      items.push(...tacoResults.map(tacoToFoodItem));
    }

    return items;
  }, [isSearching, tacoResults, customResults]);

  const handleSelect = useCallback(
    (food: FoodItem) => {
      onSelect(food);
      setSearch("");
    },
    [onSelect]
  );

  return (
    <div className="space-y-2">
      <Input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder={placeholder}
        className="h-12 rounded-xl bg-secondary border-0 text-base placeholder:text-muted-foreground/60"
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck={false}
      />

      {isSearching && (
        <div className="rounded-xl border border-border/50 bg-card overflow-hidden">
          {results === undefined ? (
            <div className="p-4 text-center text-sm text-muted-foreground animate-pulse">
              Buscando...
            </div>
          ) : results.length === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              Nenhum alimento encontrado para &quot;{search}&quot;
            </div>
          ) : (
            <div className="max-h-[40vh] overflow-y-auto overscroll-contain divide-y divide-border/30">
              {results.map((food) => (
                <button
                  key={String(food._id)}
                  onClick={() => handleSelect(food)}
                  className="flex w-full items-center gap-3 px-4 py-3 text-left active:bg-accent transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium leading-snug">
                      {food.name}
                      {food.isCustom && (
                        <span className="ml-1.5 text-[10px] font-medium text-primary/70 bg-primary/10 px-1.5 py-0.5 rounded-full">
                          personalizado
                        </span>
                      )}
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {food.category ? `${food.category} · ` : ""}P:{food.protein_g.toFixed(1)}g C:{food.carbs_g.toFixed(1)}g G:{food.lipids_g.toFixed(1)}g
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-base font-bold text-primary tabular-nums">
                      {Math.round(food.energy_kcal)}
                    </div>
                    <div className="text-[10px] text-muted-foreground">kcal</div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
