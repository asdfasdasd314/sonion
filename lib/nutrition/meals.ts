import type { Food, Meal, MealDay, MacroTotals } from "@/lib/nutrition/types";

export const SEEDED_MEAL_DAYS: MealDay[] = [
  {
    id: "2026-08-20",
    date: "2026-08-20",
    meals: [
      {
        id: "2026-08-20-breakfast",
        name: "Breakfast",
        time: "8:10 AM",
        foods: [
          { id: "oats", name: "Overnight oats", macros: { calories: 380, protein: 18, fat: 12, carbohydrates: 52 } },
          { id: "berries", name: "Blueberries", macros: { calories: 84, protein: 1, fat: 0, carbohydrates: 21 } },
        ],
      },
      {
        id: "2026-08-20-lunch",
        name: "Lunch",
        time: "12:35 PM",
        foods: [
          { id: "chicken-bowl", name: "Chicken rice bowl", macros: { calories: 620, protein: 46, fat: 18, carbohydrates: 67 } },
          { id: "avocado", name: "Half an avocado", macros: { calories: 160, protein: 2, fat: 15, carbohydrates: 9 } },
        ],
      },
      {
        id: "2026-08-20-dinner",
        name: "Dinner",
        time: "7:05 PM",
        foods: [
          { id: "salmon", name: "Roasted salmon", macros: { calories: 412, protein: 42, fat: 26, carbohydrates: 0 } },
          { id: "potatoes", name: "Crispy potatoes", macros: { calories: 280, protein: 6, fat: 9, carbohydrates: 44 } },
          { id: "green-beans", name: "Green beans", macros: { calories: 55, protein: 3, fat: 0, carbohydrates: 12 } },
        ],
      },
    ],
  },
  {
    id: "2026-08-19",
    date: "2026-08-19",
    meals: [
      {
        id: "2026-08-19-breakfast",
        name: "Breakfast",
        time: "7:45 AM",
        foods: [
          { id: "eggs", name: "Two eggs and toast", macros: { calories: 390, protein: 24, fat: 19, carbohydrates: 31 } },
          { id: "orange", name: "Orange", macros: { calories: 62, protein: 1, fat: 0, carbohydrates: 15 } },
        ],
      },
      {
        id: "2026-08-19-lunch",
        name: "Lunch",
        time: "1:00 PM",
        foods: [
          { id: "turkey-wrap", name: "Turkey wrap", macros: { calories: 510, protein: 35, fat: 17, carbohydrates: 54 } },
          { id: "carrots", name: "Carrots and hummus", macros: { calories: 190, protein: 6, fat: 10, carbohydrates: 21 } },
        ],
      },
      {
        id: "2026-08-19-dinner",
        name: "Dinner",
        time: "6:40 PM",
        foods: [
          { id: "beef-pasta", name: "Beef tomato pasta", macros: { calories: 760, protein: 43, fat: 25, carbohydrates: 88 } },
          { id: "side-salad", name: "Side salad", macros: { calories: 120, protein: 3, fat: 8, carbohydrates: 10 } },
        ],
      },
    ],
  },
  {
    id: "2026-08-18",
    date: "2026-08-18",
    meals: [
      {
        id: "2026-08-18-breakfast",
        name: "Breakfast",
        time: "8:30 AM",
        foods: [{ id: "yogurt", name: "Greek yogurt with granola", macros: { calories: 420, protein: 28, fat: 11, carbohydrates: 53 } }],
      },
      {
        id: "2026-08-18-lunch",
        name: "Lunch",
        time: "12:20 PM",
        foods: [{ id: "tuna-sandwich", name: "Tuna sandwich", macros: { calories: 580, protein: 38, fat: 22, carbohydrates: 58 } }],
      },
      {
        id: "2026-08-18-dinner",
        name: "Dinner",
        time: "7:25 PM",
        foods: [{ id: "tofu-stir-fry", name: "Tofu stir-fry with rice", macros: { calories: 690, protein: 31, fat: 23, carbohydrates: 88 } }],
      },
    ],
  },
  {
    id: "2026-08-17",
    date: "2026-08-17",
    meals: [
      {
        id: "2026-08-17-breakfast",
        name: "Breakfast",
        time: "9:00 AM",
        foods: [{ id: "smoothie", name: "Banana peanut butter smoothie", macros: { calories: 510, protein: 29, fat: 21, carbohydrates: 56 } }],
      },
      {
        id: "2026-08-17-lunch",
        name: "Lunch",
        time: "1:15 PM",
        foods: [{ id: "grain-bowl", name: "Roasted vegetable grain bowl", macros: { calories: 640, protein: 22, fat: 19, carbohydrates: 91 } }],
      },
      {
        id: "2026-08-17-dinner",
        name: "Dinner",
        time: "6:55 PM",
        foods: [{ id: "shrimp-tacos", name: "Shrimp tacos", macros: { calories: 720, protein: 46, fat: 24, carbohydrates: 79 } }],
      },
    ],
  },
];

const EMPTY_MACROS: MacroTotals = { calories: 0, protein: 0, fat: 0, carbohydrates: 0 };

export function addMacroTotals(first: MacroTotals, second: MacroTotals): MacroTotals {
  return {
    calories: first.calories + second.calories,
    protein: first.protein + second.protein,
    fat: first.fat + second.fat,
    carbohydrates: first.carbohydrates + second.carbohydrates,
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
