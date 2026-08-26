import { z } from "zod";

import { FIBER_GRAMS_PER_1000_CALORIES } from "@/lib/nutrition/targets";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const NutritionTargetsSchema = z.object({
  bmr: z.number(),
  tdee: z.number(),
  targetCalories: z.number(),
  weeklyChangePounds: z.number(),
  dailyCalorieAdjustment: z.number(),
  proteinGrams: z.number(),
  fatGrams: z.number(),
  carbohydratesGrams: z.number(),
  fiberGrams: z.number(),
  proteinCalories: z.number(),
  fatCalories: z.number(),
  remainingCalories: z.number(),
  hasInsufficientCalories: z.boolean(),
}).strict();

export const SavedNutritionTargetSchema = z.object({
  user_id: z.string().regex(UUID_PATTERN),
  target_snapshot: NutritionTargetsSchema,
  created_at: z.string().min(1),
  updated_at: z.string().min(1),
}).strict();
export type SavedNutritionTarget = z.infer<typeof SavedNutritionTargetSchema>;

export const NutritionTargetSaveBodySchema = z.object({
  targets: NutritionTargetsSchema,
}).strict();

export const SavedNutritionTargetResponseSchema = z.object({
  target: SavedNutritionTargetSchema.nullable(),
}).strict();

export function parseSavedNutritionTargetResponse(value: unknown): SavedNutritionTarget | null | undefined {
  const parsed = SavedNutritionTargetResponseSchema.safeParse(normalizeSavedNutritionTargetResponse(value));
  return parsed.success ? parsed.data.target : undefined;
}

function normalizeSavedNutritionTargetResponse(value: unknown) {
  if (typeof value !== "object" || value === null || !("target" in value)) return value;
  const response = value as { target?: unknown };
  if (typeof response.target !== "object" || response.target === null) return value;
  const target = response.target as Record<string, unknown>;
  if ("fiberGrams" in target || typeof target.targetCalories !== "number") return value;
  return {
    ...response,
    target: {
      ...target,
      fiberGrams: target.targetCalories * FIBER_GRAMS_PER_1000_CALORIES / 1000,
    },
  };
}
