"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { UserSwitcher } from "@/components/layout/UserSwitcher";
import { BottomNav } from "@/components/layout/BottomNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getTodayISO, formatGrams } from "@/lib/constants";
import { Doc } from "../../../convex/_generated/dataModel";

/* ---------- Projection types & logic ---------- */

type WeekProjection = {
  week: number;
  date: string;
  weight: number;
  bmr: number;
  tdee: number;
  dailyDeficit: number;
  weeklyLoss: number;
  status: "on_track" | "slowing" | "plateau";
  actualWeight?: number;
  deviationPct?: number;
};

const KCAL_PER_KG = 7700;

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

function buildProjection(
  currentWeight: number,
  targetWeight: number,
  height: number,
  age: number,
  sex: string,
  activityFactor: number,
  deficitKcal: number,
  startDate: string,
  weightHistory?: Array<{ date: string; weight_kg: number }>
): WeekProjection[] {
  const minIntake = sex === "F" ? 1200 : 1500;
  const projections: WeekProjection[] = [];
  let weight = currentWeight;
  const start = new Date(startDate + "T12:00:00");

  // Build a map of actual weights by week start date
  const actualByWeek = new Map<string, number>();
  if (weightHistory) {
    for (const entry of weightHistory) {
      // Find which projection week this entry falls in
      const entryDate = new Date(entry.date + "T12:00:00");
      const diffDays = Math.floor(
        (entryDate.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)
      );
      if (diffDays >= 0) {
        const weekNum = Math.floor(diffDays / 7);
        // Keep the latest entry for each week
        const weekKey = String(weekNum);
        actualByWeek.set(weekKey, entry.weight_kg);
      }
    }
  }

  for (let week = 0; week < 104; week++) {
    const bmr = calcBMR(weight, height, age, sex);
    const tdee = bmr * activityFactor;
    const maxDeficit = tdee - minIntake;
    const dailyDeficit = Math.min(deficitKcal, Math.max(maxDeficit, 0));
    const weeklyLoss = (dailyDeficit * 7) / KCAL_PER_KG;

    let status: WeekProjection["status"] = "on_track";
    if (dailyDeficit < 200) status = "plateau";
    else if (dailyDeficit < 300) status = "slowing";

    const weekDate = new Date(start);
    weekDate.setDate(weekDate.getDate() + week * 7);
    const dateStr = weekDate.toLocaleDateString("en-CA", {
      timeZone: "America/Sao_Paulo",
    });

    const actual = actualByWeek.get(String(week));
    const deviationPct = actual
      ? ((actual - weight) / weight) * 100
      : undefined;

    projections.push({
      week,
      date: dateStr,
      weight: Math.round(weight * 10) / 10,
      bmr: Math.round(bmr),
      tdee: Math.round(tdee),
      dailyDeficit: Math.round(dailyDeficit),
      weeklyLoss: Math.round(weeklyLoss * 100) / 100,
      status,
      actualWeight: actual,
      deviationPct,
    });

    weight -= weeklyLoss;
    if (weight <= targetWeight) {
      // Add final week at target
      projections[projections.length - 1].weight =
        Math.round(Math.max(weight, targetWeight) * 10) / 10;
      break;
    }
    if (status === "plateau") break;
  }

  return projections;
}

/* ---------- Status label helpers ---------- */

const STATUS_CONFIG = {
  on_track: {
    label: "No caminho",
    bg: "bg-emerald-500/10",
    text: "text-emerald-500",
  },
  slowing: {
    label: "Desacelerando",
    bg: "bg-amber-500/10",
    text: "text-amber-400",
  },
  plateau: {
    label: "Plato",
    bg: "bg-red-400/10",
    text: "text-red-400",
  },
};

/* ---------- Main Page ---------- */

