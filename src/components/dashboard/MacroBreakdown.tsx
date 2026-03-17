"use client";

import { formatGrams } from "@/lib/constants";

interface MacroBreakdownProps {
  protein: { consumed: number; target: number };
  carbs: { consumed: number; target: number };
  fat: { consumed: number; target: number };
}

function MacroBar({
  label,
  consumed,
  target,
  color,
  glowColor,
}: {
  label: string;
  consumed: number;
  target: number;
  color: string;
  glowColor: string;
}) {
  const pct = target > 0 ? Math.min((consumed / target) * 100, 100) : 0;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className="font-semibold tracking-wide">{label}</span>
        <span className="text-muted-foreground tabular-nums">
          {formatGrams(consumed)}g / {formatGrams(target)}g
        </span>
      </div>
      <div className="h-2 rounded-full bg-secondary overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500 ease-out"
          style={{
            width: `${pct}%`,
            backgroundColor: color,
            boxShadow: pct > 5 ? `0 0 8px ${glowColor}` : "none",
          }}
        />
      </div>
    </div>
  );
}

export function MacroBreakdown({ protein, carbs, fat }: MacroBreakdownProps) {
  return (
    <div className="rounded-xl bg-card p-4 space-y-3">
      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
        Macros
      </h3>
      <MacroBar
        label="Proteina"
        consumed={protein.consumed}
        target={protein.target}
        color="oklch(0.65 0.18 250)"
        glowColor="oklch(0.65 0.18 250 / 0.3)"
      />
      <MacroBar
        label="Carboidratos"
        consumed={carbs.consumed}
        target={carbs.target}
        color="oklch(0.75 0.17 70)"
        glowColor="oklch(0.75 0.17 70 / 0.3)"
      />
      <MacroBar
        label="Gorduras"
        consumed={fat.consumed}
        target={fat.target}
        color="oklch(0.65 0.18 310)"
        glowColor="oklch(0.65 0.18 310 / 0.3)"
      />
    </div>
  );
}
