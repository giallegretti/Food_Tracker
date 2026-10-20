"use client";

import { useState, Suspense } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { BottomNav } from "@/components/layout/BottomNav";
import { ModuleCard } from "@/components/meals/ModuleCard";
import { MealEditor } from "@/components/meals/MealEditor";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { MODULE_ORDER, getTodayISO, formatKcal } from "@/lib/constants";
import { Doc } from "../../../convex/_generated/dataModel";

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
  dayTargetKcal,
}: {
  userId: string;
  date: string;
  profile: Doc<"userProfiles">;
  dayTargetKcal: number;
}) {
  const today = getTodayISO();
  const entries = useQuery(api.dailyLog.getByDate, { userId, date });
  const totals = useQuery(api.dailyLog.getDailyTotals, { userId, date });

  const [activeModule, setActiveModule] = useState<string | null>(null);

  if (!totals || !entries) {
    return (
      <SheetBody className="flex items-center justify-center py-12">
        <span className="text-muted-foreground animate-pulse">
          Carregando...
        </span>
      </SheetBody>
    );
  }

  const isEditable = date <= today;

  if (activeModule !== null) {
    return (
      <MealEditor
        key={activeModule}
        userId={userId}
        date={date}
        module={activeModule}
        entries={entries}
        editable={isEditable}
        targetKcal={
          activeModule !== "extra"
            ? profile.modules[activeModule as keyof typeof profile.modules]
            : undefined
        }
        onBack={() => setActiveModule(null)}
      />
    );
  }

  const moduleItemCount: Record<string, number> = {};
  for (const entry of entries) {
    moduleItemCount[entry.module] =
      (moduleItemCount[entry.module] || 0) + entry.items.length;
  }

  const formattedDate = new Date(date + "T12:00:00").toLocaleDateString(
    "pt-BR",
    { weekday: "long", day: "numeric", month: "long" }
  );

  const modules: string[] = [...MODULE_ORDER];
  if (totals.byModule["extra"]) modules.push("extra");

  // Resumo do dia; tocar numa refeição abre o editor dela
  return (
    <>
      <SheetHeader className="pr-12">
        <SheetTitle className="text-left">Detalhes do dia</SheetTitle>
        <p className="text-xs text-muted-foreground capitalize">
          {formattedDate}
        </p>
      </SheetHeader>

      <SheetBody className="space-y-3">
        {/* Day total */}
        <div className="flex items-baseline gap-1.5">
          <span className="text-xl font-bold tabular-nums">
            {formatKcal(totals.kcal)}
          </span>
          <span className="text-sm text-muted-foreground">
            / {formatKcal(dayTargetKcal)} kcal
          </span>
        </div>

        {/* Module cards with read-only entries */}
        {modules.map((mod) => (
          <div key={mod} className="space-y-0">
            <ModuleCard
              module={mod}
              consumed={totals.byModule[mod]?.kcal || 0}
              budget={
                mod === "extra"
                  ? 0
                  : profile.modules[mod as keyof typeof profile.modules]
              }
              itemCount={moduleItemCount[mod]}
              onClick={isEditable ? () => setActiveModule(mod) : undefined}
            />

            {entries
              .filter((e) => e.module === mod)
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
            onClick={() => setActiveModule("extra")}
          >
            + Adicionar alimento extra
          </Button>
        )}
      </SheetBody>
    </>
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
  const { userId } = useCurrentUser();
  const today = getTodayISO();

  const [editingDate, setEditingDate] = useState<string | null>(null);
  const [manualDate, setManualDate] = useState("");

  const profile = useQuery(api.userProfiles.getByUserId, { userId });
  const datesWithEntries = useQuery(api.dailyLog.getDatesWithEntries, {
    userId,
  });
  const weightHistory = useQuery(api.weightLog.getByUser, { userId });

  if (!profile) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-muted-foreground animate-pulse">Carregando...</div>
      </div>
    );
  }

  const isBasalMode = profile.targetMode === "basal";

  // Pesagens em ordem crescente para achar o basal vigente em cada data.
  // O weightLog guarda o bmr de cada pesagem, então a meta de um dia passado
  // reflete o peso daquele dia, não o atual.
  const weighAsc = [...(weightHistory ?? [])].sort((a, b) =>
    a.date.localeCompare(b.date)
  );
  const basalForDate = (date: string): number => {
    if (weighAsc.length === 0) return profile.bmr;
    let chosen = weighAsc[0];
    for (const w of weighAsc) {
      if (w.date <= date) chosen = w;
      else break;
    }
    return chosen.bmr;
  };
  const targetsForDate = (date: string): MacroTargets => {
    const basal = basalForDate(date);
    const kcal = isBasalMode
      ? basal
      : basal * profile.activityFactor - profile.deficitKcal;
    return {
      kcal,
      protein: (kcal * profile.proteinPct) / 100 / 4,
      carbs: (kcal * profile.carbsPct) / 100 / 4,
      fat: (kcal * profile.fatPct) / 100 / 9,
    };
  };

  const allDates = datesWithEntries || [];
  const months = groupByMonth(allDates);

  return (
    <div className="min-h-screen pb-24">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl safe-top">
        <div className="mx-auto flex max-w-md items-center justify-between px-4 py-3">
          <h1 className="text-base font-bold tracking-tight">Diario</h1>
        </div>
      </div>

      <div className="mx-auto max-w-md px-4 space-y-5">
        {/* Date picker for accessing any past day */}
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={manualDate}
            max={today}
            onChange={(e) => setManualDate(e.target.value)}
            className="flex-1 h-11 rounded-xl bg-secondary border-0 px-3 text-base text-foreground"
          />
          <Button
            variant="secondary"
            className="h-11 rounded-xl px-4 font-semibold shrink-0"
            disabled={!manualDate || manualDate > today}
            onClick={() => {
              setEditingDate(manualDate);
              setManualDate("");
            }}
          >
            Abrir dia
          </Button>
        </div>

        {months.length === 0 && (
          <div className="text-center py-12 text-muted-foreground text-sm">
            Nenhum registro ainda.
          </div>
        )}

        {months.map(({ monthKey, label, days }) => {
          const daysWithin = days.filter(
            (d) => d.totalKcal <= targetsForDate(d.date).kcal
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
                    targets={targetsForDate(day.date)}
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
          className="gap-0 rounded-t-2xl border-t border-border/50"
        >
          {editingDate && (
            <DayEditor
              key={editingDate}
              userId={userId}
              date={editingDate}
              profile={profile}
              dayTargetKcal={targetsForDate(editingDate).kcal}
            />
          )}
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
