import { z } from "zod";

export type FoodDataset = "foundation" | "fndds";

export const NormalizedPortionSchema = z.object({
  description: z.string().trim().min(1),
  gramWeight: z.number().finite().positive(),
  amount: z.number().finite().optional(),
  unit: z.string().optional(),
  volumeMl: z.number().finite().positive().optional(),
  densityGPerMl: z.number().finite().positive().optional(),
}).strict();

export const NormalizedNutrientsSchema = z.object({
  caloriesKcal: z.number().finite().nonnegative().optional(),
  proteinG: z.number().finite().nonnegative().optional(),
  carbohydratesG: z.number().finite().nonnegative().optional(),
  fatG: z.number().finite().nonnegative().optional(),
  fiberG: z.number().finite().nonnegative().optional(),
}).strict();

export const NormalizedFoodSchema = z.object({
  fdcId: z.number().int().positive(),
  description: z.string().trim().min(1),
  dataset: z.enum(["foundation", "fndds"]),
  category: z.string().optional(),
  foodCode: z.string().optional(),
  nutrientsPer100g: NormalizedNutrientsSchema,
  portions: z.array(NormalizedPortionSchema),
  ingredients: z.array(z.string()).optional(),
}).strict();

export type NormalizedPortion = {
  description: string;
  gramWeight: number;
  amount?: number;
  unit?: string;
  volumeMl?: number;
  densityGPerMl?: number;
};

export type NormalizedNutrients = {
  caloriesKcal?: number;
  proteinG?: number;
  carbohydratesG?: number;
  fatG?: number;
  fiberG?: number;
};

export type NormalizedFood = {
  fdcId: number;
  description: string;
  dataset: FoodDataset;
  category?: string;
  foodCode?: string;
  nutrientsPer100g: NormalizedNutrients;
  portions: NormalizedPortion[];
  ingredients?: string[];
};

export type FoodSearchResult = {
  fdcId: number;
  description: string;
  dataset: FoodDataset;
  category?: string;
  score: number;
};

export type FoodToolError =
  | { error: "INVALID_ARGUMENTS"; message: string }
  | { error: "FOOD_NOT_FOUND" };
