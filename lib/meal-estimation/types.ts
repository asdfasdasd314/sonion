import { z } from "zod";

export const PortionKindSchema = z.enum(["solid", "liquid"]);
export type PortionKind = z.infer<typeof PortionKindSchema>;

export const MealSelectionItemSchema = z.object({
  itemName: z.string().trim().min(1).max(200),
  fdcId: z.number().int().positive(),
  portionUnits: z.number().finite().positive(),
  portionKind: PortionKindSchema,
}).strict();

export const MealSelectionSchema = z.object({
  items: z.array(MealSelectionItemSchema).min(1).max(50),
}).strict();
export type MealSelectionItem = z.infer<typeof MealSelectionItemSchema>;
export type MealSelection = z.infer<typeof MealSelectionSchema>;

export const DensityProvenanceSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("usda"),
    gramsPerMilliliter: z.number().finite().positive(),
    portionDescription: z.string().trim().min(1),
  }).strict(),
  z.object({
    type: z.literal("fallback"),
    gramsPerMilliliter: z.number().finite().positive(),
    portionKind: PortionKindSchema,
  }).strict(),
]);
export type DensityProvenance = z.infer<typeof DensityProvenanceSchema>;

const NutrientValueSchema = z.number().finite().nonnegative().nullable();

export const MealEstimateItemSchema = z.object({
  foodName: z.string().trim().min(1),
  fdcId: z.number().int().positive(),
  portionUnits: z.number().finite().positive(),
  portionKind: PortionKindSchema,
  estimatedMilliliters: z.number().finite().positive(),
  estimatedGrams: z.number().finite().positive(),
  densitySource: DensityProvenanceSchema,
  calories: NutrientValueSchema,
  protein: NutrientValueSchema,
  fat: NutrientValueSchema,
  carbohydrates: NutrientValueSchema,
}).strict();

export const MealEstimateSchema = z.object({
  items: z.array(MealEstimateItemSchema).min(1),
  totals: z.object({
    calories: NutrientValueSchema,
    protein: NutrientValueSchema,
    fat: NutrientValueSchema,
    carbohydrates: NutrientValueSchema,
  }).strict(),
}).strict();
export type MealEstimateItem = z.infer<typeof MealEstimateItemSchema>;
export type MealEstimate = z.infer<typeof MealEstimateSchema>;

export function parseMealSelection(value: unknown): MealSelection | undefined {
  const parsed = MealSelectionSchema.safeParse(value);
  return parsed.success ? parsed.data : undefined;
}

export function parseMealEstimate(value: unknown): MealEstimate | undefined {
  const parsed = MealEstimateSchema.safeParse(value);
  return parsed.success ? parsed.data : undefined;
}
