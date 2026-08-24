import assert from "node:assert/strict";
import test from "node:test";

import {
  buildInterpretationErrorInsert,
  mapInterpretationFailure,
  truncateText,
} from "../lib/interpretation-errors";
import { AgentRunnerError } from "../lib/agent/runner";
import { MealEstimationError } from "../lib/meal-estimation";
import { SupabaseMealError } from "../lib/meal-history/supabase";
import { mealListFingerprint } from "../lib/nutrition/dashboard-poll";

test("truncateText bounds stored prompts and diagnostics", () => {
  assert.equal(truncateText("short", 10), "short");
  assert.equal(truncateText("abcdefghijk", 8).endsWith("…"), true);
  assert.ok(truncateText("abcdefghijk", 8).length <= 8);
});

test("mapInterpretationFailure maps agent, estimation, and save errors", () => {
  const agent = mapInterpretationFailure(
    new AgentRunnerError("MODEL_OUTPUT_INVALID", "bad json", {
      diagnostics: [{
        code: "EMPTY_RESULT",
        message: "required",
        fieldPath: "items",
      }],
      modelOutput: '{"nope":true}',
    }),
  );
  assert.equal(agent.errorCode, "MODEL_OUTPUT_INVALID");
  assert.match(agent.errorMessage, /invalid meal interpretation/i);
  assert.ok(agent.diagnostics);

  const estimation = mapInterpretationFailure(
    new MealEstimationError("UNKNOWN_FDC_ID", "missing food"),
  );
  assert.equal(estimation.errorCode, "UNKNOWN_FDC_ID");

  const save = mapInterpretationFailure(new SupabaseMealError("write failed", 503));
  assert.equal(save.errorCode, "SAVE_FAILED");
});

test("buildInterpretationErrorInsert truncates the prompt and keeps date/time", () => {
  const insert = buildInterpretationErrorInsert({
    prompt: "a".repeat(800),
    mealDate: "2026-08-23",
    mealTime: "19:30",
    failure: {
      errorCode: "MODEL_FAILURE",
      errorMessage: "Google AI could not process this meal description.",
      diagnostics: null,
    },
  });
  assert.equal(insert.source, "interpret_and_save");
  assert.equal(insert.mealDate, "2026-08-23");
  assert.equal(insert.mealTime, "19:30");
  assert.ok(insert.prompt.length <= 500);
  assert.equal(insert.errorCode, "MODEL_FAILURE");
});

test("mealListFingerprint changes when count or newest id changes", () => {
  assert.equal(mealListFingerprint([]), "0:");
  assert.equal(
    mealListFingerprint([{ id: "a" }, { id: "b" }]),
    "2:a",
  );
  assert.notEqual(
    mealListFingerprint([{ id: "a" }]),
    mealListFingerprint([{ id: "b" }]),
  );
});
