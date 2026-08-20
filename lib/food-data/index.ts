export { normalizeFoundationFood, normalizeFnddsFood, selectCalorieValue } from "./normalize";
export { buildAndWriteFoodIndex, buildFoodIndex, writeFoodIndex } from "./index-builder";
export { getFood, searchFoods, createFoodTools } from "./tools";
export type {
  FoodDataset,
  FoodSearchResult,
  FoodToolError,
  NormalizedFood,
  NormalizedNutrients,
  NormalizedPortion,
} from "./types";
