const SUPABASE_AUTH_PATH = "/auth/v1";
const SESSION_STORAGE_KEY = "sonion.supabase.auth.session";

export type SupabaseUser = {
  id: string;
  email?: string;
};

export type SupabaseSession = {
  access_token: string;
  refresh_token: string;
  expires_at?: number;
  user: SupabaseUser;
};

export type AuthResult = {
  session: SupabaseSession | null;
  user: SupabaseUser | null;
};

type AuthResponse = {
  access_token?: unknown;
  refresh_token?: unknown;
  expires_at?: unknown;
  user?: unknown;
};

type AuthErrorResponse = {
  error?: unknown;
  error_description?: unknown;
  msg?: unknown;
  message?: unknown;
};

export class SupabaseConfigurationError extends Error {
  constructor() {
    super("Supabase is not configured. Add the public Supabase values to your environment and restart the app.");
    this.name = "SupabaseConfigurationError";
  }
}

export class SupabaseAuthError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "SupabaseAuthError";
    this.status = status;
  }
}

function getSupabaseUrl() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

  if (!url || !anonKey) {
    throw new SupabaseConfigurationError();
  }

  return { anonKey, url: url.replace(/\/$/, "") };
}

function isSupabaseUser(value: unknown): value is SupabaseUser {
  return (
    typeof value === "object" &&
    value !== null &&
    "id" in value &&
    typeof value.id === "string" &&
    (!("email" in value) || typeof value.email === "string" || value.email === null)
  );
}

function isSupabaseSession(value: unknown): value is SupabaseSession {
  return (
    typeof value === "object" &&
    value !== null &&
    "access_token" in value &&
    typeof value.access_token === "string" &&
    "refresh_token" in value &&
    typeof value.refresh_token === "string" &&
    "user" in value &&
    isSupabaseUser(value.user)
  );
}

function authResult(payload: AuthResponse): AuthResult {
  const session = isSupabaseSession(payload) ? payload : null;
  const user = isSupabaseUser(payload.user) ? payload.user : session?.user ?? null;

  return { session, user };
}

function getErrorMessage(payload: unknown, fallback: string) {
  if (typeof payload !== "object" || payload === null) {
    return fallback;
  }

  const errorPayload = payload as AuthErrorResponse;
  const message = [
    errorPayload.error_description,
    errorPayload.msg,
    errorPayload.message,
    errorPayload.error,
  ].find((value): value is string => typeof value === "string" && value.trim().length > 0);

  return message?.trim() ?? fallback;
}

async function authRequest<T>(
  path: string,
  options: RequestInit = {},
  accessToken?: string,
): Promise<T> {
  const { anonKey, url } = getSupabaseUrl();
  const headers = new Headers(options.headers);
  headers.set("apikey", anonKey);

  if (accessToken) {
    headers.set("Authorization", `Bearer ${accessToken}`);
  }

  if (options.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(`${url}${SUPABASE_AUTH_PATH}/${path}`, {
    ...options,
    headers,
  });
  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new SupabaseAuthError(
      getErrorMessage(payload, "Supabase could not complete that authentication request."),
      response.status,
    );
  }

  return payload as T;
}

export async function signInWithPassword(email: string, password: string) {
  const payload = await authRequest<AuthResponse>("token?grant_type=password", {
    body: JSON.stringify({ email, password }),
    method: "POST",
  });

  return authResult(payload);
}

export async function signUpWithPassword(email: string, password: string) {
  const payload = await authRequest<AuthResponse>("signup", {
    body: JSON.stringify({ email, password }),
    method: "POST",
  });

  return authResult(payload);
}

export async function refreshSupabaseSession(refreshToken: string) {
  const payload = await authRequest<AuthResponse>("token?grant_type=refresh_token", {
    body: JSON.stringify({ refresh_token: refreshToken }),
    method: "POST",
  });

  return authResult(payload);
}

export async function signOut(accessToken: string) {
  await authRequest("logout", { method: "POST" }, accessToken);
}

export async function getSupabaseUser(accessToken: string) {
  return authRequest<SupabaseUser>("user", { method: "GET" }, accessToken);
}

export function loadStoredSession() {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const storedSession = window.localStorage.getItem(SESSION_STORAGE_KEY);
    if (!storedSession) {
      return null;
    }

    const parsedSession: unknown = JSON.parse(storedSession);
    return isSupabaseSession(parsedSession) ? parsedSession : null;
  } catch {
    return null;
  }
}

export function saveStoredSession(session: SupabaseSession) {
  window.localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
}

export function clearStoredSession() {
  window.localStorage.removeItem(SESSION_STORAGE_KEY);
}

