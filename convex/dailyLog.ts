import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

const logItemValidator = v.object({
  foodId: v.optional(v.id("foods")),
  name: v.string(),
  portionGrams: v.float64(),
  energy_kcal: v.float64(),
  protein_g: v.float64(),
  carbs_g: v.float64(),
  lipids_g: v.float64(),
});

// Get all log entries for a user on a specific date
export const getByDate = query({
  args: { userId: v.string(), date: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("dailyLogEntries")
      .withIndex("by_user_date", (q) =>
        q.eq("userId", args.userId).eq("date", args.date)
      )
      .collect();
  },
});

// Get daily totals for a user on a specific date
export const getDailyTotals = query({
  args: { userId: v.string(), date: v.string() },
  handler: async (ctx, args) => {
    const entries = await ctx.db
      .query("dailyLogEntries")
      .withIndex("by_user_date", (q) =>
        q.eq("userId", args.userId).eq("date", args.date)
      )
      .collect();

    const totals = {
      kcal: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
      byModule: {} as Record<
        string,
        { kcal: number; protein: number; carbs: number; fat: number }
      >,
    };

    for (const entry of entries) {
      totals.kcal += entry.totalKcal;
      totals.protein += entry.totalProtein;
      totals.carbs += entry.totalCarbs;
      totals.fat += entry.totalFat;

      if (!totals.byModule[entry.module]) {
        totals.byModule[entry.module] = {
          kcal: 0,
          protein: 0,
          carbs: 0,
          fat: 0,
        };
      }
      totals.byModule[entry.module].kcal += entry.totalKcal;
      totals.byModule[entry.module].protein += entry.totalProtein;
      totals.byModule[entry.module].carbs += entry.totalCarbs;
      totals.byModule[entry.module].fat += entry.totalFat;
    }

    return totals;
  },
});

// Add a log entry (optionally also for another user)
export const addEntry = mutation({
  args: {
    userId: v.string(),
    date: v.string(),
    module: v.string(),
    recipeId: v.optional(v.id("recipes")),
    items: v.array(logItemValidator),
    note: v.optional(v.string()),
    alsoForUserId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const totalKcal = args.items.reduce((s, i) => s + i.energy_kcal, 0);
    const totalProtein = args.items.reduce((s, i) => s + i.protein_g, 0);
    const totalCarbs = args.items.reduce((s, i) => s + i.carbs_g, 0);
    const totalFat = args.items.reduce((s, i) => s + i.lipids_g, 0);

    const entry = {
      date: args.date,
      module: args.module,
      recipeId: args.recipeId,
      items: args.items,
      totalKcal,
      totalProtein,
      totalCarbs,
      totalFat,
      note: args.note,
    };

    const id = await ctx.db.insert("dailyLogEntries", {
      userId: args.userId,
      ...entry,
    });

    if (args.alsoForUserId) {
      await ctx.db.insert("dailyLogEntries", {
        userId: args.alsoForUserId,
        ...entry,
      });
    }

    return id;
  },
});

// Share an existing entry with another user (duplicate it)
export const shareEntry = mutation({
  args: {
    entryId: v.id("dailyLogEntries"),
    targetUserId: v.string(),
  },
  handler: async (ctx, args) => {
    const entry = await ctx.db.get(args.entryId);
    if (!entry) throw new Error("Entry not found");

    return await ctx.db.insert("dailyLogEntries", {
      userId: args.targetUserId,
      date: entry.date,
      module: entry.module,
      recipeId: entry.recipeId,
      items: entry.items,
      totalKcal: entry.totalKcal,
      totalProtein: entry.totalProtein,
      totalCarbs: entry.totalCarbs,
      totalFat: entry.totalFat,
      note: entry.note,
    });
  },
});

