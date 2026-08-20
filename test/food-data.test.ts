import { existsSync } from "node:fs";
import { test } from "node:test";
import assert from "node:assert/strict";

import {
  buildFoodIndex,
  createFoodTools,
  normalizeFnddsFood,
  normalizeFoundationFood,
  selectCalorieValue,
} from "../lib/food-data";
import { FOUNDATION_DATA_PATH, FNDDS_DATA_PATH } from "../lib/food-data/index-builder";
import type { RawNutrient } from "../lib/food-data/raw";
import type { NormalizedFood } from "../lib/food-data/types";

const foundationNutrients: RawNutrient[] = [
  { nutrient: { id: 1003 }, amount: 1.1 },
  { nutrient: { id: 1004 }, amount: 0.2 },
  { nutrient: { id: 1005 }, amount: 12.3 },
  { nutrient: { id: 1079 }, amount: 2.4 },
  { nutrient: { id: 2047 }, amount: 80 },
  { nutrient: { id: 2048 }, amount: 72 },
];

const fnddsNutrients: RawNutrient[] = [
  { nutrientId: 1003, value: 3.43 },
  { nutrientId: 1004, value: 0.08 },
  { nutrientId: 1005, value: 4.92 },
  { nutrientId: 1079, value: 0 },
  { nutrientId: 1008, value: 34 },
];

test("normalizes Foundation nutrients, category, ingredients, and portions", () => {
  const food = normalizeFoundationFood({
    fdcId: 2685570,
    description: "Squash, winter, butternut, raw",
    foodCategory: { description: "Vegetables and Vegetable Products" },
    foodNutrients: foundationNutrients,
    foodPortions: [
      { amount: 1, measureUnit: { name: "RACC", abbreviation: "RACC" }, gramWeight: 85 },
      { amount: 1, measureUnit: { abbreviation: "bad" }, gramWeight: 0 },
    ],
    inputFoods: [{ foodDescription: "Butternut squash" }],
  });

  assert.deepEqual(food, {
    fdcId: 2685570,
    description: "Squash, winter, butternut, raw",
    dataset: "foundation",
    category: "Vegetables and Vegetable Products",
    nutrientsPer100g: {
      caloriesKcal: 72,
      proteinG: 1.1,
      carbohydratesG: 12.3,
      fatG: 0.2,
      fiberG: 2.4,
    },
    portions: [{ description: "1 RACC", gramWeight: 85, amount: 1, unit: "RACC" }],
    ingredients: ["Butternut squash"],
  });
});

test("normalizes FNDDS nutrients, category, food code, and human portion descriptions", () => {
  const food = normalizeFnddsFood({
    fdcId: 2705388,
    description: "Milk, fat free (skim)",
    foodCode: "11113000",
    wweiaFoodCategory: { wweiaFoodCategoryDescription: "Milk, nonfat" },
    foodNutrients: fnddsNutrients,
    foodPortions: [
      { gramWeight: 244, portionDescription: "1 cup" },
      { gramWeight: 30.5, portionDescription: "1 fl oz" },
      { gramWeight: 1, portionDescription: "Quantity not specified" },
    ],
  });

  assert.deepEqual(food, {
    fdcId: 2705388,
    description: "Milk, fat free (skim)",
    dataset: "fndds",
    category: "Milk, nonfat",
    foodCode: "11113000",
    nutrientsPer100g: {
      caloriesKcal: 34,
      proteinG: 3.43,
      carbohydratesG: 4.92,
      fatG: 0.08,
      fiberG: 0,
    },
    portions: [
      { description: "1 cup", gramWeight: 244 },
      { description: "1 fl oz", gramWeight: 30.5 },
      { description: "Quantity not specified", gramWeight: 1 },
    ],
  });
});

test("uses the centralized calorie precedence rules", () => {
  assert.equal(selectCalorieValue(foundationNutrients, "foundation"), 72);
  assert.equal(
    selectCalorieValue(
      foundationNutrients.filter((nutrient) => nutrient.nutrient?.id !== 2048),
      "foundation",
    ),
    80,
  );
  assert.equal(selectCalorieValue(fnddsNutrients, "fndds"), 34);
  assert.equal(
    selectCalorieValue([{ nutrientId: 2047, value: 80 }, { nutrientId: 2048, value: 72 }], "fndds"),
    undefined,
  );
});

