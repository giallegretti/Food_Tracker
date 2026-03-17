"use client";

import { useState, useCallback } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Input } from "@/components/ui/input";
import { Doc } from "../../../convex/_generated/dataModel";

interface FoodSearchProps {
  onSelect: (food: Doc<"foods">) => void;
  placeholder?: string;
}

export function FoodSearch({
  onSelect,
  placeholder = "Buscar alimento...",
}: FoodSearchProps) {
  const [search, setSearch] = useState("");

  const results = useQuery(
    api.foods.search,
    search.trim().length >= 2 ? { searchTerm: search, limit: 20 } : "skip"
  );

  const handleSelect = useCallback(
    (food: Doc<"foods">) => {
      onSelect(food);
      setSearch("");
    },
    [onSelect]
  );

  const isSearching = search.trim().length >= 2;

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
                  key={food._id}
                  onClick={() => handleSelect(food)}
                  className="flex w-full items-center gap-3 px-4 py-3 text-left active:bg-accent transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium leading-snug">
                      {food.name}
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {food.category} · P:{food.protein_g.toFixed(1)}g C:{food.carbs_g.toFixed(1)}g G:{food.lipids_g.toFixed(1)}g
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
