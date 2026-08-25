import assert from "node:assert/strict";
import test from "node:test";

import { parseMealRequestBody } from "../lib/meal-batch/request";

const estimate = {
  items: [{
    foodName: "Rice",
    fdcId: 1,
    portionUnits: 1,
    portionKind: "solid",
    estimatedMilliliters: 150,
    estimatedGrams: 100,
    densitySource: { type: "fallback", gramsPerMilliliter: 0.75, portionKind: "solid" },
    calories: 130,
    protein: null,
    fat: 0.3,
    carbohydrates: 28,
  }],
  totals: { calories: 130, protein: null, fat: 0.3, carbohydrates: 28 },
};

const baseMeal = { prompt: "oatmeal", mealDate: "2026-08-23", mealTime: "08:00" };

test("batch requests require at least one dated meal", () => {
  const empty = parseMealRequestBody({ meals: [] }, 4_000);
  assert.equal(empty.ok, false);
  if (!empty.ok) assert.match(empty.message, /at least one meal/i);

  const missingDate = parseMealRequestBody({ meals: [{ prompt: "oatmeal", mealTime: "08:00" }] }, 4_000);
  assert.equal(missingDate.ok, false);
  if (!missingDate.ok) assert.match(missingDate.message, /date/i);
});

test("batch requests parse multiple descriptions without model output fields", () => {
  const parsed = parseMealRequestBody({ meals: [baseMeal, { ...baseMeal, prompt: "chicken and rice", mealTime: "12:00" }] }, 4_000);
  assert.equal(parsed.ok, true);
  if (parsed.ok && parsed.kind === "batch") {
    assert.equal(parsed.meals.length, 2);
    assert.equal(parsed.meals[1]?.prompt, "chicken and rice");
  }
});

test("refinement requests validate the saved meal context and date/time", () => {
  const parsed = parseMealRequestBody({
    refinement: {
      mealId: "22222222-2222-4222-8222-222222222222",
      instruction: "use whole milk",
      previousEstimate: estimate,
      mealDate: "2026-08-23",
      mealTime: "08:15",
    },
  }, 4_000);
  assert.equal(parsed.ok, true);
  if (parsed.ok && parsed.kind === "refinement") {
    assert.equal(parsed.refinement.mealId, "22222222-2222-4222-8222-222222222222");
    assert.equal(parsed.refinement.mealTime, "08:15");
  }
});

test("batch and refinement modes cannot be combined", () => {
  const parsed = parseMealRequestBody({
    meals: [baseMeal],
    refinement: { mealId: "22222222-2222-4222-8222-222222222222" },
  }, 4_000);
  assert.equal(parsed.ok, false);
  if (!parsed.ok) assert.match(parsed.message, /either/i);
});
