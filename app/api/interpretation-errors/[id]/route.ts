import { NextResponse } from "next/server";

import {
  dismissInterpretationError,
  SupabaseInterpretationError,
} from "@/lib/interpretation-errors";
import { authenticateMealRequest, MealRequestAuthError } from "@/lib/meal-history/request";

export const dynamic = "force-dynamic";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function errorResponse(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

function mapError(error: unknown) {
  if (error instanceof MealRequestAuthError || error instanceof SupabaseInterpretationError) {
    return errorResponse(error.message, error.status >= 500 ? 503 : error.status);
  }
  return errorResponse("Interpretation errors are temporarily unavailable. Try again shortly.", 503);
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { accessToken } = await authenticateMealRequest(request);
    const { id } = await context.params;
    if (!UUID_PATTERN.test(id)) {
      return errorResponse("Provide a valid interpretation-error id.", 400);
    }
    const record = await dismissInterpretationError(accessToken, id);
    if (!record) return errorResponse("That interpretation error was not found.", 404);
    return NextResponse.json(record);
  } catch (error) {
    return mapError(error);
  }
}
