"use client";

import { BottomNav } from "@/components/layout/BottomNav";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function MarmitasPage() {
  return (
    <div className="min-h-screen pb-24">
      <div className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl safe-top">
        <div className="mx-auto max-w-md px-4 py-3">
          <div className="flex items-center justify-between">
            <h1 className="text-base font-bold tracking-tight">Marmitas</h1>
            <Link href="/marmitas/nova">
              <Button size="sm" className="rounded-xl h-8 px-3 text-xs font-semibold">
                + Novo Plano
              </Button>
            </Link>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-md px-4 py-12 text-center">
        <p className="text-muted-foreground">Nenhum plano de marmitas ainda.</p>
        <p className="text-xs text-muted-foreground/60 mt-1">
          Crie um plano para calcular ingredientes e gerar lista de compras.
        </p>
      </div>

      <BottomNav />
    </div>
  );
}
