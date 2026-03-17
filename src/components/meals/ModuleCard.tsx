"use client";

import { Card, CardContent } from "@/components/ui/card";
import { CalorieBudgetBar } from "./CalorieBudgetBar";
import { MODULE_LABELS } from "@/lib/constants";
import { cn } from "@/lib/utils";

const MODULE_EMOJI: Record<string, string> = {
  cafeDaManha: "☕",
  almoco: "🍱",
  lanche: "🍌",
  jantar: "🍽️",
  doce: "🍫",
  extra: "➕",
};

interface ModuleCardProps {
  module: string;
  consumed: number;
  budget: number;
  itemCount?: number;
  onClick?: () => void;
}

export function ModuleCard({
  module,
  consumed,
  budget,
  itemCount,
  onClick,
}: ModuleCardProps) {
  const hasItems = itemCount !== undefined && itemCount > 0;

  return (
    <Card
      className={cn(
        "transition-all active:scale-[0.98]",
        onClick && "cursor-pointer"
      )}
      onClick={onClick}
    >
      <CardContent className="p-3">
        <div className="flex items-center gap-3">
          <span className="text-xl">{MODULE_EMOJI[module] || "🍽️"}</span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-sm font-semibold">
                {MODULE_LABELS[module] || module}
              </span>
              <div className="flex items-center gap-2 text-xs">
                {hasItems && (
                  <span className="text-muted-foreground">
                    {itemCount} {itemCount === 1 ? "item" : "itens"}
                  </span>
                )}
              </div>
            </div>
            <CalorieBudgetBar consumed={consumed} budget={budget} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
