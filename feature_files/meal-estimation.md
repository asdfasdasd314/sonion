# Portion Unit meal estimation

## Summary

The meal-estimation feature converts the model's food identity and Portion Unit selection into a server-owned USDA-backed estimate. Portion Units are the only user-facing amount representation: solid PUs use 150 mL and liquid PUs use 250 mL, with density selected from normalized USDA volume portions or the configured fallback. The dashboard uses the shared pipeline only through automatic background persistence.

## Key Points

- The model returns only `{ items: [{ itemName, fdcId, portionUnits, portionKind }] }`; it never supplies grams, milliliters, density, nutrients, totals, or nutrition prose.
- `parameter_files/meal-estimation.toml` is the source of truth for the solid/liquid PU calibration and fallback densities.
- USDA portions recognize milliliters, cups, fluid ounces, tablespoons, and teaspoons. Each valid volume portion stores total milliliters and derived grams-per-milliliter density, and the deterministic preferred portion description is exposed when used.
- Missing nutrients remain `null`. Missing calories are derived from complete protein, carbohydrate, and fat values using the 4/4/9 macro equation, and calorie totals sum every available or derived item value rather than treating missing data as zero.
- Item and meal totals include nullable dietary fiber (USDA 1079 / `fiberG`) scaled like other nutrients; fiber is amount-tracking only and is never folded into calorie derivation. Legacy snapshots that omit `fiber` parse as `fiber: null`.
- The automatic API returns `202 { accepted: true, queuedMeals }` after validating a batch or refinement request; it does not return model output.
- New meal batches continue the shared agent + estimate pipeline in Next.js `after()` and save each normal meal row independently.
- Refinements reuse the structured revision pipeline and persist the resulting estimate directly to the owner-scoped saved meal.
- Fallback density provenance and incomplete nutrient data remain part of each saved immutable JSONB meal snapshot for history consumers.

## Relevant Files

- `lib/meal-estimation/types.ts` defines strict selection, density provenance, item, total, and API schemas.
- `lib/meal-estimation/config.ts` reads the server-owned TOML parameters.
- `lib/meal-estimation/estimate.ts` owns volume conversion, density selection, nutrient scaling, and totals.
- `lib/meal-estimation/pipeline.ts` shares selection → authoritative foods → `estimateMeal` for sync and auto-save paths.
- `lib/meal-batch/request.ts` validates automatic batch and refinement request bodies before any model call.
- `lib/food-data/normalize.ts` normalizes USDA volume portions and derives density.
- `app/api/estimate/route.ts` authenticates, queues the pipeline via `after()`, and persists successful estimates.
- `components/meal-interpreter.tsx` submits dated batches and automatic refinements without rendering new AI output.
- `lib/meal-history/types.ts` reuses `MealEstimateSchema` as the persistence contract so all food attributes and nullable values survive saving.
- `lib/interpretation-errors/` records automatic processing failures for the frontend-visible errors table.
- `test/meal-estimation.test.ts` covers conversion, additivity, validation, density provenance, scaling, null values, totals, and response shape.
- `test/estimate-autosave.test.ts` covers auto-save request validation.
- `parameter_files/meal-estimation.toml` records the initial calibration assumptions.

## Dev Mode

TESTING

## State Log

- Added the strict Portion Unit selection contract, server-owned calibration, USDA density provenance, nutrient scaling, uncertainty-aware API response, and accessible UI rendering.
- Mapped strict result-payload key errors to the offending content field so correction diagnostics identify prohibited nutrition fields precisely.
- Added macro-derived calories and partial calorie totals so one incomplete USDA record no longer hides the meal's calculable calories.
- Connected validated estimate results to the owner-scoped meal persistence flow without adding meal-type titles.
- Replaced the old synchronous and single-meal auto-save contracts with the acknowledgement-only batch/refinement contract; the batch feature owns its request limits.
- Added nullable dietary fiber to estimate items/totals with missing-key → null compatibility so legacy JSONB snapshots still parse.
