import { SupabaseConfigurationError } from "@/lib/supabase-auth";
import {
  parseSavedNutritionTargetResponse,
  SavedNutritionTargetSchema,
  type SavedNutritionTarget,
} from "@/lib/nutrition/target-history";
import type { NutritionTargets } from "@/lib/nutrition/targets";

const SUPABASE_REST_PATH = "/rest/v1/nutrition_targets";
const TARGET_COLUMNS = "user_id,target_snapshot,created_at,updated_at";

export class SupabaseNutritionTargetError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "SupabaseNutritionTargetError";
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
    return "Supabase could not complete that target request.";
  }
  const values = payload as Record<string, unknown>;
  const message = [values.message, values.details, values.hint, values.error_description]
    .find((value): value is string => typeof value === "string" && value.trim().length > 0);
  return message?.trim() ?? "Supabase could not complete that target request.";
}

async function targetRequest<T>(accessToken: string, path = "", options: RequestInit = {}): Promise<T> {
  const { anonKey, url } = getSupabaseRestConfig();
  const headers = new Headers(options.headers);
  headers.set("apikey", anonKey);
  headers.set("Authorization", `Bearer ${accessToken}`);
  headers.set("Accept", "application/json");
  if (options.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");

  const response = await fetch(`${url}${SUPABASE_REST_PATH}${path}`, { ...options, headers });
  const payload = await response.json().catch(() => null);
  if (!response.ok) throw new SupabaseNutritionTargetError(getSupabaseErrorMessage(payload), response.status);
  return payload as T;
}

export async function getNutritionTarget(accessToken: string): Promise<SavedNutritionTarget | null> {
  const payload = await targetRequest<unknown>(accessToken, `?select=${TARGET_COLUMNS}&limit=1`);
  if (!Array.isArray(payload)) {
    throw new SupabaseNutritionTargetError("Supabase returned an invalid nutrition target response.", 502);
  }
  const response = parseSavedNutritionTargetResponse({ target: payload[0] ?? null });
  if (response === undefined) {
    throw new SupabaseNutritionTargetError("Supabase returned an invalid nutrition target response.", 502);
  }
  return response;
}

export async function saveNutritionTarget(
  accessToken: string,
  userId: string,
  targets: NutritionTargets,
): Promise<SavedNutritionTarget> {
  const payload = await targetRequest<unknown>(accessToken, `?on_conflict=user_id&select=${TARGET_COLUMNS}`, {
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates,return=representation" },
    body: JSON.stringify({ user_id: userId, target_snapshot: targets }),
  });
  const record = Array.isArray(payload) ? SavedNutritionTargetSchema.safeParse(payload[0]) : undefined;
  if (!record || !record.success) {
    throw new SupabaseNutritionTargetError("Supabase returned an invalid saved nutrition target.", 502);
  }
  return record.data;
}
