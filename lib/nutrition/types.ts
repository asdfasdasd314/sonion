import type { DensityProvenance, PortionKind } from "@/lib/meal-estimation/types";

export type NutritionValue = number | null;

export type MacroTotals = {
  calories: NutritionValue;
  protein: NutritionValue;
  fat: NutritionValue;
  carbohydrates: NutritionValue;
};

export type Food = {
  id: string;
  name: string;
  fdcId: number;
  portionUnits: number;
  portionKind: PortionKind;
  estimatedMilliliters: number;
  estimatedGrams: number;
  densitySource: DensityProvenance;
  macros: MacroTotals;
};

export type Meal = {
  id: string;
  date: string;
  time: string;
  foods: Food[];
};

export type MealDay = {
  id: string;
  date: string;
  meals: Meal[];
};

export type ActivityLevel =
  | "sedentary"
  | "lightly-active"
  | "moderately-active"
  | "very-active";

export type Goal = "maintain" | "cut" | "bulk";

export type WeightChangeUnit = "percent" | "pounds";
