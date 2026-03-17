"use client";

import { BottomNav } from "@/components/layout/BottomNav";

export default function NovaMarmitaPage() {
  return (
    <div className="min-h-screen pb-24">
      <div className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl safe-top">
        <div className="mx-auto max-w-md px-4 py-3">
          <h1 className="text-base font-bold tracking-tight">Novo Plano de Marmitas</h1>
        </div>
      </div>

      <div className="mx-auto max-w-md px-4 py-12 text-center">
        <p className="text-muted-foreground">
          Em breve: selecione receitas, defina quantidades e periodo para
          calcular automaticamente os ingredientes necessarios.
        </p>
      </div>

      <BottomNav />
    </div>
  );
}
