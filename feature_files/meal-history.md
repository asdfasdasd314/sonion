# Supabase meal history

## Summary

Meal history persists each processed estimate as an owner-scoped JSONB snapshot. A record has its UUID, verified user ownership, local eating date/time, audit timestamps, and the complete estimate; an existing original meal description may be retained when available, but it is not required and it has no breakfast/lunch/dinner title.

## Key Points

- `meal_snapshot` reuses `MealEstimateSchema`, preserving food identity, FDC IDs, Portion Units, portion kind, volume, grams, density provenance, nullable nutrients, and totals atomically.
- `meal_prompt` is optional legacy/context data. It is displayed as locked context only when present and is never accepted by the meal PATCH schema.
- New meal saves require only the local date/time and `meal_snapshot`; revisions use saved foods as context when no prompt is available.
- `meal_date` and `meal_time` are native local `date` and `time without time zone` columns. Audit timestamps are UTC.
- Supabase RLS and API authorization restrict normal browser requests to the verified owner. Service-role access is a trusted administrative boundary and is not exposed in this slice.
- GET returns the current user's records in local date/time descending order. PATCH and DELETE remain owner-scoped, while the dashboard uses PATCH only after a submitted revision.
- A history entry can focus the center interpreter panel. A submitted revision replaces the in-memory estimate, but a focused meal is updated in history only after the user explicitly saves it.
- Records created before `meal_prompt` was added remain refinable using their saved foods as context without requiring a prompt.
- DELETE is exposed in the dashboard through a per-meal confirmation control, while PATCH remains owner-scoped and is used for focused history saves after a submitted revision.

## Relevant Files

- `supabase/migrations/20260821000000_create_meals.sql` defines the table, index, trigger, grants, and RLS policies.
- `supabase/migrations/20260822000000_add_meal_prompts.sql` adds the nullable source-description column for existing records.
- `lib/meal-history/types.ts` validates persisted records and local date/time input.
- `lib/meal-history/supabase.ts` implements authenticated PostgREST requests.
- `lib/meal-history/mapping.ts` maps records into UI date groups.
- `lib/meal-history/save.ts` defines save-state transitions and duplicate-submit protection.
- `app/api/meals/route.ts` handles authenticated list/save operations.
- `app/api/meals/[id]/route.ts` handles ownership-safe update/delete operations; updates replace the estimate without changing the original prompt.
- `components/meal-interpreter.tsx` keeps submitted descriptions as optional refinement context, submits revisions, and chooses POST for new saves or PATCH for focused history saves.
- `components/meal-history.tsx` exposes the focus/refinement action from each saved meal.
- `test/meal-history.test.ts` covers validation, mapping, ordering, nullable aggregation, and save-state behavior.
- `parameter_files/meal-history.toml` records the persistence contract.
- `components/meal-history.tsx` renders the upper-left delete control, confirmation widget, request state, and frontend removal after a successful DELETE.

## Dev Mode

TESTING

## State Log

- Created owner-scoped Supabase meal persistence with processed estimate snapshots, local date/time fields, API authorization, and history mapping.
- Added isolated meal API test configuration so mocked auth/PostgREST requests exercise the route handlers without weakening production Supabase configuration checks.
- Added optional prompt context, history-to-interpreter focus, explicit AI revision submission, and manual POST/PATCH save boundaries so an unreviewed revision never changes saved history.
- Added an accessible per-meal delete confirmation flow that calls the existing ownership-safe DELETE endpoint and removes the deleted meal from grouped history state after success.
- Made prompt persistence optional: meal saves now write only meal contents, while available prompts remain readable and promptless older meals can be revised from saved foods.
