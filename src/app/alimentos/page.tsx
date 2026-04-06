"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { BottomNav } from "@/components/layout/BottomNav";
import { FoodSearch } from "@/components/food/FoodSearch";
import { PortionInput } from "@/components/food/PortionInput";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Doc, Id } from "../../../convex/_generated/dataModel";
import type { FoodItem } from "@/components/food/FoodSearch";

export default function AlimentosPage() {
  const { userId } = useCurrentUser();
  const [tab, setTab] = useState<"taco" | "meus">("taco");
  const [selectedFood, setSelectedFood] = useState<FoodItem | null>(null);
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
            <h1 className="text-base font-bold tracking-tight">Alimentos</h1>
            {tab === "taco" && foodCount !== undefined && (
              <span className="text-[11px] text-muted-foreground tabular-nums">
                {foodCount} itens
              </span>
            )}
          </div>

          {/* Tab switcher */}
          <div className="flex gap-1 rounded-xl bg-secondary p-1">
            <button
              onClick={() => setTab("taco")}
              className={`flex-1 rounded-lg py-2 text-sm font-medium transition-colors ${
                tab === "taco"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground"
              }`}
            >
              TACO
            </button>
            <button
              onClick={() => setTab("meus")}
              className={`flex-1 rounded-lg py-2 text-sm font-medium transition-colors ${
                tab === "meus"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground"
              }`}
            >
              Meus Alimentos
            </button>
          </div>

          {tab === "taco" && (
            <FoodSearch
              onSelect={(food) => setSelectedFood(food)}
              placeholder="Buscar alimento por nome..."
              createdBy={userId}
            />
          )}
        </div>
      </div>

      <div className="mx-auto max-w-md px-4 py-3 space-y-4">
        {tab === "taco" ? (
          <>
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
                        onClick={() =>
                          setSelectedFood({
                            _id: food._id,
                            name: food.name,
                            category: food.category,
                            energy_kcal: food.energy_kcal,
                            protein_g: food.protein_g,
                            carbs_g: food.carbs_g,
                            lipids_g: food.lipids_g,
                            fiber_g: food.fiber_g,
                            isCustom: false,
                          })
                        }
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
          </>
        ) : (
          <MeusAlimentos userId={userId} />
        )}
      </div>

      <BottomNav />
    </div>
  );
}

/* ---------- Meus Alimentos (custom foods management) ---------- */

