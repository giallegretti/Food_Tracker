"use client";

import { useState, useCallback } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Doc } from "../../../convex/_generated/dataModel";

interface FoodSearchProps {
  onSelect: (food: Doc<"foods">) => void;
  placeholder?: string;
}

export function FoodSearch({
  onSelect,
  placeholder = "Buscar alimento...",
}: FoodSearchProps) {
  const [search, setSearch] = useState("");
  const [isOpen, setIsOpen] = useState(false);

  const results = useQuery(
    api.foods.search,
    search.trim().length >= 2 ? { searchTerm: search, limit: 15 } : "skip"
  );

  const handleSelect = useCallback(
    (food: Doc<"foods">) => {
      onSelect(food);
      setSearch("");
      setIsOpen(false);
    },
    [onSelect]
  );

  return (
    <div className="relative">
      <Input
        value={search}
        onChange={(e) => {
          setSearch(e.target.value);
          setIsOpen(true);
        }}
        onFocus={() => setIsOpen(true)}
        placeholder={placeholder}
        className="h-11 rounded-xl bg-secondary border-0 text-sm placeholder:text-muted-foreground/60"
      />
      {isOpen && search.trim().length >= 2 && (
        <div className="absolute top-full left-0 right-0 z-50 mt-1.5 rounded-xl border border-border/50 bg-popover shadow-2xl overflow-hidden">
          <ScrollArea className="max-h-[300px]">
            {results === undefined ? (
              <div className="p-4 text-center text-sm text-muted-foreground animate-pulse">
                Buscando...
              </div>
            ) : results.length === 0 ? (
              <div className="p-4 text-center text-sm text-muted-foreground">
                Nenhum alimento encontrado
              </div>
            ) : (
              <div className="py-1">
                {results.map((food) => (
                  <button
                    key={food._id}
                    onClick={() => handleSelect(food)}
                    className="flex w-full items-start gap-2.5 px-3 py-2.5 text-left hover:bg-accent/50 active:bg-accent transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium leading-tight">
                        {food.name}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="secondary" className="text-[9px] px-1.5 py-0 rounded-md">
                          {food.category}
                        </Badge>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-sm font-bold text-primary tabular-nums">
                        {Math.round(food.energy_kcal)}
                      </div>
                      <div className="text-[10px] text-muted-foreground">kcal/100g</div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>
      )}
      {isOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
}
