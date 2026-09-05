import assert from "node:assert/strict";
import test from "node:test";

import {
  buildMealPromptFromAbsoluteItems,
  composeAbsoluteMealPrompt,
  composePercentageMealPrompt,
  scalePercentagesToPortionUnits,
} from "../lib/meal-batch/proportions";

test("scales imperfect solid percentages by their kind sum", () => {
  const scaled = scalePercentagesToPortionUnits(
    [
      { name: "eggs", percentage: 30, portionKind: "solid" },
      { name: "bread", percentage: 20, portionKind: "solid" },
      { name: "chicken", percentage: 15, portionKind: "solid" },
    ],
    2,
    0,
  );
  assert.equal(scaled.ok, true);
  if (!scaled.ok) return;
  assert.equal(scaled.items.length, 3);
  assert.ok(almostEqual(scaled.items[0]!.portionUnits, (30 / 65) * 2));
  assert.ok(almostEqual(scaled.items[1]!.portionUnits, (20 / 65) * 2));
  assert.ok(almostEqual(scaled.items[2]!.portionUnits, (15 / 65) * 2));
  assert.equal(scaled.items.every((item) => item.portionKind === "solid"), true);
});

test("scales solid-only and liquid-only meals independently", () => {
  const solids = scalePercentagesToPortionUnits(
    [
      { name: "eggs", percentage: 0.5, portionKind: "solid" },
      { name: "bananas", percentage: 0.25, portionKind: "solid" },
      { name: "fruit", percentage: 0.25, portionKind: "solid" },
    ],
    1.6,
    0,
  );
  assert.equal(solids.ok, true);
  if (solids.ok) {
    assert.ok(almostEqual(solids.items[0]!.portionUnits, 0.8));
    assert.ok(almostEqual(solids.items[1]!.portionUnits, 0.4));
    assert.ok(almostEqual(solids.items[2]!.portionUnits, 0.4));
  }

  const liquids = scalePercentagesToPortionUnits(
    [
      { name: "milk", percentage: 75, portionKind: "liquid" },
      { name: "coffee", percentage: 25, portionKind: "liquid" },
    ],
    0,
    2,
  );
  assert.equal(liquids.ok, true);
  if (liquids.ok) {
    assert.ok(almostEqual(liquids.items[0]!.portionUnits, 1.5));
    assert.ok(almostEqual(liquids.items[1]!.portionUnits, 0.5));
  }
});

test("normalizes mixed solid and liquid percentages with independent denominators", () => {
  const scaled = scalePercentagesToPortionUnits(
    [
      { name: "eggs", percentage: 30, portionKind: "solid" },
      { name: "bread", percentage: 20, portionKind: "solid" },
      { name: "milk", percentage: 40, portionKind: "liquid" },
      { name: "juice", percentage: 10, portionKind: "liquid" },
    ],
    2,
    1,
  );
  assert.equal(scaled.ok, true);
  if (!scaled.ok) return;
  assert.ok(almostEqual(scaled.items[0]!.portionUnits, (30 / 50) * 2));
  assert.ok(almostEqual(scaled.items[1]!.portionUnits, (20 / 50) * 2));
  assert.ok(almostEqual(scaled.items[2]!.portionUnits, (40 / 50) * 1));
  assert.ok(almostEqual(scaled.items[3]!.portionUnits, (10 / 50) * 1));
});

test("rejects non-positive percentages and missing kind totals", () => {
  assert.equal(
    scalePercentagesToPortionUnits([{ name: "eggs", percentage: 0, portionKind: "solid" }], 1, 0).ok,
    false,
  );
  assert.equal(
    scalePercentagesToPortionUnits([{ name: "eggs", percentage: -5, portionKind: "solid" }], 1, 0).ok,
    false,
  );
  assert.equal(
    scalePercentagesToPortionUnits([{ name: "eggs", percentage: Number.NaN, portionKind: "solid" }], 1, 0).ok,
    false,
  );
  assert.equal(
    scalePercentagesToPortionUnits([{ name: "eggs", percentage: 30, portionKind: "solid" }], 0, 0).ok,
    false,
  );
  assert.equal(
    scalePercentagesToPortionUnits([{ name: "milk", percentage: 50, portionKind: "liquid" }], 0, 0).ok,
    false,
  );
});

test("compose helpers build stable absolute prompts and validate absolute mode", () => {
  const absolute = composeAbsoluteMealPrompt(
    [
      { name: " eggs ", portionUnits: 0.8, portionKind: "solid" },
      { name: "milk", portionUnits: 1.25, portionKind: "liquid" },
    ],
    20,
  );
  assert.equal(absolute.ok, true);
  if (absolute.ok) {
    assert.equal(absolute.prompt, "0.8 PU eggs (solid)\n1.25 PU milk (liquid)");
    assert.equal(buildMealPromptFromAbsoluteItems(absolute.items), absolute.prompt);
  }

  const percentage = composePercentageMealPrompt(
    [
      { name: "eggs", percentage: 30, portionKind: "solid" },
      { name: "bread", percentage: 20, portionKind: "solid" },
      { name: "chicken", percentage: 15, portionKind: "solid" },
    ],
    2,
    0,
    20,
  );
  assert.equal(percentage.ok, true);
  if (percentage.ok) {
    assert.match(percentage.prompt, /PU eggs \(solid\)/);
    assert.match(percentage.prompt, /PU bread \(solid\)/);
    assert.match(percentage.prompt, /PU chicken \(solid\)/);
  }

  assert.equal(composeAbsoluteMealPrompt([{ name: "eggs", portionUnits: 0, portionKind: "solid" }], 20).ok, false);
  assert.equal(
    composePercentageMealPrompt([{ name: "eggs", percentage: 10, portionKind: "solid" }], 0, 0, 20).ok,
    false,
  );
});

function almostEqual(actual: number, expected: number, epsilon = 1e-10): boolean {
  return Math.abs(actual - expected) <= epsilon;
}
