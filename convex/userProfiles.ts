import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

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
    // Calculate BMR using Mifflin-St Jeor
    const bmr =
      args.sex === "F"
        ? 10 * args.weight_kg +
          6.25 * args.height_cm -
          5 * args.age -
          161
        : 10 * args.weight_kg +
          6.25 * args.height_cm -
          5 * args.age +
          5;

    const tdee = bmr * args.activityFactor;
    const targetKcal = tdee - args.deficitKcal;

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

    const bmr =
      profile.sex === "F"
        ? 10 * args.weight_kg +
          6.25 * profile.height_cm -
          5 * profile.age -
          161
        : 10 * args.weight_kg +
          6.25 * profile.height_cm -
          5 * profile.age +
          5;

    const tdee = bmr * profile.activityFactor;
    const targetKcal = tdee - profile.deficitKcal;

    await ctx.db.patch(profile._id, {
      weight_kg: args.weight_kg,
      bmr,
      tdee,
      targetKcal,
    });
  },
});
