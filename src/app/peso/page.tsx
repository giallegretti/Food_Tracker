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
import { Doc } from "../../../convex/_generated/dataModel";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";

const COL = {
  basal: "oklch(0.72 0.19 155)", // verde — basal / meta
  sed: "oklch(0.65 0.18 250)", // azul — sedentária / manutenção
  leve: "oklch(0.75 0.16 70)", // âmbar — leve 3×/sem
};

function calcBMR(
  weight: number,
  height: number,
  age: number,
  sex: string
): number {
  return sex === "F"
    ? 10 * weight + 6.25 * height - 5 * age - 161
    : 10 * weight + 6.25 * height - 5 * age + 5;
}

/* ---------- Main Page ---------- */

export default function PesoPage() {
  const { userId, setUserId } = useCurrentUser();
  const [tab, setTab] = useState<"registro" | "curvas">("registro");

  const profile = useQuery(api.userProfiles.getByUserId, { userId });
  const weightHistory = useQuery(api.weightLog.getByUser, { userId });

  return (
    <div className="min-h-screen pb-24">
      <div className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl safe-top">
        <div className="mx-auto max-w-md px-4 py-3 space-y-2">
          <div className="flex items-center justify-between">
            <h1 className="text-base font-bold tracking-tight">Peso</h1>
            <UserSwitcher userId={userId} onSwitch={setUserId} />
          </div>

          {/* Tab switcher */}
          <div className="flex gap-1 rounded-xl bg-secondary p-1">
            <button
              onClick={() => setTab("registro")}
              className={`flex-1 rounded-lg py-2 text-sm font-medium transition-colors ${
                tab === "registro"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground"
              }`}
            >
              Registro
            </button>
            <button
              onClick={() => setTab("curvas")}
              className={`flex-1 rounded-lg py-2 text-sm font-medium transition-colors ${
                tab === "curvas"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground"
              }`}
            >
              Curvas
            </button>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-md px-4 py-3 space-y-4">
        {tab === "registro" ? (
          <RegistroTab
            userId={userId}
            profile={profile}
            weightHistory={weightHistory}
          />
        ) : (
          <CurvasTab profile={profile} weightHistory={weightHistory} />
        )}
      </div>

      <BottomNav />
    </div>
  );
}

/* ---------- Registro Tab ---------- */

function RegistroTab({
  userId,
  profile,
  weightHistory,
}: {
  userId: string;
  profile: Doc<"userProfiles"> | undefined | null;
  weightHistory: Doc<"weightLog">[] | undefined;
}) {
  const [newWeight, setNewWeight] = useState("");
  const [note, setNote] = useState("");
  const [selectedDate, setSelectedDate] = useState(getTodayISO());

  const addWeight = useMutation(api.weightLog.addEntry);

  const handleAddWeight = async () => {
    const weight = parseFloat(newWeight.replace(",", "."));
    if (isNaN(weight) || weight <= 0) return;

    await addWeight({
      userId,
      date: selectedDate,
      weight_kg: weight,
      note: note.trim() || undefined,
    });

    setNewWeight("");
    setNote("");
    setSelectedDate(getTodayISO());
  };

  const initialWeight = 112;
  // Current weight = most recent by DATE, not by insertion order
  const mostRecentEntry = weightHistory
    ? [...weightHistory].sort((a, b) => b.date.localeCompare(a.date))[0]
    : undefined;
  const currentWeight = mostRecentEntry?.weight_kg ?? profile?.weight_kg ?? initialWeight;
  const totalLost = initialWeight - currentWeight;
  const nextThreshold = Math.floor(totalLost / 5) * 5 + 5;
  const kgToNextRecalc = nextThreshold - totalLost;

  return (
    <>
      {/* Current stats */}
      {profile && (
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-xl bg-card p-3 text-center">
            <div className="text-2xl font-bold tabular-nums">
              {formatGrams(currentWeight)}
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
            A cada 5kg perdidos o metabolismo se adapta. Registre seu peso para
            atualizar automaticamente.
          </p>
        </div>
      )}

      {/* Add weight form */}
      <div className="rounded-xl bg-card p-4 space-y-3">
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Registrar peso
        </h2>
        <div>
          <label className="text-[11px] text-muted-foreground font-medium mb-1 block">
            Data
          </label>
          <Input
            type="date"
            value={selectedDate}
            max={getTodayISO()}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="h-11 rounded-xl bg-secondary border-0 text-sm"
          />
        </div>
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
            {[...weightHistory]
              .sort((a, b) => a.date.localeCompare(b.date))
              .map((entry) => (
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
                    {new Date(entry.date + "T12:00:00").toLocaleDateString(
                      "pt-BR",
                      {
                        day: "2-digit",
                        month: "short",
                        year:
                          entry.date.substring(0, 4) !==
                          getTodayISO().substring(0, 4)
                            ? "numeric"
                            : undefined,
                      }
                    )}
                  </span>
                </div>
              ))}
          </div>
        </div>
      )}
    </>
  );
}

/* ---------- Curvas Tab (gasto por peso) ---------- */

