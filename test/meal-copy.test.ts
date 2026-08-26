import assert from "node:assert/strict";
import test from "node:test";

import {
  cloneMealSnapshot,
  createMealCopyDraft,
  currentLocalMealDateTime,
  MEAL_COPY_REVISION_REQUIRED_BEFORE_SAVE,
  MEAL_COPY_SAVE_METHOD,
} from "../lib/meal-copy/draft";
import type { MealRecord } from "../lib/meal-history/types";

const estimate = {
  items: [{
    foodName: "Oatmeal",
    fdcId: 42,
    portionUnits: 1.5,
    portionKind: "solid" as const,
    estimatedMilliliters: 225,
    estimatedGrams: 150,
    densitySource: { type: "fallback" as const, gramsPerMilliliter: 0.75, portionKind: "solid" as const },
    calories: 220,
    protein: 8,
    fat: 4,
    carbohydrates: 38,
    fiber: 4,
  }],
  totals: { calories: 220, protein: 8, fat: 4, carbohydrates: 38, fiber: 4 },
};

const source: MealRecord = {
  id: "22222222-2222-4222-8222-222222222222",
  user_id: "11111111-1111-4111-8111-111111111111",
  meal_date: "2026-08-01",
  meal_time: "08:15:00",
  meal_snapshot: estimate,
  created_at: "2026-08-01T12:00:00.000Z",
  updated_at: "2026-08-01T12:00:00.000Z",
};

test("formats the current local meal date and time as save-ready strings", () => {
  const stamp = currentLocalMealDateTime(new Date(2026, 7, 23, 16, 48));
  assert.equal(stamp.mealDate, "2026-08-23");
  assert.equal(stamp.mealTime, "16:48");
});

test("builds a copy draft with cloned attributes and now defaults", () => {
  const draft = createMealCopyDraft(source, new Date(2026, 7, 23, 16, 48));
  assert.equal(draft.sourceMealId, source.id);
  assert.equal(draft.sourceMealDate, "2026-08-01");
  assert.equal(draft.sourceMealTime, "08:15:00");
  assert.equal(draft.mealDate, "2026-08-23");
  assert.equal(draft.mealTime, "16:48");
  assert.equal(draft.mealSnapshot.items[0]?.foodName, "Oatmeal");
  assert.equal(draft.mealSnapshot.items[0]?.portionUnits, 1.5);
  assert.equal(draft.mealSnapshot.totals.calories, 220);
});

test("isolates the copied snapshot from later mutations to the source estimate", () => {
  const draft = createMealCopyDraft(source, new Date(2026, 7, 23, 9, 0));
  draft.mealSnapshot.items[0]!.portionUnits = 9;
  draft.mealSnapshot.totals.calories = 999;
  assert.equal(source.meal_snapshot.items[0]?.portionUnits, 1.5);
  assert.equal(source.meal_snapshot.totals.calories, 220);

  const cloned = cloneMealSnapshot(source.meal_snapshot);
  cloned.items[0]!.foodName = "Changed";
  assert.equal(source.meal_snapshot.items[0]?.foodName, "Oatmeal");
});

test("keeps copy-save contract values aligned with the parameter file", () => {
  assert.equal(MEAL_COPY_REVISION_REQUIRED_BEFORE_SAVE, false);
  assert.equal(MEAL_COPY_SAVE_METHOD, "post-new-record");
});
