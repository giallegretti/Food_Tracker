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
import { RecipePicker } from "@/components/food/RecipePicker";
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

const MODULE_EMOJI: Record<string, string> = {
  cafeDaManha: "☕",
  almoco: "🍱",
  lanche: "🍌",
  jantar: "🍽️",
  doce: "🍫",
  extra: "➕",
};

/* ---------- Expanded day: module-level breakdown ---------- */
function DayModuleBreakdown({ userId, date }: { userId: string; date: string }) {
  const totals = useQuery(api.dailyLog.getDailyTotals, { userId, date });

  if (!totals) {
    return (
      <div className="py-2 text-xs text-muted-foreground animate-pulse">
        Carregando...
      </div>
    );
  }

  const modules = [...MODULE_ORDER, "extra" as const];
  const hasAny = modules.some((mod) => (totals.byModule[mod]?.kcal || 0) > 0);
  if (!hasAny) return null;

  return (
    <div className="space-y-1.5 pt-2 pb-1">
      {modules.map((mod) => {
        const modKcal = totals.byModule[mod]?.kcal || 0;
        if (modKcal === 0) return null;
        return (
          <div
            key={mod}
            className="flex items-center justify-between text-xs px-1"
          >
            <span className="text-muted-foreground">
              {MODULE_EMOJI[mod]} {MODULE_LABELS[mod] || "Extra"}
            </span>
            <span className="tabular-nums text-muted-foreground">
              {Math.round(modKcal)} kcal
            </span>
          </div>
        );
      })}
    </div>
  );
}

/* ---------- Helper: group dates by month ---------- */
type DaySummary = {
  date: string;
  totalKcal: number;
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
};

function groupByMonth(
  dates: DaySummary[]
): Array<{ monthKey: string; label: string; days: DaySummary[] }> {
  const groups = new Map<string, DaySummary[]>();

  for (const entry of dates) {
    const monthKey = entry.date.substring(0, 7);
    if (!groups.has(monthKey)) {
      groups.set(monthKey, []);
    }
    groups.get(monthKey)!.push(entry);
  }

  return Array.from(groups.entries())
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([monthKey, days]) => {
      const d = new Date(monthKey + "-15T12:00:00");
      const label = d.toLocaleDateString("pt-BR", {
        month: "long",
        year: "numeric",
      });
      return { monthKey, label, days };
    });
}

