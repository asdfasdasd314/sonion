import { existsSync, readFileSync } from "node:fs";

import { RUNTIME_INDEX_PATH } from "./index-builder";
import type { NormalizedFood } from "./types";
import { FoodDataSetupError } from "./errors";

let cachedFoods: readonly NormalizedFood[] | undefined;
let cachedFoodsById: Map<number, NormalizedFood> | undefined;

function isNormalizedFood(value: unknown): value is NormalizedFood {
  if (typeof value !== "object" || value === null) return false;
  const food = value as Partial<NormalizedFood>;
  return (
    typeof food.fdcId === "number" &&
    Number.isInteger(food.fdcId) &&
    food.fdcId > 0 &&
    typeof food.description === "string" &&
    food.description.trim().length > 0 &&
    (food.dataset === "foundation" || food.dataset === "fndds") &&
    isNormalizedNutrients(food.nutrientsPer100g) &&
    Array.isArray(food.portions) &&
    food.portions.every(isNormalizedPortion) &&
    (food.category === undefined || typeof food.category === "string") &&
    (food.foodCode === undefined || typeof food.foodCode === "string") &&
    (food.ingredients === undefined ||
      (Array.isArray(food.ingredients) && food.ingredients.every((item) => typeof item === "string")))
  );
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isNormalizedNutrients(value: unknown): boolean {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  return Object.values(value).every(isFiniteNumber);
}

function isNormalizedPortion(value: unknown): boolean {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  const portion = value as Partial<NormalizedFood["portions"][number]>;
  return (
    typeof portion.description === "string" &&
    portion.description.trim().length > 0 &&
    isFiniteNumber(portion.gramWeight) &&
    portion.gramWeight > 0 &&
    (portion.amount === undefined || isFiniteNumber(portion.amount)) &&
    (portion.unit === undefined || typeof portion.unit === "string")
  );
}

export function loadFoodIndex(): readonly NormalizedFood[] {
  if (cachedFoods) return cachedFoods;

  if (!existsSync(RUNTIME_INDEX_PATH)) {
    throw new FoodDataSetupError(
      `Food data setup error: generated index is missing at ${RUNTIME_INDEX_PATH}. ` +
        "Run npm run food-data:index after placing the USDA JSON inputs in food-data/.",
    );
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(readFileSync(RUNTIME_INDEX_PATH, "utf8")) as unknown;
  } catch (error) {
    throw new FoodDataSetupError(
      `Food data setup error: generated index could not be read at ${RUNTIME_INDEX_PATH}.`,
      { cause: error },
    );
  }

  if (
    !Array.isArray(parsed) ||
    parsed.length === 0 ||
    parsed.some((food) => !isNormalizedFood(food))
  ) {
    throw new FoodDataSetupError(
      `Food data setup error: generated index at ${RUNTIME_INDEX_PATH} is invalid. ` +
        "Regenerate it with npm run food-data:index.",
    );
  }

  cachedFoods = parsed;
  cachedFoodsById = new Map(parsed.map((food) => [food.fdcId, food]));
  return cachedFoods;
}

export function getLoadedFoodById(fdcId: number): NormalizedFood | undefined {
  loadFoodIndex();
  return cachedFoodsById?.get(fdcId);
}
