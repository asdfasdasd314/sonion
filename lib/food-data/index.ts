export { normalizeFoundationFood, normalizeFnddsFood, selectCalorieValue } from "./normalize";
export { buildAndWriteFoodIndex, buildFoodIndex, writeFoodIndex } from "./index-builder";
export { FoodDataSetupError } from "./errors";
export {
  getFood,
  searchFoods,
  createFoodTools,
  createFoodToolRegistry,
  getDefaultFoodToolRegistry,
} from "./tools";
export type {
  FoodToolDefinition,
  FoodToolName,
  FoodToolRegistry,
  FoodDataset,
  FoodSearchResult,
  FoodToolError,
  NormalizedFood,
  NormalizedNutrients,
  NormalizedPortion,
} from "./types";