/* ---------- Main content ---------- */
function DiarioContent() {
  const searchParams = useSearchParams();
  const { userId, setUserId } = useCurrentUser();
  const today = getTodayISO();

  const [activeModule, setActiveModule] = useState<string | null>(
    searchParams.get("modulo")
  );
  const [addTab, setAddTab] = useState<"alimentos" | "receitas">("alimentos");
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
  const [expandedDay, setExpandedDay] = useState<string | null>(null);

  const profile = useQuery(api.userProfiles.getByUserId, { userId });
  const entries = useQuery(api.dailyLog.getByDate, { userId, date: today });
  const totals = useQuery(api.dailyLog.getDailyTotals, { userId, date: today });
  const datesWithEntries = useQuery(api.dailyLog.getDatesWithEntries, {
    userId,
  });

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

  const formattedToday = new Date(today + "T12:00:00").toLocaleDateString(
    "pt-BR",
    { weekday: "long", day: "numeric", month: "short" }
  );

  const targetKcal = profile.targetKcal;

  // Macro targets in grams (from % of target calories)
  const targetProtein = (targetKcal * profile.proteinPct) / 100 / 4;
  const targetCarbs = (targetKcal * profile.carbsPct) / 100 / 4;
  const targetFat = (targetKcal * profile.fatPct) / 100 / 9;

  // History: exclude today, group by month
  const pastDates = (datesWithEntries || []).filter((d) => d.date !== today);
  const months = groupByMonth(pastDates);

  return (
    <div className="min-h-screen pb-24">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl safe-top">
        <div className="mx-auto flex max-w-md items-center justify-between px-4 py-3">
          <div className="flex-1">
            <h1 className="text-base font-bold tracking-tight">Diario</h1>
            <p className="text-[11px] text-muted-foreground capitalize mt-0.5">
              {formattedToday}
            </p>
          </div>
          <UserSwitcher userId={userId} onSwitch={setUserId} />
        </div>
      </div>

      <div className="mx-auto max-w-md px-4 space-y-3">
        {/* Daily summary card */}
        <div className="rounded-2xl bg-card p-4 space-y-3">
          {/* Calories - main number */}
          <div className="flex items-baseline justify-between">
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-bold tabular-nums">
                {formatKcal(totals.kcal)}
              </span>
              <span className="text-sm text-muted-foreground">
                / {formatKcal(targetKcal)} kcal
              </span>
            </div>
            {totals.kcal <= targetKcal ? (
              <span className="text-xs font-medium text-emerald-500 tabular-nums">
                -{Math.round(targetKcal - totals.kcal)}
              </span>
            ) : (
              <span className="text-xs font-medium text-red-400 tabular-nums">
                +{Math.round(totals.kcal - targetKcal)}
              </span>
            )}
          </div>

          {/* Macro bars */}
          <div className="grid grid-cols-3 gap-3">
            {([
              { label: "Proteina", value: totals.protein, target: targetProtein, color: "oklch(0.7 0.15 250)" },
              { label: "Carbos", value: totals.carbs, target: targetCarbs, color: "oklch(0.75 0.17 70)" },
              { label: "Gordura", value: totals.fat, target: targetFat, color: "oklch(0.72 0.16 330)" },
            ] as const).map((macro) => {
              const pct = macro.target > 0 ? Math.min((macro.value / macro.target) * 100, 100) : 0;
              return (
                <div key={macro.label} className="space-y-1">
                  <div className="flex items-baseline justify-between">
                    <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
                      {macro.label}
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${pct}%`, backgroundColor: macro.color }}
                    />
                  </div>
                  <div className="text-[11px] tabular-nums text-muted-foreground">
                    {Math.round(macro.value)}
                    <span className="text-muted-foreground/50">
                      /{Math.round(macro.target)}g
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Module cards with entries — always today */}
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
              }}
            />

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
                        {Math.round(item.portionGrams)}g ·{" "}
                        {Math.round(item.energy_kcal)} kcal
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
            setAddTab("alimentos");
          }}
        >
          + Adicionar alimento extra
        </Button>

        {/* ===== COMPACT HISTORY ===== */}
        {months.length > 0 && (
          <div className="pt-6 space-y-5">
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Historico
            </h2>

            {months.map(({ monthKey, label, days }) => {
              const daysWithin = days.filter(
                (d) => d.totalKcal <= targetKcal
              ).length;
              const daysOver = days.length - daysWithin;

              return (
                <div key={monthKey} className="space-y-1.5">
                  {/* Month header */}
                  <div className="flex items-center justify-between px-1 pb-1">
                    <h3 className="text-sm font-semibold capitalize">
                      {label}
                    </h3>
                    <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                      <span>
                        {days.length} {days.length === 1 ? "dia" : "dias"}
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="inline-block w-2 h-2 rounded-full bg-emerald-500" />
                        {daysWithin}
                      </span>
                      {daysOver > 0 && (
                        <span className="flex items-center gap-1">
                          <span className="inline-block w-2 h-2 rounded-full bg-red-400" />
                          {daysOver}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Day rows */}
                  <div className="space-y-1">
                    {days.map(({ date, totalKcal, totalProtein, totalCarbs, totalFat }) => {
                      const isExpanded = expandedDay === date;
                      const isOver = totalKcal > targetKcal;
                      const pct =
                        targetKcal > 0 ? totalKcal / targetKcal : 0;
                      const dateLabel = new Date(
                        date + "T12:00:00"
                      ).toLocaleDateString("pt-BR", {
                        weekday: "short",
                        day: "numeric",
                      });
                      const proteinPct = targetProtein > 0 ? totalProtein / targetProtein : 0;

                      return (
                        <div key={date}>
                          <button
                            onClick={() =>
                              setExpandedDay(isExpanded ? null : date)
                            }
                            className={`w-full rounded-xl px-3 py-2.5 text-sm transition-colors ${
                              isExpanded
                                ? "bg-card ring-1 ring-border/50"
                                : "bg-card/50 hover:bg-card"
                            }`}
                          >
                            {/* Row 1: date + calorie bar + kcal */}
                            <div className="flex items-center gap-3">
                              {/* Status dot */}
                              <span
                                className={`shrink-0 w-2.5 h-2.5 rounded-full ${
                                  isOver ? "bg-red-400" : "bg-emerald-500"
                                }`}
                              />
                              {/* Date */}
                              <span className="capitalize text-left min-w-[68px]">
                                {dateLabel}
                              </span>
                              {/* Mini calorie bar */}
                              <div className="flex-1 h-1.5 rounded-full bg-secondary overflow-hidden">
                                <div
                                  className="h-full rounded-full transition-all"
                                  style={{
                                    width: `${Math.min(pct * 100, 100)}%`,
                                    backgroundColor: isOver
                                      ? "oklch(0.65 0.2 25)"
                                      : pct > 0.8
                                        ? "oklch(0.75 0.17 70)"
                                        : "oklch(0.72 0.19 155)",
                                  }}
                                />
                              </div>
                              {/* Kcal numbers */}
                              <span className="tabular-nums text-xs text-muted-foreground shrink-0">
                                {formatKcal(totalKcal)}
                                <span className="text-muted-foreground/50">
                                  {" "}
                                  / {formatKcal(targetKcal)}
                                </span>
                              </span>
                              {/* Chevron */}
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                width="14"
                                height="14"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                className={`shrink-0 text-muted-foreground/50 transition-transform ${
                                  isExpanded ? "rotate-180" : ""
                                }`}
                              >
                                <path d="m6 9 6 6 6-6" />
                              </svg>
                            </div>
                            {/* Row 2: macro summary */}
                            <div className="flex items-center gap-3 mt-1.5 ml-[22px]">
                              <span className={`text-[10px] tabular-nums font-medium ${
                                proteinPct >= 0.9 ? "text-emerald-500" : proteinPct >= 0.7 ? "text-muted-foreground" : "text-red-400/80"
                              }`}>
                                P {Math.round(totalProtein)}g
                              </span>
                              <span className="text-[10px] tabular-nums text-muted-foreground/60">
                                C {Math.round(totalCarbs)}g
                              </span>
                              <span className="text-[10px] tabular-nums text-muted-foreground/60">
                                G {Math.round(totalFat)}g
                              </span>
                            </div>
                          </button>

                          {/* Expanded module breakdown */}
                          {isExpanded && (
                            <div className="mx-3 border-l-2 border-border/40 pl-4 ml-4">
                              <DayModuleBreakdown
                                userId={userId}
                                date={date}
                              />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add food sheet */}
      <Sheet
        open={activeModule !== null}
        onOpenChange={(open) => {
          if (!open) {
            setActiveModule(null);
            setPendingItems([]);
            setSelectedFood(null);
            setAddTab("alimentos");
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
                onSelect={(food) => setSelectedFood(food)}
                placeholder="Buscar alimento para adicionar..."
              />
            ) : (
              <RecipePicker onSelect={handleAddRecipe} />
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

export default function DiarioPage() {
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
      <DiarioContent />
    </Suspense>
  );
}
