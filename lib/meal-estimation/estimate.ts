import { selectPreferredVolumePortion } from "../food-data/normalize";
import type { NormalizedFood } from "../food-data/types";
import { MEAL_ESTIMATION_PARAMETERS, type MealEstimationParameters } from "./config";
import {
  MealSelectionSchema,
  type MealEstimate,
  type MealEstimateItem,
  type MealSelection,
} from "./types";

export class MealEstimationError extends Error {
  readonly code: "INVALID_SELECTION" | "UNKNOWN_FDC_ID";

  constructor(code: MealEstimationError["code"], message: string) {
    super(message);
    this.name = "MealEstimationError";
    this.code = code;
  }
}

function scaledNutrient(value: number | undefined, grams: number): number | null {
  return value === undefined ? null : grams * value / 100;
}

function caloriesFromMacros(
  protein: number | null,
  carbohydrates: number | null,
  fat: number | null,
): number | null {
  if (protein === null || carbohydrates === null || fat === null) return null;
  return (4 * protein) + (4 * carbohydrates) + (9 * fat);
}

function total(
  items: readonly MealEstimateItem[],
  key: "calories" | "protein" | "fat" | "carbohydrates",
  allowMissing = false,
): number | null {
  if (!allowMissing && items.some((item) => item[key] === null)) return null;

  const knownValues = items
    .map((item) => item[key])
    .filter((value): value is number => value !== null);
  return knownValues.length ? knownValues.reduce((sum, value) => sum + value, 0) : null;
}

export function portionUnitMilliliters(
  portionKind: MealSelection["items"][number]["portionKind"],
  parameters: MealEstimationParameters = MEAL_ESTIMATION_PARAMETERS,
): number {
  return parameters.portionUnitMilliliters[portionKind];
}

export function estimateMeal(
  input: unknown,
  foods: readonly NormalizedFood[],
  parameters: MealEstimationParameters = MEAL_ESTIMATION_PARAMETERS,
): MealEstimate {
  const selection = MealSelectionSchema.safeParse(input);
  if (!selection.success) {
    throw new MealEstimationError("INVALID_SELECTION", "The meal selection payload is invalid.");
  }

  const foodsById = new Map(foods.map((food) => [food.fdcId, food]));
  const items = selection.data.items.map((selected) => {
    const food = foodsById.get(selected.fdcId);
    if (!food) {
      throw new MealEstimationError("UNKNOWN_FDC_ID", "The selected FDC ID is not in the authoritative USDA index.");
    }

    const estimatedMilliliters = selected.portionUnits * portionUnitMilliliters(selected.portionKind, parameters);
    const preferredPortion = selectPreferredVolumePortion(food.portions);
    const usdaDensity = preferredPortion
      ? preferredPortion.densityGPerMl ?? preferredPortion.gramWeight / (preferredPortion.volumeMl as number)
      : undefined;
    const densitySource = preferredPortion
      ? {
          type: "usda" as const,
          gramsPerMilliliter: usdaDensity as number,
          portionDescription: preferredPortion.description,
        }
      : {
          type: "fallback" as const,
          gramsPerMilliliter: parameters.fallbackDensityGramsPerMilliliter[selected.portionKind],
          portionKind: selected.portionKind,
        };
    const estimatedGrams = estimatedMilliliters * densitySource.gramsPerMilliliter;
    const protein = scaledNutrient(food.nutrientsPer100g.proteinG, estimatedGrams);
    const fat = scaledNutrient(food.nutrientsPer100g.fatG, estimatedGrams);
    const carbohydrates = scaledNutrient(food.nutrientsPer100g.carbohydratesG, estimatedGrams);
    const calories = scaledNutrient(food.nutrientsPer100g.caloriesKcal, estimatedGrams) ??
      caloriesFromMacros(protein, carbohydrates, fat);

    return {
      foodName: food.description,
      fdcId: food.fdcId,
      portionUnits: selected.portionUnits,
      portionKind: selected.portionKind,
      estimatedMilliliters,
      estimatedGrams,
      densitySource,
      calories,
      protein,
      fat,
      carbohydrates,
    } satisfies MealEstimateItem;
  });

  return {
    items,
    totals: {
      calories: total(items, "calories", true),
      protein: total(items, "protein"),
      fat: total(items, "fat"),
      carbohydrates: total(items, "carbohydrates"),
    },
  };
}
