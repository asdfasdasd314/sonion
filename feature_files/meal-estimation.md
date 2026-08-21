# Portion Unit meal estimation

## Summary

The meal-estimation feature converts the model's food identity and Portion Unit selection into a server-owned USDA-backed estimate. Portion Units are the only user-facing amount representation: solid PUs use 150 mL and liquid PUs use 250 mL, with density selected from normalized USDA volume portions or the configured fallback.

## Key Points

- The model returns only `{ items: [{ itemName, fdcId, portionUnits, portionKind }] }`; it never supplies grams, milliliters, density, nutrients, totals, or nutrition prose.
- `parameter_files/meal-estimation.toml` is the source of truth for the solid/liquid PU calibration and fallback densities.
- USDA portions recognize milliliters, cups, fluid ounces, tablespoons, and teaspoons. Each valid volume portion stores total milliliters and derived grams-per-milliliter density, and the deterministic preferred portion description is exposed when used.
- Missing nutrients remain `null`. A total is `null` when any item lacks that nutrient rather than treating missing data as zero.
- The API returns `{ items, totals }`, and the browser validates that response before rendering a responsive accessible item table.
- Fallback density provenance and incomplete nutrient data are shown as uncertainty messages. No estimate is persisted or added to meal history.

## Relevant Files

- `lib/meal-estimation/types.ts` defines strict selection, density provenance, item, total, and API schemas.
- `lib/meal-estimation/config.ts` reads the server-owned TOML parameters.
- `lib/meal-estimation/estimate.ts` owns volume conversion, density selection, nutrient scaling, and totals.
- `lib/food-data/normalize.ts` normalizes USDA volume portions and derives density.
- `app/api/estimate/route.ts` retrieves authoritative records and returns the stable estimate object.
- `components/meal-interpreter.tsx` parses and renders the estimate without persisting it.
- `test/meal-estimation.test.ts` covers conversion, additivity, validation, density provenance, scaling, null values, totals, and response shape.
- `parameter_files/meal-estimation.toml` records the initial calibration assumptions.

## Dev Mode

TESTING

## State Log

- Added the strict Portion Unit selection contract, server-owned calibration, USDA density provenance, nutrient scaling, uncertainty-aware API response, and accessible UI rendering.
- Mapped strict result-payload key errors to the offending content field so correction diagnostics identify prohibited nutrition fields precisely.
