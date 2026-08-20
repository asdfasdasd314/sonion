import assert from "node:assert/strict";
import test from "node:test";

import { aggregateDailyMacros, aggregateMealMacros } from "../lib/nutrition/meals";
import { ACTIVITY_MULTIPLIERS, GOAL_ADJUSTMENTS, calculateNutritionTargets, roundNutritionValue, validateNutritionTargetInput } from "../lib/nutrition/targets";
import type { Meal } from "../lib/nutrition/types";

const sampleMeal: Meal = {
  id: "sample",
  name: "Sample",
  time: "12:00 PM",
  foods: [
    { id: "one", name: "One", macros: { calories: 100, protein: 10, fat: 2, carbohydrates: 12 } },
    { id: "two", name: "Two", macros: { calories: 250, protein: 20, fat: 8, carbohydrates: 30 } },
  ],
};

test("aggregates food and daily macro totals", () => {
  assert.deepEqual(aggregateMealMacros(sampleMeal), { calories: 350, protein: 30, fat: 10, carbohydrates: 42 });
  assert.deepEqual(aggregateDailyMacros([sampleMeal, sampleMeal]), { calories: 700, protein: 60, fat: 20, carbohydrates: 84 });
});

test("uses activity range midpoints and goal adjustments", () => {
  assert.deepEqual(ACTIVITY_MULTIPLIERS, {
    sedentary: 1.2,
    "lightly-active": 1.4,
    "moderately-active": 1.575,
    "very-active": 1.8,
  });
  assert.deepEqual(GOAL_ADJUSTMENTS, { maintain: 0, cut: -0.15, bulk: 0.1 });

  const result = calculateNutritionTargets({ weightKg: 80, heightCm: 180, age: 30, activityLevel: "moderately-active", goal: "cut" });
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.targets.bmr, 1805);
  assert.equal(result.targets.tdee, 2842.875);
  assert.equal(result.targets.targetCalories, 2416.44375);
  assert.equal(result.targets.proteinGrams, 160);
  assert.equal(result.targets.fatGrams, 64);
});

test("rounds displayed values without changing calculation precision", () => {
  assert.equal(roundNutritionValue(2416.44375), 2416);
  assert.equal(roundNutritionValue(42.6), 43);
});

test("reports required, non-positive, and impossible inputs", () => {
  const errors = validateNutritionTargetInput({ weightKg: 0, heightCm: 300, age: 8, activityLevel: "", goal: "" });
  assert.equal(errors.weightKg, "Use a body weight between 1 and 500 kg.");
  assert.equal(errors.heightCm, "Use a height between 50 and 250 cm.");
  assert.equal(errors.age, "Use an age between 13 and 120 years.");
  assert.equal(errors.activityLevel, "Choose an activity level.");
  assert.equal(errors.goal, "Choose a goal.");
});

test("flags insufficient remaining calories for carbohydrates", () => {
  const result = calculateNutritionTargets({ weightKg: 500, heightCm: 50, age: 120, activityLevel: "sedentary", goal: "cut" });
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.targets.hasInsufficientCalories, true);
  assert.ok(result.targets.remainingCalories < 0);
  assert.equal(result.targets.carbohydratesGrams, 0);
});
