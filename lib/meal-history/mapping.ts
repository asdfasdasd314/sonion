import type { MealRecord } from "@/lib/meal-history/types";
import type { Food, Meal, MealDay } from "@/lib/nutrition/types";

export function mapMealRecordToMeal(record: MealRecord): Meal {
  return {
    id: record.id,
    date: record.meal_date,
    time: record.meal_time,
    foods: record.meal_snapshot.items.map((item, index): Food => ({
      id: `${record.id}-${item.fdcId}-${index}`,
      name: item.foodName,
      fdcId: item.fdcId,
      portionUnits: item.portionUnits,
      portionKind: item.portionKind,
      estimatedMilliliters: item.estimatedMilliliters,
      estimatedGrams: item.estimatedGrams,
      densitySource: item.densitySource,
      macros: {
        calories: item.calories,
        protein: item.protein,
        fat: item.fat,
        carbohydrates: item.carbohydrates,
        fiber: item.fiber,
      },
    })),
  };
}

export function groupMealsByDate(records: MealRecord[]): MealDay[] {
  const meals = records
    .map(mapMealRecordToMeal)
    .sort((first, second) => compareLocalDateTime(second, first));
  const days = new Map<string, MealDay>();

  for (const meal of meals) {
    const day = days.get(meal.date);
    if (day) {
      day.meals.push(meal);
    } else {
      days.set(meal.date, { id: meal.date, date: meal.date, meals: [meal] });
    }
  }

  return [...days.values()];
}

function compareLocalDateTime(first: Pick<Meal, "date" | "time">, second: Pick<Meal, "date" | "time">) {
  return `${first.date}T${first.time}`.localeCompare(`${second.date}T${second.time}`);
}
