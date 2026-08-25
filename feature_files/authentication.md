# Supabase email/password authentication

## Summary

Sonion requires a Supabase email/password session before a user can access the meal interpreter or private meal history. The browser owns the sign-in experience and session persistence, while server routes verify the bearer token before processing estimates or persistence requests.

## Key Points

- Supabase Auth REST endpoints provide sign-up, sign-in, refresh, and sign-out without adding an SDK dependency to this prototype.
- Sessions are stored in browser local storage and refreshed when they are within one minute of expiry.
- The Supabase URL and public anon key are client configuration; service-role keys must never be exposed to the browser.
- The estimate route rejects requests without a valid Supabase bearer token.
- Meal routes verify the bearer token with Supabase Auth and derive ownership from the verified user; a client-supplied user ID is never trusted.
- Meal and interpretation-error row-level security permit each authenticated user to select, insert, update, and delete only their own records. Trusted service-role administration relies on Supabase's native RLS bypass and is not exposed by the browser.

## Relevant Files

- `lib/supabase-auth.ts` owns Supabase Auth requests, session validation, and browser session storage.
- `components/auth-panel.tsx` provides the email/password sign-in and account creation UI.
- `app/page.tsx` restores the session, gates the dashboard, and passes the access token to the interpreter component.
- `app/api/estimate/route.ts` verifies the access token before calling Gemma and before queuing automatic batches or refinements.
- `app/api/meals/route.ts` and `app/api/meals/[id]/route.ts` verify the access token before accessing persisted meals.
- `app/api/interpretation-errors/route.ts` and `app/api/interpretation-errors/[id]/route.ts` verify the access token before listing or dismissing interpretation errors.
- `supabase/migrations/20260821000000_create_meals.sql` defines the owner-scoped meals table and RLS policies.
- `supabase/migrations/20260823200000_create_interpretation_errors.sql` defines the owner-scoped interpretation errors table and RLS policies.
- `.env.example` documents the required public Supabase environment values.
- `parameter_files/authentication.toml` records the authentication behavior for this feature.

## Dev Mode

HACKING

## State Log

- Added Supabase email/password auth, browser session restoration, authenticated UI gating, and bearer-token validation for meal interpretation.
- Added bearer-token ownership checks for persistent meal history and documented the service-role/RLS boundary.
- Extended the same bearer + RLS ownership pattern to interpretation-error list/insert/dismiss for automatic processing failures.
