import { existsSync, readFileSync } from "node:fs";

import { RUNTIME_INDEX_PATH } from "./index-builder";
import type { NormalizedFood } from "./types";

let cachedFoods: readonly NormalizedFood[] | undefined;
let cachedFoodsById: Map<number, NormalizedFood> | undefined;

function isNormalizedFood(value: unknown): value is NormalizedFood {
  if (typeof value !== "object" || value === null) return false;
  const food = value as Partial<NormalizedFood>;
  return (
    typeof food.fdcId === "number" &&
    Number.isInteger(food.fdcId) &&
    typeof food.description === "string" &&
    (food.dataset === "foundation" || food.dataset === "fndds") &&
    typeof food.nutrientsPer100g === "object" &&
    Array.isArray(food.portions)
  );
}

export function loadFoodIndex(): readonly NormalizedFood[] {
  if (cachedFoods) return cachedFoods;

  if (!existsSync(RUNTIME_INDEX_PATH)) {
    throw new Error(
      `Food data setup error: generated index is missing at ${RUNTIME_INDEX_PATH}. ` +
        "Run npm run food-data:index after placing the USDA JSON inputs in food-data/.",
    );
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(readFileSync(RUNTIME_INDEX_PATH, "utf8")) as unknown;
  } catch (error) {
    throw new Error(
      `Food data setup error: generated index could not be read at ${RUNTIME_INDEX_PATH}.`,
      { cause: error },
    );
  }

  if (!Array.isArray(parsed) || parsed.some((food) => !isNormalizedFood(food))) {
    throw new Error(
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
