import { query, mutation, action } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";

// Search foods by name using Convex full-text search
export const search = query({
  args: { searchTerm: v.string(), limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    if (!args.searchTerm.trim()) return [];
    const results = await ctx.db
      .query("foods")
      .withSearchIndex("search_name", (q) =>
        q.search("name", args.searchTerm)
      )
      .take(args.limit ?? 15);
    return results;
  },
});

// Get all foods by category
export const byCategory = query({
  args: { category: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("foods")
      .withIndex("by_category", (q) => q.eq("category", args.category))
      .collect();
  },
});

// Get all unique categories
export const categories = query({
  handler: async (ctx) => {
    const foods = await ctx.db.query("foods").collect();
    const cats = new Set(foods.map((f) => f.category));
    return Array.from(cats).sort();
  },
});

// Get a single food by ID
export const getById = query({
  args: { id: v.id("foods") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

// Get food count (useful for checking if seed ran)
export const count = query({
  handler: async (ctx) => {
    const foods = await ctx.db.query("foods").collect();
    return foods.length;
  },
});

// Batch insert foods (called by the seed action)
export const batchInsert = mutation({
  args: {
    foods: v.array(
      v.object({
        tacoId: v.number(),
        category: v.string(),
        name: v.string(),
        nameNormalized: v.string(),
        energy_kcal: v.float64(),
        energy_kj: v.float64(),
        protein_g: v.float64(),
        lipids_g: v.float64(),
        carbs_g: v.float64(),
        fiber_g: v.float64(),
        cholesterol_mg: v.optional(v.float64()),
        sodium_mg: v.optional(v.float64()),
        calcium_mg: v.optional(v.float64()),
        iron_mg: v.optional(v.float64()),
        potassium_mg: v.optional(v.float64()),
      })
    ),
  },
  handler: async (ctx, args) => {
    for (const food of args.foods) {
      await ctx.db.insert("foods", food);
    }
    return args.foods.length;
  },
});
