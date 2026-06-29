import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { computeMetrics } from "./lib/calc";

export const getByUserId = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("userProfiles")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .first();
  },
});

export const getAll = query({
  handler: async (ctx) => {
    return await ctx.db.query("userProfiles").collect();
  },
});

export const upsert = mutation({
  args: {
    userId: v.string(),
    name: v.string(),
    sex: v.string(),
    age: v.number(),
    weight_kg: v.float64(),
    height_cm: v.float64(),
    activityFactor: v.float64(),
    deficitKcal: v.number(),
    targetMode: v.optional(v.string()),
    proteinPct: v.float64(),
    carbsPct: v.float64(),
    fatPct: v.float64(),
    modules: v.object({
      cafeDaManha: v.float64(),
      almoco: v.float64(),
      lanche: v.float64(),
      jantar: v.float64(),
      doce: v.float64(),
    }),
  },
  handler: async (ctx, args) => {
    const { bmr, tdee, targetKcal } = computeMetrics({
      sex: args.sex,
      weight_kg: args.weight_kg,
      height_cm: args.height_cm,
      age: args.age,
      activityFactor: args.activityFactor,
      deficitKcal: args.deficitKcal,
      targetMode: args.targetMode,
    });

    const existing = await ctx.db
      .query("userProfiles")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .first();

    const data = {
      ...args,
      bmr,
      tdee,
      targetKcal,
    };

    if (existing) {
      await ctx.db.patch(existing._id, data);
      return existing._id;
    } else {
      return await ctx.db.insert("userProfiles", data);
    }
  },
});

export const updateWeight = mutation({
  args: { userId: v.string(), weight_kg: v.float64() },
  handler: async (ctx, args) => {
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

    await ctx.db.patch(profile._id, {
      weight_kg: args.weight_kg,
      bmr,
      tdee,
      targetKcal,
    });
  },
});
