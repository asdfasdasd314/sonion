import { NextResponse } from "next/server";

import { authenticateMealRequest, MealRequestAuthError } from "@/lib/meal-history/request";
import { listMeals, saveMeal, SupabaseMealError } from "@/lib/meal-history/supabase";
import { MealSaveBodySchema } from "@/lib/meal-history/types";

export const dynamic = "force-dynamic";

function errorResponse(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

function mapError(error: unknown) {
  if (error instanceof MealRequestAuthError || error instanceof SupabaseMealError) {
    return errorResponse(error.message, error.status >= 500 ? 503 : error.status);
  }
  return errorResponse("Meal history is temporarily unavailable. Try again shortly.", 503);
}

export async function GET(request: Request) {
  try {
    const { accessToken } = await authenticateMealRequest(request);
    return NextResponse.json({ meals: await listMeals(accessToken) });
  } catch (error) {
    return mapError(error);
  }
}

export async function POST(request: Request) {
  try {
    const { accessToken, user } = await authenticateMealRequest(request);
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return errorResponse("Send a valid JSON request body.", 400);
    }
    const parsed = MealSaveBodySchema.safeParse(body);
    if (!parsed.success) return errorResponse("Include a valid meal date, local time, and complete meal estimate.", 400);
    return NextResponse.json(await saveMeal(accessToken, user.id, parsed.data), { status: 201 });
  } catch (error) {
    return mapError(error);
  }
}
