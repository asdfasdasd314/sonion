# Supabase-backed nutrition dashboard

## Summary

Sonion's authenticated home page is a simple three-column personal dashboard: private Supabase meal history on the left, an authenticated AI meal interpreter in the center, and a browser-only nutrition target calculator on the right. Meal history stores processed estimates with user-selected local date/time values; targets remain browser-only.

## Key Points

- Meal history loads the authenticated user's records from `/api/meals`, maps JSONB snapshots into local-date groups, and aggregates nullable calories, protein, fat, and carbohydrates for each date header.
- Date rows are keyboard-operable expand/collapse buttons. Expanded rows show meal-level and food-level macro detail.
- The interpreter POSTs the signed-in user's prompt to `/api/estimate`, validates the `{ items, totals }` response, and lets the user save the complete estimate with local date/time, Portion Units, estimated volume/grams, density provenance, macros, totals, and uncertainty notices.
- The target calculator accepts weight in pounds and height in inches, converts them to kilograms and centimeters for the supplied Mifflin–St Jeor equation, then applies activity range midpoints and a user-selected weekly cut/bulk change in either percentage of body weight or pounds, using 3,500 kcal per pound, before calculating macros.
- Internal target calculations keep decimal precision while rendered values are rounded to whole numbers. Negative remaining calories are surfaced as a warning and carbohydrates display as zero.
- The migration and API enforce owner-only read/write/delete behavior; there are no user-facing edit/delete controls in this slice. Nutrition targets remain non-persistent.

## Relevant Files

- `app/page.tsx` owns session restoration, sign-out, auth gating, and the authenticated dashboard shell.
- `components/meal-history.tsx` loads and renders the authenticated expandable date and meal history.
- `components/meal-interpreter.tsx` owns prompt validation, estimate requests, and response states.
- `components/nutrition-targets.tsx` owns the target form and accessible inline validation.
- `lib/meal-history/mapping.ts` maps persisted records into sorted date groups.
- `lib/meal-history/types.ts` validates local date/time fields and complete snapshots.
- `lib/meal-history/supabase.ts` owns authenticated Supabase REST persistence.
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
- Added responsive accessible meal-estimate rows with explicit fallback-density and missing-nutrient uncertainty messaging.
- Replaced seeded history with authenticated Supabase loading, added save-state transitions and refresh-after-save, and preserved null nutrient semantics in aggregation.
- Fixed the required-input nutrition validation fixture to omit activity/goal instead of empty strings so TypeScript accepts `Partial<NutritionTargetInput>`.
