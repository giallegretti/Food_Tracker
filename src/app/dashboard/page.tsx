"use client";

import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { UserSwitcher } from "@/components/layout/UserSwitcher";
import { BottomNav } from "@/components/layout/BottomNav";
import { DailyRing } from "@/components/dashboard/DailyRing";
import { MacroBreakdown } from "@/components/dashboard/MacroBreakdown";
import { ModuleCard } from "@/components/meals/ModuleCard";
import { MODULE_ORDER, getTodayISO } from "@/lib/constants";
import Link from "next/link";

export default function DashboardPage() {
  const { userId, setUserId } = useCurrentUser();
  const today = getTodayISO();

  const profile = useQuery(api.userProfiles.getByUserId, { userId });
  const totals = useQuery(api.dailyLog.getDailyTotals, { userId, date: today });
  const entries = useQuery(api.dailyLog.getByDate, { userId, date: today });

  if (!profile || totals === undefined) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-muted-foreground animate-pulse">Carregando...</div>
      </div>
    );
  }

  const macroTargets = {
    protein: (profile.targetKcal * profile.proteinPct) / 100 / 4,
    carbs: (profile.targetKcal * profile.carbsPct) / 100 / 4,
    fat: (profile.targetKcal * profile.fatPct) / 100 / 9,
  };

  const moduleItemCount: Record<string, number> = {};
  if (entries) {
    for (const entry of entries) {
      moduleItemCount[entry.module] =
        (moduleItemCount[entry.module] || 0) + entry.items.length;
    }
  }

  const todayFormatted = new Date(today + "T12:00:00").toLocaleDateString(
    "pt-BR",
    { weekday: "long", day: "numeric", month: "short" }
  );

  return (
    <div className="min-h-screen pb-24">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl safe-top">
        <div className="mx-auto flex max-w-md items-center justify-between px-4 py-3">
          <div>
            <h1 className="text-base font-bold tracking-tight">Food Tracker</h1>
            <p className="text-[11px] text-muted-foreground capitalize">
              {todayFormatted}
            </p>
          </div>
          <UserSwitcher userId={userId} onSwitch={setUserId} />
        </div>
      </div>

      <div className="mx-auto max-w-md px-4 space-y-5">
        {/* Calorie Ring */}
        <div className="flex justify-center pt-2 pb-1">
          <DailyRing consumed={totals.kcal} target={profile.targetKcal} />
        </div>

        {/* Macro Breakdown */}
        <MacroBreakdown
          protein={{ consumed: totals.protein, target: macroTargets.protein }}
          carbs={{ consumed: totals.carbs, target: macroTargets.carbs }}
          fat={{ consumed: totals.fat, target: macroTargets.fat }}
        />

        {/* Module Cards */}
        <div className="space-y-2">
          <h2 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest px-1">
            Refeicoes
          </h2>
          {MODULE_ORDER.map((mod) => (
            <Link key={mod} href={`/diario?modulo=${mod}`}>
              <ModuleCard
                module={mod}
                consumed={totals.byModule[mod]?.kcal || 0}
                budget={profile.modules[mod]}
                itemCount={moduleItemCount[mod]}
              />
            </Link>
          ))}
          {totals.byModule["extra"] && (
            <ModuleCard
              module="extra"
              consumed={totals.byModule["extra"].kcal}
              budget={0}
              itemCount={moduleItemCount["extra"]}
            />
          )}
        </div>

        {/* Partner View */}
        <PartnerView currentUserId={userId} date={today} />
      </div>

      <BottomNav />
    </div>
  );
}

function PartnerView({
  currentUserId,
  date,
}: {
  currentUserId: string;
  date: string;
}) {
  const partnerId = currentUserId === "giovanna" ? "ricardo" : "giovanna";
  const partnerProfile = useQuery(api.userProfiles.getByUserId, {
    userId: partnerId,
  });
  const partnerTotals = useQuery(api.dailyLog.getDailyTotals, {
    userId: partnerId,
    date,
  });

  if (!partnerProfile || partnerTotals === undefined) return null;

  const pct = Math.round(
    (partnerTotals.kcal / partnerProfile.targetKcal) * 100
  );

  return (
    <div className="rounded-xl bg-card p-3 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-xs font-bold">
          {partnerProfile.name.charAt(0)}
        </div>
        <div>
          <span className="text-sm font-medium">{partnerProfile.name}</span>
          <p className="text-[11px] text-muted-foreground tabular-nums">
            {Math.round(partnerTotals.kcal)} / {Math.round(partnerProfile.targetKcal)} kcal
          </p>
        </div>
      </div>
      <div className="text-sm font-bold text-muted-foreground tabular-nums">
        {pct}%
      </div>
    </div>
  );
}
