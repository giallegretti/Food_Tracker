"use client";

import { useState, useCallback, Suspense } from "react";
import { useQuery, useMutation } from "convex/react";
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
import {
  MODULE_ORDER,
  MODULE_LABELS,
  getTodayISO,
  formatKcal,
} from "@/lib/constants";
import { Doc } from "../../../convex/_generated/dataModel";
import type { FoodItem } from "@/components/food/FoodSearch";

/* ---------- Types ---------- */
type DaySummary = {
  date: string;
  totalKcal: number;
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
};

type MacroTargets = {
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
};

/* ---------- Day summary card (reusable) ---------- */
function DaySummaryCard({
  day,
  targets,
  dateLabel,
  onClick,
}: {
  day: DaySummary;
  targets: MacroTargets;
  dateLabel: string;
  onClick: () => void;
}) {
  const isOver = day.totalKcal > targets.kcal;

  const macros = [
    {
      label: "Proteina",
      value: day.totalProtein,
      target: targets.protein,
      color: "oklch(0.7 0.15 250)",
    },
    {
      label: "Carbos",
      value: day.totalCarbs,
      target: targets.carbs,
      color: "oklch(0.75 0.17 70)",
    },
    {
      label: "Gordura",
      value: day.totalFat,
      target: targets.fat,
      color: "oklch(0.72 0.16 330)",
    },
  ];

  return (
    <button
      onClick={onClick}
      className="w-full rounded-2xl bg-card p-4 space-y-3 text-left transition-colors hover:ring-1 hover:ring-border/50 active:scale-[0.99]"
    >
      {/* Date + status */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground capitalize">
          {dateLabel}
        </span>
        <span
          className={`inline-block w-2.5 h-2.5 rounded-full ${
            isOver ? "bg-red-400" : "bg-emerald-500"
          }`}
        />
      </div>

      {/* Calories */}
      <div className="flex items-baseline justify-between">
        <div className="flex items-baseline gap-1.5">
          <span className="text-2xl font-bold tabular-nums">
            {formatKcal(day.totalKcal)}
          </span>
          <span className="text-sm text-muted-foreground">
            / {formatKcal(targets.kcal)} kcal
          </span>
        </div>
        {day.totalKcal <= targets.kcal ? (
          <span className="text-xs font-medium text-emerald-500 tabular-nums">
            -{Math.round(targets.kcal - day.totalKcal)}
          </span>
        ) : (
          <span className="text-xs font-medium text-red-400 tabular-nums">
            +{Math.round(day.totalKcal - targets.kcal)}
          </span>
        )}
      </div>

      {/* Macro bars */}
      <div className="grid grid-cols-3 gap-3">
        {macros.map((macro) => {
          const pct =
            macro.target > 0
              ? Math.min((macro.value / macro.target) * 100, 100)
              : 0;
          return (
            <div key={macro.label} className="space-y-1">
              <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
                {macro.label}
              </span>
              <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${pct}%`,
                    backgroundColor: macro.color,
                  }}
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
    </button>
  );
}

/* ---------- Day editor (sheet content) ---------- */
function DayEditor({
  userId,
  date,
  profile,
  onClose,
}: {
  userId: string;
  date: string;
  profile: Doc<"userProfiles">;
  onClose: () => void;
}) {
  const today = getTodayISO();
  const entries = useQuery(api.dailyLog.getByDate, { userId, date });
  const totals = useQuery(api.dailyLog.getDailyTotals, { userId, date });

  const addEntry = useMutation(api.dailyLog.addEntry);
  const removeItem = useMutation(api.dailyLog.removeItem);
  const shareModuleEntries = useMutation(api.dailyLog.shareModuleEntries);

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
      date,
      module: activeModule,
      items: pendingItems,
      alsoForUserId: shareWithPartner ? partnerId : undefined,
    });
    setPendingItems([]);
    setShareWithPartner(false);
  }, [activeModule, pendingItems, userId, date, addEntry, shareWithPartner, partnerId]);

  const handleShareModule = useCallback(
    async (mod: string) => {
      await shareModuleEntries({
        userId,
        date,
        module: mod,
        targetUserId: partnerId,
      });
      setSharedModule(mod);
      setTimeout(() => setSharedModule(null), 2000);
    },
    [userId, date, partnerId, shareModuleEntries]
  );

  if (!totals || !entries) {
    return (
      <div className="flex items-center justify-center py-12">
        <span className="text-muted-foreground animate-pulse">
          Carregando...
        </span>
      </div>
    );
  }

  const moduleItemCount: Record<string, number> = {};
  for (const entry of entries) {
    moduleItemCount[entry.module] =
      (moduleItemCount[entry.module] || 0) + entry.items.length;
  }

  const pendingTotal = pendingItems.reduce((s, i) => s + i.energy_kcal, 0);
  const isEditable = date <= today;

  const formattedDate = new Date(date + "T12:00:00").toLocaleDateString(
    "pt-BR",
    { weekday: "long", day: "numeric", month: "long" }
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

  // If a module is active, show the unified module view
  if (activeModule !== null) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold">
            {MODULE_LABELS[activeModule] || "Extra"}
            {activeModule !== "extra" && profile && (
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
          </h3>
          <button
            onClick={() => {
              setActiveModule(null);
              setPendingItems([]);
              setSelectedFood(null);
            }}
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            Voltar
          </button>
        </div>

        {/* Registered items */}
        {registeredItems.length > 0 && (
          <div className="space-y-1">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Registrados ({registeredItems.length} · {Math.round(registeredKcal)} kcal)
            </h3>
            {registeredItems.map((item) => (
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
                {isEditable && (
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
                )}
              </div>
            ))}

            {/* Share module */}
            {isEditable && (
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
            )}
          </div>
        )}

        {/* Add section */}
        {isEditable && (
          <div className="space-y-3">
            {registeredItems.length > 0 && (
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Adicionar
              </h3>
            )}

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
        )}

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
    );
  }

  // Default: show day overview with modules (read-only preview)
  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground capitalize">
        {formattedDate}
      </p>

      {/* Day total */}
      <div className="flex items-baseline gap-1.5">
        <span className="text-xl font-bold tabular-nums">
          {formatKcal(totals.kcal)}
        </span>
        <span className="text-sm text-muted-foreground">
          / {formatKcal(profile.targetKcal)} kcal
        </span>
      </div>

      {/* Module cards with read-only entries */}
      {MODULE_ORDER.map((mod) => (
        <div key={mod} className="space-y-0">
          <ModuleCard
            module={mod}
            consumed={totals.byModule[mod]?.kcal || 0}
            budget={profile.modules[mod]}
            itemCount={moduleItemCount[mod]}
            onClick={
              isEditable
                ? () => {
                    setActiveModule(mod);
                    setPendingItems([]);
                    setAddTab("alimentos");
                    setShareWithPartner(false);
                  }
                : undefined
            }
          />

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

      {/* Extra food button */}
      {isEditable && (
        <Button
          variant="secondary"
          className="w-full h-11 rounded-xl"
          onClick={() => {
            setActiveModule("extra");
            setPendingItems([]);
            setAddTab("alimentos");
            setShareWithPartner(false);
          }}
        >
          + Adicionar alimento extra
        </Button>
      )}
    </div>
  );
}

/* ---------- Helper: group dates by month ---------- */
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
  const { userId, setUserId } = useCurrentUser();
  const today = getTodayISO();

  const [editingDate, setEditingDate] = useState<string | null>(null);

  const profile = useQuery(api.userProfiles.getByUserId, { userId });
  const datesWithEntries = useQuery(api.dailyLog.getDatesWithEntries, {
    userId,
  });

  if (!profile) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-muted-foreground animate-pulse">Carregando...</div>
      </div>
    );
  }

  const targetKcal = profile.targetKcal;
  const targets: MacroTargets = {
    kcal: targetKcal,
    protein: (targetKcal * profile.proteinPct) / 100 / 4,
    carbs: (targetKcal * profile.carbsPct) / 100 / 4,
    fat: (targetKcal * profile.fatPct) / 100 / 9,
  };

  const allDates = datesWithEntries || [];
  const months = groupByMonth(allDates);

  return (
    <div className="min-h-screen pb-24">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl safe-top">
        <div className="mx-auto flex max-w-md items-center justify-between px-4 py-3">
          <div className="flex-1">
            <h1 className="text-base font-bold tracking-tight">Diario</h1>
          </div>
          <UserSwitcher userId={userId} onSwitch={setUserId} />
        </div>
      </div>

      <div className="mx-auto max-w-md px-4 space-y-5">
        {months.length === 0 && (
          <div className="text-center py-12 text-muted-foreground text-sm">
            Nenhum registro ainda.
          </div>
        )}

        {months.map(({ monthKey, label, days }) => {
          const daysWithin = days.filter(
            (d) => d.totalKcal <= targetKcal
          ).length;
          const daysOver = days.length - daysWithin;
          const avgProtein =
            days.reduce((s, d) => s + d.totalProtein, 0) / days.length;

          return (
            <div key={monthKey} className="space-y-3">
              {/* Month header */}
              <div className="flex items-center justify-between px-1">
                <h2 className="text-sm font-semibold capitalize">{label}</h2>
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
                  <span>
                    P {Math.round(avgProtein)}g/dia
                  </span>
                </div>
              </div>

              {/* Day cards */}
              {days.map((day) => {
                const isToday = day.date === today;
                const dateLabel = isToday
                  ? "Hoje"
                  : new Date(day.date + "T12:00:00").toLocaleDateString(
                      "pt-BR",
                      { weekday: "long", day: "numeric", month: "short" }
                    );

                return (
                  <DaySummaryCard
                    key={day.date}
                    day={day}
                    targets={targets}
                    dateLabel={dateLabel}
                    onClick={() => setEditingDate(day.date)}
                  />
                );
              })}
            </div>
          );
        })}
      </div>

      {/* Day editor sheet */}
      <Sheet
        open={editingDate !== null}
        onOpenChange={(open) => {
          if (!open) setEditingDate(null);
        }}
      >
        <SheetContent
          side="bottom"
          className="h-[90vh] rounded-t-2xl border-t border-border/50"
        >
          <SheetHeader>
            <SheetTitle className="text-left">Detalhes do dia</SheetTitle>
          </SheetHeader>
          <div className="mt-4 overflow-y-auto max-h-[calc(90vh-80px)]">
            {editingDate && (
              <DayEditor
                userId={userId}
                date={editingDate}
                profile={profile}
                onClose={() => setEditingDate(null)}
              />
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
