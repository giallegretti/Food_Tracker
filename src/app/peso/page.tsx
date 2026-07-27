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
  ReferenceArea,
  ReferenceDot,
} from "recharts";

const COL = {
  basal: "oklch(0.72 0.19 155)", // verde — basal / meta
  sed: "oklch(0.65 0.18 250)", // azul — sedentária / manutenção
  leve: "oklch(0.75 0.16 70)", // âmbar — leve 3×/sem
  peso: "oklch(0.72 0.16 300)", // roxo — curva de peso real
  dose: "oklch(0.72 0.19 155)", // verde — faixas de dose
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
  const [tab, setTab] = useState<"tratamento" | "curvas">("tratamento");

  const profile = useQuery(api.userProfiles.getByUserId, { userId });
  const weightHistory = useQuery(api.weightLog.getByUser, { userId });
  const doseHistory = useQuery(api.doseLog.getByUser, { userId });

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
              onClick={() => setTab("tratamento")}
              className={`flex-1 rounded-lg py-2 text-sm font-medium transition-colors ${
                tab === "tratamento"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground"
              }`}
            >
              Tratamento
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
        {tab === "tratamento" ? (
          <TratamentoTab
            userId={userId}
            profile={profile}
            weightHistory={weightHistory}
            doseHistory={doseHistory}
          />
        ) : (
          <CurvasTab profile={profile} weightHistory={weightHistory} />
        )}
      </div>

      <BottomNav />
    </div>
  );
}

/* ---------- Tratamento Tab (peso × fases de dose) ---------- */

const DOSE_UNIT = "mg";

function fmtDose(n: number): string {
  return n.toLocaleString("pt-BR", { maximumFractionDigits: 2 });
}

function tsFromISO(d: string): number {
  return new Date(d + "T12:00:00").getTime();
}

function fmtShort(ts: number): string {
  return new Date(ts).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
  });
}

