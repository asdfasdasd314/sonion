import type { Food, Meal, MacroTotals, NutritionValue } from "@/lib/nutrition/types";

const EMPTY_MACROS: MacroTotals = { calories: null, protein: null, fat: null, carbohydrates: null };

function addNullable(first: NutritionValue, second: NutritionValue): NutritionValue {
  if (first === null && second === null) return null;
  return (first ?? 0) + (second ?? 0);
}

export function addMacroTotals(first: MacroTotals, second: MacroTotals): MacroTotals {
  return {
    calories: addNullable(first.calories, second.calories),
    protein: addNullable(first.protein, second.protein),
    fat: addNullable(first.fat, second.fat),
    carbohydrates: addNullable(first.carbohydrates, second.carbohydrates),
  };
}

export function aggregateFoods(foods: Food[]): MacroTotals {
  return foods.reduce((totals, food) => addMacroTotals(totals, food.macros), EMPTY_MACROS);
}

export function aggregateMealMacros(meal: Meal): MacroTotals {
  return aggregateFoods(meal.foods);
}

export function aggregateDailyMacros(meals: Meal[]): MacroTotals {
  return meals.reduce((totals, meal) => addMacroTotals(totals, aggregateMealMacros(meal)), EMPTY_MACROS);
}

export function formatMacroValue(value: NutritionValue, suffix = "", maximumFractionDigits = 1) {
  return value === null ? "—" : `${value.toLocaleString(undefined, { maximumFractionDigits })}${suffix}`;
}
