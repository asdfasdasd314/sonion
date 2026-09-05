# Automatic batch meal interpretation

## Summary

The interpreter accepts a repeatable list of structured meals—each in absolute portion-unit mode or percentage-weight mode with solid/liquid totals—plus local date and time, then queues the list for automatic AI interpretation and history persistence. Refining a saved meal follows the same acknowledgement-only contract and updates the existing owner-scoped record after the revision is applied.

## Key Points

- New meal entry is dual-mode only: absolute per-item float PU + solid/liquid, or percentage weights + meal-level solid total PU and liquid total PU. Free-text meal prompts are rejected.
- Percentage mode normalizes per kind (solids among solids, liquids among liquids) before applying the matching total; imperfect sums are scaled by `pct_i / S_k`.
- The client may preview resolved PUs; `/api/estimate` re-validates, scales, and composes the agent prompt server-side before `after()` work. Queued meals still carry `{ prompt, mealDate, mealTime }`.
- The `/api/estimate` route returns only a `202` acceptance acknowledgement. It never returns an AI estimate or structured revision to the browser for automatic processing.
- Batch items are processed independently in the background so one failed interpretation does not prevent other meals from being saved.
- Refinements and meal copy remain free-text / snapshot-based and unchanged by this dual-mode entry path.
- Background failures remain visible through the existing owner-scoped interpretation-error records.
- `parameter_files/meal-batch-interpretation.toml` is the source of truth for maximum batch size, max items per meal, and acknowledgement/processing assumptions.

## Relevant Files

- `components/meal-interpreter.tsx` owns the dual-mode dated-entry form, resolved-PU preview, automatic queue acknowledgement, refinement queue, and copied-meal compatibility flow.
- `lib/meal-batch/proportions.ts` owns Zod schemas, per-kind percentage→PU scaling, and absolute prompt composition.
- `lib/meal-batch/config.ts` loads batch-size and per-meal item-cap parameters.
- `lib/meal-batch/request.ts` validates structured batch and refinement request envelopes, then builds composed prompts before model work begins.
- `lib/agent/food-tools-skill.ts` locks stated Portion Units and kinds when the composed prompt is explicit.
- `app/api/estimate/route.ts` authenticates, queues background interpretation/refinement work, saves successful results, and records failures.
- `parameter_files/meal-batch-interpretation.toml` records the batch processing contract.
- `test/meal-proportions.test.ts` covers per-kind percentage scaling and prompt composition.
- `test/estimate-autosave.test.ts` covers structured absolute/percentage batches, legacy prompt rejection, refinement validation, and mutually exclusive request modes.

## Dev Mode

HACKING

## State Log

- Replaced manual interpret/review/save behavior with one acknowledgement-only batch queue and automatic owner-scoped refinement persistence.
- Replaced free-text batch entry with absolute and percentage structured modes, server-authoritative per-kind scaling, and an agent skill lock on stated Portion Units.
