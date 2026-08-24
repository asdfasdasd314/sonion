# Interpretation errors

## Summary

Owner-scoped interpretation failure records capture Interpret-and-Save background failures so they are visible in the dashboard without checking deployment or database logs. Successful auto-saves write normal `meals` rows and do not create error rows.

## Key Points

- The `interpretation_errors` table stores source, bounded prompt text, optional local meal date/time, a stable error code, a user-safe message, optional truncated diagnostics, and soft-dismiss via `dismissed_at`.
- Inserts use the verified user JWT through PostgREST with the anon key; there is no browser-exposed service role.
- `GET /api/interpretation-errors` returns the current user's open errors newest first. `PATCH /api/interpretation-errors/[id]` sets `dismissed_at`.
- Failure mapping covers agent, estimation, food-data setup, auth/config, and post-estimate save failures without storing API keys.
- The dashboard shows a separate expandable errors section and light-polls for new rows while authenticated.

## Relevant Files

- `supabase/migrations/20260823200000_create_interpretation_errors.sql` defines the table, index, grants, and RLS policies.
- `lib/interpretation-errors/` owns types, bounds, failure mapping, config, and PostgREST helpers.
- `app/api/interpretation-errors/route.ts` and `app/api/interpretation-errors/[id]/route.ts` expose list and dismiss endpoints.
- `components/interpretation-errors.tsx` renders the expandable dashboard section.
- `parameter_files/interpretation-errors.toml` records truncation and source-label tunables.
- `test/interpretation-errors.test.ts` and `test/interpretation-errors-api.test.ts` cover mapping and route auth/list/dismiss behavior.

## Dev Mode

TESTING

## State Log

- Added owner-scoped interpretation error persistence, authenticated list/dismiss APIs, failure mapping, and a dashboard errors section for Interpret and Save.
