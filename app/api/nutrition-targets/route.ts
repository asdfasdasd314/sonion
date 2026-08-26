import { NextResponse } from "next/server";

import { authenticateMealRequest, MealRequestAuthError } from "@/lib/meal-history/request";
import { NutritionTargetSaveBodySchema } from "@/lib/nutrition/target-history";
import { getNutritionTarget, saveNutritionTarget, SupabaseNutritionTargetError } from "@/lib/nutrition/target-supabase";

export const dynamic = "force-dynamic";

function errorResponse(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

function mapError(error: unknown) {
  if (error instanceof MealRequestAuthError || error instanceof SupabaseNutritionTargetError) {
    return errorResponse(error.message, error.status >= 500 ? 503 : error.status);
  }
  return errorResponse("Nutrition targets are temporarily unavailable. Try again shortly.", 503);
}

export async function GET(request: Request) {
  try {
    const { accessToken } = await authenticateMealRequest(request, "daily targets");
    return NextResponse.json({ target: await getNutritionTarget(accessToken) });
  } catch (error) {
    return mapError(error);
  }
}

export async function POST(request: Request) {
  try {
    const { accessToken, user } = await authenticateMealRequest(request, "daily targets");
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return errorResponse("Send a valid JSON request body.", 400);
    }
    const parsed = NutritionTargetSaveBodySchema.safeParse(body);
    if (!parsed.success) return errorResponse("Include a complete calculated nutrition target.", 400);
    return NextResponse.json(await saveNutritionTarget(accessToken, user.id, parsed.data.targets), { status: 201 });
  } catch (error) {
    return mapError(error);
  }
}
