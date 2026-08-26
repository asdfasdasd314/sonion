# Supabase-backed nutrition dashboard

## Summary

Sonion's authenticated home page is a two-view personal dashboard: the primary meal-tracking view gives private Supabase meal history and the authenticated AI meal interpreter most of the available width, while a separate scientific-calculations view contains the nutrition target calculator. The primary view also keeps the expandable interpretation-errors section below the grid. Meal history stores processed estimates with user-selected local date/time values, and an optional saved daily target provides a persistent benchmark above the log.

## Key Points

- Meal history loads the authenticated user's records from `/api/meals`, maps JSONB snapshots into local-date groups, and aggregates nullable calories, protein, fat, carbohydrates, and fiber for each date header.
- Date rows are keyboard-operable expand/collapse buttons. Expanded rows show meal-level and food-level nutrient detail, including fiber (`fi` on compact food lines). The calculator derives a daily fiber target from the final calorie target, and saved benchmark cards show it alongside the other macro targets.
- The interpreter accepts multiple signed-in meal descriptions, each with local date/time, and queues them through `/api/estimate`; the API returns only a 202 acknowledgement and background processing saves complete USDA-backed estimates.
- Refining a focused meal queues the structured revision and automatically PATCHes the saved record; the browser does not review or save a returned AI response.
- While the authenticated dashboard is open, light polling checks meals and interpretation errors (paused when the tab is hidden) and refreshes history or the errors panel when list identity changes.
- Interpretation failures appear in a sibling expandable section with dismiss controls; they are not nested inside history or the interpreter card.
- The authenticated dashboard view switcher keeps meal tracking and scientific calculations visually separate; the calculator remains mounted while hidden so entered values survive a view change.
- The target calculator accepts weight in pounds and height in inches, converts them to kilograms and centimeters for the supplied Mifflin–St Jeor equation, then applies activity range midpoints and a user-selected weekly cut/bulk change in either percentage of body weight or pounds, using 3,500 kcal per pound, before calculating macros.
- Internal target calculations keep decimal precision while rendered values are rounded to whole numbers. Fiber is calculated as 14 grams per 1,000 final target calories and persisted inside each target snapshot. Negative remaining calories are surfaced as a warning and carbohydrates display as zero.
- The migrations and APIs enforce owner-only access. Nutrition targets can be saved as one replaceable per-user benchmark and are shown above meal history when present.
- Fiber remains inside the existing `target_snapshot` JSONB object, so adding this persisted target does not require a Supabase migration.

## Relevant Files

- `app/page.tsx` owns session restoration, sign-out, auth gating, dashboard view switching, shell, and light polling.
- `components/meal-history.tsx` loads and renders the authenticated expandable date and meal history.
- `components/meal-interpreter.tsx` owns the repeatable dated meal list, automatic queue status, and automatic refinement/copy actions.
- `components/interpretation-errors.tsx` owns the expandable interpretation-errors section.
- `components/nutrition-targets.tsx` owns the target form, accessible inline validation, and authenticated save action.
- `lib/nutrition/target-history.ts` validates saved target snapshots and API responses.
- `lib/nutrition/target-supabase.ts` owns authenticated target persistence.
- `supabase/migrations/20260825000000_create_nutrition_targets.sql` defines the owner-scoped saved-target table and policies.
- `lib/meal-history/mapping.ts` maps persisted records into sorted date groups.
- `lib/meal-history/types.ts` validates local date/time fields and complete snapshots.
- `lib/meal-history/supabase.ts` owns authenticated Supabase REST persistence.
- `lib/nutrition/dashboard-poll.ts` mirrors poll interval and meal-list fingerprint helpers for the client.
- `lib/nutrition/meals.ts` owns nullable macro aggregation.
- `lib/nutrition/targets.ts` owns target validation and nutrition calculations.
- `lib/nutrition/types.ts` defines shared meal, macro, activity, and goal types.
- `test/nutrition.test.ts` covers aggregation, calculation assumptions, rounding, validation, and insufficient calories.
- `parameter_files/nutrition-dashboard.toml` records dashboard and persistence assumptions.

## Dev Mode

HACKING

## State Log

- Added the responsive three-column dashboard, authenticated interpreter card, and client-only target calculator with focused unit coverage.
- Corrected the nutrition calculation fixture to match the approved Mifflin–St Jeor equation for the test input.
- Changed nutrition target inputs and validation to pounds and inches while preserving metric-based calculation precision through explicit unit conversion.
- Corrected the insufficient-calorie test fixture so its low-weight input actually exercises the negative remaining-calorie branch.
- Updated the imperial calculation fixture to retain enough conversion precision for the existing BMR tolerance.
- Replaced fixed cut/bulk calorie percentages with validated weekly body-weight change inputs and transparent calorie adjustments.
- Prevented the conditional weekly-change input from receiving an undefined value so it remains controlled when the cut/bulk fields mount.
- Added owner-scoped saved daily targets, a calculator save action, and a benchmark summary above meal history for comparing logged totals over time.
- Added responsive accessible meal-estimate rows with explicit fallback-density and missing-nutrient uncertainty messaging.
- Replaced seeded history with authenticated Supabase loading, added save-state transitions and refresh-after-save, and preserved null nutrient semantics in aggregation.
- Fixed the required-input nutrition validation fixture to omit activity/goal instead of empty strings so TypeScript accepts `Partial<NutritionTargetInput>`.
- Replaced manual interpretation/save controls with a repeatable batch queue and acknowledgement-only automatic persistence while preserving light polling for background meal/error updates.
- Split scientific calculations into a secondary dashboard view, widened the tracking columns, and increased meal-history nutrient text for readability.
- Surfaced dietary fiber amounts alongside protein/fat/carbs in day headers, meal summaries, food lines, and the copy-draft estimate table without adding fiber targets.
- Added a precise 14 g per 1,000 calories daily fiber target to calculated and persisted nutrition targets, with legacy saved snapshots normalized when read.
- Corrected legacy target response normalization to derive fiber inside the persisted target snapshot and retained precision-aware formula coverage.
