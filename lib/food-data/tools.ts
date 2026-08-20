import { z } from "zod";

import { getLoadedFoodById, loadFoodIndex } from "./loader";
import type {
  FoodSearchResult,
  FoodToolError,
  NormalizedFood,
} from "./types";

const SearchFoodsSchema = z.object({
  query: z.string().trim().min(1).max(200),
  limit: z.number().int().min(1).max(10).optional().default(5),
  dataset: z.enum(["all", "fndds", "foundation"]).optional().default("all"),
});

const GetFoodSchema = z.object({
  fdcId: z.number().int().positive(),
});

export type SearchFoodsResponse = { results: FoodSearchResult[] };
export type GetFoodResponse = NormalizedFood | { error: "FOOD_NOT_FOUND" };
export type FoodToolset = {
  searchFoods(input: unknown): SearchFoodsResponse | FoodToolError;
  getFood(input: unknown): GetFoodResponse | FoodToolError;
};

function invalidArguments(): FoodToolError {
  return { error: "INVALID_ARGUMENTS", message: "Invalid food tool arguments." };
}

function tokens(value: string): string[] {
  return value
    .normalize("NFKD")
    .toLocaleLowerCase("en-US")
    .replace(/[\u0300-\u036f]/g, "")
    .split(/[^\p{L}\p{N}]+/u)
    .filter(Boolean);
}

function matchingToken(queryToken: string, candidateTokens: readonly string[]): boolean {
  return candidateTokens.some(
    (candidateToken) =>
      candidateToken === queryToken ||
      candidateToken.startsWith(queryToken) ||
      queryToken.startsWith(candidateToken),
  );
}

function compareText(left: string, right: string): number {
  return left === right ? 0 : left < right ? -1 : 1;
}

function scoreFood(food: NormalizedFood, query: string): number {
  const normalizedDescription = tokens(food.description).join(" ");
  const normalizedQuery = tokens(query).join(" ");
  if (normalizedDescription === normalizedQuery) return 1;
  if (normalizedDescription.startsWith(normalizedQuery)) return 0.95;

  const queryTokens = tokens(query);
  const descriptionTokens = tokens(food.description);
  const categoryTokens = food.category ? tokens(food.category) : [];
  const matchedDescriptionTokens = queryTokens.filter((queryToken) =>
    matchingToken(queryToken, descriptionTokens),
  );
  const matchedCategoryTokens = queryTokens.filter((queryToken) =>
    matchingToken(queryToken, categoryTokens),
  );
  const descriptionOverlap = matchedDescriptionTokens.length / queryTokens.length;
  const categoryOverlap = matchedCategoryTokens.length / queryTokens.length;

  if (descriptionOverlap === 1) return 0.85 + 0.05 / Math.max(descriptionTokens.length, 1);
  if (descriptionOverlap > 0) return 0.45 + descriptionOverlap * 0.25 + categoryOverlap * 0.1;
  if (categoryOverlap > 0) return 0.25 + categoryOverlap * 0.2;
  return 0;
}

function searchFoodsInIndex(
  input: unknown,
  index: readonly NormalizedFood[],
): SearchFoodsResponse | FoodToolError {
  const parsed = SearchFoodsSchema.safeParse(input);
  if (!parsed.success) return invalidArguments();

  const { query, limit, dataset } = parsed.data;
  const results = index
    .filter((food) => dataset === "all" || food.dataset === dataset)
    .map((food) => ({ food, score: scoreFood(food, query) }))
    .filter((candidate) => candidate.score > 0)
    .sort(
      (left, right) =>
        right.score - left.score ||
        compareText(left.food.description, right.food.description) ||
        compareText(left.food.dataset, right.food.dataset) ||
        left.food.fdcId - right.food.fdcId,
    )
    .slice(0, limit)
    .map(({ food, score }) => ({
      fdcId: food.fdcId,
      description: food.description,
      dataset: food.dataset,
      ...(food.category ? { category: food.category } : {}),
      score: Math.round(score * 1_000) / 1_000,
    }));

  return { results };
}

export function createFoodTools(index: readonly NormalizedFood[]): FoodToolset {
  const foodsById = new Map(index.map((food) => [food.fdcId, food]));
  return {
    searchFoods: (input) => searchFoodsInIndex(input, index),
    getFood: (input) => {
      const parsed = GetFoodSchema.safeParse(input);
      if (!parsed.success) return invalidArguments();
      return foodsById.get(parsed.data.fdcId) ?? { error: "FOOD_NOT_FOUND" };
    },
  };
}

let defaultTools: FoodToolset | undefined;

function getDefaultTools(): FoodToolset {
  if (!defaultTools) defaultTools = createFoodTools(loadFoodIndex());
  return defaultTools;
}

export function searchFoods(input: unknown): SearchFoodsResponse | FoodToolError {
  return getDefaultTools().searchFoods(input);
}

export function getFood(input: unknown): GetFoodResponse | FoodToolError {
  const parsed = GetFoodSchema.safeParse(input);
  if (!parsed.success) return invalidArguments();
  return getLoadedFoodById(parsed.data.fdcId) ?? { error: "FOOD_NOT_FOUND" };
}
