import { readFileSync } from "node:fs";
import { join } from "node:path";

export type MealBatchParameters = {
  maxMealsPerRequest: number;
};

function parameterNumber(source: string, key: string): number {
  const match = source.match(new RegExp("^" + key + "\\s*=\\s*([0-9]+)\\s*$", "m"));
  const value = match ? Number(match[1]) : Number.NaN;
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error("Invalid meal-batch-interpretation parameter: " + key);
  }
  return value;
}

function loadParameters(): MealBatchParameters {
  const source = readFileSync(
    join(process.cwd(), "parameter_files/meal-batch-interpretation.toml"),
    "utf8",
  );
  return {
    maxMealsPerRequest: parameterNumber(source, "max_meals_per_request"),
  };
}

export const MEAL_BATCH_PARAMETERS = loadParameters();
