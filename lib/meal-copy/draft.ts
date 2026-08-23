import type { MealEstimate } from "@/lib/meal-estimation/types";
import type { MealRecord } from "@/lib/meal-history/types";

/** Tunables mirrored from parameter_files/meal-copy.toml for the browser draft path. */
export const MEAL_COPY_DEFAULT_DATETIME = "now" as const;
export const MEAL_COPY_REVISION_REQUIRED_BEFORE_SAVE = false;
export const MEAL_COPY_SAVE_METHOD = "post-new-record" as const;

export type MealCopyDraft = {
  mealSnapshot: MealEstimate;
  mealDate: string;
  mealTime: string;
  sourceMealId: string;
  sourceMealDate: string;
  sourceMealTime: string;
};

export function cloneMealSnapshot(snapshot: MealEstimate): MealEstimate {
  return structuredClone(snapshot);
}

export function currentLocalMealDateTime(now = new Date()): { mealDate: string; mealTime: string } {
  const pad = (value: number) => String(value).padStart(2, "0");
  return {
    mealDate: `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`,
    mealTime: `${pad(now.getHours())}:${pad(now.getMinutes())}`,
  };
}

export function createMealCopyDraft(source: MealRecord, now = new Date()): MealCopyDraft {
  const { mealDate, mealTime } = currentLocalMealDateTime(now);
  return {
    mealSnapshot: cloneMealSnapshot(source.meal_snapshot),
    mealDate,
    mealTime,
    sourceMealId: source.id,
    sourceMealDate: source.meal_date,
    sourceMealTime: source.meal_time,
  };
}
