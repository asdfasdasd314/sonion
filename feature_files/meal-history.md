# Supabase meal history

## Summary

Meal history persists each processed estimate as an owner-scoped JSONB snapshot. A record has only its UUID, verified user ownership, local eating date/time, audit timestamps, and the complete estimate; it has no breakfast/lunch/dinner title.

## Key Points

- `meal_snapshot` reuses `MealEstimateSchema`, preserving food identity, FDC IDs, Portion Units, portion kind, volume, grams, density provenance, nullable nutrients, and totals atomically.
- `meal_date` and `meal_time` are native local `date` and `time without time zone` columns. Audit timestamps are UTC.
- Supabase RLS and API authorization restrict normal browser requests to the verified owner. Service-role access is a trusted administrative boundary and is not exposed in this slice.
- GET returns the current user's records in local date/time descending order. PATCH and DELETE are available for future callers but have no dashboard controls yet.

## Relevant Files

- `supabase/migrations/20260821000000_create_meals.sql` defines the table, index, trigger, grants, and RLS policies.
- `lib/meal-history/types.ts` validates persisted records and local date/time input.
- `lib/meal-history/supabase.ts` implements authenticated PostgREST requests.
- `lib/meal-history/mapping.ts` maps records into UI date groups.
- `lib/meal-history/save.ts` defines save-state transitions and duplicate-submit protection.
- `app/api/meals/route.ts` handles authenticated list/save operations.
- `app/api/meals/[id]/route.ts` handles ownership-safe future update/delete operations.
- `test/meal-history.test.ts` covers validation, mapping, ordering, nullable aggregation, and save-state behavior.
- `parameter_files/meal-history.toml` records the persistence contract.

## Dev Mode

TESTING

## State Log

- Created owner-scoped Supabase meal persistence with processed estimate snapshots, local date/time fields, API authorization, and history mapping.
- Added isolated meal API test configuration so mocked auth/PostgREST requests exercise the route handlers without weakening production Supabase configuration checks.
