"use client";

import { useState, useCallback, useMemo } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Id } from "../../../convex/_generated/dataModel";
import {
  searchOpenFoodFacts,
  type ExternalProduct,
} from "@/lib/openFoodFacts";
import { useFoodsCache } from "@/hooks/useFoodsCache";

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

interface FoodSearchProps {
  onSelect: (food: FoodItem) => void;
  placeholder?: string;
  createdBy?: string;
}

export function FoodSearch({
  onSelect,
  placeholder = "Buscar alimento...",
  createdBy,
}: FoodSearchProps) {
  const [search, setSearch] = useState("");

  // External search state (Open Food Facts + USDA)
  const [offResults, setOffResults] = useState<ExternalProduct[] | null>(null);
  const [offLoading, setOffLoading] = useState(false);
  const [offSaving, setOffSaving] = useState<number | null>(null);

  const addCustomFood = useMutation(api.customFoods.add);
  const { ready, searchFoods } = useFoodsCache();

  const isSearching = search.trim().length >= 2;

  const results = useMemo<FoodItem[] | undefined>(() => {
    if (!isSearching) return undefined;
    if (!ready) return undefined;
    return searchFoods(search, 15);
  }, [isSearching, ready, searchFoods, search]);

  const handleSelect = useCallback(
    (food: FoodItem) => {
      onSelect(food);
      setSearch("");
      setOffResults(null);
    },
    [onSelect]
  );

  const handleSearchOFF = useCallback(async () => {
    if (!search.trim()) return;
    setOffLoading(true);
    try {
      const products = await searchOpenFoodFacts(search.trim());
      setOffResults(products);
    } catch {
      setOffResults([]);
    } finally {
      setOffLoading(false);
    }
  }, [search]);

  const handleSelectOFF = useCallback(
    async (product: ExternalProduct, index: number) => {
      if (!createdBy) return;
      setOffSaving(index);
      try {
        const id = await addCustomFood({
          name: product.product_name,
          energy_kcal: product.energy_kcal,
          protein_g: product.protein_g,
          carbs_g: product.carbs_g,
          lipids_g: product.lipids_g,
          fiber_g: product.fiber_g,
          createdBy,
        });
        const foodItem: FoodItem = {
          _id: id,
          name: product.product_name,
          energy_kcal: product.energy_kcal,
          protein_g: product.protein_g,
          carbs_g: product.carbs_g,
          lipids_g: product.lipids_g,
          fiber_g: product.fiber_g,
          isCustom: true,
        };
        onSelect(foodItem);
        setSearch("");
        setOffResults(null);
      } finally {
        setOffSaving(null);
      }
    },
    [createdBy, addCustomFood, onSelect]
  );

  return (
    <div className="space-y-2">
      <Input
        value={search}
        onChange={(e) => {
          setSearch(e.target.value);
          setOffResults(null);
        }}
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
          ) : results.length === 0 && !offResults ? (
            <div className="p-4 text-center space-y-3">
              <p className="text-sm text-muted-foreground">
                Nenhum alimento encontrado para &quot;{search}&quot;
              </p>
              {createdBy && (
                <Button
                  variant="secondary"
                  className="rounded-xl h-10 px-4 text-sm font-medium"
                  onClick={handleSearchOFF}
                  disabled={offLoading}
                >
                  {offLoading ? "Buscando..." : "Buscar em bases externas"}
                </Button>
              )}
            </div>
          ) : (
            <>
              <div className="max-h-[40vh] overflow-y-auto overscroll-contain divide-y divide-border/30">
                {(results ?? []).map((food) => (
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

              {/* OFF search button at bottom of local results */}
              {createdBy && !offResults && (
                <div className="border-t border-border/30 p-3 text-center">
                  <Button
                    variant="ghost"
                    className="rounded-xl h-9 px-4 text-xs font-medium text-muted-foreground"
                    onClick={handleSearchOFF}
                    disabled={offLoading}
                  >
                    {offLoading
                      ? "Buscando..."
                      : "Nao encontrou? Buscar em bases externas"}
                  </Button>
                </div>
              )}
            </>
          )}

          {/* OFF results section */}
          {offResults !== null && (
            <div className="border-t border-primary/20">
              <div className="px-4 py-2 bg-primary/5">
                <span className="text-[10px] font-semibold text-primary uppercase tracking-wider">
                  Bases externas (OFF + USDA)
                </span>
              </div>
              {offResults.length === 0 ? (
                <div className="p-4 text-center text-sm text-muted-foreground">
                  Nenhum resultado nas bases externas
                </div>
              ) : (
                <div className="max-h-[30vh] overflow-y-auto overscroll-contain divide-y divide-border/30">
                  {offResults.map((product, i) => (
                    <button
                      key={i}
                      onClick={() => handleSelectOFF(product, i)}
                      disabled={offSaving !== null}
                      className="flex w-full items-center gap-3 px-4 py-3 text-left active:bg-accent transition-colors disabled:opacity-50"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium leading-snug">
                          {product.product_name}
                          <span
                            className={
                              "ml-1.5 text-[10px] font-medium px-1.5 py-0.5 rounded-full " +
                              (product.source === "usda"
                                ? "text-blue-600/70 bg-blue-500/10"
                                : "text-orange-600/70 bg-orange-500/10")
                            }
                          >
                            {product.source === "usda" ? "USDA" : "OFF"}
                          </span>
                        </p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          P:{product.protein_g.toFixed(1)}g C:{product.carbs_g.toFixed(1)}g G:{product.lipids_g.toFixed(1)}g
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-base font-bold text-primary tabular-nums">
                          {offSaving === i ? "..." : Math.round(product.energy_kcal)}
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
      )}
    </div>
  );
}
