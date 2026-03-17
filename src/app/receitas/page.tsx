"use client";

import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { BottomNav } from "@/components/layout/BottomNav";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MODULE_LABELS, MODULE_ORDER } from "@/lib/constants";
import Link from "next/link";
import { useState } from "react";

export default function ReceitasPage() {
  const [filterModule, setFilterModule] = useState<string | null>(null);

  const recipes = useQuery(
    api.recipes.list,
    filterModule ? { module: filterModule } : {}
  );

  return (
    <div className="min-h-screen pb-24">
      <div className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl safe-top">
        <div className="mx-auto max-w-md px-4 py-3">
          <div className="flex items-center justify-between">
            <h1 className="text-base font-bold tracking-tight">Receitas</h1>
            <Link href="/receitas/nova">
              <Button size="sm" className="rounded-xl h-8 px-3 text-xs font-semibold">
                + Nova
              </Button>
            </Link>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-md px-4 py-3 space-y-4">
        {/* Module filter */}
        <div className="flex flex-wrap gap-1.5">
          <Badge
            variant={filterModule === null ? "default" : "secondary"}
            className="cursor-pointer text-[11px] rounded-lg active:scale-95 transition-all"
            onClick={() => setFilterModule(null)}
          >
            Todas
          </Badge>
          {MODULE_ORDER.map((mod) => (
            <Badge
              key={mod}
              variant={filterModule === mod ? "default" : "secondary"}
              className="cursor-pointer text-[11px] rounded-lg active:scale-95 transition-all"
              onClick={() =>
                setFilterModule(filterModule === mod ? null : mod)
              }
            >
              {MODULE_LABELS[mod]}
            </Badge>
          ))}
        </div>

        {/* Recipe list */}
        {recipes === undefined ? (
          <div className="text-center text-muted-foreground py-12 animate-pulse">
            Carregando...
          </div>
        ) : recipes.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Nenhuma receita encontrada</p>
            <p className="text-xs text-muted-foreground/60 mt-1">
              Crie receitas para logar refeicoes mais rapido
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {recipes.map((recipe) => (
              <div
                key={recipe._id}
                className="rounded-xl bg-card p-3 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold">{recipe.name}</h3>
                  <div className="flex items-center gap-1.5">
                    {recipe.isPreBuilt && (
                      <Badge variant="outline" className="text-[9px] rounded-md">
                        Pre-montada
                      </Badge>
                    )}
                    {recipe.module && (
                      <Badge variant="secondary" className="text-[9px] rounded-md">
                        {MODULE_LABELS[recipe.module]}
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                  <span>
                    {recipe.items.length} {recipe.items.length === 1 ? "item" : "itens"}
                  </span>
                  <div className="flex gap-3 tabular-nums">
                    <span className="font-bold text-foreground">
                      {Math.round(recipe.totalKcal)} kcal
                    </span>
                    <span>P:{recipe.totalProtein.toFixed(1)}</span>
                    <span>C:{recipe.totalCarbs.toFixed(1)}</span>
                    <span>G:{recipe.totalFat.toFixed(1)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