// Delete a log entry
export const deleteEntry = mutation({
  args: { id: v.id("dailyLogEntries") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});

// Remove a single item from an entry by index
export const removeItem = mutation({
  args: {
    entryId: v.id("dailyLogEntries"),
    itemIndex: v.number(),
  },
  handler: async (ctx, args) => {
    const entry = await ctx.db.get(args.entryId);
    if (!entry) throw new Error("Entry not found");

    const newItems = entry.items.filter((_, i) => i !== args.itemIndex);

    if (newItems.length === 0) {
      await ctx.db.delete(args.entryId);
      return;
    }

    const totalKcal = newItems.reduce((s, i) => s + i.energy_kcal, 0);
    const totalProtein = newItems.reduce((s, i) => s + i.protein_g, 0);
    const totalCarbs = newItems.reduce((s, i) => s + i.carbs_g, 0);
    const totalFat = newItems.reduce((s, i) => s + i.lipids_g, 0);

    await ctx.db.patch(args.entryId, {
      items: newItems,
      totalKcal,
      totalProtein,
      totalCarbs,
      totalFat,
    });
  },
});

// Share all entries for a module with another user
export const shareModuleEntries = mutation({
  args: {
    userId: v.string(),
    date: v.string(),
    module: v.string(),
    targetUserId: v.string(),
  },
  handler: async (ctx, args) => {
    const entries = await ctx.db
      .query("dailyLogEntries")
      .withIndex("by_user_date_module", (q) =>
        q
          .eq("userId", args.userId)
          .eq("date", args.date)
          .eq("module", args.module)
      )
      .collect();

    for (const entry of entries) {
      await ctx.db.insert("dailyLogEntries", {
        userId: args.targetUserId,
        date: entry.date,
        module: entry.module,
        recipeId: entry.recipeId,
        items: entry.items,
        totalKcal: entry.totalKcal,
        totalProtein: entry.totalProtein,
        totalCarbs: entry.totalCarbs,
        totalFat: entry.totalFat,
        note: entry.note,
      });
    }

    return entries.length;
  },
});

// Get all dates with entries for a user (for history view)
export const getDatesWithEntries = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const entries = await ctx.db
      .query("dailyLogEntries")
      .withIndex("by_user_date", (q) => q.eq("userId", args.userId))
      .collect();

    const dateMap = new Map<
      string,
      { kcal: number; protein: number; carbs: number; fat: number }
    >();
    for (const entry of entries) {
      const prev = dateMap.get(entry.date) || {
        kcal: 0,
        protein: 0,
        carbs: 0,
        fat: 0,
      };
      dateMap.set(entry.date, {
        kcal: prev.kcal + entry.totalKcal,
        protein: prev.protein + entry.totalProtein,
        carbs: prev.carbs + entry.totalCarbs,
        fat: prev.fat + entry.totalFat,
      });
    }

    return Array.from(dateMap.entries())
      .map(([date, totals]) => ({
        date,
        totalKcal: totals.kcal,
        totalProtein: totals.protein,
        totalCarbs: totals.carbs,
        totalFat: totals.fat,
      }))
      .sort((a, b) => b.date.localeCompare(a.date));
  },
});

// Copy all entries from one date to another
export const copyDay = mutation({
  args: {
    userId: v.string(),
    fromDate: v.string(),
    toDate: v.string(),
  },
  handler: async (ctx, args) => {
    const entries = await ctx.db
      .query("dailyLogEntries")
      .withIndex("by_user_date", (q) =>
        q.eq("userId", args.userId).eq("date", args.fromDate)
      )
      .collect();

    for (const entry of entries) {
      await ctx.db.insert("dailyLogEntries", {
        userId: args.userId,
        date: args.toDate,
        module: entry.module,
        recipeId: entry.recipeId,
        items: entry.items,
        totalKcal: entry.totalKcal,
        totalProtein: entry.totalProtein,
        totalCarbs: entry.totalCarbs,
        totalFat: entry.totalFat,
        note: entry.note,
      });
    }

    return entries.length;
  },
});
