import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

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

    // Also update the user profile weight
    await ctx.db.patch(profile._id, {
      weight_kg: args.weight_kg,
      bmr,
      tdee,
      targetKcal,
    });
  },
});
