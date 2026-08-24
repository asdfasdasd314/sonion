import { after, NextResponse } from "next/server";

import {
  getGeminiModel,
  getGemmaModel,
} from "@/lib/gemma";
import { AgentRunnerError } from "@/lib/agent/runner";
import { FoodDataSetupError, type FoodToolRegistry } from "@/lib/food-data";
import { getDefaultFoodToolRegistry } from "@/lib/food-data/tools";
import { MealEstimationError } from "@/lib/meal-estimation";
import { parseEstimateRequestBody } from "@/lib/meal-estimation/autosave-request";
import {
  createMealGenerateAdapter,
  runMealEstimatePipeline,
} from "@/lib/meal-estimation/pipeline";
import {
  buildInterpretationErrorInsert,
  insertInterpretationError,
  mapInterpretationFailure,
} from "@/lib/interpretation-errors";
import { saveMeal } from "@/lib/meal-history/supabase";
import { MealRevisionError } from "@/lib/meal-revision/apply";
import {
  getSupabaseUser,
  SupabaseAuthError,
  SupabaseConfigurationError,
} from "@/lib/supabase-auth";

/** Allow long agent loops for sync and Interpret-and-Save after() work. */
export const maxDuration = 300;

const MAX_PROMPT_LENGTH = 4_000;

function errorResponse(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

function mapSyncEstimateError(error: unknown) {
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

async function persistInterpretationFailure(input: {
  accessToken: string;
  userId: string;
  prompt: string;
  mealDate: string;
  mealTime: string;
  error: unknown;
}) {
  const failure = mapInterpretationFailure(input.error);
  console.error("Interpret and Save failed.", {
    code: failure.errorCode,
    message: failure.errorMessage,
    diagnostics: failure.diagnostics,
  });
  try {
    await insertInterpretationError(
      input.accessToken,
      input.userId,
      buildInterpretationErrorInsert({
        prompt: input.prompt,
        mealDate: input.mealDate,
        mealTime: input.mealTime,
        failure,
      }),
    );
  } catch (persistError) {
    console.error("Failed to persist interpretation error row.", {
      persistError,
      originalCode: failure.errorCode,
    });
  }
}

export async function POST(request: Request) {
  const authorization = request.headers.get("authorization");
  const accessToken = authorization?.match(/^Bearer\s+(.+)$/i)?.[1]?.trim();

  if (!accessToken) {
    return errorResponse("Sign in before interpreting a meal.", 401);
  }

  let userId: string;
  try {
    const user = await getSupabaseUser(accessToken);
    userId = user.id;
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

  const parsed = parseEstimateRequestBody(body, MAX_PROMPT_LENGTH);
  if (!parsed.ok) {
    return errorResponse(parsed.message, 400);
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

  if (parsed.saveAfterInterpret) {
    const { prompt, mealDate, mealTime } = parsed;
    after(async () => {
      try {
        const generate = createMealGenerateAdapter(apiKey);
        const { estimate } = await runMealEstimatePipeline({
          prompt,
          tools,
          generate,
        });
        await saveMeal(accessToken, userId, {
          mealDate,
          mealTime,
          mealSnapshot: estimate,
        });
      } catch (error) {
        await persistInterpretationFailure({
          accessToken,
          userId,
          prompt,
          mealDate,
          mealTime,
          error,
        });
      }
    });
    return NextResponse.json({ accepted: true }, { status: 202 });
  }

  try {
    const generate = createMealGenerateAdapter(apiKey);
    const { estimate, revision } = await runMealEstimatePipeline({
      prompt: parsed.prompt,
      tools,
      generate,
      revisionRequest: parsed.revisionRequest,
    });
    return revision
      ? NextResponse.json({ estimate, revision })
      : NextResponse.json(estimate);
  } catch (error) {
    return mapSyncEstimateError(error);
  }
}
