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

  const result = calculateNutritionTargets({ weightLb: 176.36981, heightIn: 70.86614, age: 30, activityLevel: "moderately-active", goal: "cut" });
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.ok(Math.abs(result.targets.bmr - 1780) < 0.01);
  assert.ok(Math.abs(result.targets.tdee - 2803.5) < 0.01);
  assert.ok(Math.abs(result.targets.targetCalories - 2382.975) < 0.01);
  assert.ok(Math.abs(result.targets.proteinGrams - 160) < 0.01);
  assert.ok(Math.abs(result.targets.fatGrams - 64) < 0.01);
});

test("rounds displayed values without changing calculation precision", () => {
  assert.equal(roundNutritionValue(2416.44375), 2416);
  assert.equal(roundNutritionValue(42.6), 43);
});

test("reports required, non-positive, and impossible inputs", () => {
  const errors = validateNutritionTargetInput({ weightLb: 0, heightIn: 118, age: 8, activityLevel: "", goal: "" });
  assert.equal(errors.weightLb, "Use a body weight between 1 and 1,102 lb.");
  assert.equal(errors.heightIn, "Use a height between 19.7 and 98.4 inches.");
  assert.equal(errors.age, "Use an age between 13 and 120 years.");
  assert.equal(errors.activityLevel, "Choose an activity level.");
  assert.equal(errors.goal, "Choose a goal.");
});

test("flags insufficient remaining calories for carbohydrates", () => {
  const result = calculateNutritionTargets({ weightLb: 2.2, heightIn: 19.7, age: 120, activityLevel: "sedentary", goal: "cut" });
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.targets.hasInsufficientCalories, true);
  assert.ok(result.targets.remainingCalories < 0);
  assert.equal(result.targets.carbohydratesGrams, 0);
});
