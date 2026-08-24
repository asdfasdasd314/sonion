import assert from "node:assert/strict";
import test from "node:test";

import { parseEstimateRequestBody } from "../lib/meal-estimation/autosave-request";

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

test("auto-save requires meal date and time", () => {
  const missingDate = parseEstimateRequestBody({
    prompt: "oatmeal",
    saveAfterInterpret: true,
    mealTime: "08:00",
  }, 4_000);
  assert.equal(missingDate.ok, false);
  if (!missingDate.ok) assert.match(missingDate.message, /meal date/i);

  const missingTime = parseEstimateRequestBody({
    prompt: "oatmeal",
    saveAfterInterpret: true,
    mealDate: "2026-08-23",
  }, 4_000);
  assert.equal(missingTime.ok, false);
  if (!missingTime.ok) assert.match(missingTime.message, /meal time/i);
});

test("auto-save rejects revision combinations", () => {
  const parsed = parseEstimateRequestBody({
    prompt: "chicken and rice",
    saveAfterInterpret: true,
    mealDate: "2026-08-23",
    mealTime: "12:00",
    revision: { instruction: "more rice", previousEstimate: estimate },
  }, 4_000);
  assert.equal(parsed.ok, false);
  if (!parsed.ok) assert.match(parsed.message, /cannot be combined with a revision/i);
});

test("sync path remains available without saveAfterInterpret", () => {
  const parsed = parseEstimateRequestBody({ prompt: "eggs and toast" }, 4_000);
  assert.equal(parsed.ok, true);
  if (parsed.ok) {
    assert.equal(parsed.saveAfterInterpret, false);
    assert.equal(parsed.prompt, "eggs and toast");
  }
});

test("auto-save parses a valid queued request", () => {
  const parsed = parseEstimateRequestBody({
    prompt: "two eggs",
    saveAfterInterpret: true,
    mealDate: "2026-08-23",
    mealTime: "08:15",
  }, 4_000);
  assert.equal(parsed.ok, true);
  if (parsed.ok && parsed.saveAfterInterpret) {
    assert.equal(parsed.mealDate, "2026-08-23");
    assert.equal(parsed.mealTime, "08:15");
  }
});
