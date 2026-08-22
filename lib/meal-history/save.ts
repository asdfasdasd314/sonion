import type { MealEstimate } from "@/lib/meal-estimation/types";

export type MealSaveState = "idle" | "saving" | "saved" | "error";

export function canStartMealSave(response: MealEstimate | null, state: MealSaveState): boolean {
  return response !== null && state !== "saving" && state !== "saved";
}

export function saveStateAfterResponse(success: boolean): Extract<MealSaveState, "saved" | "error"> {
  return success ? "saved" : "error";
}
