import { test } from "node:test";
import assert from "node:assert/strict";

import {
  estimateMeal,
  parseMealEstimate,
  parseMealSelection,
  type MealEstimationParameters,
} from "../lib/meal-estimation";
import type { NormalizedFood } from "../lib/food-data/types";

const parameters: MealEstimationParameters = {
  portionUnitMilliliters: { solid: 150, liquid: 250 },
  fallbackDensityGramsPerMilliliter: { solid: 0.75, liquid: 1 },
};

const foods: NormalizedFood[] = [
  {
    fdcId: 1,
    description: "Rice, cooked",
    dataset: "fndds",
    nutrientsPer100g: { caloriesKcal: 130, proteinG: 2.7, fatG: 0.3, carbohydratesG: 28, fiberG: 0.4 },
    portions: [{ description: "1 cup", gramWeight: 195, volumeMl: 240, densityGPerMl: 195 / 240 }],
  },
  {
    fdcId: 2,
    description: "Apple juice",
    dataset: "fndds",
    nutrientsPer100g: { caloriesKcal: 46, proteinG: 0.1, fatG: 0.1 },
    portions: [],
  },
  {
    fdcId: 3,
    description: "Food with macro-only calories",
    dataset: "foundation",
    nutrientsPer100g: { proteinG: 10, fatG: 5, carbohydratesG: 20 },
    portions: [],
  },
  {
    fdcId: 4,
    description: "Food without calorie data",
    dataset: "foundation",
    nutrientsPer100g: {},
    portions: [],
  },
];

test("validates positive finite Portion Units and solid/liquid kinds", () => {
  assert.ok(parseMealSelection({ items: [{ itemName: "rice", fdcId: 1, portionUnits: 1, portionKind: "solid" }] }));
  assert.equal(parseMealSelection({ items: [] }), undefined);
  assert.equal(parseMealSelection({ items: [{ itemName: "rice", fdcId: 1, portionUnits: 0, portionKind: "solid" }] }), undefined);
  assert.equal(parseMealSelection({ items: [{ itemName: "juice", fdcId: 2, portionUnits: 1, portionKind: "beverage" }] }), undefined);
});

test("converts additive solid and liquid Portion Units, scales nutrients, and uses USDA density", () => {
  const estimate = estimateMeal({
    items: [
      { itemName: "rice", fdcId: 1, portionUnits: 1.5, portionKind: "solid" },
      { itemName: "juice", fdcId: 2, portionUnits: 2, portionKind: "liquid" },
    ],
  }, foods, parameters);

  assert.equal(estimate.items[0]?.estimatedMilliliters, 225);
  assert.equal(estimate.items[0]?.estimatedGrams, 182.8125);
  assert.equal(estimate.items[0]?.densitySource.type, "usda");
  assert.equal(estimate.items[0]?.calories, 237.65625);
  assert.equal(estimate.items[0]?.fiber, 0.73125);
  assert.equal(estimate.items[1]?.estimatedMilliliters, 500);
  assert.equal(estimate.items[1]?.estimatedGrams, 500);
  assert.deepEqual(estimate.items[1]?.densitySource, {
    type: "fallback",
    gramsPerMilliliter: 1,
    portionKind: "liquid",
  });
  assert.equal(estimate.items[1]?.carbohydrates, null);
  assert.equal(estimate.items[1]?.fiber, null);
  assert.equal(estimate.totals.carbohydrates, null);
  assert.equal(estimate.totals.fiber, null);
  assert.equal(estimate.totals.calories, 467.65625);
});

test("derives missing item calories from protein, fat, and carbohydrates", () => {
  const estimate = estimateMeal({
    items: [{ itemName: "macro-only food", fdcId: 3, portionUnits: 1, portionKind: "solid" }],
  }, foods, parameters);

  assert.equal(estimate.items[0]?.estimatedGrams, 112.5);
  assert.equal(estimate.items[0]?.calories, 185.625);
  assert.equal(estimate.items[0]?.fiber, null);
  assert.equal(estimate.totals.calories, 185.625);
  assert.equal(estimate.totals.fiber, null);
});

test("keeps calculable calorie totals when another item has no calorie data", () => {
  const estimate = estimateMeal({
    items: [
      { itemName: "rice", fdcId: 1, portionUnits: 1, portionKind: "solid" },
      { itemName: "unknown calories", fdcId: 4, portionUnits: 1, portionKind: "solid" },
    ],
  }, foods, parameters);

  assert.equal(estimate.items[1]?.calories, null);
  assert.equal(estimate.items[1]?.fiber, null);
  assert.equal(estimate.totals.calories, 158.4375);
  assert.equal(estimate.totals.fiber, null);
});

test("rejects unknown FDC IDs and preserves the stable response schema", () => {
  assert.throws(
    () => estimateMeal({ items: [{ itemName: "unknown", fdcId: 999, portionUnits: 1, portionKind: "solid" }] }, foods, parameters),
    /authoritative USDA index/,
  );

  const estimate = estimateMeal({ items: [{ itemName: "rice", fdcId: 1, portionUnits: 1, portionKind: "solid" }] }, foods, parameters);
  assert.deepEqual(parseMealEstimate(estimate), estimate);
  assert.equal(parseMealEstimate({ items: estimate.items }), undefined);
});

test("normalizes legacy snapshots that omit fiber to null on parse", () => {
  const legacy = {
    items: [{
      foodName: "Rice, cooked",
      fdcId: 1,
      portionUnits: 1,
      portionKind: "solid",
      estimatedMilliliters: 150,
      estimatedGrams: 121.875,
      densitySource: { type: "fallback", gramsPerMilliliter: 0.75, portionKind: "solid" },
      calories: 158.4375,
      protein: 3.290625,
      fat: 0.365625,
      carbohydrates: 34.125,
    }],
    totals: { calories: 158.4375, protein: 3.290625, fat: 0.365625, carbohydrates: 34.125 },
  };

  const parsed = parseMealEstimate(legacy);
  assert.ok(parsed);
  assert.equal(parsed.items[0]?.fiber, null);
  assert.equal(parsed.totals.fiber, null);
});
