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
    fiber: 0.4,
  }],
  totals: { calories: 130, protein: null, fat: 0.3, carbohydrates: 28, fiber: 0.4 },
};

const absoluteMeal = {
  entryMode: "absolute" as const,
  items: [{ name: "oatmeal", portionUnits: 1.5, portionKind: "solid" as const }],
  mealDate: "2026-08-23",
  mealTime: "08:00",
};

const percentageMeal = {
  entryMode: "percentage" as const,
  items: [
    { name: "eggs", percentage: 30, portionKind: "solid" as const },
    { name: "bread", percentage: 20, portionKind: "solid" as const },
    { name: "chicken", percentage: 15, portionKind: "solid" as const },
  ],
  solidTotalPU: 2,
  liquidTotalPU: 0,
  mealDate: "2026-08-23",
  mealTime: "08:00",
};

test("batch requests require at least one dated meal", () => {
  const empty = parseMealRequestBody({ meals: [] }, 4_000);
  assert.equal(empty.ok, false);
  if (!empty.ok) assert.match(empty.message, /at least one meal/i);

  const missingDate = parseMealRequestBody({
    meals: [{
      entryMode: "absolute",
      items: [{ name: "oatmeal", portionUnits: 1, portionKind: "solid" }],
      mealTime: "08:00",
    }],
  }, 4_000);
  assert.equal(missingDate.ok, false);
  if (!missingDate.ok) assert.match(missingDate.message, /date/i);
});

test("batch requests reject legacy free-text prompts", () => {
  const parsed = parseMealRequestBody({
    meals: [{ prompt: "oatmeal", mealDate: "2026-08-23", mealTime: "08:00" }],
  }, 4_000);
  assert.equal(parsed.ok, false);
  if (!parsed.ok) assert.match(parsed.message, /absolute or percentage|free-text/i);
});

test("batch requests parse absolute meals into composed prompts", () => {
  const parsed = parseMealRequestBody({
    meals: [
      absoluteMeal,
      {
        entryMode: "absolute",
        items: [
          { name: "chicken", portionUnits: 1, portionKind: "solid" },
          { name: "rice", portionUnits: 1.5, portionKind: "solid" },
        ],
        mealDate: "2026-08-23",
        mealTime: "12:00",
      },
    ],
  }, 4_000);
  assert.equal(parsed.ok, true);
  if (parsed.ok && parsed.kind === "batch") {
    assert.equal(parsed.meals.length, 2);
    assert.equal(parsed.meals[0]?.prompt, "1.5 PU oatmeal (solid)");
    assert.equal(parsed.meals[1]?.prompt, "1 PU chicken (solid)\n1.5 PU rice (solid)");
  }
});

test("batch requests scale percentage meals with per-kind totals", () => {
  const mixed = {
    entryMode: "percentage" as const,
    items: [
      { name: "eggs", percentage: 30, portionKind: "solid" as const },
      { name: "bread", percentage: 20, portionKind: "solid" as const },
      { name: "milk", percentage: 40, portionKind: "liquid" as const },
      { name: "juice", percentage: 10, portionKind: "liquid" as const },
    ],
    solidTotalPU: 2,
    liquidTotalPU: 1,
    mealDate: "2026-08-23",
    mealTime: "13:00",
  };
  const parsed = parseMealRequestBody({ meals: [percentageMeal, mixed] }, 4_000);
  assert.equal(parsed.ok, true);
  if (parsed.ok && parsed.kind === "batch") {
    assert.match(parsed.meals[0]!.prompt, /PU eggs \(solid\)/);
    assert.match(parsed.meals[0]!.prompt, /PU bread \(solid\)/);
    assert.match(parsed.meals[0]!.prompt, /PU chicken \(solid\)/);
    assert.match(parsed.meals[1]!.prompt, /PU milk \(liquid\)/);
    assert.match(parsed.meals[1]!.prompt, /PU juice \(liquid\)/);
  }
});

test("batch requests reject invalid percentage payloads", () => {
  const missingTotal = parseMealRequestBody({
    meals: [{
      entryMode: "percentage",
      items: [{ name: "eggs", percentage: 30, portionKind: "solid" }],
      solidTotalPU: 0,
      liquidTotalPU: 0,
      mealDate: "2026-08-23",
      mealTime: "08:00",
    }],
  }, 4_000);
  assert.equal(missingTotal.ok, false);
  if (!missingTotal.ok) assert.match(missingTotal.message, /solid total/i);

  const badPercentage = parseMealRequestBody({
    meals: [{
      entryMode: "percentage",
      items: [{ name: "eggs", percentage: 0, portionKind: "solid" }],
      solidTotalPU: 1,
      liquidTotalPU: 0,
      mealDate: "2026-08-23",
      mealTime: "08:00",
    }],
  }, 4_000);
  assert.equal(badPercentage.ok, false);
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

test("refinement previousEstimate accepts legacy snapshots that omit fiber", () => {
  const legacyEstimate = {
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
  const parsed = parseMealRequestBody({
    refinement: {
      mealId: "22222222-2222-4222-8222-222222222222",
      instruction: "use whole milk",
      previousEstimate: legacyEstimate,
      mealDate: "2026-08-23",
      mealTime: "08:15",
    },
  }, 4_000);
  assert.equal(parsed.ok, true);
  if (parsed.ok && parsed.kind === "refinement") {
    assert.equal(parsed.refinement.previousEstimate.items[0]?.fiber, null);
    assert.equal(parsed.refinement.previousEstimate.totals.fiber, null);
  }
});

test("batch and refinement modes cannot be combined", () => {
  const parsed = parseMealRequestBody({
    meals: [absoluteMeal],
    refinement: { mealId: "22222222-2222-4222-8222-222222222222" },
  }, 4_000);
  assert.equal(parsed.ok, false);
  if (!parsed.ok) assert.match(parsed.message, /either/i);
});
