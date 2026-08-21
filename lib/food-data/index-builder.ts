import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import { normalizeFoundationFood, normalizeFnddsFood } from "./normalize";
import { asRawFoodRecord, type RawFoodRecord } from "./raw";
import type { NormalizedFood } from "./types";
import { FoodDataSetupError } from "./errors";

export const FOOD_DATA_DIR = path.resolve(process.cwd(), "food-data");
export const FOUNDATION_DATA_PATH = path.join(
  FOOD_DATA_DIR,
  "FoodData_Central_foundation_food_json_2026-04-30.json",
);
export const FNDDS_DATA_PATH = path.join(FOOD_DATA_DIR, "surveyDownload.json");
export const RUNTIME_INDEX_PATH = path.join(FOOD_DATA_DIR, "food-index.json");

function setupError(label: string, filePath: string, cause?: unknown): FoodDataSetupError {
  const suffix = cause instanceof Error ? ` (${cause.message})` : "";
  return new FoodDataSetupError(
    `Food data setup error: ${label} is unavailable at ${filePath}. ` +
      `Place the gitignored USDA input there before running the food-data index command${suffix}`,
  );
}

function readJson(filePath: string, label: string): unknown {
  if (!existsSync(filePath)) throw setupError(label, filePath);

  try {
    return JSON.parse(readFileSync(filePath, "utf8")) as unknown;
  } catch (error) {
    throw setupError(label, filePath, error);
  }
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return typeof value === "object" && value !== null
    ? (value as Record<string, unknown>)
    : undefined;
}

function extractRecords(payload: unknown, keys: readonly string[]): RawFoodRecord[] {
  if (Array.isArray(payload)) {
    return payload
      .map(asRawFoodRecord)
      .filter((record): record is RawFoodRecord => record !== undefined);
  }

  const record = asRecord(payload);
  if (!record) return [];

  for (const key of keys) {
    const value = record[key];
    if (Array.isArray(value)) {
      return value
        .map(asRawFoodRecord)
        .filter((item): item is RawFoodRecord => item !== undefined);
    }
  }

  return [];
}

function normalizeRecords(
  records: readonly RawFoodRecord[],
  normalize: (record: RawFoodRecord) => NormalizedFood | undefined,
): NormalizedFood[] {
  return records
    .map(normalize)
    .filter((food): food is NormalizedFood => food !== undefined);
}

function compareText(left: string, right: string): number {
  return left === right ? 0 : left < right ? -1 : 1;
}

export function buildFoodIndex(): NormalizedFood[] {
  const foundationRecords = extractRecords(
    readJson(FOUNDATION_DATA_PATH, "Foundation Foods JSON"),
    ["FoundationFoods", "foundationFoods", "foods"],
  );
  const fnddsRecords = extractRecords(
    readJson(FNDDS_DATA_PATH, "FNDDS / Survey Foods JSON"),
    ["SurveyFoods", "surveyFoods", "foods"],
  );

  if (foundationRecords.length === 0 && fnddsRecords.length === 0) {
    throw new FoodDataSetupError(
      "Food data setup error: the USDA input files contain no usable food records. " +
        "Check the Foundation Foods and FNDDS JSON files, then run npm run food-data:index.",
    );
  }

  const byId = new Map<number, NormalizedFood>();
  for (const food of [
    ...normalizeRecords(foundationRecords, normalizeFoundationFood),
    ...normalizeRecords(fnddsRecords, normalizeFnddsFood),
  ]) {
    if (!byId.has(food.fdcId)) byId.set(food.fdcId, food);
  }

  const index = [...byId.values()].sort(
    (left, right) =>
      compareText(left.description, right.description) ||
      compareText(left.dataset, right.dataset) ||
      left.fdcId - right.fdcId,
  );

  if (index.length === 0) {
    throw new FoodDataSetupError(
      "Food data setup error: the USDA input files contain no normalizable food records. " +
        "Check the input contents, then run npm run food-data:index.",
    );
  }

  return index;
}

export function writeFoodIndex(index: readonly NormalizedFood[]): void {
  try {
    mkdirSync(FOOD_DATA_DIR, { recursive: true });
    writeFileSync(RUNTIME_INDEX_PATH, JSON.stringify(index), "utf8");
  } catch (error) {
    throw new FoodDataSetupError(
      `Food data setup error: generated index could not be written at ${RUNTIME_INDEX_PATH}. ` +
        "Make food-data writable, then run npm run food-data:index.",
      { cause: error },
    );
  }
}

export function buildAndWriteFoodIndex(): NormalizedFood[] {
  const index = buildFoodIndex();
  writeFoodIndex(index);
  return index;
}
