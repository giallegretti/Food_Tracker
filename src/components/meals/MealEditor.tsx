"use client";

import { useState, useCallback, useEffect } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Doc } from "../../../convex/_generated/dataModel";
import { FoodSearch } from "@/components/food/FoodSearch";
import { PortionInput } from "@/components/food/PortionInput";
import { RecipePicker } from "@/components/food/RecipePicker";
import { CopyMealPanel } from "@/components/meals/CopyMealPanel";
import { Button } from "@/components/ui/button";
import {
  SheetBody,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { MODULE_LABELS, getTodayISO } from "@/lib/constants";
import type { FoodItem } from "@/components/food/FoodSearch";

type PendingItem = {
  foodId?: Doc<"foods">["_id"];
  name: string;
  portionGrams: number;
  energy_kcal: number;
  protein_g: number;
  carbs_g: number;
  lipids_g: number;
};

type ItemRef = {
  entryId: Doc<"dailyLogEntries">["_id"];
  itemIndex: number;
};

interface MealEditorProps {
  userId: string;
  date: string;
  module: string;
  /** Entradas do dia inteiro; o editor filtra as da refeição */
  entries: Doc<"dailyLogEntries">[];
  /** Meta de kcal da refeição (omitir no Extra) */
  targetKcal?: number;
  editable?: boolean;
  /** Mostra "Voltar" no cabeçalho (Diário volta para o resumo do dia) */
  onBack?: () => void;
}

// Conteúdo da drawer de uma refeição: cabeçalho, corpo rolável e rodapé fixo
// com o Salvar. Deve ser renderizado direto dentro de <SheetContent>.
export function MealEditor({
  userId,
  date,
  module,
  entries,
  targetKcal,
  editable = true,
  onBack,
}: MealEditorProps) {
  const today = getTodayISO();
  const addEntry = useMutation(api.dailyLog.addEntry);
  const removeItem = useMutation(api.dailyLog.removeItem);
  const updateItem = useMutation(api.dailyLog.updateItem);

  const [addTab, setAddTab] = useState<"alimentos" | "receitas">("alimentos");
  const [selectedFood, setSelectedFood] = useState<FoodItem | null>(null);
  const [pendingItems, setPendingItems] = useState<PendingItem[]>([]);
  const [editingItem, setEditingItem] = useState<ItemRef | null>(null);
  const [copyOpen, setCopyOpen] = useState(false);
  const [copyMessage, setCopyMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!copyMessage) return;
    const t = setTimeout(() => setCopyMessage(null), 3000);
    return () => clearTimeout(t);
  }, [copyMessage]);

  const handleAddFood = useCallback((food: FoodItem, grams: number) => {
    const factor = grams / 100;
    setPendingItems((prev) => [
      ...prev,
      {
        foodId: food.isCustom ? undefined : (food._id as Doc<"foods">["_id"]),
        name: food.name,
        portionGrams: grams,
        energy_kcal: food.energy_kcal * factor,
        protein_g: food.protein_g * factor,
        carbs_g: food.carbs_g * factor,
        lipids_g: food.lipids_g * factor,
      },
    ]);
    setSelectedFood(null);
  }, []);

  const handleAddRecipe = useCallback((recipe: Doc<"recipes">) => {
    const items = recipe.items.map((item) => ({
      foodId: item.foodId,
      name: item.name,
      portionGrams: item.portionGrams,
      energy_kcal: item.energy_kcal,
      protein_g: item.protein_g,
      carbs_g: item.carbs_g,
      lipids_g: item.lipids_g,
    }));
    setPendingItems((prev) => [...prev, ...items]);
    setAddTab("alimentos");
  }, []);

  const handleSave = async () => {
    if (pendingItems.length === 0 || saving) return;
    setSaving(true);
    try {
      await addEntry({ userId, date, module, items: pendingItems });
      setPendingItems([]);
    } finally {
      setSaving(false);
    }
  };

  const moduleEntries = entries.filter((e) => e.module === module);
  const registeredItems = moduleEntries.flatMap((entry) =>
    entry.items.map((item, itemIndex) => ({
      entryId: entry._id,
      itemIndex,
      name: item.name,
      portionGrams: item.portionGrams,
      energy_kcal: item.energy_kcal,
    }))
  );
  const registeredKcal = registeredItems.reduce((s, i) => s + i.energy_kcal, 0);
  const pendingTotal = pendingItems.reduce((s, i) => s + i.energy_kcal, 0);

  // Monta um FoodItem sintético (valores por 100g) para o item em edição
  let editingContext: {
    food: FoodItem;
    grams: number;
    foodId?: Doc<"foods">["_id"];
  } | null = null;
  if (editingItem) {
    const entry = moduleEntries.find((e) => e._id === editingItem.entryId);
    const item = entry?.items[editingItem.itemIndex];
    if (item && item.portionGrams > 0) {
      const factor = item.portionGrams / 100;
      editingContext = {
        food: {
          _id: (item.foodId ?? "edit-synthetic") as FoodItem["_id"],
          name: item.name,
          energy_kcal: item.energy_kcal / factor,
          protein_g: item.protein_g / factor,
          carbs_g: item.carbs_g / factor,
          lipids_g: item.lipids_g / factor,
          fiber_g: 0,
          isCustom: !item.foodId,
        },
        grams: item.portionGrams,
        foodId: item.foodId,
      };
    }
  }

  const handleConfirmEdit = async (food: FoodItem, grams: number) => {
    if (!editingItem || !editingContext) return;
    const factor = grams / 100;
    await updateItem({
      entryId: editingItem.entryId,
      itemIndex: editingItem.itemIndex,
      item: {
        foodId: editingContext.foodId,
        name: food.name,
        portionGrams: grams,
        energy_kcal: food.energy_kcal * factor,
        protein_g: food.protein_g * factor,
        carbs_g: food.carbs_g * factor,
        lipids_g: food.lipids_g * factor,
      },
    });
    setEditingItem(null);
  };

  const dateLabel =
    date === today
      ? null
      : new Date(date + "T12:00:00").toLocaleDateString("pt-BR", {
          weekday: "long",
          day: "numeric",
          month: "short",
        });

  return (
    <>
      <SheetHeader className="pr-12">
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="-ml-1 mb-1 self-start text-xs font-medium text-muted-foreground hover:text-foreground"
          >
            ‹ Voltar ao dia
          </button>
        )}
        <SheetTitle className="text-left">
          {MODULE_LABELS[module] || "Extra"}
          {targetKcal !== undefined && (
            <span className="text-xs font-normal text-muted-foreground ml-2">
              Meta: {Math.round(targetKcal)} kcal
            </span>
          )}
        </SheetTitle>
        {dateLabel && (
          <p className="text-[11px] text-muted-foreground capitalize">
            {dateLabel}
          </p>
        )}
      </SheetHeader>

      <SheetBody className="space-y-4">
        {/* Registrados */}
        {registeredItems.length > 0 && (
          <div className="space-y-1">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Registrados ({registeredItems.length} · {Math.round(registeredKcal)} kcal)
            </h3>
            {registeredItems.map((item) => {
              const isEditingThis =
                editingItem?.entryId === item.entryId &&
                editingItem?.itemIndex === item.itemIndex;
              const label = (
                <>
                  <p className="truncate font-medium">{item.name}</p>
                  <p className="text-[11px] text-muted-foreground tabular-nums">
                    {Math.round(item.portionGrams)}g · {Math.round(item.energy_kcal)} kcal
                  </p>
                </>
              );
              return (
                <div
                  key={`${item.entryId}-${item.itemIndex}`}
                  className={`flex items-center justify-between rounded-xl p-3 text-sm transition-colors ${
                    isEditingThis ? "bg-primary/10 ring-1 ring-primary/30" : "bg-card"
                  }`}
                >
                  {editable ? (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedFood(null);
                        setCopyOpen(false);
                        setEditingItem({
                          entryId: item.entryId,
                          itemIndex: item.itemIndex,
                        });
                      }}
                      className="flex-1 min-w-0 text-left"
                    >
                      {label}
                    </button>
                  ) : (
                    <div className="flex-1 min-w-0">{label}</div>
                  )}
                  {editable && (
                    <button
                      type="button"
                      onClick={() => {
                        if (isEditingThis) setEditingItem(null);
                        removeItem({
                          entryId: item.entryId,
                          itemIndex: item.itemIndex,
                        });
                      }}
                      className="text-red-400 text-xs font-bold w-8 h-8 flex items-center justify-center rounded-full hover:bg-red-400/10 shrink-0 ml-2"
                      aria-label={`Remover ${item.name}`}
                    >
                      X
                    </button>
                  )}
                </div>
              );
            })}

            {/* Copiar refeição */}
            {editable && !copyOpen && (
              <button
                type="button"
                onClick={() => {
                  setCopyOpen(true);
                  setEditingItem(null);
                  setSelectedFood(null);
                }}
                className={`flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors w-full ${
                  copyMessage
                    ? "bg-primary/10 text-primary ring-1 ring-primary/30"
                    : "bg-secondary text-muted-foreground"
                }`}
              >
                <span className="text-base">{copyMessage ? "✓" : "📋"}</span>
                <span>{copyMessage ?? "Copiar para outro dia ou refeição"}</span>
              </button>
            )}
          </div>
        )}

        {editable && copyOpen && (
          <CopyMealPanel
            userId={userId}
            fromDate={date}
            fromModule={module}
            itemCount={registeredItems.length}
            onCopied={(message) => {
              setCopyOpen(false);
              setCopyMessage(message);
            }}
            onCancel={() => setCopyOpen(false)}
          />
        )}

        {/* Editar item */}
        {editable && editingItem && editingContext && (
          <div className="space-y-2">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Editar item
            </h3>
            <PortionInput
              key={`${editingItem.entryId}-${editingItem.itemIndex}`}
              food={editingContext.food}
              suggestedGrams={editingContext.grams}
              submitLabel="Atualizar"
              onConfirm={handleConfirmEdit}
              onCancel={() => setEditingItem(null)}
            />
          </div>
        )}

        {/* Adicionar */}
        {editable && !editingContext && !copyOpen && (
          <div className="space-y-3">
            {registeredItems.length > 0 && (
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Adicionar
              </h3>
            )}

            {!selectedFood && (
              <div className="flex gap-1 rounded-xl bg-secondary p-1">
                {(["alimentos", "receitas"] as const).map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setAddTab(tab)}
                    className={`flex-1 rounded-lg py-2 text-sm font-medium transition-colors ${
                      addTab === tab
                        ? "bg-background text-foreground shadow-sm"
                        : "text-muted-foreground"
                    }`}
                  >
                    {tab === "alimentos" ? "Alimentos" : "Receitas"}
                  </button>
                ))}
              </div>
            )}

            {selectedFood ? (
              <PortionInput
                key={String(selectedFood._id)}
                food={selectedFood}
                onConfirm={handleAddFood}
                onCancel={() => setSelectedFood(null)}
              />
            ) : addTab === "alimentos" ? (
              <FoodSearch
                onSelect={setSelectedFood}
                placeholder="Buscar alimento para adicionar..."
                createdBy={userId}
              />
            ) : (
              <RecipePicker onSelect={handleAddRecipe} />
            )}
          </div>
        )}

        {/* Novos itens (ainda não salvos) */}
        {pendingItems.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Novos itens ({pendingItems.length})
            </h3>
            {pendingItems.map((item, i) => (
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
                    type="button"
                    onClick={() =>
                      setPendingItems((prev) => prev.filter((_, idx) => idx !== i))
                    }
                    className="text-red-400 text-xs font-bold w-8 h-8 flex items-center justify-center rounded-full hover:bg-red-400/10"
                    aria-label={`Remover ${item.name}`}
                  >
                    X
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </SheetBody>

      {/* Rodapé fixo: o Salvar fica sempre à vista, mesmo com a lista longa */}
      {pendingItems.length > 0 && (
        <SheetFooter className="mt-0 flex-row items-center justify-between border-t border-border/50 pt-3 sheet-footer-safe">
          <span className="font-bold tabular-nums">
            {pendingItems.length} {pendingItems.length === 1 ? "item" : "itens"} ·{" "}
            {Math.round(pendingTotal)} kcal
          </span>
          <Button
            onClick={handleSave}
            disabled={saving}
            className="rounded-xl h-11 px-6 font-semibold"
          >
            {saving ? "Salvando..." : "Salvar"}
          </Button>
        </SheetFooter>
      )}
    </>
  );
}
