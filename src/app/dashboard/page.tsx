"use client";

import { useState, useCallback } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { UserSwitcher } from "@/components/layout/UserSwitcher";
import { BottomNav } from "@/components/layout/BottomNav";
import { DailyRing } from "@/components/dashboard/DailyRing";
import { MacroBreakdown } from "@/components/dashboard/MacroBreakdown";
import { ModuleCard } from "@/components/meals/ModuleCard";
import { FoodSearch } from "@/components/food/FoodSearch";
import { PortionInput } from "@/components/food/PortionInput";
import { RecipePicker } from "@/components/food/RecipePicker";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { MODULE_ORDER, MODULE_LABELS, getTodayISO } from "@/lib/constants";
import { Doc } from "../../../convex/_generated/dataModel";
import type { FoodItem } from "@/components/food/FoodSearch";

export default function DashboardPage() {
  const { userId, setUserId } = useCurrentUser();
  const today = getTodayISO();

  const [activeModule, setActiveModule] = useState<string | null>(null);
  const [addTab, setAddTab] = useState<"alimentos" | "receitas">("alimentos");
  const [selectedFood, setSelectedFood] = useState<FoodItem | null>(null);
  const [pendingItems, setPendingItems] = useState<
    Array<{
      foodId?: Doc<"foods">["_id"];
      name: string;
      portionGrams: number;
      energy_kcal: number;
      protein_g: number;
      carbs_g: number;
      lipids_g: number;
    }>
  >([]);
  const [shareWithPartner, setShareWithPartner] = useState(false);
  const [sharedModule, setSharedModule] = useState<string | null>(null);
  const partnerId = userId === "giovanna" ? "ricardo" : "giovanna";
  const partnerName = partnerId === "ricardo" ? "Ricardo" : "Giovanna";

  const profile = useQuery(api.userProfiles.getByUserId, { userId });
  const totals = useQuery(api.dailyLog.getDailyTotals, { userId, date: today });
  const entries = useQuery(api.dailyLog.getByDate, { userId, date: today });

  const addEntry = useMutation(api.dailyLog.addEntry);
  const removeItem = useMutation(api.dailyLog.removeItem);
  const shareModuleEntries = useMutation(api.dailyLog.shareModuleEntries);

  const handleAddFood = useCallback(
    (food: FoodItem, grams: number) => {
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
    },
    []
  );

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

  const handleSaveModule = useCallback(async () => {
    if (!activeModule || pendingItems.length === 0) return;
    await addEntry({
      userId,
      date: today,
      module: activeModule,
      items: pendingItems,
      alsoForUserId: shareWithPartner ? partnerId : undefined,
    });
    setPendingItems([]);
    setShareWithPartner(false);
  }, [activeModule, pendingItems, userId, today, addEntry, shareWithPartner, partnerId]);

  const handleShareModule = useCallback(
    async (mod: string) => {
      await shareModuleEntries({
        userId,
        date: today,
        module: mod,
        targetUserId: partnerId,
      });
      setSharedModule(mod);
      setTimeout(() => setSharedModule(null), 2000);
    },
    [userId, today, partnerId, shareModuleEntries]
  );

  if (!profile || totals === undefined) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-muted-foreground animate-pulse">Carregando...</div>
      </div>
    );
  }

  const macroTargets = {
    protein: (profile.targetKcal * profile.proteinPct) / 100 / 4,
    carbs: (profile.targetKcal * profile.carbsPct) / 100 / 4,
    fat: (profile.targetKcal * profile.fatPct) / 100 / 9,
  };

  const moduleItemCount: Record<string, number> = {};
  if (entries) {
    for (const entry of entries) {
      moduleItemCount[entry.module] =
        (moduleItemCount[entry.module] || 0) + entry.items.length;
    }
  }

  const pendingTotal = pendingItems.reduce((s, i) => s + i.energy_kcal, 0);

  const todayFormatted = new Date(today + "T12:00:00").toLocaleDateString(
    "pt-BR",
    { weekday: "long", day: "numeric", month: "short" }
  );

  // Get registered items for the active module
  const activeModuleEntries = entries?.filter((e) => e.module === activeModule) ?? [];
  const registeredItems: Array<{
    entryId: Doc<"dailyLogEntries">["_id"];
    itemIndex: number;
    name: string;
    portionGrams: number;
    energy_kcal: number;
  }> = [];
  for (const entry of activeModuleEntries) {
    for (let i = 0; i < entry.items.length; i++) {
      registeredItems.push({
        entryId: entry._id,
        itemIndex: i,
        name: entry.items[i].name,
        portionGrams: entry.items[i].portionGrams,
        energy_kcal: entry.items[i].energy_kcal,
      });
    }
  }
  const registeredKcal = registeredItems.reduce((s, i) => s + i.energy_kcal, 0);

  return (
    <div className="min-h-screen pb-24">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl safe-top">
        <div className="mx-auto flex max-w-md items-center justify-between px-4 py-3">
          <div>
            <h1 className="text-base font-bold tracking-tight">Food Tracker</h1>
            <p className="text-[11px] text-muted-foreground capitalize">
              {todayFormatted}
            </p>
          </div>
          <UserSwitcher userId={userId} onSwitch={setUserId} />
        </div>
      </div>

      <div className="mx-auto max-w-md px-4 space-y-5">
        {/* Calorie Ring */}
        <div className="flex justify-center pt-2 pb-1">
          <DailyRing consumed={totals.kcal} target={profile.targetKcal} />
        </div>

        {/* Macro Breakdown */}
        <MacroBreakdown
          protein={{ consumed: totals.protein, target: macroTargets.protein }}
          carbs={{ consumed: totals.carbs, target: macroTargets.carbs }}
          fat={{ consumed: totals.fat, target: macroTargets.fat }}
        />

        {/* Module Cards */}
        <div className="space-y-2">
          <h2 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest px-1">
            Refeicoes
          </h2>
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
                  setAddTab("alimentos");
                  setSelectedFood(null);
                  setShareWithPartner(false);
                }}
              />

              {/* Read-only preview of logged items */}
              {entries
                ?.filter((e) => e.module === mod)
                .map((entry) => (
                  <div
                    key={entry._id}
                    className="ml-10 border-l border-border/40 pl-3 py-1"
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
                  </div>
                ))}
            </div>
          ))}
          {totals.byModule["extra"] && (
            <ModuleCard
              module="extra"
              consumed={totals.byModule["extra"].kcal}
              budget={0}
              itemCount={moduleItemCount["extra"]}
              onClick={() => {
                setActiveModule("extra");
                setPendingItems([]);
                setAddTab("alimentos");
                setSelectedFood(null);
                setShareWithPartner(false);
              }}
            />
          )}
        </div>

        {/* Extra food button */}
        <Button
          variant="secondary"
          className="w-full h-11 rounded-xl"
          onClick={() => {
            setActiveModule("extra");
            setPendingItems([]);
            setAddTab("alimentos");
            setSelectedFood(null);
            setShareWithPartner(false);
          }}
        >
          + Adicionar alimento extra
        </Button>

        {/* Partner View */}
        <PartnerView currentUserId={userId} date={today} />
      </div>

      {/* Module Sheet */}
      <Sheet
        open={activeModule !== null}
        onOpenChange={(open) => {
          if (!open) {
            setActiveModule(null);
            setPendingItems([]);
            setSelectedFood(null);
            setAddTab("alimentos");
            setShareWithPartner(false);
          }
        }}
      >
        <SheetContent
          side="bottom"
          className="h-[85vh] rounded-t-2xl border-t border-border/50"
        >
          <SheetHeader>
            <SheetTitle className="text-left">
              {activeModule
                ? MODULE_LABELS[activeModule] || "Extra"
                : "Adicionar"}
              {activeModule && activeModule !== "extra" && profile && (
                <span className="text-xs font-normal text-muted-foreground ml-2">
                  Meta:{" "}
                  {Math.round(
                    profile.modules[
                      activeModule as keyof typeof profile.modules
                    ] || 0
                  )}{" "}
                  kcal
                </span>
              )}
            </SheetTitle>
          </SheetHeader>

          <div className="mt-4 space-y-4 overflow-y-auto max-h-[calc(85vh-140px)]">
            {/* ===== REGISTERED ITEMS ===== */}
            {registeredItems.length > 0 && (
              <div className="space-y-1">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Registrados ({registeredItems.length} · {Math.round(registeredKcal)} kcal)
                </h3>
                {registeredItems.map((item, idx) => (
                  <div
                    key={`${item.entryId}-${item.itemIndex}`}
                    className="flex items-center justify-between rounded-xl bg-card p-3 text-sm"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="truncate font-medium">{item.name}</p>
                      <p className="text-[11px] text-muted-foreground tabular-nums">
                        {Math.round(item.portionGrams)}g · {Math.round(item.energy_kcal)} kcal
                      </p>
                    </div>
                    <button
                      onClick={() =>
                        removeItem({
                          entryId: item.entryId,
                          itemIndex: item.itemIndex,
                        })
                      }
                      className="text-red-400 text-xs font-bold w-7 h-7 flex items-center justify-center rounded-full hover:bg-red-400/10 shrink-0 ml-2"
                    >
                      X
                    </button>
                  </div>
                ))}

                {/* Share module with partner */}
                <button
                  type="button"
                  onClick={() => activeModule && handleShareModule(activeModule)}
                  className={`flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors w-full ${
                    sharedModule === activeModule
                      ? "bg-primary/10 text-primary ring-1 ring-primary/30"
                      : "bg-secondary text-muted-foreground"
                  }`}
                >
                  <span className="text-base">
                    {sharedModule === activeModule ? "✓" : "→"}
                  </span>
                  <span>
                    {sharedModule === activeModule
                      ? `Enviado p/ ${partnerName}`
                      : `Enviar tudo p/ ${partnerName}`}
                  </span>
                </button>
              </div>
            )}

            {/* ===== ADD NEW ITEMS ===== */}
            <div className="space-y-3">
              {registeredItems.length > 0 && (
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Adicionar
                </h3>
              )}

              {/* Tab switcher */}
              {!selectedFood && (
                <div className="flex gap-1 rounded-xl bg-secondary p-1">
                  <button
                    onClick={() => setAddTab("alimentos")}
                    className={`flex-1 rounded-lg py-2 text-sm font-medium transition-colors ${
                      addTab === "alimentos"
                        ? "bg-background text-foreground shadow-sm"
                        : "text-muted-foreground"
                    }`}
                  >
                    Alimentos
                  </button>
                  <button
                    onClick={() => setAddTab("receitas")}
                    className={`flex-1 rounded-lg py-2 text-sm font-medium transition-colors ${
                      addTab === "receitas"
                        ? "bg-background text-foreground shadow-sm"
                        : "text-muted-foreground"
                    }`}
                  >
                    Receitas
                  </button>
                </div>
              )}

              {selectedFood ? (
                <PortionInput
                  food={selectedFood}
                  onConfirm={handleAddFood}
                  onCancel={() => setSelectedFood(null)}
                />
              ) : addTab === "alimentos" ? (
                <FoodSearch
                  onSelect={setSelectedFood}
                  placeholder="Buscar alimento para adicionar..."
                />
              ) : (
                <RecipePicker onSelect={handleAddRecipe} />
              )}
            </div>

            {/* Pending items */}
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
                {/* Share with partner toggle */}
                <button
                  type="button"
                  onClick={() => setShareWithPartner((v) => !v)}
                  className={`flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors w-full ${
                    shareWithPartner
                      ? "bg-primary/10 text-primary ring-1 ring-primary/30"
                      : "bg-secondary text-muted-foreground"
                  }`}
                >
                  <span className="text-base">{shareWithPartner ? "✓" : "+"}</span>
                  <span>Também para {partnerName}</span>
                </button>

                <div className="flex items-center justify-between pt-2 border-t border-border/50">
                  <span className="font-bold tabular-nums">
                    Total: {Math.round(pendingTotal)} kcal
                  </span>
                  <Button
                    onClick={handleSaveModule}
                    className="rounded-xl h-10 px-6 font-semibold"
                  >
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

function PartnerView({
  currentUserId,
  date,
}: {
  currentUserId: string;
  date: string;
}) {
  const partnerId = currentUserId === "giovanna" ? "ricardo" : "giovanna";
  const partnerProfile = useQuery(api.userProfiles.getByUserId, {
    userId: partnerId,
  });
  const partnerTotals = useQuery(api.dailyLog.getDailyTotals, {
    userId: partnerId,
    date,
  });

  if (!partnerProfile || partnerTotals === undefined) return null;

  const pct = Math.round(
    (partnerTotals.kcal / partnerProfile.targetKcal) * 100
  );

  return (
    <div className="rounded-xl bg-card p-3 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-xs font-bold">
          {partnerProfile.name.charAt(0)}
        </div>
        <div>
          <span className="text-sm font-medium">{partnerProfile.name}</span>
          <p className="text-[11px] text-muted-foreground tabular-nums">
            {Math.round(partnerTotals.kcal)} / {Math.round(partnerProfile.targetKcal)} kcal
          </p>
        </div>
      </div>
      <div className="text-sm font-bold text-muted-foreground tabular-nums">
        {pct}%
      </div>
    </div>
  );
}
