"use client";

import { useState, useCallback, Suspense } from "react";
import { useQuery, useMutation } from "convex/react";
import { useSearchParams } from "next/navigation";
import { api } from "../../../convex/_generated/api";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { UserSwitcher } from "@/components/layout/UserSwitcher";
import { BottomNav } from "@/components/layout/BottomNav";
import { FoodSearch } from "@/components/food/FoodSearch";
import { PortionInput } from "@/components/food/PortionInput";
import { ModuleCard } from "@/components/meals/ModuleCard";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { MODULE_ORDER, MODULE_LABELS, getTodayISO, formatKcal } from "@/lib/constants";
import { Doc } from "../../../convex/_generated/dataModel";

function DiarioContent() {
  const searchParams = useSearchParams();
  const { userId, setUserId } = useCurrentUser();
  const today = getTodayISO();

  const [activeModule, setActiveModule] = useState<string | null>(
    searchParams.get("modulo")
  );
  const [selectedFood, setSelectedFood] = useState<Doc<"foods"> | null>(null);
  const [pendingItems, setPendingItems] = useState<
    Array<{
      foodId: Doc<"foods">["_id"];
      name: string;
      portionGrams: number;
      energy_kcal: number;
      protein_g: number;
      carbs_g: number;
      lipids_g: number;
    }>
  >([]);

  const profile = useQuery(api.userProfiles.getByUserId, { userId });
  const entries = useQuery(api.dailyLog.getByDate, { userId, date: today });
  const totals = useQuery(api.dailyLog.getDailyTotals, { userId, date: today });

  const addEntry = useMutation(api.dailyLog.addEntry);
  const deleteEntry = useMutation(api.dailyLog.deleteEntry);

  const handleAddFood = useCallback(
    (food: Doc<"foods">, grams: number) => {
      const factor = grams / 100;
      setPendingItems((prev) => [
        ...prev,
        {
          foodId: food._id,
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

  const handleSaveModule = useCallback(async () => {
    if (!activeModule || pendingItems.length === 0) return;
    await addEntry({
      userId,
      date: today,
      module: activeModule,
      items: pendingItems,
    });
    setPendingItems([]);
    setActiveModule(null);
  }, [activeModule, pendingItems, userId, today, addEntry]);

  if (!profile || totals === undefined) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-muted-foreground animate-pulse">Carregando...</div>
      </div>
    );
  }

  const moduleItemCount: Record<string, number> = {};
  if (entries) {
    for (const entry of entries) {
      moduleItemCount[entry.module] =
        (moduleItemCount[entry.module] || 0) + entry.items.length;
    }
  }

  const pendingTotal = pendingItems.reduce((s, i) => s + i.energy_kcal, 0);

  return (
    <div className="min-h-screen pb-24">
      <div className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl safe-top">
        <div className="mx-auto flex max-w-md items-center justify-between px-4 py-3">
          <div>
            <h1 className="text-base font-bold tracking-tight">Diario</h1>
            <p className="text-[11px] text-muted-foreground capitalize">
              {new Date(today + "T12:00:00").toLocaleDateString("pt-BR", {
                weekday: "long",
                day: "numeric",
                month: "short",
              })}
            </p>
          </div>
          <UserSwitcher userId={userId} onSwitch={setUserId} />
        </div>
      </div>

      <div className="mx-auto max-w-md px-4 space-y-3">
        {/* Daily total pill */}
        <div className="text-center py-2">
          <div className="inline-flex items-baseline gap-1 rounded-full bg-card px-4 py-2">
            <span className="text-2xl font-bold tabular-nums">
              {formatKcal(totals.kcal)}
            </span>
            <span className="text-sm text-muted-foreground">
              / {formatKcal(profile.targetKcal)} kcal
            </span>
          </div>
        </div>

        {/* Module cards with entries */}
        {MODULE_ORDER.map((mod) => (
          <div key={mod} className="space-y-0">
            <ModuleCard
              module={mod}
              consumed={totals.byModule[mod]?.kcal || 0}
              budget={profile.modules[mod]}
              itemCount={moduleItemCount[mod]}
              onClick={() => {
                setActiveModule(mod);
                setPendingItems([]);
              }}
            />

            {/* Logged entries for this module */}
            {entries
              ?.filter((e) => e.module === mod)
              .map((entry) => (
                <div
                  key={entry._id}
                  className="ml-10 border-l border-border/40 pl-3 py-1.5"
                >
                  {entry.items.map((item, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between text-xs py-0.5"
                    >
                      <span className="truncate flex-1 text-muted-foreground">
                        {item.name}
                      </span>
                      <span className="text-muted-foreground/70 ml-2 shrink-0 tabular-nums">
                        {Math.round(item.portionGrams)}g · {Math.round(item.energy_kcal)} kcal
                      </span>
                    </div>
                  ))}
                  <button
                    onClick={() => deleteEntry({ id: entry._id })}
                    className="text-[11px] text-red-400/70 hover:text-red-400 mt-0.5 font-medium"
                  >
                    Remover
                  </button>
                </div>
              ))}
          </div>
        ))}

        {/* Extra food button */}
        <Button
          variant="secondary"
          className="w-full h-11 rounded-xl"
          onClick={() => {
            setActiveModule("extra");
            setPendingItems([]);
          }}
        >
          + Adicionar alimento extra
        </Button>
      </div>

      {/* Add food sheet */}
      <Sheet
        open={activeModule !== null}
        onOpenChange={(open) => {
          if (!open) {
            setActiveModule(null);
            setPendingItems([]);
            setSelectedFood(null);
          }
        }}
      >
        <SheetContent side="bottom" className="h-[85vh] rounded-t-2xl border-t border-border/50">
          <SheetHeader>
            <SheetTitle className="text-left">
              {activeModule
                ? MODULE_LABELS[activeModule] || "Extra"
                : "Adicionar"}
              {activeModule && activeModule !== "extra" && profile && (
                <span className="text-xs font-normal text-muted-foreground ml-2">
                  Meta: {Math.round(profile.modules[activeModule as keyof typeof profile.modules] || 0)} kcal
                </span>
              )}
            </SheetTitle>
          </SheetHeader>

          <div className="mt-4 space-y-4 overflow-y-auto max-h-[calc(85vh-140px)]">
            {selectedFood ? (
              <PortionInput
                food={selectedFood}
                onConfirm={handleAddFood}
                onCancel={() => setSelectedFood(null)}
              />
            ) : (
              <FoodSearch
                onSelect={(food) => setSelectedFood(food)}
                placeholder="Buscar alimento para adicionar..."
              />
            )}

            {/* Pending items */}
            {pendingItems.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Itens a adicionar ({pendingItems.length})
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
                        onClick={() =>
                          setPendingItems((prev) =>
                            prev.filter((_, idx) => idx !== i)
                          )
                        }
                        className="text-red-400 text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full hover:bg-red-400/10"
                      >
                        X
                      </button>
                    </div>
                  </div>
                ))}
                <div className="flex items-center justify-between pt-2 border-t border-border/50">
                  <span className="font-bold tabular-nums">
                    Total: {Math.round(pendingTotal)} kcal
                  </span>
                  <Button onClick={handleSaveModule} className="rounded-xl h-10 px-6 font-semibold">
                    Salvar
                  </Button>
                </div>
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>

      <BottomNav />
    </div>
  );
}

export default function DiarioPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <div className="text-muted-foreground animate-pulse">Carregando...</div>
        </div>
      }
    >
      <DiarioContent />
    </Suspense>
  );
}
