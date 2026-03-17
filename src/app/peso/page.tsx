"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { UserSwitcher } from "@/components/layout/UserSwitcher";
import { BottomNav } from "@/components/layout/BottomNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getTodayISO, formatGrams } from "@/lib/constants";

export default function PesoPage() {
  const { userId, setUserId } = useCurrentUser();
  const [newWeight, setNewWeight] = useState("");
  const [note, setNote] = useState("");

  const profile = useQuery(api.userProfiles.getByUserId, { userId });
  const weightHistory = useQuery(api.weightLog.getByUser, { userId });
  const addWeight = useMutation(api.weightLog.addEntry);

  const handleAddWeight = async () => {
    const weight = parseFloat(newWeight.replace(",", "."));
    if (isNaN(weight) || weight <= 0) return;

    await addWeight({
      userId,
      date: getTodayISO(),
      weight_kg: weight,
      note: note.trim() || undefined,
    });

    setNewWeight("");
    setNote("");
  };

  const initialWeight = 112;
  const currentWeight = profile?.weight_kg ?? initialWeight;
  const totalLost = initialWeight - currentWeight;
  const nextThreshold = Math.floor(totalLost / 5) * 5 + 5;
  const kgToNextRecalc = nextThreshold - totalLost;

  return (
    <div className="min-h-screen pb-24">
      <div className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl safe-top">
        <div className="mx-auto flex max-w-md items-center justify-between px-4 py-3">
          <h1 className="text-base font-bold tracking-tight">Peso</h1>
          <UserSwitcher userId={userId} onSwitch={setUserId} />
        </div>
      </div>

      <div className="mx-auto max-w-md px-4 py-3 space-y-4">
        {/* Current stats */}
        {profile && (
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-xl bg-card p-3 text-center">
              <div className="text-2xl font-bold tabular-nums">
                {formatGrams(profile.weight_kg)}
              </div>
              <div className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider mt-0.5">
                Peso (kg)
              </div>
            </div>
            <div className="rounded-xl bg-card p-3 text-center">
              <div className="text-2xl font-bold text-primary tabular-nums">
                {Math.round(profile.targetKcal)}
              </div>
              <div className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider mt-0.5">
                Meta kcal/dia
              </div>
            </div>
            <div className="rounded-xl bg-card p-3 text-center">
              <div className="text-2xl font-bold tabular-nums">
                {Math.round(profile.bmr)}
              </div>
              <div className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider mt-0.5">
                BMR
              </div>
            </div>
            <div className="rounded-xl bg-card p-3 text-center">
              <div className="text-2xl font-bold tabular-nums">
                {Math.round(profile.tdee)}
              </div>
              <div className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider mt-0.5">
                TDEE
              </div>
            </div>
          </div>
        )}

        {/* TDEE recalc alert */}
        {kgToNextRecalc <= 2 && totalLost > 0 && (
          <div className="rounded-xl bg-amber-500/10 border border-amber-500/20 p-3">
            <p className="text-sm font-semibold text-amber-400">
              Faltam {formatGrams(kgToNextRecalc)} kg para recalcular o TDEE!
            </p>
            <p className="text-[11px] text-muted-foreground mt-1">
              A cada 5kg perdidos o metabolismo se adapta. Registre seu peso para atualizar automaticamente.
            </p>
          </div>
        )}

        {/* Add weight form */}
        <div className="rounded-xl bg-card p-4 space-y-3">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Registrar peso
          </h2>
          <Input
            type="number"
            inputMode="decimal"
            step="0.1"
            value={newWeight}
            onChange={(e) => setNewWeight(e.target.value)}
            placeholder="Peso em kg (ex: 110.5)"
            className="h-11 rounded-xl bg-secondary border-0 text-sm"
          />
          <Input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Nota (opcional)"
            className="h-11 rounded-xl bg-secondary border-0 text-sm"
          />
          <Button
            className="w-full h-11 rounded-xl font-semibold"
            onClick={handleAddWeight}
            disabled={!newWeight}
          >
            Salvar
          </Button>
        </div>

        {/* Weight history */}
        {weightHistory && weightHistory.length > 0 && (
          <div>
            <h2 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest mb-2 px-1">
              Historico
            </h2>
            <div className="space-y-1">
              {[...weightHistory].reverse().map((entry) => (
                <div
                  key={entry._id}
                  className="flex items-center justify-between rounded-xl bg-card p-3"
                >
                  <div className="flex items-baseline gap-2">
                    <span className="font-bold tabular-nums">
                      {formatGrams(entry.weight_kg)} kg
                    </span>
                    {entry.note && (
                      <span className="text-[11px] text-muted-foreground">
                        {entry.note}
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] text-muted-foreground tabular-nums">
                    {new Date(entry.date + "T12:00:00").toLocaleDateString("pt-BR", {
                      day: "2-digit",
                      month: "short",
                    })}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
