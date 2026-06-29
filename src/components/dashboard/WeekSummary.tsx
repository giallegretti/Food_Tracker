"use client";

import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { getTodayISO, shiftDate } from "@/lib/constants";

interface WeekSummaryProps {
  userId: string;
  basal: number; // linha do basal/meta
  maintenance: number; // teto da escala (sedentária)
}

/**
 * Consumo dos últimos 7 dias contra a linha do basal. Dias abaixo do basal
 * ficam âmbar — régua para não viver abaixo do basal.
 */
export function WeekSummary({ userId, basal, maintenance }: WeekSummaryProps) {
  const datesData = useQuery(api.dailyLog.getDatesWithEntries, { userId });

  const today = getTodayISO();
  const days = Array.from({ length: 7 }, (_, i) => shiftDate(today, i - 6));

  const kcalByDate = new Map<string, number>();
  for (const d of datesData ?? []) kcalByDate.set(d.date, d.totalKcal);

  const max = maintenance * 1.05;
  const basalBottom = Math.min((basal / max) * 100, 100);

  const logged = days
    .map((d) => kcalByDate.get(d) ?? 0)
    .filter((v) => v > 0);
  const avg = logged.length
    ? Math.round(logged.reduce((s, v) => s + v, 0) / logged.length)
    : 0;
  const belowCount = days.filter((d) => {
    const v = kcalByDate.get(d) ?? 0;
    return v > 0 && v < basal;
  }).length;
  const loggedCount = logged.length;

  return (
    <div className="rounded-xl bg-card p-4">
      <div className="flex items-baseline justify-between mb-3">
        <span className="text-sm font-semibold">Consumo × basal</span>
        <span className="text-[11px] text-muted-foreground tabular-nums">
          {new Date(days[0] + "T12:00:00").toLocaleDateString("pt-BR", {
            day: "numeric",
            month: "short",
          })}{" "}
          –{" "}
          {new Date(days[6] + "T12:00:00").toLocaleDateString("pt-BR", {
            day: "numeric",
            month: "short",
          })}
        </span>
      </div>

      <div className="relative flex items-end gap-1.5 h-[120px] pt-1.5">
        {/* linha do basal/meta */}
        <div
          className="absolute left-0 right-0 border-t border-dashed"
          style={{
            bottom: `${basalBottom}%`,
            borderColor: "oklch(0.72 0.19 155 / 0.7)",
          }}
        >
          <span className="absolute right-0 -top-3.5 text-[9px] font-mono text-emerald-400">
            basal {Math.round(basal)}
          </span>
        </div>

        {days.map((d) => {
          const kcal = kcalByDate.get(d) ?? 0;
          const h = kcal > 0 ? Math.max((kcal / max) * 100, 3) : 0;
          const below = kcal > 0 && kcal < basal;
          const isToday = d === today;
          return (
            <div
              key={d}
              className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end"
            >
              <div
                className="w-3/5 rounded-t-md transition-all"
                style={{
                  height: `${h}%`,
                  backgroundColor: below
                    ? "oklch(0.75 0.16 70)"
                    : "oklch(0.72 0.19 155)",
                  outline: isToday ? "2px solid var(--foreground)" : "none",
                  outlineOffset: "1px",
                }}
                title={kcal > 0 ? `${Math.round(kcal)} kcal` : "sem registro"}
              />
              <span className="text-[9px] font-mono text-muted-foreground capitalize">
                {new Date(d + "T12:00:00")
                  .toLocaleDateString("pt-BR", { weekday: "short" })
                  .replace(".", "")}
              </span>
            </div>
          );
        })}
      </div>

      <div className="flex justify-between text-[11px] font-mono text-muted-foreground mt-3 pt-3 border-t border-border/50">
        <span>{avg > 0 ? `média ${avg} / dia` : "sem registros"}</span>
        {belowCount > 0 && (
          <span style={{ color: "oklch(0.75 0.16 70)" }}>
            {belowCount} de {loggedCount}{" "}
            {loggedCount === 1 ? "dia" : "dias"} abaixo do basal
          </span>
        )}
      </div>
    </div>
  );
}
