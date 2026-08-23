import { existsSync } from "node:fs";

import { FoodDataSetupError } from "../lib/food-data/errors";
import {
  FOUNDATION_DATA_PATH,
  FNDDS_DATA_PATH,
  RUNTIME_INDEX_PATH,
  buildAndWriteFoodIndex,
} from "../lib/food-data/index-builder";
import { loadFoodIndex } from "../lib/food-data/loader";

function prepareFoodIndex(): void {
  try {
    const index = loadFoodIndex();
    console.log(`Validated food-data/food-index.json with ${index.length} normalized foods.`);
    return;
  } catch (error) {
    if (!(error instanceof FoodDataSetupError)) throw error;

    const hasRawInputs = existsSync(FOUNDATION_DATA_PATH) || existsSync(FNDDS_DATA_PATH);
    const isVercelBuild = process.env.VERCEL === "1";

    if (isVercelBuild && !existsSync(RUNTIME_INDEX_PATH) && !hasRawInputs) {
      console.warn(
        "Skipping USDA index generation during the Vercel build because the raw inputs are gitignored. " +
          "Generate and commit food-data/food-index.json to enable the food-estimation API in the deployment.",
      );
      return;
    }

    const index = buildAndWriteFoodIndex();
    console.log(`Generated food-data/food-index.json with ${index.length} normalized foods.`);
  }
}

prepareFoodIndex();
