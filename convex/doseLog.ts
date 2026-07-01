import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const getByUser = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("doseLog")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();
  },
});

export const addEntry = mutation({
  args: {
    userId: v.string(),
    date: v.string(),
    dose_mg: v.float64(),
    medication: v.optional(v.string()),
    note: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // One dose entry per date: upsert
    const existing = await ctx.db
      .query("doseLog")
      .withIndex("by_user_date", (q) =>
        q.eq("userId", args.userId).eq("date", args.date)
      )
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        dose_mg: args.dose_mg,
        medication: args.medication,
        note: args.note,
      });
    } else {
      await ctx.db.insert("doseLog", {
        userId: args.userId,
        date: args.date,
        dose_mg: args.dose_mg,
        medication: args.medication,
        note: args.note,
      });
    }
  },
});

export const removeEntry = mutation({
  args: { id: v.id("doseLog") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});
