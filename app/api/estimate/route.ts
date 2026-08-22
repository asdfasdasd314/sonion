import { NextResponse } from "next/server";

import {
  createGemmaClient,
  getGeminiModel,
  getGemmaModel,
  getNextMealModel,
} from "@/lib/gemma";
import { runMealAgent, AgentRunnerError } from "@/lib/agent/runner";
import { FoodDataSetupError, type FoodToolRegistry } from "@/lib/food-data";
import { getDefaultFoodToolRegistry } from "@/lib/food-data/tools";
import { NormalizedFoodSchema, type NormalizedFood } from "@/lib/food-data/types";
import { estimateMeal, MealEstimationError } from "@/lib/meal-estimation";
import { applyMealRevision, MealRevisionError } from "@/lib/meal-revision/apply";
import { MEAL_REVISION_PARAMETERS } from "@/lib/meal-revision/config";
import {
  MealRevisionRequestSchema,
  revisionContextFromEstimate,
  type MealRevision,
} from "@/lib/meal-revision/types";
import {
  MealEstimateSchema,
  type MealEstimate,
  type MealSelection,
} from "@/lib/meal-estimation/types";
import {
  getSupabaseUser,
  SupabaseAuthError,
  SupabaseConfigurationError,
} from "@/lib/supabase-auth";

const MAX_PROMPT_LENGTH = 4_000;

type PromptBody = {
  prompt: unknown;
  revision?: unknown;
};

function isPromptBody(value: unknown): value is PromptBody {
  return typeof value === "object" && value !== null && "prompt" in value;
}