function MeusAlimentos({ userId }: { userId: string }) {
  const customFoods = useQuery(api.customFoods.list);
  const addCustomFood = useMutation(api.customFoods.add);
  const updateCustomFood = useMutation(api.customFoods.update);
  const removeCustomFood = useMutation(api.customFoods.remove);

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<Id<"customFoods"> | null>(null);

  // Form state
  const [formName, setFormName] = useState("");
  const [formKcal, setFormKcal] = useState("");
  const [formProtein, setFormProtein] = useState("");
  const [formCarbs, setFormCarbs] = useState("");
  const [formFat, setFormFat] = useState("");
  const [formFiber, setFormFiber] = useState("");

  const resetForm = () => {
    setFormName("");
    setFormKcal("");
    setFormProtein("");
    setFormCarbs("");
    setFormFat("");
    setFormFiber("");
    setShowForm(false);
    setEditingId(null);
  };

  const startEdit = (food: Doc<"customFoods">) => {
    setEditingId(food._id);
    setFormName(food.name);
    setFormKcal(String(food.energy_kcal));
    setFormProtein(String(food.protein_g));
    setFormCarbs(String(food.carbs_g));
    setFormFat(String(food.lipids_g));
    setFormFiber(String(food.fiber_g));
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!formName.trim()) return;
    const data = {
      name: formName.trim(),
      energy_kcal: Number(formKcal) || 0,
      protein_g: Number(formProtein) || 0,
      lipids_g: Number(formFat) || 0,
      carbs_g: Number(formCarbs) || 0,
      fiber_g: Number(formFiber) || 0,
    };

    if (editingId) {
      await updateCustomFood({ id: editingId, ...data });
    } else {
      await addCustomFood({ ...data, createdBy: userId });
    }
    resetForm();
  };

  const isFormValid = formName.trim().length > 0;

  return (
    <div className="space-y-4">
      {showForm ? (
        <div className="rounded-xl bg-card p-4 space-y-3">
          <h3 className="text-sm font-semibold">
            {editingId ? "Editar alimento" : "Novo alimento"}
          </h3>
          <p className="text-[11px] text-muted-foreground">
            Valores nutricionais por 100g
          </p>

          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1 block">
              Nome
            </label>
            <Input
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              placeholder="Ex: Pao de queijo caseiro"
              className="h-11 rounded-xl bg-secondary border-0 text-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1 block">
                Calorias (kcal)
              </label>
              <Input
                type="number"
                inputMode="decimal"
                value={formKcal}
                onChange={(e) => setFormKcal(e.target.value)}
                placeholder="0"
                className="h-10 rounded-xl bg-secondary border-0 text-sm tabular-nums"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1 block">
                Proteina (g)
              </label>
              <Input
                type="number"
                inputMode="decimal"
                value={formProtein}
                onChange={(e) => setFormProtein(e.target.value)}
                placeholder="0"
                className="h-10 rounded-xl bg-secondary border-0 text-sm tabular-nums"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1 block">
                Carboidratos (g)
              </label>
              <Input
                type="number"
                inputMode="decimal"
                value={formCarbs}
                onChange={(e) => setFormCarbs(e.target.value)}
                placeholder="0"
                className="h-10 rounded-xl bg-secondary border-0 text-sm tabular-nums"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1 block">
                Gordura (g)
              </label>
              <Input
                type="number"
                inputMode="decimal"
                value={formFat}
                onChange={(e) => setFormFat(e.target.value)}
                placeholder="0"
                className="h-10 rounded-xl bg-secondary border-0 text-sm tabular-nums"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1 block">
                Fibra (g)
              </label>
              <Input
                type="number"
                inputMode="decimal"
                value={formFiber}
                onChange={(e) => setFormFiber(e.target.value)}
                placeholder="0"
                className="h-10 rounded-xl bg-secondary border-0 text-sm tabular-nums"
              />
            </div>
          </div>

          {/* Preview */}
          {isFormValid && (
            <div className="grid grid-cols-4 gap-2 pt-1">
              <div className="rounded-lg bg-primary/10 p-2 text-center">
                <div className="text-sm font-bold text-primary tabular-nums">
                  {Math.round(Number(formKcal) || 0)}
                </div>
                <div className="text-[10px] text-muted-foreground font-medium">kcal</div>
              </div>
              <div className="rounded-lg bg-blue-500/10 p-2 text-center">
                <div className="text-sm font-bold text-blue-400 tabular-nums">
                  {(Number(formProtein) || 0).toFixed(1)}
                </div>
                <div className="text-[10px] text-muted-foreground font-medium">prot</div>
              </div>
              <div className="rounded-lg bg-amber-500/10 p-2 text-center">
                <div className="text-sm font-bold text-amber-400 tabular-nums">
                  {(Number(formCarbs) || 0).toFixed(1)}
                </div>
                <div className="text-[10px] text-muted-foreground font-medium">carb</div>
              </div>
              <div className="rounded-lg bg-purple-500/10 p-2 text-center">
                <div className="text-sm font-bold text-purple-400 tabular-nums">
                  {(Number(formFat) || 0).toFixed(1)}
                </div>
                <div className="text-[10px] text-muted-foreground font-medium">gord</div>
              </div>
            </div>
          )}

          <div className="flex gap-2 pt-1">
            <Button
              variant="secondary"
              onClick={resetForm}
              className="flex-1 h-10 rounded-xl"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSave}
              className="flex-1 h-10 rounded-xl font-semibold"
              disabled={!isFormValid}
            >
              {editingId ? "Salvar" : "Adicionar"}
            </Button>
          </div>
        </div>
      ) : (
        <Button
          className="w-full h-11 rounded-xl font-semibold"
          onClick={() => setShowForm(true)}
        >
          + Novo alimento personalizado
        </Button>
      )}

      {/* Custom foods list */}
      {customFoods === undefined ? (
        <div className="text-center py-8 text-muted-foreground text-sm animate-pulse">
          Carregando...
        </div>
      ) : customFoods.length === 0 && !showForm ? (
        <div className="text-center py-8 text-muted-foreground text-sm">
          Nenhum alimento personalizado cadastrado.
          <br />
          <span className="text-xs">
            Adicione alimentos que nao estao na tabela TACO.
          </span>
        </div>
      ) : (
        <div className="space-y-1">
          {customFoods.map((food) => (
            <div
              key={food._id}
              className="rounded-xl bg-card p-3 space-y-1"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium leading-tight">
                    {food.name}
                    <span className="ml-1.5 text-[10px] font-medium text-primary/70 bg-primary/10 px-1.5 py-0.5 rounded-full">
                      personalizado
                    </span>
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-1 tabular-nums">
                    P:{food.protein_g.toFixed(1)}g C:{food.carbs_g.toFixed(1)}g G:{food.lipids_g.toFixed(1)}g F:{food.fiber_g.toFixed(1)}g
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-sm font-bold text-primary tabular-nums">
                    {Math.round(food.energy_kcal)}
                  </div>
                  <div className="text-[10px] text-muted-foreground">kcal/100g</div>
                </div>
              </div>
              <div className="flex items-center gap-3 pt-0.5">
                <button
                  onClick={() => startEdit(food)}
                  className="text-[11px] text-blue-400/70 hover:text-blue-400 font-medium"
                >
                  Editar
                </button>
                <button
                  onClick={() => removeCustomFood({ id: food._id })}
                  className="text-[11px] text-red-400/70 hover:text-red-400 font-medium"
                >
                  Excluir
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
