import { test } from "node:test";
import assert from "node:assert/strict";

import { runMealAgent } from "../lib/agent/runner";
import { formatResult, formatToolCall } from "../lib/agent/protocol";
import { createFoodToolRegistry } from "../lib/food-data/tools";
import type { NormalizedFood } from "../lib/food-data/types";

const fixtureIndex: NormalizedFood[] = [
  {
    fdcId: 10,
    description: "Chicken breast, roasted",
    dataset: "fndds",
    nutrientsPer100g: { proteinG: 31 },
    portions: [{ description: "1 piece", gramWeight: 140 }],
  },
];

test("runs search, lookup, and final result without exposing arbitrary capabilities", async () => {
  const tools = createFoodToolRegistry(fixtureIndex);
  const outputs = [
    formatToolCall("searchFoods", { query: "chicken", limit: 1 }),
    formatToolCall("getFood", { fdcId: 10 }),
    formatResult("Roasted chicken breast was described; the portion remains approximate."),
  ];
  const requests: string[] = [];

  const result = await runMealAgent({
    mealPrompt: "one scoop of roasted chicken",
    tools,
    generate: async ({ systemInstruction, contents }) => {
      requests.push(systemInstruction + "\n" + contents);
      return outputs.shift() ?? formatResult("missing mocked output");
    },
    limits: { deadlineMs: 1_000 },
  });

  assert.equal(result, "Roasted chicken breast was described; the portion remains approximate.");
  assert.equal(requests.length, 3);
  assert.match(requests[0] ?? "", /<sonion-user-meal>/);
  assert.match(requests[1] ?? "", /<sonion-tool-results>/);
  assert.match(requests[2] ?? "", /fdcId/);
  assert.match(requests[0] ?? "", /Do not use paths, files/);
});

test("returns a bounded correction when arguments fail strict validation", async () => {
  const tools = createFoodToolRegistry(fixtureIndex);
  const requests: string[] = [];
  let turn = 0;

  const result = await runMealAgent({
    mealPrompt: "chicken",
    tools,
    generate: async ({ contents }) => {
      requests.push(contents);
      turn += 1;
      return turn === 1
        ? formatToolCall("searchFoods", { query: "chicken", unsupported: true })
        : formatResult("Chicken was identified; the exact portion is uncertain.");
    },
    limits: { deadlineMs: 1_000 },
  });

  assert.equal(result, "Chicken was identified; the exact portion is uncertain.");
  assert.match(requests[1] ?? "", /INVALID_TOOL_ARGUMENTS/);
  assert.match(requests[1] ?? "", /arguments\.unsupported/);
});

test("never executes a strict-registry call with unknown, missing, or invalid arguments", () => {
  const tools = createFoodToolRegistry(fixtureIndex);

  assert.deepEqual(tools.searchFoods.execute({ query: "chicken", unknown: true }), {
    error: "INVALID_ARGUMENTS",
    message: "Invalid food tool arguments.",
  });
  assert.deepEqual(tools.searchFoods.execute({ query: "chicken", limit: 11 }), {
    error: "INVALID_ARGUMENTS",
    message: "Invalid food tool arguments.",
  });
  assert.deepEqual(tools.getFood.execute({}), {
    error: "INVALID_ARGUMENTS",
    message: "Invalid food tool arguments.",
  });
});
