# Gemini model selection

## Summary

The Gemini integration sends Sonion food descriptions to a configurable Google AI model. Gemma 4 31B is the default while allowing local deployments to select another supported model without changing request code.

## Key Points

- `GEMINI_MODEL` controls the model identifier used by the server-side generation request.
- The fallback model is `gemma-4-31b-it`.
- The model is selected on the server and is never accepted from the browser request body.
- API keys remain environment-only and are not stored in parameter files.

## Relevant Files

- `lib/gemma.ts` resolves the configured model and owns the Gemma client helpers.
- `app/api/estimate/route.ts` passes the resolved model to Google AI.
- `parameter_files/gemini.toml` records the tunable model default and environment override.
- `.env.example` shows the local configuration surface.
- `README.md` documents setup and model overrides.

## Dev Mode

HACKING

## State Log

- Added configurable Gemini model selection with Gemma 4 31B as the default.
