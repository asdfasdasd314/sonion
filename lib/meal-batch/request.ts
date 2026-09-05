import { MealEstimateSchema, type MealEstimate } from "@/lib/meal-estimation/types";
import { isValidLocalDate, isValidLocalTime } from "@/lib/meal-history/types";
import { MEAL_REVISION_PARAMETERS } from "@/lib/meal-revision/config";
import { MealRevisionRequestSchema } from "@/lib/meal-revision/types";

import { MEAL_BATCH_PARAMETERS } from "./config";
import {
  composeAbsoluteMealPrompt,
  composePercentageMealPrompt,
} from "./proportions";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type QueuedMeal = {
  prompt: string;
  mealDate: string;
  mealTime: string;
};

export type QueuedRefinement = {
  mealId: string;
  instruction: string;
  previousEstimate: MealEstimate;
  mealDate: string;
  mealTime: string;
};

export type ParsedMealRequest =
  | { ok: false; message: string }
  | { ok: true; kind: "batch"; meals: QueuedMeal[] }
  | { ok: true; kind: "refinement"; refinement: QueuedRefinement };

type RequestBody = {
  meals?: unknown;
  refinement?: unknown;
};

function isRequestBody(value: unknown): value is RequestBody {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseDatedMeal(value: unknown, index: number, maxPromptLength: number): QueuedMeal | { error: string } {
  if (!isRecord(value)) return { error: `Meal ${index + 1} must be an object.` };

  if ("prompt" in value && value.entryMode === undefined) {
    return { error: `Meal ${index + 1} must use absolute or percentage entry instead of a free-text prompt.` };
  }

  if (value.entryMode !== "absolute" && value.entryMode !== "percentage") {
    return { error: `Meal ${index + 1} must use entryMode "absolute" or "percentage".` };
  }

  if (typeof value.mealDate !== "string" || !isValidLocalDate(value.mealDate)) {
    return { error: `Choose a valid date for meal ${index + 1}.` };
  }
  if (typeof value.mealTime !== "string" || !isValidLocalTime(value.mealTime)) {
    return { error: `Choose a valid time for meal ${index + 1}.` };
  }

  const maxItems = MEAL_BATCH_PARAMETERS.maxItemsPerMeal;
  const composed = value.entryMode === "absolute"
    ? composeAbsoluteMealPrompt(value.items, maxItems)
    : composePercentageMealPrompt(value.items, value.solidTotalPU, value.liquidTotalPU, maxItems);

  if (!composed.ok) {
    return { error: `Meal ${index + 1}: ${composed.message}` };
  }

  const prompt = composed.prompt.trim();
  if (!prompt) return { error: `Enter at least one food for meal ${index + 1}.` };
  if (prompt.length > maxPromptLength) {
    return { error: `Keep meal ${index + 1} under ${maxPromptLength.toLocaleString()} characters.` };
  }

  return { prompt, mealDate: value.mealDate, mealTime: value.mealTime };
}

function parseBatch(value: unknown, maxPromptLength: number): ParsedMealRequest {
  if (!Array.isArray(value)) return { ok: false, message: "Include a meals array to process." };
  if (value.length === 0) return { ok: false, message: "Add at least one meal before interpreting." };
  if (value.length > MEAL_BATCH_PARAMETERS.maxMealsPerRequest) {
    return {
      ok: false,
      message: `Process at most ${MEAL_BATCH_PARAMETERS.maxMealsPerRequest} meals at once.`,
    };
  }

  const meals: QueuedMeal[] = [];
  for (const [index, item] of value.entries()) {
    const parsed = parseDatedMeal(item, index, maxPromptLength);
    if ("error" in parsed) return { ok: false, message: parsed.error };
    meals.push(parsed);
  }
  return { ok: true, kind: "batch", meals };
}

function parseRefinement(value: unknown, maxPromptLength: number): ParsedMealRequest {
  if (!isRecord(value)) return { ok: false, message: "Include a complete refinement request." };
  if (typeof value.mealId !== "string" || !UUID_PATTERN.test(value.mealId)) {
    return { ok: false, message: "Refinement requires a valid saved meal ID." };
  }
  if (typeof value.instruction !== "string") {
    return { ok: false, message: "Describe what should change in the saved meal." };
  }

  const instruction = value.instruction.trim();
  if (!instruction) return { ok: false, message: "Describe what should change in the saved meal." };
  if (instruction.length > Math.min(maxPromptLength, MEAL_REVISION_PARAMETERS.revisionMaxLength)) {
    return {
      ok: false,
      message: `Keep the refinement under ${MEAL_REVISION_PARAMETERS.revisionMaxLength.toLocaleString()} characters.`,
    };
  }
  if (typeof value.mealDate !== "string" || !isValidLocalDate(value.mealDate)) {
    return { ok: false, message: "Choose a valid meal date for the refinement." };
  }
  if (typeof value.mealTime !== "string" || !isValidLocalTime(value.mealTime)) {
    return { ok: false, message: "Choose a valid meal time for the refinement." };
  }

  const previousEstimate = MealRevisionRequestSchema.safeParse({
    instruction,
    previousEstimate: value.previousEstimate,
  });
  if (!previousEstimate.success || !MealEstimateSchema.safeParse(previousEstimate.data.previousEstimate).success) {
    return { ok: false, message: "The saved meal estimate is invalid and cannot be refined." };
  }

  return {
    ok: true,
    kind: "refinement",
    refinement: {
      mealId: value.mealId,
      instruction,
      previousEstimate: previousEstimate.data.previousEstimate,
      mealDate: value.mealDate,
      mealTime: value.mealTime,
    },
  };
}

export function parseMealRequestBody(body: unknown, maxPromptLength: number): ParsedMealRequest {
  if (!isRequestBody(body)) {
    return { ok: false, message: "Send a valid meal request body." };
  }
  if (body.meals !== undefined && body.refinement !== undefined) {
    return { ok: false, message: "Choose either a meal batch or a refinement request." };
  }
  if (body.meals !== undefined) return parseBatch(body.meals, maxPromptLength);
  if (body.refinement !== undefined) return parseRefinement(body.refinement, maxPromptLength);
  return { ok: false, message: "Include a meals array or refinement request." };
}
