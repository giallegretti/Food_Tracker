"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  MODULE_LABELS,
  MODULE_ORDER,
  getTodayISO,
  shiftDate,
} from "@/lib/constants";

const TARGET_MODULES = [...MODULE_ORDER, "extra"] as const;

function shortDate(date: string): string {
  return new Date(date + "T12:00:00").toLocaleDateString("pt-BR", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

function relativeLabel(date: string, today: string): string {
  if (date === today) return "hoje";
  if (date === shiftDate(today, -1)) return "ontem";
  return shortDate(date);
}

interface CopyMealPanelProps {
  userId: string;
  fromDate: string;
  fromModule: string;
  itemCount: number;
  onCopied: (message: string) => void;
  onCancel: () => void;
}

export function CopyMealPanel({
  userId,
  fromDate,
  fromModule,
  itemCount,
  onCopied,
  onCancel,
}: CopyMealPanelProps) {
  const today = getTodayISO();
  const copyModuleToDate = useMutation(api.dailyLog.copyModuleToDate);

  // Caso mais comum: trazer a refeição de um dia passado para hoje
  const [toDate, setToDate] = useState(fromDate === today ? "" : today);
  const [toModule, setToModule] = useState<string>(fromModule);
  const [saving, setSaving] = useState(false);

  const quickDates = [today, shiftDate(today, -1), shiftDate(today, -2)];
  const customDate = toDate && !quickDates.includes(toDate) ? toDate : "";
  const isSameSlot = toDate === fromDate && toModule === fromModule;
  const canCopy = !!toDate && !isSameSlot && !saving;

  const handleCopy = async () => {
    if (!canCopy) return;
    setSaving(true);
    try {
      await copyModuleToDate({
        userId,
        fromDate,
        module: fromModule,
        toDate,
        toModule,
      });
      onCopied(
        `Copiado para ${MODULE_LABELS[toModule]} de ${relativeLabel(toDate, today)}`
      );
    } finally {
      setSaving(false);
    }
  };

  const chip = (active: boolean) =>
    cn(
      "rounded-lg px-3 py-2 text-xs font-medium transition-all active:scale-95",
      active ? "bg-primary text-primary-foreground" : "bg-secondary"
    );

  return (
    <div className="rounded-xl bg-card p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Copiar refeição</h3>
        <button
          type="button"
          onClick={onCancel}
          className="text-xs text-muted-foreground hover:text-foreground"
        >
          Cancelar
        </button>
      </div>

      <div>
        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">
          Para qual dia
        </label>
        <div className="flex flex-wrap gap-1.5">
          {quickDates.map((d, i) => (
            <button
              key={d}
              type="button"
              onClick={() => setToDate(d)}
              className={chip(toDate === d)}
            >
              {i === 0 ? "Hoje" : i === 1 ? "Ontem" : shortDate(d)}
            </button>
          ))}
          <label
            className={cn(
              chip(!!customDate),
              "relative flex items-center gap-1 cursor-pointer"
            )}
          >
            {customDate ? shortDate(customDate) : "Outra data"}
            <input
              type="date"
              value={customDate}
              max={today}
              onChange={(e) => e.target.value && setToDate(e.target.value)}
              className="absolute inset-0 opacity-0 cursor-pointer"
              aria-label="Escolher outra data"
            />
          </label>
        </div>
      </div>

      <div>
        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">
          Em qual refeição
        </label>
        <div className="flex flex-wrap gap-1.5">
          {TARGET_MODULES.map((mod) => (
            <button
              key={mod}
              type="button"
              onClick={() => setToModule(mod)}
              className={chip(toModule === mod)}
            >
              {MODULE_LABELS[mod]}
            </button>
          ))}
        </div>
      </div>

      {isSameSlot && (
        <p className="text-[11px] text-muted-foreground">
          Esta já é a refeição de origem. Escolha outro dia ou outra refeição.
        </p>
      )}

      <Button
        className="w-full h-11 rounded-xl font-semibold"
        disabled={!canCopy}
        onClick={handleCopy}
      >
        {saving
          ? "Copiando..."
          : toDate
            ? `Copiar ${itemCount} ${itemCount === 1 ? "item" : "itens"} para ${MODULE_LABELS[toModule]} de ${relativeLabel(toDate, today)}`
            : "Escolha o dia"}
      </Button>
    </div>
  );
}
