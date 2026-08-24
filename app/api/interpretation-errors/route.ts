import { NextResponse } from "next/server";

import {
  listInterpretationErrors,
  SupabaseInterpretationError,
} from "@/lib/interpretation-errors";
import { authenticateMealRequest, MealRequestAuthError } from "@/lib/meal-history/request";

export const dynamic = "force-dynamic";

function errorResponse(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

function mapError(error: unknown) {
  if (error instanceof MealRequestAuthError || error instanceof SupabaseInterpretationError) {
    return errorResponse(error.message, error.status >= 500 ? 503 : error.status);
  }
  return errorResponse("Interpretation errors are temporarily unavailable. Try again shortly.", 503);
}

export async function GET(request: Request) {
  try {
    const { accessToken } = await authenticateMealRequest(request);
    const includeDismissed = new URL(request.url).searchParams.get("includeDismissed") === "true";
    return NextResponse.json({
      errors: await listInterpretationErrors(accessToken, { includeDismissed }),
    });
  } catch (error) {
    return mapError(error);
  }
}
