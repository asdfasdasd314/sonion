import assert from "node:assert/strict";
import test from "node:test";

import { aggregateDailyMacros, aggregateMealMacros } from "../lib/nutrition/meals";
import {
  ACTIVITY_MULTIPLIERS,
  calculateNutritionTargets,
  FIBER_GRAMS_PER_1000_CALORIES,
  roundNutritionValue,
  validateNutritionTargetInput,
} from "../lib/nutrition/targets";
import {
  NutritionTargetSaveBodySchema,
  NutritionTargetsSchema,
  parseSavedNutritionTargetResponse,
  SavedNutritionTargetResponseSchema,
} from "../lib/nutrition/target-history";
import type { Meal } from "../lib/nutrition/types";

const sampleMeal: Meal = {
  id: "sample",
  date: "2026-08-20",
  time: "12:00 PM",
  foods: [
    { id: "one", name: "One", fdcId: 1, portionUnits: 1, portionKind: "solid", estimatedMilliliters: 150, estimatedGrams: 100, densitySource: { type: "fallback", gramsPerMilliliter: 0.75, portionKind: "solid" }, macros: { calories: 100, protein: 10, fat: 2, carbohydrates: 12, fiber: 3 } },
    { id: "two", name: "Two", fdcId: 2, portionUnits: 1, portionKind: "solid", estimatedMilliliters: 150, estimatedGrams: 100, densitySource: { type: "fallback", gramsPerMilliliter: 0.75, portionKind: "solid" }, macros: { calories: 250, protein: 20, fat: 8, carbohydrates: 30, fiber: 5 } },
  ],
};

test("aggregates food and daily macro totals", () => {
  assert.deepEqual(aggregateMealMacros(sampleMeal), { calories: 350, protein: 30, fat: 10, carbohydrates: 42, fiber: 8 });
  assert.deepEqual(aggregateDailyMacros([sampleMeal, sampleMeal]), { calories: 700, protein: 60, fat: 20, carbohydrates: 84, fiber: 16 });
});

test("sums known nullable nutrients while keeping a nutrient null when no value exists", () => {
  const mealWithMissingNutrients: Meal = {
    ...sampleMeal,
    id: "nullable",
    foods: [{ ...sampleMeal.foods[0], macros: { calories: null, protein: 4, fat: null, carbohydrates: null, fiber: null } }],
  };
  assert.deepEqual(aggregateMealMacros(mealWithMissingNutrients), { calories: null, protein: 4, fat: null, carbohydrates: null, fiber: null });
  assert.deepEqual(aggregateDailyMacros([mealWithMissingNutrients, sampleMeal]), { calories: 350, protein: 34, fat: 10, carbohydrates: 42, fiber: 8 });
});

test("uses activity range midpoints and weekly percentage changes", () => {
  assert.deepEqual(ACTIVITY_MULTIPLIERS, {
    sedentary: 1.2,
    "lightly-active": 1.4,
    "moderately-active": 1.575,
    "very-active": 1.8,
  });

  const result = calculateNutritionTargets({ weightLb: 176.36981, heightIn: 70.86614, age: 30, activityLevel: "moderately-active", goal: "cut", weeklyChange: 1, weeklyChangeUnit: "percent" });
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.ok(Math.abs(result.targets.bmr - 1780) < 0.01);
  assert.ok(Math.abs(result.targets.tdee - 2803.5) < 0.01);
  assert.ok(Math.abs(result.targets.weeklyChangePounds + 1.7636981) < 0.01);
  assert.ok(Math.abs(result.targets.dailyCalorieAdjustment + 881.84905) < 0.01);
  assert.ok(Math.abs(result.targets.targetCalories - 1921.65095) < 0.01);
  assert.ok(Math.abs(result.targets.proteinGrams - 160) < 0.01);
  assert.ok(Math.abs(result.targets.fatGrams - 64) < 0.01);
  assert.ok(Math.abs(result.targets.fiberGrams - 26.9031133) < 0.0000001);
  assert.equal(result.targets.fiberGrams, result.targets.targetCalories * FIBER_GRAMS_PER_1000_CALORIES / 1000);
});

