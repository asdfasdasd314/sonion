# Structured meal revisions

## Summary

Meal revisions are a server-validated patch protocol. The model returns only the foods that need to be replaced, added, or removed, plus concise user-facing notes; the server applies those changes to the current meal and recalculates authoritative nutrition for the resulting selection.

## Key Points

- A revision update targets an existing item by its zero-based item index and name, so unchanged foods remain untouched and duplicate foods remain addressable.
- Replacement and addition updates contain only food identity and Portion Unit data; the server still obtains USDA records and calculates nutrients.
- Removal is explicit, and an empty update list is valid when the request cannot be applied or the model determines that nothing should change.
- Notes are required, bounded, and intended for concise rationale, uncertainty, and unchanged or unsupported requests rather than hidden chain-of-thought.
- The browser submits a refinement for background processing and receives only an acknowledgement; the recalculated estimate is persisted directly to the focused meal.
- `parameter_files/meal-revision.toml` is the source of truth for revision instruction, note, and update limits.

## Relevant Files

- `lib/meal-revision/types.ts` defines revision requests, update operations, notes, and response validation.
- `lib/meal-revision/apply.ts` applies validated patch operations to the current selection.
- `lib/meal-revision/config.ts` reads server-owned revision limits.
- `lib/agent/food-tools-skill.ts` describes the selection and revision output envelopes for the model.
- `lib/agent/protocol.ts` validates revision envelopes separately from initial meal selections.
- `lib/agent/runner.ts` carries the current meal context through the revision agent loop.
- `app/api/estimate/route.ts` validates refinement requests, applies patches, recalculates USDA-backed estimates, and updates the saved row.
- `components/meal-interpreter.tsx` submits structured refinements without rendering a returned AI response.
- `parameter_files/meal-revision.toml` records the tunable revision limits.

## Dev Mode

TESTING

## State Log

- Added the structured revision envelope, server-side patch application, bounded notes, and automatic owner-scoped persistence.
- Added static protocol, patch-application, and revision-agent coverage; runtime tests remain intentionally unexecuted under the task execution boundary.
