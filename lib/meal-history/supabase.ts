import { SupabaseConfigurationError } from "@/lib/supabase-auth";
import {
  parseMealRecord,
  type MealPatchBody,
  type MealRecord,
  type MealSaveBody,
} from "@/lib/meal-history/types";

const SUPABASE_REST_PATH = "/rest/v1/meals";

export class SupabaseMealError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "SupabaseMealError";
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
    return "Supabase could not complete that meal request.";
  }
  const values = payload as Record<string, unknown>;
  const message = [values.message, values.details, values.hint, values.error_description]
    .find((value): value is string => typeof value === "string" && value.trim().length > 0);
  return message?.trim() ?? "Supabase could not complete that meal request.";
}

async function mealRequest<T>(accessToken: string, path = "", options: RequestInit = {}): Promise<T> {
  const { anonKey, url } = getSupabaseRestConfig();
  const headers = new Headers(options.headers);
  headers.set("apikey", anonKey);
  headers.set("Authorization", `Bearer ${accessToken}`);
  headers.set("Accept", "application/json");
  if (options.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");

  const response = await fetch(`${url}${SUPABASE_REST_PATH}${path}`, { ...options, headers });
  const payload = await response.json().catch(() => null);
  if (!response.ok) throw new SupabaseMealError(getSupabaseErrorMessage(payload), response.status);
  return payload as T;
}

const MEAL_COLUMNS = "id,user_id,meal_date,meal_time,meal_snapshot,created_at,updated_at";

export async function listMeals(accessToken: string): Promise<MealRecord[]> {
  const payload = await mealRequest<unknown>(
    accessToken,
    `?select=${MEAL_COLUMNS}&order=meal_date.desc,meal_time.desc`,
  );
  if (!Array.isArray(payload)) throw new SupabaseMealError("Supabase returned an invalid meal history response.", 502);
  const records = payload.map(parseMealRecord);
  if (records.some((record) => record === undefined)) {
    throw new SupabaseMealError("Supabase returned an invalid meal history response.", 502);
  }
  return records as MealRecord[];
}

export async function saveMeal(accessToken: string, userId: string, input: MealSaveBody): Promise<MealRecord> {
  const payload = await mealRequest<unknown>(accessToken, `?select=${MEAL_COLUMNS}`, {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({
      user_id: userId,
      meal_date: input.mealDate,
      meal_time: input.mealTime,
      meal_snapshot: input.mealSnapshot,
    }),
  });
  const record = Array.isArray(payload) ? parseMealRecord(payload[0]) : undefined;
  if (!record) throw new SupabaseMealError("Supabase returned an invalid saved meal.", 502);
  return record;
}

export async function updateMeal(accessToken: string, id: string, input: MealPatchBody): Promise<MealRecord | null> {
  const payload = await mealRequest<unknown>(
    accessToken,
    `?id=eq.${encodeURIComponent(id)}&select=${MEAL_COLUMNS}`,
    {
      method: "PATCH",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({
        ...(input.mealDate === undefined ? {} : { meal_date: input.mealDate }),
        ...(input.mealTime === undefined ? {} : { meal_time: input.mealTime }),
        ...(input.mealSnapshot === undefined ? {} : { meal_snapshot: input.mealSnapshot }),
      }),
    },
  );
  if (!Array.isArray(payload) || payload.length === 0) return null;
  const record = parseMealRecord(payload[0]);
  if (!record) throw new SupabaseMealError("Supabase returned an invalid updated meal.", 502);
  return record;
}

export async function deleteMeal(accessToken: string, id: string) {
  await mealRequest(accessToken, `?id=eq.${encodeURIComponent(id)}`, {
    method: "DELETE",
    headers: { Prefer: "return=minimal" },
  });
}
