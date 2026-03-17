"use client";

import { cn } from "@/lib/utils";

interface DailyRingProps {
  consumed: number;
  target: number;
  size?: number;
}

export function DailyRing({ consumed, target, size = 180 }: DailyRingProps) {
  const percentage = target > 0 ? Math.min((consumed / target) * 100, 100) : 0;
  const remaining = target - consumed;
  const isOver = consumed > target;

  const strokeWidth = 12;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;

  const ringColor = isOver
    ? "oklch(0.65 0.2 25)"
    : percentage > 80
      ? "oklch(0.75 0.17 70)"
      : "oklch(0.72 0.19 155)";

  return (
    <div className="relative flex flex-col items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90 absolute inset-0">
        {/* Background track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-secondary"
        />
        {/* Progress arc */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          stroke={ringColor}
          className="transition-all duration-700 ease-out"
          style={{
            filter: `drop-shadow(0 0 6px ${ringColor})`,
          }}
        />
      </svg>
      <div className="flex flex-col items-center justify-center z-10">
        <span className="text-3xl font-bold tracking-tight">{Math.round(consumed)}</span>
        <span className="text-xs text-muted-foreground mt-0.5">
          de {Math.round(target)} kcal
        </span>
        <span
          className={cn(
            "text-sm font-semibold mt-1.5 px-2 py-0.5 rounded-full",
            isOver
              ? "text-red-400 bg-red-400/10"
              : "text-emerald-400 bg-emerald-400/10"
          )}
        >
          {isOver
            ? `+${Math.round(consumed - target)} acima`
            : `${Math.round(remaining)} restam`}
        </span>
      </div>
    </div>
  );
}
