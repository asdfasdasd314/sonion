# Meal copy drafts

## Summary

Meal copy duplicates a saved meal's full estimate snapshot into the center interpreter as a new draft. The user can change the local date and time and save the result as a separate history record without mutating the source meal.

## Key Points

- Copy starts from a history entry and loads every attribute of `meal_snapshot` into the interpreter; the source record is never mutated by the draft or by later saves.
- Default local date and time are set to now so the common routine-meal case saves under a new eating moment without first editing the clock fields.
- Saving a copy always POSTs a new meal through `/api/meals`; it never PATCHes the source id.
- Copy and refine remain mutually exclusive in the dashboard shell so the interpreter knows whether the active draft updates history or creates a sibling entry.
- `parameter_files/meal-copy.toml` records the draft defaults and save contract for this feature.

## Relevant Files

- `lib/meal-copy/draft.ts` clones the estimate snapshot and builds the copy draft with current local date/time.
- `components/meal-history.tsx` exposes the per-meal copy action beside refine.
- `components/meal-interpreter.tsx` renders the copy snapshot, date/time fields, and POST-only save path.
- `app/page.tsx` keeps copy and refine focus mutually exclusive.
- `parameter_files/meal-copy.toml` records tunable copy-draft behavior.
- `test/meal-copy.test.ts` covers snapshot isolation and default date/time draft construction.
- Structured revision application remains owned by `feature_files/meal-revision.md`; persistence remains owned by `feature_files/meal-history.md`.

## Dev Mode

HACKING

## State Log

- Added copy-draft helpers, history copy action, direct copy persistence, and POST-only save so routine meals can be retargeted to a new date and time.
