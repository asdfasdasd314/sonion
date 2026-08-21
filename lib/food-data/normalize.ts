import type { RawFoodPortion, RawFoodRecord, RawInputFood, RawNutrient } from "./raw";
import type {
  FoodDataset,
  NormalizedFood,
  NormalizedPortion,
} from "./types";

export const NUTRIENT_IDS = {
  protein: 1003,
  fat: 1004,
  carbohydrates: 1005,
  foundationEnergyGeneral: 2047,
  foundationEnergySpecific: 2048,
  fnddsEnergy: 1008,
  fiber: 1079,
} as const;

function text(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed || undefined;
}

function finiteNumber(value: unknown): number | undefined {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : undefined;
  }

  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }

  return undefined;
}

function positiveNumber(value: unknown): number | undefined {
  const parsed = finiteNumber(value);
  return parsed !== undefined && parsed > 0 ? parsed : undefined;
}

function nutrientId(nutrient: RawNutrient): number | undefined {
  return finiteNumber(nutrient.nutrientId ?? nutrient.nutrient?.id);
}

function nutrientAmount(nutrient: RawNutrient): number | undefined {
  return finiteNumber(nutrient.amount ?? nutrient.value);
}

function nutrientValues(nutrients: readonly RawNutrient[]) {
  const values = new Map<number, number>();

  for (const nutrient of nutrients) {
    const id = nutrientId(nutrient);
    const amount = nutrientAmount(nutrient);
    if (id !== undefined && amount !== undefined && !values.has(id)) {
      values.set(id, amount);
    }
  }

  return values;
}

/**
 * Selects one calorie entry for a record. Foundation Specific Factors (2048)
 * takes precedence over General Factors (2047); entries are never summed.
 */
export function selectCalorieValue(
  nutrients: readonly RawNutrient[],
  dataset: FoodDataset,
): number | undefined {
  const values = nutrientValues(nutrients);

  if (dataset === "fndds") {
    return values.get(NUTRIENT_IDS.fnddsEnergy);
  }

  return (
    values.get(NUTRIENT_IDS.foundationEnergySpecific) ??
    values.get(NUTRIENT_IDS.foundationEnergyGeneral)
  );
}

function portionUnit(portion: RawFoodPortion): string | undefined {
  return text(portion.measureUnit?.abbreviation) ?? text(portion.measureUnit?.name);
}

function portionDescription(
  portion: RawFoodPortion,
  dataset: FoodDataset,
  unit: string | undefined,
  amount: number | undefined,
): string | undefined {
  if (dataset === "fndds") {
    return text(portion.portionDescription) ??
      (amount !== undefined && unit ? `${amount} ${unit}` : unit);
  }

  return (
    text(portion.portionDescription) ??
    (amount !== undefined && unit ? `${amount} ${unit}` : unit)
  );
}

type VolumeUnit = "milliliter" | "cup" | "fluid-ounce" | "tablespoon" | "teaspoon";

const VOLUME_MILLILITERS: Record<VolumeUnit, number> = {
  milliliter: 1,
  cup: 240,
  "fluid-ounce": 29.5735,
  tablespoon: 14.7868,
  teaspoon: 4.92892,
};

const VOLUME_UNIT_ALIASES: Record<string, VolumeUnit> = {
  ml: "milliliter",
  milliliter: "milliliter",
  milliliters: "milliliter",
  millilitre: "milliliter",
  millilitres: "milliliter",
  cup: "cup",
  cups: "cup",
  "fl oz": "fluid-ounce",
  floz: "fluid-ounce",
  "fluid oz": "fluid-ounce",
  "fluid ounce": "fluid-ounce",
  "fluid ounces": "fluid-ounce",
  tbsp: "tablespoon",
  tablespoon: "tablespoon",
  tablespoons: "tablespoon",
  tsp: "teaspoon",
  teaspoon: "teaspoon",
  teaspoons: "teaspoon",
};

function normalizedUnit(value: string | undefined): VolumeUnit | undefined {
  if (!value) return undefined;
  const key = value.trim().toLocaleLowerCase("en-US").replace(/\./g, "").replace(/\s+/g, " ");
  return VOLUME_UNIT_ALIASES[key];
}

function volumeDetails(
  portion: RawFoodPortion,
  amount: number | undefined,
  description: string,
): { volumeMl: number; densityGPerMl: number } | undefined {
  const describedAmount = description.match(/(?:^|\s)(\d+(?:\.\d+)?)\s*(?:ml|millilit(?:er|re)s?|cups?|fl\s*oz|fluid ounces?|tbsp|tablespoons?|tsp|teaspoons?)\b/i);
  const unit = normalizedUnit(portion.measureUnit?.abbreviation) ?? normalizedUnit(portion.measureUnit?.name) ??
    (describedAmount ? normalizedUnit(describedAmount[0].replace(describedAmount[1], "").trim()) : undefined);
  if (!unit) return undefined;

  const quantity = amount ?? (describedAmount ? finiteNumber(describedAmount[1]) : undefined);
  if (quantity === undefined || quantity <= 0) return undefined;
  const volumeMl = quantity * VOLUME_MILLILITERS[unit];
  const gramWeight = positiveNumber(portion.gramWeight);
  if (!Number.isFinite(volumeMl) || volumeMl <= 0 || gramWeight === undefined) return undefined;
  return { volumeMl, densityGPerMl: gramWeight / volumeMl };
}

