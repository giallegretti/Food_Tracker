"use client";

interface CalorieBudgetBarProps {
  consumed: number;
  budget: number;
  showNumbers?: boolean;
}

export function CalorieBudgetBar({
  consumed,
  budget,
  showNumbers = true,
}: CalorieBudgetBarProps) {
  const percentage = budget > 0 ? Math.min((consumed / budget) * 100, 100) : 0;
  const remaining = budget - consumed;
  const isOver = consumed > budget;

  const barColor = isOver
    ? "oklch(0.65 0.2 25)"
    : percentage > 80
      ? "oklch(0.75 0.17 70)"
      : "oklch(0.72 0.19 155)";

  return (
    <div className="space-y-1">
      {showNumbers && (
        <div className="flex items-center justify-between text-[11px] tabular-nums">
          <span className="text-muted-foreground">
            {Math.round(consumed)} / {Math.round(budget)} kcal
          </span>
          {remaining > 0 ? (
            <span className="text-emerald-400 font-medium">
              -{Math.round(remaining)}
            </span>
          ) : isOver ? (
            <span className="text-red-400 font-medium">
              +{Math.round(consumed - budget)}
            </span>
          ) : null}
        </div>
      )}
      <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500 ease-out"
          style={{
            width: `${Math.min(percentage, 100)}%`,
            backgroundColor: barColor,
          }}
        />
      </div>
    </div>
  );
}
