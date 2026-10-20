"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { BottomNav } from "@/components/layout/BottomNav";
import { DailyRing } from "@/components/dashboard/DailyRing";
import { BasalReference } from "@/components/dashboard/BasalReference";
import { WeekSummary } from "@/components/dashboard/WeekSummary";
import { MacroBreakdown } from "@/components/dashboard/MacroBreakdown";
import { ModuleCard } from "@/components/meals/ModuleCard";
import { MealEditor } from "@/components/meals/MealEditor";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { MODULE_ORDER, getTodayISO } from "@/lib/constants";

export default function DashboardPage() {
  const { userId } = useCurrentUser();
  const today = getTodayISO();

  const [activeModule, setActiveModule] = useState<string | null>(null);

  const profile = useQuery(api.userProfiles.getByUserId, { userId });
  const totals = useQuery(api.dailyLog.getDailyTotals, { userId, date: today });
  const entries = useQuery(api.dailyLog.getByDate, { userId, date: today });

  if (!profile || totals === undefined) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-muted-foreground animate-pulse">Carregando...</div>
      </div>
    );
  }

  const isBasalMode = profile.targetMode === "basal";

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

  const todayFormatted = new Date(today + "T12:00:00").toLocaleDateString(
    "pt-BR",
    { weekday: "long", day: "numeric", month: "short" }
  );

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
        </div>
      </div>

      <div className="mx-auto max-w-md px-4 space-y-5">
        {/* Calorie Ring */}
        <div className="flex justify-center pt-2 pb-1">
          <DailyRing
            consumed={totals.kcal}
            target={profile.targetKcal}
            maintenance={isBasalMode ? profile.tdee : undefined}
          />
        </div>

        {/* Basal / sedentária / atividade (modelo meta = basal) */}
        {isBasalMode && (
          <BasalReference
            consumed={totals.kcal}
            basal={profile.bmr}
            maintenance={profile.tdee}
            activity={profile.bmr * 1.375}
          />
        )}

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
                onClick={() => setActiveModule(mod)}
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
              onClick={() => setActiveModule("extra")}
            />
          )}
        </div>

        {/* Extra food button */}
        <Button
          variant="secondary"
          className="w-full h-11 rounded-xl"
          onClick={() => setActiveModule("extra")}
        >
          + Adicionar alimento extra
        </Button>

        {/* Week summary (modelo meta = basal) */}
        {isBasalMode && (
          <div className="space-y-2">
            <h2 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest px-1">
              Resumo da semana
            </h2>
            <WeekSummary
              userId={userId}
              basal={profile.bmr}
              maintenance={profile.tdee}
            />
          </div>
        )}
      </div>

      {/* Module Sheet */}
      <Sheet
        open={activeModule !== null}
        onOpenChange={(open) => {
          if (!open) setActiveModule(null);
        }}
      >
        <SheetContent
          side="bottom"
          className="data-[side=bottom]:h-[92dvh] gap-0 rounded-t-2xl border-t border-border/50"
        >
          {activeModule && (
            <MealEditor
              key={activeModule}
              userId={userId}
              date={today}
              module={activeModule}
              entries={entries ?? []}
              targetKcal={
                activeModule !== "extra"
                  ? profile.modules[activeModule as keyof typeof profile.modules]
                  : undefined
              }
            />
          )}
        </SheetContent>
      </Sheet>

      <BottomNav />
    </div>
  );
}
