"use client";

interface BasalReferenceProps {
  consumed: number;
  basal: number; // = meta do dia
  maintenance: number; // sedentária
  activity: number; // gasto com atividade física (×1,375)
}

/**
 * Barra "onde o dia caiu": preenchimento verde = consumido, paralelo à roda.
 * Palitos: verde = basal (meta), azul = sedentária, laranja = atividade física.
 * Sem rótulos — a cor casa com os chips abaixo.
 */
export function BasalReference({
  consumed,
  basal,
  maintenance,
  activity,
}: BasalReferenceProps) {
  // Escala 0 .. atividade (com folga p/ o palito não colar na borda).
  const max = activity * 1.05;
  const pct = (v: number) => `${Math.min((v / max) * 100, 100)}%`;

  return (
    <div className="space-y-3">
      <div className="rounded-xl bg-card p-4">
        <div className="relative h-[18px]">
          <div className="absolute top-1.5 left-0 right-0 h-[7px] rounded-full bg-secondary" />
          <div
            className="absolute top-1.5 left-0 h-[7px] rounded-full transition-all duration-500 ease-out"
            style={{
              width: pct(consumed),
              backgroundColor: "oklch(0.72 0.19 155)",
              boxShadow: "0 0 8px oklch(0.72 0.19 155 / 0.45)",
            }}
          />
          {/* palito basal/meta (verde) */}
          <div
            className="absolute top-0 w-[3px] h-[18px] rounded-sm"
            style={{ left: pct(basal), backgroundColor: "oklch(0.72 0.19 155)" }}
          />
          {/* palito sedentária (azul) */}
          <div
            className="absolute top-0 w-[3px] h-[18px] rounded-sm"
            style={{
              left: pct(maintenance),
              backgroundColor: "oklch(0.65 0.18 250)",
            }}
          />
          {/* palito atividade física (laranja) */}
          <div
            className="absolute top-0 w-[3px] h-[18px] rounded-sm"
            style={{
              left: pct(activity),
              backgroundColor: "oklch(0.75 0.16 70)",
            }}
          />
        </div>
      </div>

      <div className="flex gap-2">
        <div className="flex-1 rounded-xl bg-card p-2 text-center">
          <div className="text-lg font-bold tabular-nums text-emerald-400">
            {Math.round(basal)}
          </div>
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground mt-0.5">
            Basal
          </div>
        </div>
        <div className="flex-1 rounded-xl bg-card p-2 text-center">
          <div
            className="text-lg font-bold tabular-nums"
            style={{ color: "oklch(0.65 0.18 250)" }}
          >
            {Math.round(maintenance)}
          </div>
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground mt-0.5">
            Sedentária
          </div>
        </div>
        <div className="flex-1 rounded-xl bg-card p-2 text-center">
          <div
            className="text-lg font-bold tabular-nums"
            style={{ color: "oklch(0.75 0.16 70)" }}
          >
            {Math.round(activity)}
          </div>
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground mt-0.5">
            Atividade
          </div>
        </div>
      </div>
    </div>
  );
}
