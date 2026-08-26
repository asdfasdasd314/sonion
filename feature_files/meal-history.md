# Supabase meal history

## Summary

Meal history persists each processed estimate as an owner-scoped JSONB snapshot. A record has its UUID, verified user ownership, local eating date/time, audit timestamps, and the complete estimate; it has no persisted meal description or breakfast/lunch/dinner title.

## Key Points

- `meal_snapshot` reuses `MealEstimateSchema`, preserving food identity, FDC IDs, Portion Units, portion kind, volume, grams, density provenance, nullable nutrients (including dietary fiber), and totals atomically.
- Missing item/totals `fiber` on older JSONB rows normalizes to `null` on parse so history loads and copies without a DB migration or backfill.
- New meal saves require only the local date/time and `meal_snapshot`; revisions use saved foods as their base context.
- `meal_date` and `meal_time` are native local `date` and `time without time zone` columns. Audit timestamps are UTC.
- Supabase RLS and API authorization restrict normal browser requests to the verified owner. Service-role access is a trusted administrative boundary and is not exposed in this slice.
- GET returns the current user's records in local date/time descending order. PATCH and DELETE remain owner-scoped, while the dashboard uses PATCH only after a submitted revision.
- A history entry can focus the center interpreter panel. A queued revision replaces the saved row automatically after the server applies and recalculates the structured patch.
- Saved records remain refinable using their foods as context; no prompt column is required.
- DELETE is exposed in the dashboard through a per-meal confirmation control, while PATCH remains owner-scoped and is used for focused history saves after a submitted revision.
- Meal rows show their calories and macro totals while collapsed by default; each row independently expands to reveal food contents and meal actions.

## Relevant Files

- `supabase/migrations/20260821000000_create_meals.sql` defines the table, index, trigger, grants, and RLS policies.
- `lib/meal-history/types.ts` validates persisted records and local date/time input.
- `lib/meal-history/supabase.ts` implements authenticated PostgREST requests.
- `lib/meal-history/mapping.ts` maps records into UI date groups.
- `lib/meal-history/save.ts` defines save-state transitions and duplicate-submit protection.
- `app/api/meals/route.ts` handles authenticated list/save operations.
- `app/api/meals/[id]/route.ts` handles ownership-safe update/delete operations; automatic refinements use the same owner-scoped PATCH path.
- `components/meal-interpreter.tsx` submits automatic refinements with saved-food context and keeps copied meals on the POST-only new-record path. The revision protocol itself is owned by `feature_files/meal-revision.md`.
- `components/meal-history.tsx` exposes the focus/refinement action and the copy-to-new-meal action from each saved meal. Meal copy draft behavior is owned by `feature_files/meal-copy.md`.
- `test/meal-history.test.ts` covers validation, mapping, ordering, nullable aggregation, and save-state behavior.
- `parameter_files/meal-history.toml` records the persistence contract.
- `components/meal-history.tsx` renders the upper-left delete control, confirmation widget, request state, and frontend removal after a successful DELETE.

## Dev Mode

TESTING

## State Log

- Created owner-scoped Supabase meal persistence with processed estimate snapshots, local date/time fields, API authorization, and history mapping.
- Added isolated meal API test configuration so mocked auth/PostgREST requests exercise the route handlers without weakening production Supabase configuration checks.
- Added optional prompt context and history-to-interpreter focus; revisions now queue and persist automatically once the server applies the validated patch.
- Added an accessible per-meal delete confirmation flow that calls the existing ownership-safe DELETE endpoint and removes the deleted meal from grouped history state after success.
- Removed the unavailable persisted meal-prompt dependency; meal history now selects and validates only columns present in the base meals table, while focused revisions derive context from saved foods.
- Linked the per-meal copy action to the interpreter copy draft so history can seed a new POST save without owning copy-draft rules.
- Background batch inserts and refinement updates use the same owner-scoped `saveMeal`/`updateMeal` paths; history refreshes via dashboard light polling when the meal list identity changes.
- Collapsed-by-default meal rows now preserve the compact history view, with accessible per-meal toggle buttons for food details and actions.
- Extended meal snapshots and history mapping with nullable dietary fiber amounts; pre-fiber JSONB rows normalize missing fiber to null on read without a SQL migration.
