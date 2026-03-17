"use client";

import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { formatGrams } from "@/lib/constants";
import { Doc } from "../../../convex/_generated/dataModel";

interface PortionInputProps {
  food: Doc<"foods">;
  onConfirm: (food: Doc<"foods">, grams: number) => void;
  onCancel: () => void;
  suggestedGrams?: number;
}

export function PortionInput({
  food,
  onConfirm,
  onCancel,
  suggestedGrams,
}: PortionInputProps) {
  const [grams, setGrams] = useState(suggestedGrams ?? 100);

  const scaled = useMemo(() => {
    const factor = grams / 100;
    return {
      kcal: food.energy_kcal * factor,
      protein: food.protein_g * factor,
      carbs: food.carbs_g * factor,
      fat: food.lipids_g * factor,
    };
  }, [food, grams]);

  const QUICK_AMOUNTS = [50, 100, 150, 200, 300];

  return (
    <div className="rounded-xl bg-card p-4 space-y-4">
      <div>
        <h3 className="text-base font-semibold">{food.name}</h3>
        <p className="text-[11px] text-muted-foreground">{food.category}</p>
      </div>

      <div>
        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">
          Quantidade (g)
        </label>
        <Input
          type="number"
          inputMode="numeric"
          value={grams}
          onChange={(e) => setGrams(Number(e.target.value) || 0)}
          className="text-2xl font-bold h-14 rounded-xl bg-secondary border-0 text-center tabular-nums"
        />
        <div className="flex gap-1.5 mt-2">
          {QUICK_AMOUNTS.map((amount) => (
            <button
              key={amount}
              onClick={() => setGrams(amount)}
              className="flex-1 rounded-lg bg-secondary px-2 py-1.5 text-xs font-medium transition-colors hover:bg-accent active:scale-95 tabular-nums"
            >
              {amount}g
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-4 gap-2">
        <div className="rounded-lg bg-primary/10 p-2 text-center">
          <div className="text-lg font-bold text-primary tabular-nums">
            {Math.round(scaled.kcal)}
          </div>
          <div className="text-[10px] text-muted-foreground font-medium">kcal</div>
        </div>
        <div className="rounded-lg bg-blue-500/10 p-2 text-center">
          <div className="text-lg font-bold text-blue-400 tabular-nums">
            {formatGrams(scaled.protein)}
          </div>
          <div className="text-[10px] text-muted-foreground font-medium">prot</div>
        </div>
        <div className="rounded-lg bg-amber-500/10 p-2 text-center">
          <div className="text-lg font-bold text-amber-400 tabular-nums">
            {formatGrams(scaled.carbs)}
          </div>
          <div className="text-[10px] text-muted-foreground font-medium">carb</div>
        </div>
        <div className="rounded-lg bg-purple-500/10 p-2 text-center">
          <div className="text-lg font-bold text-purple-400 tabular-nums">
            {formatGrams(scaled.fat)}
          </div>
          <div className="text-[10px] text-muted-foreground font-medium">gord</div>
        </div>
      </div>

      <div className="flex gap-2 pt-1">
        <Button
          variant="secondary"
          onClick={onCancel}
          className="flex-1 h-11 rounded-xl"
        >
          Cancelar
        </Button>
        <Button
          onClick={() => onConfirm(food, grams)}
          className="flex-1 h-11 rounded-xl font-semibold"
          disabled={grams <= 0}
        >
          Adicionar
        </Button>
      </div>
    </div>
  );
}
