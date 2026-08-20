# USDA food-data tools

## Summary

The food-data feature turns the local USDA Foundation Foods and FNDDS / Survey Foods JSON files into a compact normalized index and exposes only validated food search and lookup operations to future agents.

## Key Points

- The authoritative local inputs are `food-data/FoodData_Central_foundation_food_json_2026-04-30.json` and `food-data/surveyDownload.json`.
- `normalizeFoundationFood` and `normalizeFnddsFood` hide USDA-specific nesting and preserve only application nutrition, category, portion, food-code, and simple ingredient fields.
- Foundation calories select nutrient 2048 first, then 2047; FNDDS calories use nutrient 1008. Energy entries are never summed.
- Missing nutrients remain omitted, invalid portions are omitted, and a food with no usable portions has `portions: []`.
- `searchFoods` and `getFood` validate inputs with Zod. They do not accept paths, SQL, URLs, shell commands, or raw USDA records.
- `food-data/food-index.json` is generated locally and remains outside `public/`.

## Relevant Files

- `lib/food-data/types.ts` defines the agent-facing normalized types.
- `lib/food-data/raw.ts` defines the narrow typed USDA input shapes.
- `lib/food-data/normalize.ts` owns both adapters, nutrient extraction, portion extraction, ingredients, and calorie precedence.
- `lib/food-data/index-builder.ts` reads the two hardcoded local inputs and writes the compact runtime index.
- `lib/food-data/loader.ts` caches the generated index and FDC-ID map.
- `lib/food-data/tools.ts` owns the validated search and lookup tools.
- `scripts/build-food-index.ts` is the index-generation entry point.
- `test/food-data.test.ts` covers adapters, tools, and real-record integration searches when the gitignored data is present.

## Dev Mode

TESTING

## State Log

- Added normalized USDA adapters, deterministic cached tools, local index generation, and coverage for real Foundation/FNDDS records.
- Repaired the package lock so the declared `tsx` test runner and its runtime dependencies are installed by clean dependency setup.
- Moved `tsx` and its `esbuild` runtime chain to production dependencies so `npm test` resolves after production-only dependency installation.
