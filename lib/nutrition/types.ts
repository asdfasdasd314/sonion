export type MacroTotals = {
  calories: number;
  protein: number;
  fat: number;
  carbohydrates: number;
};

export type Food = {
  id: string;
  name: string;
  macros: MacroTotals;
};

export type Meal = {
  id: string;
  name: string;
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
