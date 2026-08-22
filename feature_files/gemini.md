# Alternating Gemini model selection

## Summary

The Gemini integration sends Sonion food descriptions to two configurable Google AI models through a result-driven server-side agent loop. Gemini 3.5 Flash Lite is the default and the next generation call alternates to Gemma 4 31B, allowing request load to be shared across both provider quotas.

## Key Points

- `GEMINI_FLASH_LITE_MODEL` controls the Gemini 3.5 Flash Lite slot.
- `GEMMA_MODEL` controls the Gemma 4 31B slot.
- The selector starts with `gemini-3.5-flash-lite` and alternates every model generation call with `gemma-4-31b-it`.
- The selector is process-local; each running server process starts with Flash Lite as its first model.
- The model is selected on the server and is never accepted from the browser request body.
- The estimate route injects the food-tool skill, requests `application/json` responses, repeats model turns only for protocol tool calls, and passes only the validated structured food selection to the server-owned estimator.
- The model has no Google function-calling, code execution, arbitrary filesystem, network, or persistence capability.
- API keys remain environment-only and are not stored in parameter files.

## Relevant Files

- `lib/gemma.ts` resolves both configured models and owns the alternating selector and Google AI client helpers.
- `app/api/estimate/route.ts` selects and logs the next model for each Google AI generation call.
- `lib/agent/food-tools-skill.ts` defines the model-facing tool and output contract.
- `lib/agent/runner.ts` continues until a valid result while bounding per-turn calls and payload sizes and logging each tool-call attempt.
- `parameter_files/gemini.toml` records both tunable model defaults and environment overrides.
- `.env.example` shows the local configuration surface.
- `README.md` documents setup and model overrides.

## Dev Mode

HACKING

## State Log

- Added configurable alternating model selection with Gemini 3.5 Flash Lite as the default and Gemma 4 31B as the alternate.
- Routed meal interpretation through the result-driven food-tool agent loop.
- Removed the model round-count cutoff so meal interpretation can continue until a valid result is returned.
- Added per-generation model logging so provider failures identify which alternating slot was used.
