import { MealEstimateSchema, type MealEstimate } from "@/lib/meal-estimation/types";
import { isValidLocalDate, isValidLocalTime } from "@/lib/meal-history/types";
import { MEAL_REVISION_PARAMETERS } from "@/lib/meal-revision/config";
import { MealRevisionRequestSchema } from "@/lib/meal-revision/types";

export type ParsedEstimateRequest =
  | { ok: false; message: string }
  | {
      ok: true;
      prompt: string;
      saveAfterInterpret: false;
      revisionRequest?: {
        instruction: string;
        previousEstimate: MealEstimate;
      };
    }
  | {
      ok: true;
      prompt: string;
      saveAfterInterpret: true;
      mealDate: string;
      mealTime: string;
    };

type PromptBody = {
  prompt: unknown;
  revision?: unknown;
  saveAfterInterpret?: unknown;
  mealDate?: unknown;
  mealTime?: unknown;
};

function isPromptBody(value: unknown): value is PromptBody {
  return typeof value === "object" && value !== null && "prompt" in value;
}

export function parseEstimateRequestBody(
  body: unknown,
  maxPromptLength: number,
): ParsedEstimateRequest {
  if (!isPromptBody(body) || typeof body.prompt !== "string") {
    return { ok: false, message: 'The request body must include a string "prompt".' };
  }

  const prompt = body.prompt.trim();
  if (!prompt) {
    return { ok: false, message: "Enter a food description before submitting." };
  }
  if (prompt.length > maxPromptLength) {
    return {
      ok: false,
      message: `Keep the prompt under ${maxPromptLength.toLocaleString()} characters.`,
    };
  }

  const saveAfterInterpret = body.saveAfterInterpret === true;

  if (body.revision !== undefined) {
    if (saveAfterInterpret) {
      return {
        ok: false,
        message: "Interpret and Save cannot be combined with a revision request.",
      };
    }
    const parsedRevision = MealRevisionRequestSchema.safeParse(body.revision);
    if (!parsedRevision.success) {
      return { ok: false, message: "The revision request is incomplete or invalid." };
    }
    if (parsedRevision.data.instruction.length > MEAL_REVISION_PARAMETERS.revisionMaxLength) {
      return {
        ok: false,
        message: `Keep the revision under ${MEAL_REVISION_PARAMETERS.revisionMaxLength.toLocaleString()} characters.`,
      };
    }
    if (!MealEstimateSchema.safeParse(parsedRevision.data.previousEstimate).success) {
      return {
        ok: false,
        message: "The current meal estimate is invalid and cannot be revised.",
      };
    }
    return {
      ok: true,
      prompt,
      saveAfterInterpret: false,
      revisionRequest: parsedRevision.data,
    };
  }

  if (saveAfterInterpret) {
    if (typeof body.mealDate !== "string" || !isValidLocalDate(body.mealDate)) {
      return {
        ok: false,
        message: "Choose a valid meal date before using Interpret and Save.",
      };
    }
    if (typeof body.mealTime !== "string" || !isValidLocalTime(body.mealTime)) {
      return {
        ok: false,
        message: "Choose a valid local meal time before using Interpret and Save.",
      };
    }
    return {
      ok: true,
      prompt,
      saveAfterInterpret: true,
      mealDate: body.mealDate,
      mealTime: body.mealTime,
    };
  }

  return { ok: true, prompt, saveAfterInterpret: false };
}
