import type { ActivityLevel, Goal, WeightChangeUnit } from "@/lib/nutrition/types";

export const ACTIVITY_MULTIPLIERS: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  "lightly-active": 1.4,
  "moderately-active": 1.575,
  "very-active": 1.8,
};

export const WEIGHT_CHANGE_UNITS: Record<WeightChangeUnit, string> = {
  percent: "% of body weight",
  pounds: "lb of body weight",
};

const POUNDS_TO_KILOGRAMS = 0.45359237;
const INCHES_TO_CENTIMETERS = 2.54;
const CALORIES_PER_POUND = 3500;
const DAYS_PER_WEEK = 7;
const MAX_WEIGHT_POUNDS = 500 / POUNDS_TO_KILOGRAMS;
const MIN_HEIGHT_INCHES = 50 / INCHES_TO_CENTIMETERS;
const MAX_HEIGHT_INCHES = 250 / INCHES_TO_CENTIMETERS;

export type NutritionTargetInput = {
  weightLb: number;
  heightIn: number;
  age: number;
  activityLevel: ActivityLevel;
  goal: Goal;
  weeklyChange?: number;
  weeklyChangeUnit?: WeightChangeUnit;
};

export type NutritionTargetErrors = Partial<Record<keyof NutritionTargetInput, string>>;

export type NutritionTargets = {
  bmr: number;
  tdee: number;
  targetCalories: number;
  weeklyChangePounds: number;
  dailyCalorieAdjustment: number;
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

  if (typeof input.weightLb !== "number" || !Number.isFinite(input.weightLb)) {
    errors.weightLb = "Enter your body weight in pounds.";
  } else if (input.weightLb <= 0 || input.weightLb > MAX_WEIGHT_POUNDS) {
    errors.weightLb = "Use a body weight between 1 and 1,102 lb.";
  }

  if (typeof input.heightIn !== "number" || !Number.isFinite(input.heightIn)) {
    errors.heightIn = "Enter your height in inches.";
  } else if (input.heightIn < MIN_HEIGHT_INCHES || input.heightIn > MAX_HEIGHT_INCHES) {
    errors.heightIn = "Use a height between 19.7 and 98.4 inches.";
  }

  if (typeof input.age !== "number" || !Number.isFinite(input.age)) {
    errors.age = "Enter your age.";
  } else if (input.age < 13 || input.age > 120) {
    errors.age = "Use an age between 13 and 120 years.";
  }

  if (!input.activityLevel || !(input.activityLevel in ACTIVITY_MULTIPLIERS)) {
    errors.activityLevel = "Choose an activity level.";
  }

  if (!input.goal || !(input.goal in { maintain: true, cut: true, bulk: true })) {
    errors.goal = "Choose a goal.";
  }

  if (input.goal === "cut" || input.goal === "bulk") {
    if (typeof input.weeklyChange !== "number" || !Number.isFinite(input.weeklyChange) || input.weeklyChange <= 0) {
      errors.weeklyChange = "Enter a weekly body weight change greater than 0.";
    } else if (input.weeklyChangeUnit === "percent" && input.weeklyChange > 100) {
      errors.weeklyChange = "Use a percentage between 0 and 100.";
    } else if (input.weeklyChangeUnit === "pounds" && input.weeklyChange > (input.weightLb ?? 0)) {
      errors.weeklyChange = "Use a weekly change no greater than your body weight.";
    }

    if (!input.weeklyChangeUnit || !(input.weeklyChangeUnit in WEIGHT_CHANGE_UNITS)) {
      errors.weeklyChangeUnit = "Choose percent or pounds for the weekly change.";
    }
  }

  return errors;
}
export function calculateNutritionTargets(input: NutritionTargetInput): NutritionTargetResult {
  const errors = validateNutritionTargetInput(input);
  if (Object.keys(errors).length > 0) {
    return { ok: false, errors };
  }

  const weightKg = input.weightLb * POUNDS_TO_KILOGRAMS;
  const heightCm = input.heightIn * INCHES_TO_CENTIMETERS;
  const bmr = 10 * weightKg + 6.25 * heightCm - 5 * input.age + 5;
  const tdee = bmr * ACTIVITY_MULTIPLIERS[input.activityLevel];
  const weeklyChangePounds = input.goal === "maintain"
    ? 0
    : input.weeklyChangeUnit === "percent"
      ? input.weightLb * ((input.weeklyChange ?? 0) / 100)
      : input.weeklyChange ?? 0;
  const signedWeeklyChangePounds = input.goal === "cut" ? -weeklyChangePounds : weeklyChangePounds;
  const dailyCalorieAdjustment = signedWeeklyChangePounds * CALORIES_PER_POUND / DAYS_PER_WEEK;
  const targetCalories = tdee + dailyCalorieAdjustment;
  const proteinGrams = weightKg * 2;
  const fatGrams = weightKg * 0.8;
  const proteinCalories = proteinGrams * 4;
  const fatCalories = fatGrams * 9;
  const remainingCalories = targetCalories - proteinCalories - fatCalories;

  return {
    ok: true,
    targets: {
      bmr,
      tdee,
      targetCalories,
      weeklyChangePounds: signedWeeklyChangePounds,
      dailyCalorieAdjustment,
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
