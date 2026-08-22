import { z } from "zod";

import { MealEstimateSchema, type MealEstimate } from "@/lib/meal-estimation/types";

const LOCAL_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const LOCAL_TIME_PATTERN = /^(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isValidLocalDate(value: string): boolean {
  if (!LOCAL_DATE_PATTERN.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  return parsed.getUTCFullYear() === year && parsed.getUTCMonth() === month - 1 && parsed.getUTCDate() === day;
}

export function isValidLocalTime(value: string): boolean {
  return LOCAL_TIME_PATTERN.test(value);
}

export const LocalDateSchema = z.string().refine(isValidLocalDate, "Use a valid local date in YYYY-MM-DD format.");
export const LocalTimeSchema = z.string().refine(isValidLocalTime, "Use a local time in HH:mm or HH:mm:ss format.");

export const MealRecordSchema = z.object({
  id: z.string().regex(UUID_PATTERN),
  user_id: z.string().regex(UUID_PATTERN),
  meal_date: LocalDateSchema,
  meal_time: LocalTimeSchema,
  // Records created before meal descriptions were persisted have no prompt.
  meal_prompt: z.string().trim().min(1).max(2_000).nullable().optional(),
  meal_snapshot: MealEstimateSchema,
  created_at: z.string().min(1),
  updated_at: z.string().min(1),
}).strict();
export type MealRecord = z.infer<typeof MealRecordSchema>;

export const MealSaveBodySchema = z.object({
  mealDate: LocalDateSchema,
  mealTime: LocalTimeSchema,
  mealPrompt: z.string().trim().min(1).max(2_000),
  mealSnapshot: MealEstimateSchema,
}).strict();
export type MealSaveBody = z.infer<typeof MealSaveBodySchema>;

export const MealPatchBodySchema = z.object({
  mealDate: LocalDateSchema.optional(),
  mealTime: LocalTimeSchema.optional(),
  mealSnapshot: MealEstimateSchema.optional(),
}).strict().refine(
  (value) => value.mealDate !== undefined || value.mealTime !== undefined || value.mealSnapshot !== undefined,
  "Include at least one meal field to update.",
);
export type MealPatchBody = z.infer<typeof MealPatchBodySchema>;

export const MealRecordListSchema = z.object({ meals: z.array(MealRecordSchema) }).strict();

export function parseMealRecord(value: unknown): MealRecord | undefined {
  const parsed = MealRecordSchema.safeParse(value);
  return parsed.success ? parsed.data : undefined;
}

export function parseMealRecordList(value: unknown): MealRecord[] | undefined {
  const parsed = MealRecordListSchema.safeParse(value);
  return parsed.success ? parsed.data.meals : undefined;
}

export type MealSnapshot = MealEstimate;
