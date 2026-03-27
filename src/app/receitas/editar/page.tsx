"use client";

import { useState, useCallback, useEffect, Suspense } from "react";
import { useQuery, useMutation } from "convex/react";
import { useSearchParams, useRouter } from "next/navigation";
import { api } from "../../../../convex/_generated/api";
import { BottomNav } from "@/components/layout/BottomNav";
import { FoodSearch } from "@/components/food/FoodSearch";
import { PortionInput } from "@/components/food/PortionInput";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { MODULE_ORDER, MODULE_LABELS } from "@/lib/constants";
import { Doc, Id } from "../../../../convex/_generated/dataModel";
import type { FoodItem } from "@/components/food/FoodSearch";

interface RecipeItem {
  foodId: Id<"foods">;
  name: string;
  portionGrams: number;
  energy_kcal: number;
  protein_g: number;
  carbs_g: number;
  lipids_g: number;
}

function EditarReceitaContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const recipeId = searchParams.get("id") as Id<"recipes"> | null;

  const recipe = useQuery(
    api.recipes.getById,
    recipeId ? { id: recipeId } : "skip"
  );
  const updateRecipe = useMutation(api.recipes.update);

  const [name, setName] = useState("");
  const [module, setModule] = useState<string | undefined>(undefined);
  const [items, setItems] = useState<RecipeItem[]>([]);
  const [selectedFood, setSelectedFood] = useState<FoodItem | null>(null);
  const [loaded, setLoaded] = useState(false);

  // Load recipe data once
  useEffect(() => {
    if (recipe && !loaded) {
      setName(recipe.name);
      setModule(recipe.module);
      setItems(
        recipe.items.map((item) => ({
          foodId: item.foodId,
          name: item.name,
          portionGrams: item.portionGrams,
          energy_kcal: item.energy_kcal,
          protein_g: item.protein_g,
          carbs_g: item.carbs_g,
          lipids_g: item.lipids_g,
        }))
      );
      setLoaded(true);
    }
  }, [recipe, loaded]);

  const handleAddFood = useCallback(
    (food: FoodItem, grams: number) => {
      const factor = grams / 100;
      setItems((prev) => [
        ...prev,
        {
          foodId: food._id as Id<"foods">,
          name: food.name,
          portionGrams: grams,
          energy_kcal: food.energy_kcal * factor,
          protein_g: food.protein_g * factor,
          carbs_g: food.carbs_g * factor,
          lipids_g: food.lipids_g * factor,
        },
      ]);
      setSelectedFood(null);
    },
    []
  );

  const handleSave = async () => {
    if (!recipeId || !name.trim() || items.length === 0) return;
    await updateRecipe({
      id: recipeId,
      name: name.trim(),
      module,
      items,
    });
    router.push("/receitas");
  };

  if (!recipeId) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-muted-foreground">Receita nao encontrada</div>
      </div>
    );
  }

  if (!loaded) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-muted-foreground animate-pulse">Carregando...</div>
      </div>
    );
  }

  const totalKcal = items.reduce((s, i) => s + i.energy_kcal, 0);
  const totalProtein = items.reduce((s, i) => s + i.protein_g, 0);
  const totalCarbs = items.reduce((s, i) => s + i.carbs_g, 0);
  const totalFat = items.reduce((s, i) => s + i.lipids_g, 0);

  return (
    <div className="min-h-screen pb-24">
      <div className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl safe-top">
        <div className="mx-auto max-w-md px-4 py-3 flex items-center justify-between">
          <h1 className="text-base font-bold tracking-tight">
            Editar Receita
          </h1>
          <button
            onClick={() => router.push("/receitas")}
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            Cancelar
          </button>
        </div>
      </div>

      <div className="mx-auto max-w-md px-4 py-3 space-y-4">
        <div>
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">
            Nome
          </label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex: Marmita de frango com arroz"
            className="h-11 rounded-xl bg-secondary border-0 text-sm"
          />
        </div>

        <div>
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">
            Modulo (opcional)
          </label>
          <div className="flex flex-wrap gap-1.5">
            {MODULE_ORDER.map((mod) => (
              <Badge
                key={mod}
                variant={module === mod ? "default" : "secondary"}
                className="cursor-pointer text-[11px] rounded-lg active:scale-95 transition-all"
                onClick={() => setModule(module === mod ? undefined : mod)}
              >
                {MODULE_LABELS[mod]}
              </Badge>
            ))}
          </div>
        </div>

        {selectedFood ? (
          <PortionInput
            food={selectedFood}
            onConfirm={handleAddFood}
            onCancel={() => setSelectedFood(null)}
          />
        ) : (
          <FoodSearch
            onSelect={(food) => setSelectedFood(food)}
            placeholder="Adicionar alimento..."
          />
        )}

        {items.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Ingredientes ({items.length})
            </h3>
            {items.map((item, i) => (
              <div
                key={i}
                className="flex items-center justify-between rounded-xl bg-secondary p-3 text-sm"
              >
                <div className="flex-1 min-w-0">
                  <p className="truncate font-medium">{item.name}</p>
                  <p className="text-[11px] text-muted-foreground tabular-nums">
                    {Math.round(item.portionGrams)}g
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-bold tabular-nums">
                    {Math.round(item.energy_kcal)} kcal
                  </span>
                  <button
                    onClick={() =>
                      setItems((prev) => prev.filter((_, idx) => idx !== i))
                    }
                    className="text-red-400 text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full hover:bg-red-400/10"
                  >
                    X
                  </button>
                </div>
              </div>
            ))}

            <div className="rounded-xl bg-card p-3 space-y-1">
              <div className="flex justify-between font-bold tabular-nums">
                <span>Total</span>
                <span>{Math.round(totalKcal)} kcal</span>
              </div>
              <div className="flex justify-between text-[11px] text-muted-foreground tabular-nums">
                <span>
                  P: {totalProtein.toFixed(1)}g · C: {totalCarbs.toFixed(1)}g ·
                  G: {totalFat.toFixed(1)}g
                </span>
              </div>
            </div>

            <Button
              className="w-full h-11 rounded-xl font-semibold"
              onClick={handleSave}
              disabled={!name.trim()}
            >
              Salvar Alteracoes
            </Button>
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
}

export default function EditarReceitaPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <div className="text-muted-foreground animate-pulse">
            Carregando...
          </div>
        </div>
      }
    >
      <EditarReceitaContent />
    </Suspense>
  );
}
