import assert from "node:assert/strict";
import test from "node:test";

import { groupMealsByDate, mapMealRecordToMeal } from "../lib/meal-history/mapping";
import { canStartMealSave, saveStateAfterResponse } from "../lib/meal-history/save";
import {
  isValidLocalDate,
  isValidLocalTime,
  MealPatchBodySchema,
  MealSaveBodySchema,
  parseMealRecordList,
} from "../lib/meal-history/types";
import { getBearerToken } from "../lib/meal-history/request";

const estimate = {
  items: [{
    foodName: "Rice",
    fdcId: 1,
    portionUnits: 1,
    portionKind: "solid" as const,
    estimatedMilliliters: 150,
    estimatedGrams: 100,
    densitySource: { type: "fallback" as const, gramsPerMilliliter: 0.75, portionKind: "solid" as const },
    calories: 130,
    protein: null,
    fat: 0.3,
    carbohydrates: 28,
  }],
  totals: { calories: 130, protein: null, fat: 0.3, carbohydrates: 28 },
};

function record(id: string, date: string, time: string) {
  return {
    id,
    user_id: "11111111-1111-4111-8111-111111111111",
    meal_date: date,
    meal_time: time,
    meal_snapshot: estimate,
    created_at: "2026-08-21T00:00:00.000Z",
    updated_at: "2026-08-21T00:00:00.000Z",
  };
}

test("validates strict local date and time values", () => {
  assert.equal(isValidLocalDate("2026-02-28"), true);
  assert.equal(isValidLocalDate("2026-02-29"), false);
  assert.equal(isValidLocalDate("2026-2-1"), false);
  assert.equal(isValidLocalTime("08:05"), true);
  assert.equal(isValidLocalTime("23:59:59"), true);
  assert.equal(isValidLocalTime("24:00"), false);
  assert.equal(isValidLocalTime("8:05"), false);
});

test("validates meal-content saves and non-empty patch payloads", () => {
  assert.equal(MealSaveBodySchema.safeParse({ mealDate: "2026-08-21", mealTime: "08:05", mealSnapshot: estimate }).success, true);
  assert.equal(MealSaveBodySchema.safeParse({ mealDate: "2026-08-21", mealTime: "08:05", mealSnapshot: { items: [] } }).success, false);
  assert.equal(MealPatchBodySchema.safeParse({}).success, false);
  assert.equal(MealPatchBodySchema.safeParse({ mealTime: "12:30:00" }).success, true);
});

test("extracts only bearer tokens and maps persisted snapshots without meal titles", () => {
  const request = new Request("http://localhost", { headers: { Authorization: "Bearer access-token" } });
  assert.equal(getBearerToken(request), "access-token");
  const meal = mapMealRecordToMeal(record("22222222-2222-4222-8222-222222222222", "2026-08-21", "08:05:00"));
  assert.equal(meal.date, "2026-08-21");
  assert.equal(meal.time, "08:05:00");
  assert.equal(meal.foods[0]?.portionUnits, 1);
  assert.equal(meal.foods[0]?.macros.protein, null);
});

test("groups records by local date and orders both days and meals descending", () => {
  const days = groupMealsByDate([
    record("22222222-2222-4222-8222-222222222222", "2026-08-20", "18:00:00"),
    record("33333333-3333-4333-8333-333333333333", "2026-08-21", "08:05:00"),
    record("44444444-4444-4444-8444-444444444444", "2026-08-21", "12:30:00"),
  ]);
  assert.deepEqual(days.map((day) => day.date), ["2026-08-21", "2026-08-20"]);
  assert.deepEqual(days[0]?.meals.map((meal) => meal.time), ["12:30:00", "08:05:00"]);
});

test("rejects malformed persisted records instead of rendering unvalidated JSON", () => {
  assert.equal(parseMealRecordList({ meals: [record("not-a-uuid", "2026-08-21", "08:05:00")] }), undefined);
});

test("prevents duplicate saves and exposes explicit save-state transitions", () => {
  assert.equal(canStartMealSave(estimate, "idle"), true);
  assert.equal(canStartMealSave(estimate, "saving"), false);
  assert.equal(canStartMealSave(estimate, "saved"), false);
  assert.equal(canStartMealSave(null, "idle"), false);
  assert.equal(saveStateAfterResponse(true), "saved");
  assert.equal(saveStateAfterResponse(false), "error");
});
