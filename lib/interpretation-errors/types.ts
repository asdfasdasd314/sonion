import { z } from "zod";

import { LocalDateSchema, LocalTimeSchema } from "@/lib/meal-history/types";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const InterpretationErrorRecordSchema = z.object({
  id: z.string().regex(UUID_PATTERN),
  user_id: z.string().regex(UUID_PATTERN),
  created_at: z.string().min(1),
  source: z.string().min(1),
  prompt: z.string().min(1),
  meal_date: LocalDateSchema.nullable(),
  meal_time: LocalTimeSchema.nullable(),
  error_code: z.string().min(1),
  error_message: z.string().min(1),
  diagnostics: z.record(z.string(), z.unknown()).nullable().optional(),
  dismissed_at: z.string().nullable().optional(),
}).strict();
export type InterpretationErrorRecord = z.infer<typeof InterpretationErrorRecordSchema>;

export const InterpretationErrorListSchema = z.object({
  errors: z.array(InterpretationErrorRecordSchema),
}).strict();

export const InterpretationErrorInsertSchema = z.object({
  source: z.string().min(1),
  prompt: z.string().min(1),
  mealDate: LocalDateSchema.nullable().optional(),
  mealTime: LocalTimeSchema.nullable().optional(),
  errorCode: z.string().min(1),
  errorMessage: z.string().min(1),
  diagnostics: z.record(z.string(), z.unknown()).nullable().optional(),
}).strict();
export type InterpretationErrorInsert = z.infer<typeof InterpretationErrorInsertSchema>;

export function parseInterpretationErrorRecord(value: unknown): InterpretationErrorRecord | undefined {
  const parsed = InterpretationErrorRecordSchema.safeParse(value);
  return parsed.success ? parsed.data : undefined;
}

export function parseInterpretationErrorList(value: unknown): InterpretationErrorRecord[] | undefined {
  const parsed = InterpretationErrorListSchema.safeParse(value);
  return parsed.success ? parsed.data.errors : undefined;
}
