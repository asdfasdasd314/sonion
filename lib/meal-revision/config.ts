import { readFileSync } from "node:fs";
import { join } from "node:path";

export type MealRevisionParameters = {
  revisionMaxLength: number;
  notesMaxLength: number;
  maxUpdates: number;
};

function parameterValue(source: string, key: string): number {
  const match = source.match(new RegExp("^" + key + "\\s*=\\s*([0-9]+)\\s*$", "m"));
  const value = match ? Number(match[1]) : Number.NaN;
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error("Invalid meal-revision parameter: " + key);
  }
  return value;
}

function loadParameters(): MealRevisionParameters {
  const source = readFileSync(join(process.cwd(), "parameter_files/meal-revision.toml"), "utf8");
  return {
    revisionMaxLength: parameterValue(source, "revision_max_length"),
    notesMaxLength: parameterValue(source, "revision_notes_max_length"),
    maxUpdates: parameterValue(source, "max_revision_updates"),
  };
}

export const MEAL_REVISION_PARAMETERS = loadParameters();
