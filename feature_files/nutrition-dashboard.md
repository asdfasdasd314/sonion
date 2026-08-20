# Client-only nutrition dashboard

## Summary

Sonion's authenticated home page is a simple three-column personal dashboard: seeded meal history on the left, an authenticated AI meal interpreter in the center, and a browser-only nutrition target calculator on the right. The feature is intentionally a UI prototype; refreshing resets meal history and calculated targets, and AI responses do not create history records.

## Key Points

- Meal history is seeded in `lib/nutrition/meals.ts`, grouped by date, and aggregated into calories, protein, fat, and carbohydrates for each date header.
- Date rows are keyboard-operable expand/collapse buttons. Expanded rows show meal-level and food-level macro detail.
- The interpreter continues to POST the signed-in user's prompt to `/api/estimate`; authentication and the server route contract are unchanged.
- The target calculator uses the supplied Mifflin–St Jeor equation, activity range midpoints, maintain/cut/bulk adjustments, 2.0 g/kg protein, 0.8 g/kg fat, and remaining calories for carbohydrates.
- Internal target calculations keep decimal precision while rendered values are rounded to whole numbers. Negative remaining calories are surfaced as a warning and carbohydrates display as zero.
- No database tables, persistence, target APIs, or AI-to-history connection are part of this feature.

## Relevant Files

- `app/page.tsx` owns session restoration, sign-out, auth gating, and the authenticated dashboard shell.
- `components/meal-history.tsx` renders the seeded expandable date and meal history.
- `components/meal-interpreter.tsx` owns prompt validation, estimate requests, and response states.
- `components/nutrition-targets.tsx` owns the target form and accessible inline validation.
- `lib/nutrition/meals.ts` owns seeded meals and macro aggregation.
- `lib/nutrition/targets.ts` owns target validation and nutrition calculations.
- `lib/nutrition/types.ts` defines shared meal, macro, activity, and goal types.
- `test/nutrition.test.ts` covers aggregation, calculation assumptions, rounding, validation, and insufficient calories.
- `parameter_files/nutrition-dashboard.toml` records the client-only prototype assumptions.

## Dev Mode

HACKING

## State Log

- Added the responsive three-column dashboard, seeded/reset meal history, authenticated interpreter card, and client-only target calculator with focused unit coverage.
