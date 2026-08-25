# Automatic batch meal interpretation

## Summary

The interpreter accepts a list of meal descriptions, each with its own local date and time, and queues the complete list for automatic AI interpretation and history persistence. Refining a saved meal follows the same acknowledgement-only contract and updates the existing owner-scoped record after the revision is applied.

## Key Points

- New meal entry is a repeatable client-side list; the user submits all descriptions and timestamps with one Interpret meals action.
- The `/api/estimate` route returns only a `202` acceptance acknowledgement. It never returns an AI estimate or structured revision to the browser for automatic processing.
- Batch items are processed independently in the background so one failed interpretation does not prevent other meals from being saved.
- Refinements carry the saved meal ID, current estimate, correction, and local date/time; successful revisions PATCH the existing meal automatically.
- Background failures remain visible through the existing owner-scoped interpretation-error records.
- `parameter_files/meal-batch-interpretation.toml` is the source of truth for the maximum batch size and acknowledgement/processing assumptions.

## Relevant Files

- `components/meal-interpreter.tsx` owns the repeatable dated-entry form, automatic queue acknowledgement, refinement queue, and copied-meal compatibility flow.
- `lib/meal-batch/config.ts` loads batch-size parameters.
- `lib/meal-batch/request.ts` validates batch and refinement request envelopes before model work begins.
- `app/api/estimate/route.ts` authenticates, queues background interpretation/refinement work, saves successful results, and records failures.
- `parameter_files/meal-batch-interpretation.toml` records the batch processing contract.
- `test/estimate-autosave.test.ts` covers dated batches, refinement validation, and mutually exclusive request modes.

## Dev Mode

HACKING

## State Log

- Replaced manual interpret/review/save behavior with one acknowledgement-only batch queue and automatic owner-scoped refinement persistence.