function normalizePortion(
  portion: RawFoodPortion,
  dataset: FoodDataset,
): NormalizedPortion | undefined {
  const gramWeight = positiveNumber(portion.gramWeight);
  if (gramWeight === undefined) return undefined;

  const amount = finiteNumber(portion.amount);
  const unit = portionUnit(portion);
  const description = portionDescription(portion, dataset, unit, amount);
  if (!description) return undefined;
  const volume = volumeDetails(portion, amount, description);

  return {
    description,
    gramWeight,
    ...(amount !== undefined ? { amount } : {}),
    ...(unit ? { unit } : {}),
    ...(volume ?? {}),
  };
}

const VOLUME_PREFERENCE: Record<VolumeUnit, number> = {
  cup: 0,
  "fluid-ounce": 1,
  milliliter: 2,
  tablespoon: 3,
  teaspoon: 4,
};

/** Returns one deterministic USDA volume portion for record-level density estimates. */
export function selectPreferredVolumePortion(
  portions: readonly NormalizedPortion[],
): NormalizedPortion | undefined {
  return [...portions]
    .filter((portion) => portion.volumeMl !== undefined && portion.volumeMl > 0 && portion.gramWeight > 0)
    .sort((left, right) => {
      const leftMatch = left.description.match(/(?:^|\s)(?:ml|millilit(?:er|re)s?|cups?|fl\s*oz|fluid ounces?|tbsp|tablespoons?|tsp|teaspoons?)\b/i);
      const rightMatch = right.description.match(/(?:^|\s)(?:ml|millilit(?:er|re)s?|cups?|fl\s*oz|fluid ounces?|tbsp|tablespoons?|tsp|teaspoons?)\b/i);
      const leftUnit = normalizedUnit(left.unit) ?? normalizedUnit(leftMatch?.[0]?.trim());
      const rightUnit = normalizedUnit(right.unit) ?? normalizedUnit(rightMatch?.[0]?.trim());
      return (leftUnit ? VOLUME_PREFERENCE[leftUnit] : 99) - (rightUnit ? VOLUME_PREFERENCE[rightUnit] : 99) ||
        (right.volumeMl ?? 0) - (left.volumeMl ?? 0) || left.description.localeCompare(right.description);
    })[0];
}

export function normalizePortions(
  portions: readonly RawFoodPortion[] | undefined,
  dataset: FoodDataset,
): NormalizedPortion[] {
  if (!portions) return [];
  return portions
    .map((portion) => normalizePortion(portion, dataset))
    .filter((portion): portion is NormalizedPortion => portion !== undefined);
}

function ingredientDescription(inputFood: RawInputFood): string | undefined {
  return (
    text(inputFood.foodDescription) ??
    text(inputFood.ingredientDescription) ??
    text(inputFood.food?.description) ??
    text(inputFood.description)
  );
}

function normalizeIngredients(
  inputFoods: readonly RawInputFood[] | undefined,
): string[] | undefined {
  if (!inputFoods) return undefined;

  const ingredients = inputFoods
    .map(ingredientDescription)
    .filter((ingredient): ingredient is string => ingredient !== undefined);
  const uniqueIngredients = [...new Set(ingredients)];
  return uniqueIngredients.length ? uniqueIngredients : undefined;
}

function normalizeFood(
  raw: RawFoodRecord,
  dataset: FoodDataset,
): NormalizedFood | undefined {
  const fdcId = finiteNumber(raw.fdcId);
  const description = text(raw.description);
  if (fdcId === undefined || !Number.isInteger(fdcId) || fdcId <= 0 || !description) {
    return undefined;
  }

  const nutrients = Array.isArray(raw.foodNutrients) ? raw.foodNutrients : [];
  const values = nutrientValues(nutrients);
  const caloriesKcal = selectCalorieValue(nutrients, dataset);
  const category =
    dataset === "foundation"
      ? text(raw.foodCategory?.description)
      : text(raw.wweiaFoodCategory?.wweiaFoodCategoryDescription);
  const foodCode = text(String(raw.foodCode ?? ""));
  const ingredients = normalizeIngredients(
    Array.isArray(raw.inputFoods) ? raw.inputFoods : undefined,
  );

  return {
    fdcId,
    description,
    dataset,
    ...(category ? { category } : {}),
    ...(foodCode ? { foodCode } : {}),
    nutrientsPer100g: {
      ...(caloriesKcal !== undefined ? { caloriesKcal } : {}),
      ...(values.get(NUTRIENT_IDS.protein) !== undefined
        ? { proteinG: values.get(NUTRIENT_IDS.protein) }
        : {}),
      ...(values.get(NUTRIENT_IDS.carbohydrates) !== undefined
        ? { carbohydratesG: values.get(NUTRIENT_IDS.carbohydrates) }
        : {}),
      ...(values.get(NUTRIENT_IDS.fat) !== undefined
        ? { fatG: values.get(NUTRIENT_IDS.fat) }
        : {}),
      ...(values.get(NUTRIENT_IDS.fiber) !== undefined
        ? { fiberG: values.get(NUTRIENT_IDS.fiber) }
        : {}),
    },
    portions: normalizePortions(
      Array.isArray(raw.foodPortions) ? raw.foodPortions : undefined,
      dataset,
    ),
    ...(ingredients ? { ingredients } : {}),
  };
}

export function normalizeFoundationFood(
  raw: RawFoodRecord,
): NormalizedFood | undefined {
  return normalizeFood(raw, "foundation");
}

export function normalizeFnddsFood(raw: RawFoodRecord): NormalizedFood | undefined {
  return normalizeFood(raw, "fndds");
}