function CurvasTab({
  profile,
  weightHistory,
}: {
  profile: Doc<"userProfiles"> | undefined | null;
  weightHistory: Doc<"weightLog">[] | undefined;
}) {
  if (!profile) {
    return (
      <div className="text-center py-12 text-muted-foreground text-sm animate-pulse">
        Carregando...
      </div>
    );
  }

  const mostRecent = weightHistory
    ? [...weightHistory].sort((a, b) => b.date.localeCompare(a.date))[0]
    : undefined;
  const currentWeight = mostRecent?.weight_kg ?? profile.weight_kg;
  const here = Math.round(currentWeight);
  const isBasalMode = profile.targetMode === "basal";

  const hi = Math.min(here + 3, 130);
  const lo = Math.max(here - 19, 75);

  const data: Array<{ w: number; basal: number; sed: number; leve: number }> =
    [];
  for (let w = hi; w >= lo; w--) {
    const b = calcBMR(w, profile.height_cm, profile.age, profile.sex);
    data.push({
      w,
      basal: Math.round(b),
      sed: Math.round(b * 1.2),
      leve: Math.round(b * 1.375),
    });
  }

  return (
    <>
      <div className="rounded-xl bg-card p-4">
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
          Gasto conforme o peso cai
        </h2>
        <p className="text-[11px] text-muted-foreground mb-3">
          {isBasalMode
            ? "Sua meta segue a linha do basal. A diferença até a sedentária + remédio + exercício é o emagrecimento."
            : "Basal, sedentária (×1,2) e leve (×1,375) por peso. Mifflin-St Jeor."}
        </p>
        <div className="h-[240px] -ml-2">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={data}
              margin={{ top: 12, right: 8, bottom: 0, left: 0 }}
            >
              <CartesianGrid stroke="oklch(0.26 0.01 260)" strokeDasharray="3 3" />
              <XAxis
                dataKey="w"
                tick={{ fontSize: 10, fill: "oklch(0.60 0 0)" }}
                tickFormatter={(v) => (Number(v) % 5 === 0 ? `${v}` : "")}
                interval={0}
                tickLine={false}
              />
              <YAxis
                domain={["dataMin - 80", "dataMax + 80"]}
                tick={{ fontSize: 10, fill: "oklch(0.60 0 0)" }}
                width={44}
                tickLine={false}
              />
              <Tooltip
                contentStyle={{
                  background: "oklch(0.17 0.01 260)",
                  border: "1px solid oklch(0.26 0.01 260)",
                  borderRadius: 10,
                  fontSize: 12,
                }}
                labelStyle={{ color: "oklch(0.95 0 0)" }}
                labelFormatter={(v) => `${v} kg`}
                formatter={(value, name) => [`${value} kcal`, `${name}`]}
              />
              <ReferenceLine
                x={here}
                stroke="oklch(0.95 0 0)"
                strokeDasharray="4 3"
                label={{
                  value: `você · ${here}`,
                  position: "top",
                  fill: "oklch(0.95 0 0)",
                  fontSize: 9,
                }}
              />
              <Line
                type="monotone"
                dataKey="sed"
                name="sedentária"
                stroke={COL.sed}
                strokeWidth={2}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="leve"
                name="leve 3×"
                stroke={COL.leve}
                strokeWidth={1.5}
                strokeDasharray="5 3"
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="basal"
                name={isBasalMode ? "basal / meta" : "basal"}
                stroke={COL.basal}
                strokeWidth={2.5}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-[11px] text-muted-foreground font-mono">
          <span className="inline-flex items-center gap-1.5">
            <i
              className="w-2.5 h-2.5 rounded-sm inline-block"
              style={{ background: COL.basal }}
            />
            {isBasalMode ? "basal / meta" : "basal"}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <i
              className="w-2.5 h-2.5 rounded-sm inline-block"
              style={{ background: COL.sed }}
            />
            sedentária ×1,2
          </span>
          <span className="inline-flex items-center gap-1.5">
            <i
              className="w-2.5 h-2.5 rounded-sm inline-block"
              style={{ background: COL.leve }}
            />
            leve ×1,375
          </span>
        </div>
      </div>

      {/* Tabela quilo a quilo */}
      <div>
        <h2 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest mb-2 px-1">
          Quilo a quilo
        </h2>
        <div className="rounded-xl bg-card overflow-hidden">
          <div className="max-h-[320px] overflow-y-auto">
            <table className="w-full">
              <thead className="sticky top-0 bg-card">
                <tr className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  <th className="text-left font-medium px-3 py-2">Peso</th>
                  <th className="text-right font-medium px-3 py-2">
                    {isBasalMode ? "Basal/Meta" : "Basal"}
                  </th>
                  <th className="text-right font-medium px-3 py-2">Sedent.</th>
                  <th className="text-right font-medium px-3 py-2">Leve</th>
                </tr>
              </thead>
              <tbody>
                {data.map((row) => {
                  const isHere = row.w === here;
                  return (
                    <tr
                      key={row.w}
                      className={`text-sm tabular-nums font-mono border-t border-border/40 ${
                        isHere ? "bg-emerald-400/10" : ""
                      }`}
                    >
                      <td
                        className={`text-left px-3 py-1.5 ${
                          isHere ? "text-emerald-400 font-bold" : "text-muted-foreground"
                        }`}
                      >
                        {row.w} kg
                      </td>
                      <td className="text-right px-3 py-1.5">{row.basal}</td>
                      <td className="text-right px-3 py-1.5 text-muted-foreground">
                        {row.sed}
                      </td>
                      <td className="text-right px-3 py-1.5 text-muted-foreground">
                        {row.leve}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}
