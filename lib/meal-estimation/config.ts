import { readFileSync } from "node:fs";
import { join } from "node:path";

import type { PortionKind } from "./types";

export type MealEstimationParameters = {
  portionUnitMilliliters: Record<PortionKind, number>;
  fallbackDensityGramsPerMilliliter: Record<PortionKind, number>;
};

function parameterValue(source: string, key: string): number {
  const match = source.match(new RegExp("^" + key + "\\s*=\\s*([0-9]+(?:\\.[0-9]+)?)\\s*$", "m"));
  const value = match ? Number(match[1]) : Number.NaN;
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error("Invalid meal-estimation parameter: " + key);
  }
  return value;
}

function loadParameters(): MealEstimationParameters {
  const source = readFileSync(join(process.cwd(), "parameter_files/meal-estimation.toml"), "utf8");
  return {
    portionUnitMilliliters: {
      solid: parameterValue(source, "solid_portion_unit_milliliters"),
      liquid: parameterValue(source, "liquid_portion_unit_milliliters"),
    },
    fallbackDensityGramsPerMilliliter: {
      solid: parameterValue(source, "solid_fallback_density_grams_per_milliliter"),
      liquid: parameterValue(source, "liquid_fallback_density_grams_per_milliliter"),
    },
  };
}

export const MEAL_ESTIMATION_PARAMETERS = loadParameters();
