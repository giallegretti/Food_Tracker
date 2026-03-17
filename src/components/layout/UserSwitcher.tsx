"use client";

import { cn } from "@/lib/utils";

interface UserSwitcherProps {
  userId: string;
  onSwitch: (id: string) => void;
}

export function UserSwitcher({ userId, onSwitch }: UserSwitcherProps) {
  return (
    <div className="flex items-center gap-0.5 rounded-full bg-secondary p-0.5">
      <button
        onClick={() => onSwitch("giovanna")}
        className={cn(
          "rounded-full px-3 py-1 text-xs font-semibold transition-all active:scale-95",
          userId === "giovanna"
            ? "bg-primary text-primary-foreground shadow-sm"
            : "text-muted-foreground"
        )}
      >
        Giovanna
      </button>
      <button
        onClick={() => onSwitch("ricardo")}
        className={cn(
          "rounded-full px-3 py-1 text-xs font-semibold transition-all active:scale-95",
          userId === "ricardo"
            ? "bg-primary text-primary-foreground shadow-sm"
            : "text-muted-foreground"
        )}
      >
        Ricardo
      </button>
    </div>
  );
}
