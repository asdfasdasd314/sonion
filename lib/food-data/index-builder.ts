import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import { normalizeFoundationFood, normalizeFnddsFood } from "./normalize";
import { asRawFoodRecord, type RawFoodRecord } from "./raw";
import type { NormalizedFood } from "./types";

export const FOOD_DATA_DIR = path.resolve(process.cwd(), "food-data");
export const FOUNDATION_DATA_PATH = path.join(
  FOOD_DATA_DIR,
  "FoodData_Central_foundation_food_json_2026-04-30.json",
);
export const FNDDS_DATA_PATH = path.join(FOOD_DATA_DIR, "surveyDownload.json");
export const RUNTIME_INDEX_PATH = path.join(FOOD_DATA_DIR, "food-index.json");

function setupError(label: string, filePath: string, cause?: unknown): Error {
  const suffix = cause instanceof Error ? ` (${cause.message})` : "";
  return new Error(
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

  const byId = new Map<number, NormalizedFood>();
  for (const food of [
    ...normalizeRecords(foundationRecords, normalizeFoundationFood),
    ...normalizeRecords(fnddsRecords, normalizeFnddsFood),
  ]) {
    if (!byId.has(food.fdcId)) byId.set(food.fdcId, food);
  }

  return [...byId.values()].sort(
    (left, right) =>
      compareText(left.description, right.description) ||
      compareText(left.dataset, right.dataset) ||
      left.fdcId - right.fdcId,
  );
}

export function writeFoodIndex(index: readonly NormalizedFood[]): void {
  mkdirSync(FOOD_DATA_DIR, { recursive: true });
  writeFileSync(RUNTIME_INDEX_PATH, JSON.stringify(index), "utf8");
}

export function buildAndWriteFoodIndex(): NormalizedFood[] {
  const index = buildFoodIndex();
  writeFoodIndex(index);
  return index;
}
