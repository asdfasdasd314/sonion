import { test } from "node:test";
import assert from "node:assert/strict";

import { applyMealRevision, MealRevisionError } from "../lib/meal-revision/apply";
import type { MealEstimate } from "../lib/meal-estimation/types";
import type { MealRevision } from "../lib/meal-revision/types";

const estimate: MealEstimate = {
  items: [
    {
      foodName: "white rice",
      fdcId: 1,
      portionUnits: 1,
      portionKind: "solid",
      estimatedMilliliters: 180,
      estimatedGrams: 150,
      densitySource: { type: "fallback", gramsPerMilliliter: 0.75, portionKind: "solid" },
      calories: 200,
      protein: 4,
      fat: 1,
      carbohydrates: 40,
      fiber: 1,
    },
    {
      foodName: "chicken",
      fdcId: 2,
      portionUnits: 1,
      portionKind: "solid",
      estimatedMilliliters: 180,
      estimatedGrams: 150,
      densitySource: { type: "fallback", gramsPerMilliliter: 0.75, portionKind: "solid" },
      calories: 250,
      protein: 40,
      fat: 8,
      carbohydrates: 0,
      fiber: 0,
    },
  ],
  totals: { calories: 450, protein: 44, fat: 9, carbohydrates: 40, fiber: 1 },
};

test("replaces only the targeted item and preserves untouched items", () => {
  const revision: MealRevision = {
    updates: [{
      action: "replace",
      targetItemIndex: 0,
      targetItemName: "white rice",
      itemName: "brown rice",
      fdcId: 3,
      portionUnits: 1,
      portionKind: "solid",
      reason: "The user specified brown rice.",
    }],
    notes: "Rice changed; chicken stayed unchanged.",
  };

  assert.deepEqual(applyMealRevision(estimate, revision), {
    items: [
      { itemName: "brown rice", fdcId: 3, portionUnits: 1, portionKind: "solid" },
      { itemName: "chicken", fdcId: 2, portionUnits: 1, portionKind: "solid" },
    ],
  });
});

test("allows no-op revisions and rejects stale or empty targets", () => {
  assert.deepEqual(applyMealRevision(estimate, { updates: [], notes: "Nothing changed." }), {
    items: [
      { itemName: "white rice", fdcId: 1, portionUnits: 1, portionKind: "solid" },
      { itemName: "chicken", fdcId: 2, portionUnits: 1, portionKind: "solid" },
    ],
  });

  assert.throws(
    () => applyMealRevision(estimate, {
      updates: [{ action: "remove", targetItemIndex: 5, targetItemName: "beans", reason: "Remove it." }],
      notes: "The request could not be matched.",
    }),
    MealRevisionError,
  );
});
