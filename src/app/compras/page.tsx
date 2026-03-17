"use client";

import { BottomNav } from "@/components/layout/BottomNav";

export default function ComprasPage() {
  return (
    <div className="min-h-screen pb-24">
      <div className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl safe-top">
        <div className="mx-auto max-w-md px-4 py-3">
          <h1 className="text-base font-bold tracking-tight">Lista de Compras</h1>
        </div>
      </div>

      <div className="mx-auto max-w-md px-4 py-12 text-center">
        <p className="text-muted-foreground">Nenhuma lista de compras ainda.</p>
        <p className="text-xs text-muted-foreground/60 mt-1">
          Crie um plano de marmitas para gerar a lista automaticamente.
        </p>
      </div>

      <BottomNav />
    </div>
  );
}
