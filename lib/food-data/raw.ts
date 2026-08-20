export type RawNutrient = {
  nutrientId?: number | string;
  nutrientName?: string;
  nutrientNumber?: number | string;
  nutrientUnit?: string;
  unitName?: string;
  amount?: number | string;
  value?: number | string;
  nutrient?: {
    id?: number | string;
    name?: string;
    unitName?: string;
  };
};

export type RawMeasureUnit = {
  name?: string;
  abbreviation?: string;
};

export type RawFoodPortion = {
  amount?: number | string;
  gramWeight?: number | string;
  portionDescription?: string;
  modifier?: string;
  measureUnit?: RawMeasureUnit;
};

export type RawInputFood = {
  foodDescription?: string;
  ingredientDescription?: string;
  description?: string;
  food?: { description?: string };
};

export type RawFoodRecord = {
  fdcId?: number | string;
  description?: string;
  foodClass?: string;
  dataType?: string;
  foodCode?: number | string;
  foodNutrients?: RawNutrient[];
  foodPortions?: RawFoodPortion[];
  inputFoods?: RawInputFood[];
  foodCategory?: { description?: string };
  wweiaFoodCategory?: { wweiaFoodCategoryDescription?: string };
};

export function asRawFoodRecord(value: unknown): RawFoodRecord | undefined {
  return typeof value === "object" && value !== null
    ? (value as RawFoodRecord)
    : undefined;
}
