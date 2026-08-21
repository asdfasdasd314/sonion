# USDA food-data tools

## Summary

The food-data feature turns the local USDA Foundation Foods and FNDDS / Survey Foods JSON files into a compact normalized index and exposes only validated food search and lookup operations to future agents.

## Key Points

- The authoritative local inputs are `food-data/FoodData_Central_foundation_food_json_2026-04-30.json` and `food-data/surveyDownload.json`.
- `normalizeFoundationFood` and `normalizeFnddsFood` hide USDA-specific nesting and preserve only application nutrition, category, portion, food-code, and simple ingredient fields; recognized volume portions also retain normalized milliliters and derived density.
- Foundation calories select nutrient 2048 first, then 2047; FNDDS calories use nutrient 1008. Energy entries are never summed.
- Missing nutrients remain omitted, invalid portions are omitted, and a food with no usable portions has `portions: []`.
- `searchFoods` and `getFood` validate inputs with strict Zod schemas. They reject unknown parameters and do not accept paths, SQL, URLs, shell commands, or raw USDA records.
- `createFoodToolRegistry` exposes the only two agent capabilities and executes against the normalized in-memory index only.
- `food-data/food-index.json` is generated locally and remains outside `public/`.

## Relevant Files

- `lib/food-data/types.ts` defines the agent-facing normalized types.
- `lib/food-data/raw.ts` defines the narrow typed USDA input shapes.
- `lib/food-data/normalize.ts` owns both adapters, nutrient extraction, portion extraction, ingredients, and calorie precedence.
- `lib/food-data/index-builder.ts` reads the two hardcoded local inputs and writes the compact runtime index.
- `lib/food-data/loader.ts` caches the generated index and FDC-ID map.
- `lib/food-data/errors.ts` defines setup failures that must remain distinct from model failures.
- `lib/food-data/tools.ts` owns the validated search and lookup tools.
- `lib/agent/runner.ts` consumes the allowlisted registry without exposing the loader or raw index to the model.
- `scripts/build-food-index.ts` is the index-generation entry point.
- `scripts/ensure-food-index.ts` validates the generated index and rebuilds it for local dev/build startup when needed.
- `test/food-data.test.ts` covers adapters, tools, and real-record integration searches when the gitignored data is present.

## Dev Mode

TESTING

## State Log

- Added normalized USDA adapters, deterministic cached tools, local index generation, and coverage for real Foundation/FNDDS records.
- Repaired the package lock so the declared `tsx` test runner and its runtime dependencies are installed by clean dependency setup.
- Moved `tsx` and its `esbuild` runtime chain to production dependencies so `npm test` resolves after production-only dependency installation.
- Scoped the root USDA-data ignore rule so the tracked server-side `lib/food-data` implementation is included in handoffs.
- Repaired real-record search expectations so chicken and broccoli integration cases select descriptions that match the documented starts-with ranking tier rather than arbitrary lexical token-overlap matches.
- Added typed setup errors, stricter generated-index validation, and automatic prepare hooks so missing or invalid local food data is reported before the agent loop starts.
- Added USDA volume-unit normalization, deterministic preferred volume portions, and derived density provenance for meal estimation.
- Fixed index invalidation from negative USDA nutrient sentinels by omitting negative nutrient values during normalization.