test("uses pounds per week for a bulk", () => {
  const result = calculateNutritionTargets({ weightLb: 176, heightIn: 71, age: 30, activityLevel: "sedentary", goal: "bulk", weeklyChange: 0.5, weeklyChangeUnit: "pounds" });
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.targets.weeklyChangePounds, 0.5);
  assert.equal(result.targets.dailyCalorieAdjustment, 250);
});

test("uses maintenance calories directly for maintain", () => {
  const result = calculateNutritionTargets({ weightLb: 176, heightIn: 71, age: 30, activityLevel: "sedentary", goal: "maintain" });
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.targets.targetCalories, result.targets.tdee);
  assert.equal(result.targets.weeklyChangePounds, 0);
  assert.equal(result.targets.dailyCalorieAdjustment, 0);
});

test("rounds displayed values without changing calculation precision", () => {
  assert.equal(roundNutritionValue(2416.44375), 2416);
  assert.equal(roundNutritionValue(42.6), 43);
  assert.equal(roundNutritionValue(26.9031133), 27);
});

test("requires fiber in new target snapshots and derives it for legacy responses", () => {
  const targetSnapshot = {
    bmr: 1800,
    tdee: 2520,
    targetCalories: 2416.44375,
    weeklyChangePounds: 0,
    dailyCalorieAdjustment: 0,
    proteinGrams: 160,
    fatGrams: 64,
    carbohydratesGrams: 499.1109375,
    fiberGrams: 33.8302125,
    proteinCalories: 640,
    fatCalories: 576,
    remainingCalories: 1996.44375,
    hasInsufficientCalories: false,
  };
  const savedTarget = {
    user_id: "11111111-1111-4111-8111-111111111111",
    target_snapshot: targetSnapshot,
    created_at: "2026-08-21T00:00:00.000Z",
    updated_at: "2026-08-21T00:00:00.000Z",
  };
  const { fiberGrams: _fiberGrams, ...legacySnapshot } = targetSnapshot;
  const legacyResponse = { target: { ...savedTarget, target_snapshot: legacySnapshot } };

  assert.equal(NutritionTargetsSchema.safeParse(targetSnapshot).success, true);
  assert.equal(NutritionTargetSaveBodySchema.safeParse({ targets: targetSnapshot }).success, true);
  assert.equal(NutritionTargetSaveBodySchema.safeParse({ targets: legacySnapshot }).success, false);
  assert.equal(SavedNutritionTargetResponseSchema.safeParse(legacyResponse).success, false);

  const parsed = parseSavedNutritionTargetResponse(legacyResponse);
  assert.ok(parsed);
  assert.equal(parsed.target_snapshot.fiberGrams, targetSnapshot.targetCalories * FIBER_GRAMS_PER_1000_CALORIES / 1000);
  assert.deepEqual(parseSavedNutritionTargetResponse({ target: savedTarget }), savedTarget);
});

test("reports required, non-positive, and impossible inputs", () => {
  const errors = validateNutritionTargetInput({ weightLb: 0, heightIn: 118, age: 8 });
  assert.equal(errors.weightLb, "Use a body weight between 1 and 1,102 lb.");
  assert.equal(errors.heightIn, "Use a height between 19.7 and 98.4 inches.");
  assert.equal(errors.age, "Use an age between 13 and 120 years.");
  assert.equal(errors.activityLevel, "Choose an activity level.");
  assert.equal(errors.goal, "Choose a goal.");

  const changeErrors = validateNutritionTargetInput({ weightLb: 180, heightIn: 70, age: 30, activityLevel: "sedentary", goal: "cut" });
  assert.equal(changeErrors.weeklyChange, "Enter a weekly body weight change greater than 0.");
});

test("flags insufficient remaining calories for carbohydrates", () => {
  const result = calculateNutritionTargets({ weightLb: 2.2, heightIn: 19.7, age: 120, activityLevel: "sedentary", goal: "cut", weeklyChange: 100, weeklyChangeUnit: "percent" });
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.targets.hasInsufficientCalories, true);
  assert.ok(result.targets.remainingCalories < 0);
  assert.equal(result.targets.carbohydratesGrams, 0);
});