test("keeps missing nutrients and portions missing", () => {
  const food = normalizeFnddsFood({
    fdcId: 1,
    description: "Food without measurements",
    foodNutrients: [{ nutrientId: 1003, value: 2 }],
    foodPortions: [{ gramWeight: 0, portionDescription: "invalid" }, { gramWeight: 4 }],
  });

  assert.deepEqual(food?.nutrientsPer100g, { proteinG: 2 });
  assert.deepEqual(food?.portions, []);
  assert.equal(normalizeFoundationFood({ description: "" }), undefined);
});

const fixtureIndex: NormalizedFood[] = [
  {
    fdcId: 10,
    description: "Broccoli, raw",
    dataset: "foundation",
    category: "Vegetables",
    nutrientsPer100g: { caloriesKcal: 34 },
    portions: [],
  },
  {
    fdcId: 11,
    description: "Broccoli, cooked",
    dataset: "fndds",
    category: "Vegetables",
    nutrientsPer100g: { caloriesKcal: 35 },
    portions: [],
  },
  {
    fdcId: 12,
    description: "Chicken breast, roasted",
    dataset: "fndds",
    nutrientsPer100g: {},
    portions: [],
  },
];

test("searches both datasets, filters datasets, caps results, and ranks deterministically", () => {
  const tools = createFoodTools(fixtureIndex);
  assert.deepEqual(tools.searchFoods({ query: "broccoli" }), {
    results: [
      { fdcId: 11, description: "Broccoli, cooked", dataset: "fndds", category: "Vegetables", score: 0.95 },
      { fdcId: 10, description: "Broccoli, raw", dataset: "foundation", category: "Vegetables", score: 0.95 },
    ],
  });
  assert.deepEqual(tools.searchFoods({ query: "broccoli", dataset: "foundation" }), {
    results: [{ fdcId: 10, description: "Broccoli, raw", dataset: "foundation", category: "Vegetables", score: 0.95 }],
  });
  assert.equal((tools.searchFoods({ query: "chicken", limit: 11 }) as { error: string }).error, "INVALID_ARGUMENTS");
});

test("getFood returns compact records, typed not-found, and validation errors", () => {
  const tools = createFoodTools(fixtureIndex);
  assert.equal(tools.getFood({ fdcId: 11 }), fixtureIndex[1]);
  assert.deepEqual(tools.getFood({ fdcId: 999999 }), { error: "FOOD_NOT_FOUND" });
  assert.deepEqual(tools.getFood({ fdcId: -1 }), {
    error: "INVALID_ARGUMENTS",
    message: "Invalid food tool arguments.",
  });
  assert.deepEqual(tools.searchFoods({ query: "   " }), {
    error: "INVALID_ARGUMENTS",
    message: "Invalid food tool arguments.",
  });
});

const localInputsAvailable = existsSync(FOUNDATION_DATA_PATH) && existsSync(FNDDS_DATA_PATH);

test("real USDA inputs are available for integration searches", () => {
  assert.ok(
    localInputsAvailable,
    `Food data setup error: expected ${FOUNDATION_DATA_PATH} and ${FNDDS_DATA_PATH}. ` +
      "These gitignored local inputs must be present to run real-record tests.",
  );
});

if (localInputsAvailable) {
  const realIndex = buildFoodIndex();
  const realTools = createFoodTools(realIndex);
  const cases = [
    ["skim milk", (food: NormalizedFood) => /milk/i.test(food.description) && /skim|fat free/i.test(food.description)],
    ["macaroni and cheese", (food: NormalizedFood) => /macaroni|mac/i.test(food.description) && /cheese/i.test(food.description)],
    ["chicken", (food: NormalizedFood) => /^chicken\b/i.test(food.description)],
    ["broccoli", (food: NormalizedFood) => /^broccoli\b/i.test(food.description)],
  ] as const;

  for (const [query, matcher] of cases) {
    test(`searches real USDA records for ${query}`, () => {
      const expected = realIndex.find(matcher);
      assert.ok(expected, `No real USDA record matched ${query}.`);
      const response = realTools.searchFoods({ query, limit: 10 });
      assert.ok("results" in response);
      assert.ok(response.results.some((result) => result.fdcId === expected.fdcId));
      assert.equal(realTools.getFood({ fdcId: expected.fdcId }), expected);
    });
  }
}
