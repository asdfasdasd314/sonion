import {
  getSupabaseUser,
  SupabaseAuthError,
  SupabaseConfigurationError,
  type SupabaseUser,
} from "@/lib/supabase-auth";

export class MealRequestAuthError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "MealRequestAuthError";
    this.status = status;
  }
}

export function getBearerToken(request: Request): string | undefined {
  return request.headers.get("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1]?.trim();
}

export async function authenticateMealRequest(request: Request, resource = "meal history"): Promise<{ accessToken: string; user: SupabaseUser }> {
  const accessToken = getBearerToken(request);
  if (!accessToken) throw new MealRequestAuthError(`Sign in before accessing ${resource}.`, 401);

  try {
    const user = await getSupabaseUser(accessToken);
    return { accessToken, user };
  } catch (error) {
    if (error instanceof SupabaseConfigurationError) {
      throw new MealRequestAuthError(
        "Supabase is not configured yet. Add the public Supabase values to your local environment and restart the app.",
        503,
      );
    }
    if (error instanceof SupabaseAuthError && error.status < 500) {
      throw new MealRequestAuthError("Your session is invalid or expired. Sign in again.", 401);
    }
    throw new MealRequestAuthError("Supabase could not verify your session. Try again shortly.", 503);
  }
}
