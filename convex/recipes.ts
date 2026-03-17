import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

const recipeItemValidator = v.object({
  foodId: v.id("foods"),
  name: v.string(),
  portionGrams: v.float64(),
  energy_kcal: v.float64(),
  protein_g: v.float64(),
  carbs_g: v.float64(),
  lipids_g: v.float64(),
});

export const list = query({
  args: { module: v.optional(v.string()), createdBy: v.optional(v.string()) },
  handler: async (ctx, args) => {
    if (args.module) {
      return await ctx.db
        .query("recipes")
        .withIndex("by_module", (q) => q.eq("module", args.module!))
        .collect();
    }
    return await ctx.db.query("recipes").collect();
  },
});

export const getById = query({
  args: { id: v.id("recipes") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    module: v.optional(v.string()),
    items: v.array(recipeItemValidator),
    createdBy: v.string(),
    isPreBuilt: v.boolean(),
  },
  handler: async (ctx, args) => {
    const totalKcal = args.items.reduce((s, i) => s + i.energy_kcal, 0);
    const totalProtein = args.items.reduce((s, i) => s + i.protein_g, 0);
    const totalCarbs = args.items.reduce((s, i) => s + i.carbs_g, 0);
    const totalFat = args.items.reduce((s, i) => s + i.lipids_g, 0);

    return await ctx.db.insert("recipes", {
      name: args.name,
      module: args.module,
      items: args.items,
      totalKcal,
      totalProtein,
      totalCarbs,
      totalFat,
      createdBy: args.createdBy,
      isPreBuilt: args.isPreBuilt,
    });
  },
});

export const remove = mutation({
  args: { id: v.id("recipes") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});
