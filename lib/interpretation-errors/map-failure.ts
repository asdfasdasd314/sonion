import { AgentRunnerError } from "@/lib/agent/runner";
import { FoodDataSetupError } from "@/lib/food-data";
import { MealEstimationError } from "@/lib/meal-estimation";
import { MealRevisionError } from "@/lib/meal-revision/apply";
import { SupabaseMealError } from "@/lib/meal-history/supabase";
import { SupabaseAuthError, SupabaseConfigurationError } from "@/lib/supabase-auth";

import { INTERPRETATION_ERROR_PARAMETERS } from "./config";
import { boundDiagnostics, truncateText } from "./bounds";
import type { InterpretationErrorInsert } from "./types";

export type MappedInterpretationFailure = {
  errorCode: string;
  errorMessage: string;
  diagnostics: Record<string, unknown> | null;
};

const USER_SAFE_MESSAGES: Record<string, string> = {
  MODEL_OUTPUT_INVALID:
    "Google AI returned invalid meal interpretation output after correction attempts.",
  MODEL_FAILURE:
    "Google AI could not process this meal description.",
  FINAL_OUTPUT_INVALID:
    "Google AI returned a meal selection that could not be finalized.",
  INVALID_SELECTION:
    "Google AI returned a meal selection that could not be estimated.",
  UNKNOWN_FDC_ID:
    "Google AI selected a food ID that is not in the authoritative USDA index.",
  FOOD_DATA_SETUP:
    "Food data is not ready. The local USDA index is missing or invalid.",
  SUPABASE_CONFIG:
    "Supabase is not configured for meal persistence.",
  AUTH_EXPIRED:
    "Your session expired before the meal could be saved.",
  SAVE_FAILED:
    "The meal estimate succeeded but could not be saved to your history.",
  REVISION_UNSUPPORTED:
    "Automatic refinement could not apply the requested change.",
  UNKNOWN:
    "Automatic meal processing failed unexpectedly.",
};

export function mapInterpretationFailure(error: unknown): MappedInterpretationFailure {
  if (error instanceof AgentRunnerError) {
    return {
      errorCode: error.code,
      errorMessage: USER_SAFE_MESSAGES[error.code] ?? USER_SAFE_MESSAGES.MODEL_FAILURE,
      diagnostics: boundDiagnostics({
        runnerMessage: truncateText(error.message, 300),
        diagnostics: error.diagnostics ?? null,
        modelOutputPreview: error.modelOutput
          ? truncateText(error.modelOutput, 400)
          : null,
      }),
    };
  }

  if (error instanceof MealEstimationError) {
    return {
      errorCode: error.code,
      errorMessage: USER_SAFE_MESSAGES[error.code] ?? USER_SAFE_MESSAGES.INVALID_SELECTION,
      diagnostics: boundDiagnostics({ estimationMessage: truncateText(error.message, 300) }),
    };
  }

  if (error instanceof MealRevisionError) {
    return {
      errorCode: "REVISION_UNSUPPORTED",
      errorMessage: USER_SAFE_MESSAGES.REVISION_UNSUPPORTED,
      diagnostics: boundDiagnostics({ revisionMessage: truncateText(error.message, 300) }),
    };
  }

  if (error instanceof FoodDataSetupError) {
    return {
      errorCode: "FOOD_DATA_SETUP",
      errorMessage: USER_SAFE_MESSAGES.FOOD_DATA_SETUP,
      diagnostics: boundDiagnostics({ setupMessage: truncateText(error.message, 300) }),
    };
  }

  if (error instanceof SupabaseConfigurationError) {
    return {
      errorCode: "SUPABASE_CONFIG",
      errorMessage: USER_SAFE_MESSAGES.SUPABASE_CONFIG,
      diagnostics: null,
    };
  }

  if (error instanceof SupabaseAuthError) {
    return {
      errorCode: "AUTH_EXPIRED",
      errorMessage: USER_SAFE_MESSAGES.AUTH_EXPIRED,
      diagnostics: boundDiagnostics({ status: error.status }),
    };
  }

  if (error instanceof SupabaseMealError) {
    return {
      errorCode: "SAVE_FAILED",
      errorMessage: USER_SAFE_MESSAGES.SAVE_FAILED,
      diagnostics: boundDiagnostics({
        status: error.status,
        saveMessage: truncateText(error.message, 300),
      }),
    };
  }

  return {
    errorCode: "UNKNOWN",
    errorMessage: USER_SAFE_MESSAGES.UNKNOWN,
    diagnostics: boundDiagnostics({
      message: error instanceof Error ? truncateText(error.message, 300) : "non-error throw",
    }),
  };
}

export function buildInterpretationErrorInsert(input: {
  prompt: string;
  mealDate?: string | null;
  mealTime?: string | null;
  failure: MappedInterpretationFailure;
  source?: string;
}): InterpretationErrorInsert {
  const params = INTERPRETATION_ERROR_PARAMETERS;
  return {
    source: input.source ?? params.sourceAutomaticProcessing,
    prompt: truncateText(input.prompt, params.promptMaxStoredChars),
    mealDate: input.mealDate ?? null,
    mealTime: input.mealTime ?? null,
    errorCode: truncateText(input.failure.errorCode, 120),
    errorMessage: truncateText(input.failure.errorMessage, params.errorMessageMaxChars),
    diagnostics: input.failure.diagnostics,
  };
}
