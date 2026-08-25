import { readFileSync } from "node:fs";
import { join } from "node:path";

export type InterpretationErrorParameters = {
  sourceAutomaticProcessing: string;
  promptMaxStoredChars: number;
  errorMessageMaxChars: number;
  diagnosticsMaxChars: number;
};

function parameterNumber(source: string, key: string): number {
  const match = source.match(new RegExp("^" + key + "\\s*=\\s*([0-9]+)\\s*$", "m"));
  const value = match ? Number(match[1]) : Number.NaN;
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error("Invalid interpretation-errors parameter: " + key);
  }
  return value;
}

function parameterString(source: string, key: string): string {
  const match = source.match(new RegExp("^" + key + '\\s*=\\s*"([^"]*)"\\s*$', "m"));
  const value = match?.[1]?.trim() ?? "";
  if (!value) throw new Error("Invalid interpretation-errors parameter: " + key);
  return value;
}

function loadParameters(): InterpretationErrorParameters {
  const source = readFileSync(join(process.cwd(), "parameter_files/interpretation-errors.toml"), "utf8");
  return {
    sourceAutomaticProcessing: parameterString(source, "source_automatic_processing"),
    promptMaxStoredChars: parameterNumber(source, "prompt_max_stored_chars"),
    errorMessageMaxChars: parameterNumber(source, "error_message_max_chars"),
    diagnosticsMaxChars: parameterNumber(source, "diagnostics_max_chars"),
  };
}

export const INTERPRETATION_ERROR_PARAMETERS = loadParameters();
