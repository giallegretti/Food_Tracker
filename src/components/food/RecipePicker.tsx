"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Input } from "@/components/ui/input";
import { Doc } from "../../../convex/_generated/dataModel";

interface RecipePickerProps {
  onSelect: (recipe: Doc<"recipes">) => void;
}

export function RecipePicker({ onSelect }: RecipePickerProps) {
  const [search, setSearch] = useState("");
  const recipes = useQuery(api.recipes.list, {});

  const filtered = recipes?.filter((r) =>
    search.trim().length === 0
      ? true
      : r.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-2">
      <Input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Filtrar receitas..."
        className="h-12 rounded-xl bg-secondary border-0 text-base placeholder:text-muted-foreground/60"
        autoComplete="off"
      />

      <div className="rounded-xl border border-border/50 bg-card overflow-hidden">
        {filtered === undefined ? (
          <div className="p-4 text-center text-sm text-muted-foreground animate-pulse">
            Carregando receitas...
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-4 text-center text-sm text-muted-foreground">
            {recipes?.length === 0
              ? "Nenhuma receita salva ainda. Crie receitas na aba Receitas."
              : `Nenhuma receita encontrada para "${search}"`}
          </div>
        ) : (
          <div className="max-h-[40vh] overflow-y-auto overscroll-contain divide-y divide-border/30">
            {filtered.map((recipe) => (
              <button
                key={recipe._id}
                onClick={() => onSelect(recipe)}
                className="flex w-full items-center gap-3 px-4 py-3 text-left active:bg-accent transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium leading-snug">
                    {recipe.name}
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {recipe.items.length} {recipe.items.length === 1 ? "item" : "itens"} · P:{Math.round(recipe.totalProtein)}g C:{Math.round(recipe.totalCarbs)}g G:{Math.round(recipe.totalFat)}g
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-base font-bold text-primary tabular-nums">
                    {Math.round(recipe.totalKcal)}
                  </div>
                  <div className="text-[10px] text-muted-foreground">kcal</div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
