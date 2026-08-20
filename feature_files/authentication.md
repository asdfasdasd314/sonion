# Supabase email/password authentication

## Summary

Sonion requires a Supabase email/password session before a user can access the meal interpreter. The browser owns the sign-in experience and session persistence, while the estimate route verifies the bearer token before processing a request so future user data can be scoped to the authenticated account.

## Key Points

- Supabase Auth REST endpoints provide sign-up, sign-in, refresh, and sign-out without adding an SDK dependency to this prototype.
- Sessions are stored in browser local storage and refreshed when they are within one minute of expiry.
- The Supabase URL and public anon key are client configuration; service-role keys must never be exposed to the browser.
- The estimate route rejects requests without a valid Supabase bearer token.
- Database tables, row-level security policies, and nutrition record persistence remain future work.

## Relevant Files

- `lib/supabase-auth.ts` owns Supabase Auth requests, session validation, and browser session storage.
- `components/auth-panel.tsx` provides the email/password sign-in and account creation UI.
- `app/page.tsx` restores the session, gates the dashboard, and passes the access token to the interpreter component.
- `app/api/estimate/route.ts` verifies the access token before calling Gemma.
- `.env.example` documents the required public Supabase environment values.
- `parameter_files/authentication.toml` records the authentication behavior for this feature.

## Dev Mode

HACKING

## State Log

- Added Supabase email/password auth, browser session restoration, authenticated UI gating, and bearer-token validation for meal interpretation.
