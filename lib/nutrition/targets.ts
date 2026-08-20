import type { ActivityLevel, Goal } from "@/lib/nutrition/types";

export const ACTIVITY_MULTIPLIERS: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  "lightly-active": 1.4,
  "moderately-active": 1.575,
  "very-active": 1.8,
};

export const GOAL_ADJUSTMENTS: Record<Goal, number> = {
  maintain: 0,
  cut: -0.15,
  bulk: 0.1,
};

export type NutritionTargetInput = {
  weightKg: number;
  heightCm: number;
  age: number;
  activityLevel: ActivityLevel;
  goal: Goal;
};

export type NutritionTargetErrors = Partial<Record<keyof NutritionTargetInput, string>>;

export type NutritionTargets = {
  bmr: number;
  tdee: number;
  targetCalories: number;
  proteinGrams: number;
  fatGrams: number;
  carbohydratesGrams: number;
  proteinCalories: number;
  fatCalories: number;
  remainingCalories: number;
  hasInsufficientCalories: boolean;
};

export type NutritionTargetResult =
  | { ok: true; targets: NutritionTargets }
  | { ok: false; errors: NutritionTargetErrors };

export function validateNutritionTargetInput(input: Partial<NutritionTargetInput>): NutritionTargetErrors {
  const errors: NutritionTargetErrors = {};

  if (typeof input.weightKg !== "number" || !Number.isFinite(input.weightKg)) {
    errors.weightKg = "Enter your body weight in kilograms.";
  } else if (input.weightKg <= 0 || input.weightKg > 500) {
    errors.weightKg = "Use a body weight between 1 and 500 kg.";
  }

  if (typeof input.heightCm !== "number" || !Number.isFinite(input.heightCm)) {
    errors.heightCm = "Enter your height in centimeters.";
  } else if (input.heightCm < 50 || input.heightCm > 250) {
    errors.heightCm = "Use a height between 50 and 250 cm.";
  }

  if (typeof input.age !== "number" || !Number.isFinite(input.age)) {
    errors.age = "Enter your age.";
  } else if (input.age < 13 || input.age > 120) {
    errors.age = "Use an age between 13 and 120 years.";
  }

  if (!input.activityLevel || !(input.activityLevel in ACTIVITY_MULTIPLIERS)) {
    errors.activityLevel = "Choose an activity level.";
  }

  if (!input.goal || !(input.goal in GOAL_ADJUSTMENTS)) {
    errors.goal = "Choose a goal.";
  }

  return errors;
}
export function calculateNutritionTargets(input: NutritionTargetInput): NutritionTargetResult {
  const errors = validateNutritionTargetInput(input);
  if (Object.keys(errors).length > 0) {
    return { ok: false, errors };
  }

  const bmr = 10 * input.weightKg + 6.25 * input.heightCm - 5 * input.age + 5;
  const tdee = bmr * ACTIVITY_MULTIPLIERS[input.activityLevel];
  const targetCalories = tdee * (1 + GOAL_ADJUSTMENTS[input.goal]);
  const proteinGrams = input.weightKg * 2;
  const fatGrams = input.weightKg * 0.8;
  const proteinCalories = proteinGrams * 4;
  const fatCalories = fatGrams * 9;
  const remainingCalories = targetCalories - proteinCalories - fatCalories;

  return {
    ok: true,
    targets: {
      bmr,
      tdee,
      targetCalories,
      proteinGrams,
      fatGrams,
      carbohydratesGrams: Math.max(0, remainingCalories / 4),
      proteinCalories,
      fatCalories,
      remainingCalories,
      hasInsufficientCalories: remainingCalories < 0,
    },
  };
}

export function roundNutritionValue(value: number): number {
  return Math.round(value);
}
