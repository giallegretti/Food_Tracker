import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// Search custom foods by name
export const search = query({
  args: { searchTerm: v.string(), limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    if (!args.searchTerm.trim()) return [];
    const results = await ctx.db
      .query("customFoods")
      .withSearchIndex("search_name", (q) =>
        q.search("name", args.searchTerm)
      )
      .take(args.limit ?? 15);
    return results;
  },
});

// List all custom foods
export const list = query({
  handler: async (ctx) => {
    return await ctx.db.query("customFoods").collect();
  },
});

// Get a single custom food by ID
export const getById = query({
  args: { id: v.id("customFoods") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

// Add a new custom food
export const add = mutation({
  args: {
    name: v.string(),
    energy_kcal: v.float64(),
    protein_g: v.float64(),
    lipids_g: v.float64(),
    carbs_g: v.float64(),
    fiber_g: v.float64(),
    createdBy: v.string(),
  },
  handler: async (ctx, args) => {
    const nameNormalized = args.name
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim();

    return await ctx.db.insert("customFoods", {
      name: args.name,
      nameNormalized,
      energy_kcal: args.energy_kcal,
      protein_g: args.protein_g,
      lipids_g: args.lipids_g,
      carbs_g: args.carbs_g,
      fiber_g: args.fiber_g,
      createdBy: args.createdBy,
    });
  },
});

// Update an existing custom food
export const update = mutation({
  args: {
    id: v.id("customFoods"),
    name: v.string(),
    energy_kcal: v.float64(),
    protein_g: v.float64(),
    lipids_g: v.float64(),
    carbs_g: v.float64(),
    fiber_g: v.float64(),
  },
  handler: async (ctx, args) => {
    const nameNormalized = args.name
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim();

    await ctx.db.patch(args.id, {
      name: args.name,
      nameNormalized,
      energy_kcal: args.energy_kcal,
      protein_g: args.protein_g,
      lipids_g: args.lipids_g,
      carbs_g: args.carbs_g,
      fiber_g: args.fiber_g,
    });
  },
});

// Remove a custom food
export const remove = mutation({
  args: { id: v.id("customFoods") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});
