import { SupabaseConfigurationError } from "@/lib/supabase-auth";

import {
  parseInterpretationErrorRecord,
  type InterpretationErrorInsert,
  type InterpretationErrorRecord,
} from "./types";

const SUPABASE_REST_PATH = "/rest/v1/interpretation_errors";
const ERROR_COLUMNS =
  "id,user_id,created_at,source,prompt,meal_date,meal_time,error_code,error_message,diagnostics,dismissed_at";

export class SupabaseInterpretationError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "SupabaseInterpretationError";
    this.status = status;
  }
}

function getSupabaseRestConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!url || !anonKey) throw new SupabaseConfigurationError();
  return { anonKey, url: url.replace(/\/$/, "") };
}

function getSupabaseErrorMessage(payload: unknown) {
  if (typeof payload !== "object" || payload === null) {
    return "Supabase could not complete that interpretation-error request.";
  }
  const values = payload as Record<string, unknown>;
  const message = [values.message, values.details, values.hint, values.error_description]
    .find((value): value is string => typeof value === "string" && value.trim().length > 0);
  return message?.trim() ?? "Supabase could not complete that interpretation-error request.";
}

async function interpretationErrorRequest<T>(
  accessToken: string,
  path = "",
  options: RequestInit = {},
): Promise<T> {
  const { anonKey, url } = getSupabaseRestConfig();
  const headers = new Headers(options.headers);
  headers.set("apikey", anonKey);
  headers.set("Authorization", `Bearer ${accessToken}`);
  headers.set("Accept", "application/json");
  if (options.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");

  const response = await fetch(`${url}${SUPABASE_REST_PATH}${path}`, { ...options, headers });
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new SupabaseInterpretationError(getSupabaseErrorMessage(payload), response.status);
  }
  return payload as T;
}

export async function listInterpretationErrors(
  accessToken: string,
  options: { includeDismissed?: boolean } = {},
): Promise<InterpretationErrorRecord[]> {
  const dismissedFilter = options.includeDismissed ? "" : "&dismissed_at=is.null";
  const payload = await interpretationErrorRequest<unknown>(
    accessToken,
    `?select=${ERROR_COLUMNS}${dismissedFilter}&order=created_at.desc`,
  );
  if (!Array.isArray(payload)) {
    throw new SupabaseInterpretationError("Supabase returned an invalid interpretation-error list.", 502);
  }
  const records = payload.map(parseInterpretationErrorRecord);
  if (records.some((record) => record === undefined)) {
    throw new SupabaseInterpretationError("Supabase returned an invalid interpretation-error list.", 502);
  }
  return records as InterpretationErrorRecord[];
}

export async function insertInterpretationError(
  accessToken: string,
  userId: string,
  input: InterpretationErrorInsert,
): Promise<InterpretationErrorRecord> {
  const payload = await interpretationErrorRequest<unknown>(accessToken, `?select=${ERROR_COLUMNS}`, {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({
      user_id: userId,
      source: input.source,
      prompt: input.prompt,
      meal_date: input.mealDate ?? null,
      meal_time: input.mealTime ?? null,
      error_code: input.errorCode,
      error_message: input.errorMessage,
      diagnostics: input.diagnostics ?? null,
    }),
  });
  const record = Array.isArray(payload) ? parseInterpretationErrorRecord(payload[0]) : undefined;
  if (!record) {
    throw new SupabaseInterpretationError("Supabase returned an invalid interpretation-error row.", 502);
  }
  return record;
}

export async function dismissInterpretationError(
  accessToken: string,
  id: string,
): Promise<InterpretationErrorRecord | null> {
  const payload = await interpretationErrorRequest<unknown>(
    accessToken,
    `?id=eq.${encodeURIComponent(id)}&select=${ERROR_COLUMNS}`,
    {
      method: "PATCH",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({ dismissed_at: new Date().toISOString() }),
    },
  );
  if (!Array.isArray(payload) || payload.length === 0) return null;
  const record = parseInterpretationErrorRecord(payload[0]);
  if (!record) {
    throw new SupabaseInterpretationError("Supabase returned an invalid dismissed interpretation-error row.", 502);
  }
  return record;
}