function TratamentoTab({
  userId,
  profile,
  weightHistory,
  doseHistory,
}: {
  userId: string;
  profile: Doc<"userProfiles"> | undefined | null;
  weightHistory: Doc<"weightLog">[] | undefined;
  doseHistory: Doc<"doseLog">[] | undefined;
}) {
  const [historyTab, setHistoryTab] = useState<"peso" | "doses">("peso");

  // Registro de peso
  const [newWeight, setNewWeight] = useState("");
  const [weightDate, setWeightDate] = useState(getTodayISO());
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const addWeight = useMutation(api.weightLog.addEntry);
  const removeWeight = useMutation(api.weightLog.removeEntry);

  const handleAddWeight = async () => {
    const weight = parseFloat(newWeight.replace(",", "."));
    if (isNaN(weight) || weight <= 0) return;
    await addWeight({
      userId,
      date: weightDate,
      weight_kg: weight,
    });
    setNewWeight("");
    setWeightDate(getTodayISO());
  };

  // Registro de dose
  const [doseDate, setDoseDate] = useState(getTodayISO());
  const [doseMg, setDoseMg] = useState("");
  const [doseMed, setDoseMed] = useState("");
  const addDose = useMutation(api.doseLog.addEntry);
  const removeDose = useMutation(api.doseLog.removeEntry);

  const handleAddDose = async () => {
    const mg = parseFloat(doseMg.replace(",", "."));
    if (isNaN(mg) || mg <= 0) return;
    await addDose({
      userId,
      date: doseDate,
      dose_mg: mg,
      medication: doseMed.trim() || undefined,
    });
    setDoseMg("");
    setDoseMed("");
    setDoseDate(getTodayISO());
  };

  const weights = [...(weightHistory ?? [])].sort((a, b) =>
    a.date.localeCompare(b.date)
  );
  const doses = [...(doseHistory ?? [])].sort((a, b) =>
    a.date.localeCompare(b.date)
  );

  // A curva mostra só o período do tratamento (do 1º registro de dose em diante).
  const treatmentStart = doses.length > 0 ? doses[0].date : null;
  const chartData = weights
    .filter((w) => !treatmentStart || w.date >= treatmentStart)
    .map((w) => ({
      t: tsFromISO(w.date),
      weight: w.weight_kg,
    }));

  const lastPoint = chartData[chartData.length - 1];
  const currentDose = doses[doses.length - 1];

  // Peso atual = registro mais recente por DATA (não pela ordem de inserção)
  const mostRecentEntry = [...weights].sort((a, b) =>
    b.date.localeCompare(a.date)
  )[0];
  const currentWeight = mostRecentEntry?.weight_kg ?? profile?.weight_kg;

  // Fases de dose: registro é semanal, então mesclamos semanas consecutivas de
  // mesma dose numa única faixa (rótulo aparece uma vez por fase, não por semana).
  const lastTs = lastPoint?.t ?? tsFromISO(getTodayISO());
  const doseMgs = doses.map((d) => d.dose_mg);
  const minD = Math.min(...doseMgs);
  const maxD = Math.max(...doseMgs);
  const alphaFor = (dose: number) =>
    doses.length <= 1 || maxD === minD
      ? 0.13
      : 0.06 + 0.16 * ((dose - minD) / (maxD - minD));

  const phases: Array<{ x1: number; x2: number; dose: number; alpha: number }> =
    [];
  for (let i = 0; i < doses.length; i++) {
    const start = tsFromISO(doses[i].date);
    let j = i;
    while (j + 1 < doses.length && doses[j + 1].dose_mg === doses[i].dose_mg) {
      j++;
    }
    const end = j + 1 < doses.length ? tsFromISO(doses[j + 1].date) : lastTs;
    phases.push({
      x1: start,
      x2: end,
      dose: doses[i].dose_mg,
      alpha: alphaFor(doses[i].dose_mg),
    });
    i = j;
  }

  const hasChart = chartData.length > 0;

  return (
    <>
      {/* KPIs atuais */}
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-xl bg-card p-3 text-center">
          <div className="text-2xl font-bold tabular-nums">
            {currentWeight != null ? formatGrams(currentWeight) : "—"}
            <span className="text-xs text-muted-foreground font-medium ml-0.5">
              kg
            </span>
          </div>
          <div className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider mt-0.5">
            Peso atual
          </div>
        </div>
        <div className="rounded-xl bg-card p-3 text-center">
          <div className="text-2xl font-bold text-primary tabular-nums">
            {currentDose ? fmtDose(currentDose.dose_mg) : "—"}
            <span className="text-xs text-muted-foreground font-medium ml-0.5">
              {DOSE_UNIT}
            </span>
          </div>
          <div className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider mt-0.5">
            Dose atual
          </div>
        </div>
      </div>

      {/* Gráfico peso × fases de dose */}
      <div className="rounded-xl bg-card p-4">
        {hasChart ? (
          <div className="h-[260px] -ml-2">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={chartData}
                margin={{ top: 16, right: 12, bottom: 0, left: 0 }}
              >
                <CartesianGrid
                  stroke="oklch(0.26 0.01 260)"
                  strokeDasharray="3 3"
                />
                {phases.map((p, i) => (
                  <ReferenceArea
                    key={i}
                    x1={p.x1}
                    x2={p.x2}
                    fill={COL.dose}
                    fillOpacity={p.alpha}
                    stroke="none"
                    ifOverflow="extendDomain"
                    label={{
                      value: `${fmtDose(p.dose)} ${DOSE_UNIT}`,
                      position: "insideTop",
                      fill: COL.dose,
                      fontSize: 9,
                    }}
                  />
                ))}
                <XAxis
                  dataKey="t"
                  type="number"
                  scale="time"
                  domain={["dataMin", "dataMax"]}
                  tick={{ fontSize: 10, fill: "oklch(0.60 0 0)" }}
                  tickFormatter={(v) => fmtShort(Number(v))}
                  tickLine={false}
                  minTickGap={28}
                />
                <YAxis
                  domain={["dataMin - 2", "dataMax + 2"]}
                  tick={{ fontSize: 10, fill: "oklch(0.60 0 0)" }}
                  width={44}
                  tickLine={false}
                  tickFormatter={(v) => `${v}`}
                />
                <Tooltip
                  contentStyle={{
                    background: "oklch(0.17 0.01 260)",
                    border: "1px solid oklch(0.26 0.01 260)",
                    borderRadius: 10,
                    fontSize: 12,
                  }}
                  labelStyle={{ color: "oklch(0.95 0 0)" }}
                  labelFormatter={(v) => fmtShort(Number(v))}
                  formatter={(value) => [`${value} kg`, "peso"]}
                />
                <Line
                  type="monotone"
                  dataKey="weight"
                  name="peso"
                  stroke={COL.peso}
                  strokeWidth={2.5}
                  dot={{ r: 2.5, fill: COL.peso }}
                  activeDot={{ r: 4 }}
                  connectNulls
                />
                {lastPoint && (
                  <ReferenceDot
                    x={lastPoint.t}
                    y={lastPoint.weight}
                    r={4}
                    fill="oklch(0.95 0 0)"
                    stroke={COL.peso}
                    label={{
                      value: `${formatGrams(lastPoint.weight)}`,
                      position: "top",
                      fill: "oklch(0.95 0 0)",
                      fontSize: 9,
                    }}
                  />
                )}
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-[120px] flex items-center justify-center text-[12px] text-muted-foreground text-center">
            Registre seu peso abaixo para ver a curva.
          </div>
        )}
      </div>

      {/* Registrar peso */}
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
            value={weightDate}
            max={getTodayISO()}
            onChange={(e) => setWeightDate(e.target.value)}
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
        <Button
          className="w-full h-11 rounded-xl font-semibold"
          onClick={handleAddWeight}
          disabled={!newWeight}
        >
          Salvar peso
        </Button>
      </div>

      {/* Registrar mudança de dose */}
      <div className="rounded-xl bg-card p-4 space-y-3">
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Registrar mudança de dose
        </h2>
        <div>
          <label className="text-[11px] text-muted-foreground font-medium mb-1 block">
            Data da mudança
          </label>
          <Input
            type="date"
            value={doseDate}
            max={getTodayISO()}
            onChange={(e) => setDoseDate(e.target.value)}
            className="h-11 rounded-xl bg-secondary border-0 text-sm"
          />
        </div>
        <Input
          type="number"
          inputMode="decimal"
          step="0.05"
          value={doseMg}
          onChange={(e) => setDoseMg(e.target.value)}
          placeholder={`Dose em ${DOSE_UNIT} (ex: 0.5)`}
          className="h-11 rounded-xl bg-secondary border-0 text-sm"
        />
        <Input
          value={doseMed}
          onChange={(e) => setDoseMed(e.target.value)}
          placeholder="Caneta / medicamento (opcional)"
          className="h-11 rounded-xl bg-secondary border-0 text-sm"
        />
        <Button
          className="w-full h-11 rounded-xl font-semibold"
          onClick={handleAddDose}
          disabled={!doseMg}
        >
          Salvar dose
        </Button>
      </div>

      {/* Históricos (sub-abas) */}
      <div>
        <div className="flex gap-1 rounded-xl bg-secondary p-1 mb-2">
          <button
            onClick={() => setHistoryTab("peso")}
            className={`flex-1 rounded-lg py-1.5 text-[13px] font-medium transition-colors ${
              historyTab === "peso"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground"
            }`}
          >
            Histórico de peso
          </button>
          <button
            onClick={() => setHistoryTab("doses")}
            className={`flex-1 rounded-lg py-1.5 text-[13px] font-medium transition-colors ${
              historyTab === "doses"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground"
            }`}
          >
            Doses
          </button>
        </div>

        {historyTab === "peso" ? (
          weights.length > 0 ? (
            <div className="space-y-1">
              {[...weights]
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
                    </div>
                    <div className="flex items-center gap-3">
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
                      {confirmDeleteId === entry._id ? (
                        <button
                          onClick={async () => {
                            await removeWeight({ id: entry._id });
                            setConfirmDeleteId(null);
                          }}
                          className="text-[11px] font-medium text-red-400 hover:text-red-300 transition-colors"
                          aria-label="Confirmar exclusão do peso"
                        >
                          confirmar
                        </button>
                      ) : (
                        <button
                          onClick={() => setConfirmDeleteId(entry._id)}
                          className="text-[11px] text-muted-foreground/70 hover:text-red-400 transition-colors"
                          aria-label="Remover peso"
                        >
                          remover
                        </button>
                      )}
                    </div>
                  </div>
                ))}
            </div>
          ) : (
            <p className="text-[12px] text-muted-foreground text-center py-6">
              Nenhum peso registrado ainda.
            </p>
          )
        ) : doses.length > 0 ? (
          <div className="space-y-1">
            {[...doses]
              .sort((a, b) => b.date.localeCompare(a.date))
              .map((entry) => (
                <div
                  key={entry._id}
                  className="flex items-center justify-between rounded-xl bg-card p-3"
                >
                  <div className="flex items-baseline gap-2">
                    <span className="font-bold tabular-nums">
                      {fmtDose(entry.dose_mg)} {DOSE_UNIT}
                    </span>
                    {entry.medication && (
                      <span className="text-[11px] text-muted-foreground">
                        {entry.medication}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-[11px] text-muted-foreground tabular-nums">
                      {new Date(entry.date + "T12:00:00").toLocaleDateString(
                        "pt-BR",
                        {
                          day: "2-digit",
                          month: "short",
                        }
                      )}
                    </span>
                    <button
                      onClick={() => removeDose({ id: entry._id })}
                      className="text-[11px] text-muted-foreground/70 hover:text-red-400 transition-colors"
                      aria-label="Remover dose"
                    >
                      remover
                    </button>
                  </div>
                </div>
              ))}
          </div>
        ) : (
          <p className="text-[12px] text-muted-foreground text-center py-6">
            Nenhuma dose registrada ainda.
          </p>
        )}
      </div>
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
