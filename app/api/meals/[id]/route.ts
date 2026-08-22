import { NextResponse } from "next/server";

import { authenticateMealRequest, MealRequestAuthError } from "@/lib/meal-history/request";
import { deleteMeal, SupabaseMealError, updateMeal } from "@/lib/meal-history/supabase";
import { MealPatchBodySchema } from "@/lib/meal-history/types";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function errorResponse(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

function mapError(error: unknown) {
  if (error instanceof MealRequestAuthError || error instanceof SupabaseMealError) {
    return errorResponse(error.message, error.status >= 500 ? 503 : error.status);
  }
  return errorResponse("Meal history is temporarily unavailable. Try again shortly.", 503);
}

async function getMealId(context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  return UUID_PATTERN.test(id) ? id : undefined;
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { accessToken } = await authenticateMealRequest(request);
    const id = await getMealId(context);
    if (!id) return errorResponse("Use a valid meal ID.", 400);
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return errorResponse("Send a valid JSON request body.", 400);
    }
    const parsed = MealPatchBodySchema.safeParse(body);
    if (!parsed.success) return errorResponse("Include at least one valid meal field to update.", 400);
    const meal = await updateMeal(accessToken, id, parsed.data);
    return meal ? NextResponse.json(meal) : errorResponse("Meal not found.", 404);
  } catch (error) {
    return mapError(error);
  }
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { accessToken } = await authenticateMealRequest(request);
    const id = await getMealId(context);
    if (!id) return errorResponse("Use a valid meal ID.", 400);
    await deleteMeal(accessToken, id);
    return new Response(null, { status: 204 });
  } catch (error) {
    return mapError(error);
  }
}
