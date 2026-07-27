import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { computeMetrics } from "./lib/calc";

export const getByUser = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("weightLog")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();
  },
});

export const addEntry = mutation({
  args: {
    userId: v.string(),
    date: v.string(),
    weight_kg: v.float64(),
    note: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Get user profile to calculate new BMR/TDEE
    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .first();

    if (!profile) throw new Error("Profile not found");

    const { bmr, tdee, targetKcal } = computeMetrics({
      sex: profile.sex,
      weight_kg: args.weight_kg,
      height_cm: profile.height_cm,
      age: profile.age,
      activityFactor: profile.activityFactor,
      deficitKcal: profile.deficitKcal,
      targetMode: profile.targetMode,
    });

    // Check if entry already exists for this date
    const existing = await ctx.db
      .query("weightLog")
      .withIndex("by_user_date", (q) =>
        q.eq("userId", args.userId).eq("date", args.date)
      )
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        weight_kg: args.weight_kg,
        bmr,
        tdee,
        targetKcal,
        note: args.note,
      });
    } else {
      await ctx.db.insert("weightLog", {
        userId: args.userId,
        date: args.date,
        weight_kg: args.weight_kg,
        bmr,
        tdee,
        targetKcal,
        note: args.note,
      });
    }

    // Only update profile if this is the most recent date entry
    const allEntries = await ctx.db
      .query("weightLog")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    const mostRecentDate = allEntries.reduce(
      (max, e) => (e.date > max ? e.date : max),
      ""
    );

    if (args.date >= mostRecentDate) {
      await ctx.db.patch(profile._id, {
        weight_kg: args.weight_kg,
        bmr,
        tdee,
        targetKcal,
      });
    }
  },
});

export const removeEntry = mutation({
  args: { id: v.id("weightLog") },
  handler: async (ctx, args) => {
    const entry = await ctx.db.get(args.id);
    if (!entry) return;

    await ctx.db.delete(args.id);

    // addEntry keeps the profile (weight_kg/bmr/tdee/targetKcal) in sync with
    // the most recent entry, so after a delete we must re-sync it to whatever
    // entry is now the most recent — otherwise the profile stays pinned to the
    // value we just removed. Each entry already stores its own metrics, so we
    // just reuse them (no need to recompute).
    const remaining = await ctx.db
      .query("weightLog")
      .withIndex("by_user", (q) => q.eq("userId", entry.userId))
      .collect();
    if (remaining.length === 0) return;

    const mostRecent = remaining.reduce((a, b) => (b.date > a.date ? b : a));

    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_userId", (q) => q.eq("userId", entry.userId))
      .first();
    if (!profile) return;

    await ctx.db.patch(profile._id, {
      weight_kg: mostRecent.weight_kg,
      bmr: mostRecent.bmr,
      tdee: mostRecent.tdee,
      targetKcal: mostRecent.targetKcal,
    });
  },
});
