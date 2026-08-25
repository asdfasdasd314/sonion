import { after, NextResponse } from "next/server";

import { FoodDataSetupError, type FoodToolRegistry } from "@/lib/food-data";
import { getDefaultFoodToolRegistry } from "@/lib/food-data/tools";
import { parseMealRequestBody, type QueuedMeal, type QueuedRefinement } from "@/lib/meal-batch/request";
import {
  buildInterpretationErrorInsert,
  insertInterpretationError,
  mapInterpretationFailure,
} from "@/lib/interpretation-errors";
import { createMealGenerateAdapter, runMealEstimatePipeline } from "@/lib/meal-estimation/pipeline";
import { saveMeal, SupabaseMealError, updateMeal } from "@/lib/meal-history/supabase";
import {
  getSupabaseUser,
  SupabaseAuthError,
  SupabaseConfigurationError,
} from "@/lib/supabase-auth";

/** Allow long agent loops for automatic meal processing after() work. */
export const maxDuration = 300;

const MAX_PROMPT_LENGTH = 4_000;

function errorResponse(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

async function persistInterpretationFailure(input: {
  accessToken: string;
  userId: string;
  prompt: string;
  mealDate: string;
  mealTime: string;
  error: unknown;
  source: string;
}) {
  const failure = mapInterpretationFailure(input.error);
  console.error("Automatic meal processing failed.", {
    source: input.source,
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
        source: input.source,
      }),
    );
  } catch (persistError) {
    console.error("Failed to persist interpretation error row.", {
      persistError,
      originalCode: failure.errorCode,
    });
  }
}

async function processQueuedMeal(
  input: QueuedMeal,
  accessToken: string,
  userId: string,
  tools: FoodToolRegistry,
  apiKey: string,
) {
  try {
    const generate = createMealGenerateAdapter(apiKey);
    const { estimate } = await runMealEstimatePipeline({
      prompt: input.prompt,
      tools,
      generate,
    });
    await saveMeal(accessToken, userId, {
      mealDate: input.mealDate,
      mealTime: input.mealTime,
      mealSnapshot: estimate,
    });
  } catch (error) {
    await persistInterpretationFailure({
      accessToken,
      userId,
      prompt: input.prompt,
      mealDate: input.mealDate,
      mealTime: input.mealTime,
      error,
      source: "automatic_batch",
    });
  }
}

async function processQueuedRefinement(
  input: QueuedRefinement,
  accessToken: string,
  userId: string,
  tools: FoodToolRegistry,
  apiKey: string,
) {
  try {
    const generate = createMealGenerateAdapter(apiKey);
    const { estimate } = await runMealEstimatePipeline({
      prompt: input.instruction,
      tools,
      generate,
      revisionRequest: {
        instruction: input.instruction,
        previousEstimate: input.previousEstimate,
      },
    });
    const updated = await updateMeal(accessToken, input.mealId, {
      mealDate: input.mealDate,
      mealTime: input.mealTime,
      mealSnapshot: estimate,
    });
    if (!updated) throw new SupabaseMealError("The saved meal could not be found.", 404);
  } catch (error) {
    await persistInterpretationFailure({
      accessToken,
      userId,
      prompt: input.instruction,
      mealDate: input.mealDate,
      mealTime: input.mealTime,
      error,
      source: "automatic_refinement",
    });
  }
}

export async function POST(request: Request) {
  const authorization = request.headers.get("authorization");
  const accessToken = authorization?.match(/^Bearer\s+(.+)$/i)?.[1]?.trim();

  if (!accessToken) return errorResponse("Sign in before interpreting a meal.", 401);

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

  const parsed = parseMealRequestBody(body, MAX_PROMPT_LENGTH);
  if (!parsed.ok) return errorResponse(parsed.message, 400);

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

  if (parsed.kind === "batch") {
    after(async () => {
      await Promise.all(parsed.meals.map((meal) => processQueuedMeal(
        meal,
        accessToken,
        userId,
        tools,
        apiKey,
      )));
    });
    return NextResponse.json({ accepted: true, queuedMeals: parsed.meals.length }, { status: 202 });
  }

  after(async () => {
    await processQueuedRefinement(parsed.refinement, accessToken, userId, tools, apiKey);
  });
  return NextResponse.json({ accepted: true, queuedMeals: 1 }, { status: 202 });
}
