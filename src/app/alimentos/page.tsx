"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { BottomNav } from "@/components/layout/BottomNav";
import { FoodSearch } from "@/components/food/FoodSearch";
import { PortionInput } from "@/components/food/PortionInput";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Doc } from "../../../convex/_generated/dataModel";

export default function AlimentosPage() {
  const [selectedFood, setSelectedFood] = useState<Doc<"foods"> | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const categories = useQuery(api.foods.categories);
  const foodsByCategory = useQuery(
    api.foods.byCategory,
    selectedCategory ? { category: selectedCategory } : "skip"
  );
  const foodCount = useQuery(api.foods.count);

  return (
    <div className="min-h-screen pb-24">
      <div className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl safe-top">
        <div className="mx-auto max-w-md px-4 py-3 space-y-2">
          <div className="flex items-center justify-between">
            <h1 className="text-base font-bold tracking-tight">Alimentos TACO</h1>
            {foodCount !== undefined && (
              <span className="text-[11px] text-muted-foreground tabular-nums">
                {foodCount} itens
              </span>
            )}
          </div>
          <FoodSearch
            onSelect={(food) => setSelectedFood(food)}
            placeholder="Buscar alimento por nome..."
          />
        </div>
      </div>

      <div className="mx-auto max-w-md px-4 py-3 space-y-4">
        {/* Portion input for selected food */}
        {selectedFood && (
          <PortionInput
            food={selectedFood}
            onConfirm={() => setSelectedFood(null)}
            onCancel={() => setSelectedFood(null)}
          />
        )}

        {/* Category filter */}
        {categories && (
          <div>
            <h2 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest mb-2 px-1">
              Categorias
            </h2>
            <div className="flex flex-wrap gap-1.5">
              {categories.map((cat) => (
                <Badge
                  key={cat}
                  variant={selectedCategory === cat ? "default" : "secondary"}
                  className="cursor-pointer text-[11px] rounded-lg active:scale-95 transition-all"
                  onClick={() =>
                    setSelectedCategory(selectedCategory === cat ? null : cat)
                  }
                >
                  {cat}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Foods in selected category */}
        {selectedCategory && foodsByCategory && (
          <div>
            <h2 className="text-xs font-semibold mb-2 px-1">
              {selectedCategory}{" "}
              <span className="text-muted-foreground font-normal">
                ({foodsByCategory.length})
              </span>
            </h2>
            <ScrollArea className="max-h-[60vh]">
              <div className="space-y-1">
                {foodsByCategory.map((food) => (
                  <button
                    key={food._id}
                    className="w-full text-left rounded-xl bg-card p-3 hover:bg-accent/50 active:scale-[0.98] transition-all"
                    onClick={() => setSelectedFood(food)}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-medium leading-tight flex-1 min-w-0">
                        {food.name}
                      </p>
                      <div className="text-right shrink-0">
                        <div className="text-sm font-bold text-primary tabular-nums">
                          {Math.round(food.energy_kcal)}
                        </div>
                        <div className="text-[10px] text-muted-foreground tabular-nums">
                          P:{food.protein_g.toFixed(1)} C:{food.carbs_g.toFixed(1)} G:{food.lipids_g.toFixed(1)}
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
