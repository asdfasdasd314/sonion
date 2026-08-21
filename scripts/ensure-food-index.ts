import { buildAndWriteFoodIndex } from "../lib/food-data/index-builder";
import { FoodDataSetupError } from "../lib/food-data/errors";
import { loadFoodIndex } from "../lib/food-data/loader";

try {
  const index = loadFoodIndex();
  console.log(`Validated food-data/food-index.json with ${index.length} normalized foods.`);
} catch (error) {
  if (!(error instanceof FoodDataSetupError)) throw error;

  const index = buildAndWriteFoodIndex();
  console.log(`Generated food-data/food-index.json with ${index.length} normalized foods.`);
}
