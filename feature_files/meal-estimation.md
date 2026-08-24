# Portion Unit meal estimation

## Summary

The meal-estimation feature converts the model's food identity and Portion Unit selection into a server-owned USDA-backed estimate. Portion Units are the only user-facing amount representation: solid PUs use 150 mL and liquid PUs use 250 mL, with density selected from normalized USDA volume portions or the configured fallback. Callers may review the estimate synchronously or queue Interpret and Save for background persistence.

## Key Points

- The model returns only `{ items: [{ itemName, fdcId, portionUnits, portionKind }] }`; it never supplies grams, milliliters, density, nutrients, totals, or nutrition prose.
- `parameter_files/meal-estimation.toml` is the source of truth for the solid/liquid PU calibration and fallback densities.
- USDA portions recognize milliliters, cups, fluid ounces, tablespoons, and teaspoons. Each valid volume portion stores total milliliters and derived grams-per-milliliter density, and the deterministic preferred portion description is exposed when used.
- Missing nutrients remain `null`. Missing calories are derived from complete protein, carbohydrate, and fat values using the 4/4/9 macro equation, and calorie totals sum every available or derived item value rather than treating missing data as zero.
- The sync API returns `{ items, totals }`, and the browser validates that response before rendering a responsive accessible item table.
- When `saveAfterInterpret` is true with validated local `mealDate` / `mealTime`, `/api/estimate` returns `202 { accepted: true }` immediately, continues the shared agent + estimate pipeline in Next.js `after()`, and saves a normal meal row without returning the estimate to the browser.
- Interpret and Save rejects `revision` combinations with 400 and is limited to new meal descriptions.
- Fallback density provenance and incomplete nutrient data are shown as uncertainty messages on the sync path. A successful sync estimate can still be saved manually as an immutable JSONB meal snapshot.

## Relevant Files

- `lib/meal-estimation/types.ts` defines strict selection, density provenance, item, total, and API schemas.
- `lib/meal-estimation/config.ts` reads the server-owned TOML parameters.
- `lib/meal-estimation/estimate.ts` owns volume conversion, density selection, nutrient scaling, and totals.
- `lib/meal-estimation/pipeline.ts` shares selection → authoritative foods → `estimateMeal` for sync and auto-save paths.
- `lib/meal-estimation/autosave-request.ts` validates Interpret-and-Save and sync request bodies before any model call.
- `lib/food-data/normalize.ts` normalizes USDA volume portions and derives density.
- `app/api/estimate/route.ts` authenticates, runs the pipeline, returns estimates or queues auto-save via `after()`.
- `components/meal-interpreter.tsx` parses, renders, and saves estimates, and exposes Interpret and Save for new meals only.
- `lib/meal-history/types.ts` reuses `MealEstimateSchema` as the persistence contract so all food attributes and nullable values survive saving.
- `lib/interpretation-errors/` records auto-save failures for the frontend-visible errors table.
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
- Added Interpret and Save: 202 ACK, shared pipeline in `after()`, no estimate return on auto-save, and revision+auto-save rejection.