export default function PesoPage() {
  const { userId, setUserId } = useCurrentUser();
  const [tab, setTab] = useState<"registro" | "projecao">("registro");

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
              onClick={() => setTab("projecao")}
              className={`flex-1 rounded-lg py-2 text-sm font-medium transition-colors ${
                tab === "projecao"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground"
              }`}
            >
              Projecao
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
          <ProjecaoTab profile={profile} weightHistory={weightHistory} />
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
  const currentWeight = profile?.weight_kg ?? initialWeight;
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
              .sort((a, b) => b.date.localeCompare(a.date))
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

/* ---------- Projecao Tab ---------- */

function ProjecaoTab({
  profile,
  weightHistory,
}: {
  profile: Doc<"userProfiles"> | undefined | null;
  weightHistory: Doc<"weightLog">[] | undefined;
}) {
  const [targetWeight, setTargetWeight] = useState("85");

  if (!profile) {
    return (
      <div className="text-center py-12 text-muted-foreground text-sm animate-pulse">
        Carregando...
      </div>
    );
  }

  const target = parseFloat(targetWeight.replace(",", "."));
  const isValidTarget = !isNaN(target) && target > 0 && target < profile.weight_kg;

  // Find earliest weight entry date as projection start
  const sortedHistory = weightHistory
    ? [...weightHistory].sort((a, b) => a.date.localeCompare(b.date))
    : [];
  const startDate =
    sortedHistory.length > 0 ? sortedHistory[0].date : getTodayISO();

  const projections = useMemo(() => {
    if (!isValidTarget) return [];
    return buildProjection(
      profile.weight_kg,
      target,
      profile.height_cm,
      profile.age,
      profile.sex,
      profile.activityFactor,
      profile.deficitKcal,
      startDate,
      sortedHistory
    );
  }, [
    profile.weight_kg,
    profile.height_cm,
    profile.age,
    profile.sex,
    profile.activityFactor,
    profile.deficitKcal,
    target,
    isValidTarget,
    startDate,
    sortedHistory,
  ]);

  const totalWeeks = projections.length;
  const totalMonths = Math.round(totalWeeks / 4.33);
  const nextWeek = projections.length > 1 ? projections[1] : null;

  // Find alerts
  const plateauWeek = projections.find((p) => p.status === "plateau");
  const today = getTodayISO();

  // Check for consecutive weeks above projection
  const recentDeviations = projections
    .filter((p) => p.date <= today && p.deviationPct !== undefined)
    .slice(-3);
  const consistentlyAbove =
    recentDeviations.length >= 2 &&
    recentDeviations.every((p) => (p.deviationPct ?? 0) > 2);
  const losingTooFast =
    recentDeviations.length >= 2 &&
    recentDeviations.every((p) => (p.deviationPct ?? 0) < -2);

  return (
    <>
      {/* Config */}
      <div className="rounded-xl bg-card p-4 space-y-3">
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Configuracao
        </h2>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[11px] text-muted-foreground font-medium mb-1 block">
              Peso atual
            </label>
            <div className="h-10 rounded-xl bg-secondary flex items-center justify-center text-sm font-bold tabular-nums">
              {formatGrams(profile.weight_kg)} kg
            </div>
          </div>
          <div>
            <label className="text-[11px] text-muted-foreground font-medium mb-1 block">
              Peso meta (kg)
            </label>
            <Input
              type="number"
              inputMode="decimal"
              value={targetWeight}
              onChange={(e) => setTargetWeight(e.target.value)}
              placeholder="Ex: 85"
              className="h-10 rounded-xl bg-secondary border-0 text-sm tabular-nums"
            />
          </div>
        </div>
        <div className="flex items-center justify-between text-[11px] text-muted-foreground">
          <span>Deficit atual: {profile.deficitKcal} kcal/dia</span>
          <span>TDEE: {Math.round(profile.tdee)} kcal</span>
        </div>
      </div>

      {isValidTarget && projections.length > 0 && (
        <>
          {/* Summary */}
          <div className="rounded-xl bg-card p-4 space-y-2">
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Resumo da projecao
            </h2>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold tabular-nums">
                {formatGrams(profile.weight_kg)}
              </span>
              <span className="text-muted-foreground">→</span>
              <span className="text-2xl font-bold text-primary tabular-nums">
                {formatGrams(target)}
              </span>
              <span className="text-sm text-muted-foreground">kg</span>
            </div>
            <div className="grid grid-cols-2 gap-2 pt-1">
              <div className="rounded-lg bg-secondary p-2">
                <div className="text-sm font-bold tabular-nums">
                  {totalWeeks} semanas
                </div>
                <div className="text-[10px] text-muted-foreground">
                  ~{totalMonths} {totalMonths === 1 ? "mes" : "meses"}
                </div>
              </div>
              {nextWeek && (
                <div className="rounded-lg bg-secondary p-2">
                  <div className="text-sm font-bold tabular-nums">
                    {formatGrams(nextWeek.weight)} kg
                  </div>
                  <div className="text-[10px] text-muted-foreground">
                    peso esperado sem. 1 (-
                    {formatGrams(projections[0].weeklyLoss)} kg)
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Alerts */}
          {plateauWeek && (
            <div className="rounded-xl bg-red-400/10 border border-red-400/20 p-3">
              <p className="text-sm font-semibold text-red-400">
                Plato na semana {plateauWeek.week}
              </p>
              <p className="text-[11px] text-muted-foreground mt-1">
                Deficit ficara muito pequeno ({plateauWeek.dailyDeficit}{" "}
                kcal/dia). Considere aumentar atividade fisica ou revisar o
                deficit.
              </p>
            </div>
          )}

          {consistentlyAbove && (
            <div className="rounded-xl bg-amber-500/10 border border-amber-500/20 p-3">
              <p className="text-sm font-semibold text-amber-400">
                Peso acima do projetado
              </p>
              <p className="text-[11px] text-muted-foreground mt-1">
                Seu peso real esta consistentemente acima da projecao. Considere
                revisar o deficit ou verificar a aderencia ao plano.
              </p>
            </div>
          )}

          {losingTooFast && (
            <div className="rounded-xl bg-blue-500/10 border border-blue-500/20 p-3">
              <p className="text-sm font-semibold text-blue-400">
                Perdendo mais rapido que o projetado
              </p>
              <p className="text-[11px] text-muted-foreground mt-1">
                Garanta que esta mantendo nutricao adequada e preservando massa
                muscular.
              </p>
            </div>
          )}

          {/* Timeline */}
          <div>
            <h2 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest mb-2 px-1">
              Timeline semanal
            </h2>
            <div className="space-y-1">
              {projections.map((p) => {
                const isPast = p.date <= today;
                const cfg = STATUS_CONFIG[p.status];

                return (
                  <div
                    key={p.week}
                    className={`rounded-xl bg-card p-3 ${
                      isPast ? "" : "opacity-60"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] text-muted-foreground tabular-nums w-12">
                          Sem {p.week}
                        </span>
                        <span className="text-sm font-bold tabular-nums">
                          {formatGrams(p.weight)} kg
                        </span>
                        {p.actualWeight !== undefined && (
                          <span
                            className={`text-[11px] font-medium tabular-nums ${
                              (p.deviationPct ?? 0) > 1
                                ? "text-red-400"
                                : (p.deviationPct ?? 0) < -1
                                  ? "text-blue-400"
                                  : "text-emerald-500"
                            }`}
                          >
                            (real: {formatGrams(p.actualWeight)})
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${cfg.bg} ${cfg.text}`}
                        >
                          {cfg.label}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-[10px] text-muted-foreground tabular-nums">
                      <span>TDEE {p.tdee}</span>
                      <span>Deficit {p.dailyDeficit}/dia</span>
                      <span>-{formatGrams(p.weeklyLoss)} kg/sem</span>
                      <span>
                        {new Date(p.date + "T12:00:00").toLocaleDateString(
                          "pt-BR",
                          { day: "2-digit", month: "short" }
                        )}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}

      {!isValidTarget && targetWeight && (
        <div className="text-center py-8 text-muted-foreground text-sm">
          Insira um peso meta menor que o peso atual (
          {formatGrams(profile.weight_kg)} kg).
        </div>
      )}
    </>
  );
}