function errorResponse(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(request: Request) {
  const authorization = request.headers.get("authorization");
  const accessToken = authorization?.match(/^Bearer\s+(.+)$/i)?.[1]?.trim();

  if (!accessToken) {
    return errorResponse("Sign in before interpreting a meal.", 401);
  }

  try {
    await getSupabaseUser(accessToken);
  } catch (error) {
    if (error instanceof SupabaseConfigurationError) {
      return errorResponse(
        "Supabase is not configured yet. Add the public Supabase values to your local environment and restart the app.",
        503,
      );
    }

    if (error instanceof SupabaseAuthError && error.status < 500) {
      return errorResponse("Your session is invalid or expired. Sign in again.", 401);
    }

    return errorResponse("Supabase could not verify your session. Try again shortly.", 503);
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return errorResponse("Send a valid JSON request body.", 400);
  }

  if (!isPromptBody(body) || typeof body.prompt !== "string") {
    return errorResponse('The request body must include a string "prompt".', 400);
  }

  const prompt = body.prompt.trim();

  if (!prompt) {
    return errorResponse("Enter a food description before submitting.", 400);
  }

  if (prompt.length > MAX_PROMPT_LENGTH) {
    return errorResponse(
      `Keep the prompt under ${MAX_PROMPT_LENGTH.toLocaleString()} characters.`,
      400,
    );
  }

  let revisionRequest: {
    instruction: string;
    previousEstimate: MealEstimate;
  } | undefined;
  if (body.revision !== undefined) {
    const parsedRevision = MealRevisionRequestSchema.safeParse(body.revision);
    if (!parsedRevision.success) {
      return errorResponse("The revision request is incomplete or invalid.", 400);
    }
    if (parsedRevision.data.instruction.length > MEAL_REVISION_PARAMETERS.revisionMaxLength) {
      return errorResponse(
        `Keep the revision under ${MEAL_REVISION_PARAMETERS.revisionMaxLength.toLocaleString()} characters.`,
        400,
      );
    }
    if (!MealEstimateSchema.safeParse(parsedRevision.data.previousEstimate).success) {
      return errorResponse("The current meal estimate is invalid and cannot be revised.", 400);
    }
    revisionRequest = parsedRevision.data;
  }

  const apiKey = process.env.GEMINI_API_KEY?.trim();

  if (!apiKey) {
    return errorResponse(
      "Google AI is not configured yet. Add GEMINI_API_KEY to your local environment and restart the app.",
      503,
    );
  }

  let tools: FoodToolRegistry;
  try {
    tools = getDefaultFoodToolRegistry();
  } catch (error) {
    if (error instanceof FoodDataSetupError) {
      console.error("Meal agent food data is not ready.", { error });
      return errorResponse(
        "Food data setup error: the local USDA index is missing or invalid. Run npm run food-data:index with the USDA JSON inputs in food-data/, then restart the app.",
        503,
      );
    }

    console.error("Meal agent food data setup failed.", { error });
    return errorResponse("Food data setup error: the local food tools could not be initialized.", 503);
  }

  try {
    const client = createGemmaClient(apiKey);
    const generate = async ({ systemInstruction, contents }: { systemInstruction: string; contents: string }) => {
      const model = getNextMealModel();
      console.log("Meal agent model request.", { model });
      const result = await client.models.generateContent({
        model,
        contents,
        config: {
          systemInstruction,
          responseMimeType: "application/json",
        },
      });
      return result.text ?? "";
    };

    let revision: MealRevision | undefined;
    let selection: MealSelection;
    if (revisionRequest) {
      revision = await runMealAgent({
        mealPrompt: revisionRequest.instruction,
        tools,
        generate,
        responseMode: "revision",
        revisionContext: revisionContextFromEstimate(revisionRequest.previousEstimate, prompt),
      });
      if (
        revision.updates.length > MEAL_REVISION_PARAMETERS.maxUpdates
        || revision.notes.length > MEAL_REVISION_PARAMETERS.notesMaxLength
      ) {
        throw new MealRevisionError("The revision contains too many updates.");
      }
      selection = applyMealRevision(revisionRequest.previousEstimate, revision);
    } else {
      selection = await runMealAgent({
        mealPrompt: prompt,
        tools,
        generate,
      });
    }

    const authoritativeFoods: NormalizedFood[] = [];
    for (const item of selection.items) {
      const record = await tools.getFood.execute({ fdcId: item.fdcId });
      if (!NormalizedFoodSchema.safeParse(record).success) {
        throw new MealEstimationError(
          "UNKNOWN_FDC_ID",
          "The model selected an FDC ID that is not in the authoritative USDA index.",
        );
      }
      authoritativeFoods.push(record as NormalizedFood);
    }

    const estimate = estimateMeal(selection, authoritativeFoods);
    return revision
      ? NextResponse.json({ estimate, revision })
      : NextResponse.json(estimate);
  } catch (error) {
    if (error instanceof MealRevisionError) {
      console.error("Meal agent returned an unusable structured revision.", { message: error.message });
      return errorResponse(
        "Google AI could not apply that revision safely. Review the current estimate and try describing the correction more specifically.",
        502,
      );
    }
    if (error instanceof MealEstimationError) {
      console.error("Meal agent returned an unusable food selection.", { code: error.code });
      return errorResponse(
        "Google AI returned a meal selection that could not be matched to the authoritative USDA index. Try describing the foods with a little more detail.",
        502,
      );
    }
    const errorCode = error instanceof AgentRunnerError ? error.code : "MODEL_FAILURE";
    console.error("Meal agent request failed.", {
      code: errorCode,
      message: error instanceof Error ? error.message : undefined,
      diagnostics: error instanceof AgentRunnerError ? error.diagnostics : undefined,
      modelOutput: error instanceof AgentRunnerError ? error.modelOutput : undefined,
    });
    if (error instanceof AgentRunnerError && error.code === "MODEL_OUTPUT_INVALID") {
      return errorResponse(
        "Google AI returned invalid meal interpretation output after the correction attempts. Check the server logs for the returned output and validation details.",
        502,
      );
    }
    return errorResponse(
      `Google AI could not process this request. The configured models (${getGeminiModel()} and ${getGemmaModel()}) may be unavailable through Google AI Studio.`,
      502,
    );
  }
}
