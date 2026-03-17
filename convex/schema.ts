import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // TACO foods (seeded from CSV, read-only after seed)
  foods: defineTable({
    tacoId: v.number(),
    category: v.string(),
    name: v.string(),
    nameNormalized: v.string(),
    // Per 100g:
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
    .index("by_category", ["category"])
    .index("by_tacoId", ["tacoId"])
    .searchIndex("search_name", { searchField: "name" }),

  // Custom foods (user-added, not in TACO)
  customFoods: defineTable({
    name: v.string(),
    nameNormalized: v.string(),
    energy_kcal: v.float64(),
    protein_g: v.float64(),
    lipids_g: v.float64(),
    carbs_g: v.float64(),
    fiber_g: v.float64(),
    createdBy: v.string(),
  }).searchIndex("search_name", { searchField: "name" }),

  // User profiles
  userProfiles: defineTable({
    userId: v.string(),
    name: v.string(),
    sex: v.string(),
    age: v.number(),
    weight_kg: v.float64(),
    height_cm: v.float64(),
    activityFactor: v.float64(),
    deficitKcal: v.number(),
    bmr: v.float64(),
    tdee: v.float64(),
    targetKcal: v.float64(),
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
  }).index("by_userId", ["userId"]),

  // Saved recipes / meal combos
  recipes: defineTable({
    name: v.string(),
    module: v.optional(v.string()),
    items: v.array(
      v.object({
        foodId: v.id("foods"),
        name: v.string(),
        portionGrams: v.float64(),
        energy_kcal: v.float64(),
        protein_g: v.float64(),
        carbs_g: v.float64(),
        lipids_g: v.float64(),
      })
    ),
    totalKcal: v.float64(),
    totalProtein: v.float64(),
    totalCarbs: v.float64(),
    totalFat: v.float64(),
    createdBy: v.string(),
    isPreBuilt: v.boolean(),
  })
    .index("by_module", ["module"])
    .index("by_createdBy", ["createdBy"]),

  // Daily food log entries
  dailyLogEntries: defineTable({
    userId: v.string(),
    date: v.string(),
    module: v.string(),
    recipeId: v.optional(v.id("recipes")),
    items: v.array(
      v.object({
        foodId: v.optional(v.id("foods")),
        name: v.string(),
        portionGrams: v.float64(),
        energy_kcal: v.float64(),
        protein_g: v.float64(),
        carbs_g: v.float64(),
        lipids_g: v.float64(),
      })
    ),
    totalKcal: v.float64(),
    totalProtein: v.float64(),
    totalCarbs: v.float64(),
    totalFat: v.float64(),
    note: v.optional(v.string()),
  })
    .index("by_user_date", ["userId", "date"])
    .index("by_user_date_module", ["userId", "date", "module"]),

  // Meal prep plans
  mealPrepPlans: defineTable({
    name: v.string(),
    startDate: v.string(),
    days: v.number(),
    recipes: v.array(
      v.object({
        recipeId: v.id("recipes"),
        countGiovanna: v.number(),
        countRicardo: v.number(),
      })
    ),
    ingredients: v.array(
      v.object({
        foodId: v.id("foods"),
        name: v.string(),
        totalGrams: v.float64(),
        category: v.string(),
      })
    ),
    status: v.string(),
  }),

  // Grocery lists
  groceryLists: defineTable({
    mealPrepPlanId: v.optional(v.id("mealPrepPlans")),
    name: v.string(),
    date: v.string(),
    items: v.array(
      v.object({
        foodId: v.optional(v.id("foods")),
        name: v.string(),
        quantity: v.string(),
        category: v.string(),
        checked: v.boolean(),
      })
    ),
  }),

  // Weight log
  weightLog: defineTable({
    userId: v.string(),
    date: v.string(),
    weight_kg: v.float64(),
    bmr: v.float64(),
    tdee: v.float64(),
    targetKcal: v.float64(),
    note: v.optional(v.string()),
  })
    .index("by_user_date", ["userId", "date"])
    .index("by_user", ["userId"]),
});
