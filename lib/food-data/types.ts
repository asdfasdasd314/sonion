export type FoodDataset = "foundation" | "fndds";

export type NormalizedPortion = {
  description: string;
  gramWeight: number;
  amount?: number;
  unit?: string;
};

export type NormalizedNutrients = {
  caloriesKcal?: number;
  proteinG?: number;
  carbohydratesG?: number;
  fatG?: number;
  fiberG?: number;
};

export type NormalizedFood = {
  fdcId: number;
  description: string;
  dataset: FoodDataset;
  category?: string;
  foodCode?: string;
  nutrientsPer100g: NormalizedNutrients;
  portions: NormalizedPortion[];
  ingredients?: string[];
};

export type FoodSearchResult = {
  fdcId: number;
  description: string;
  dataset: FoodDataset;
  category?: string;
  score: number;
};

export type FoodToolError =
  | { error: "INVALID_ARGUMENTS"; message: string }
  | { error: "FOOD_NOT_FOUND" };
