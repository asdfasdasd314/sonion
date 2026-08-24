import { INTERPRETATION_ERROR_PARAMETERS } from "./config";

export function truncateText(value: string, maxChars: number): string {
  const trimmed = value.trim();
  if (trimmed.length <= maxChars) return trimmed;
  return `${trimmed.slice(0, Math.max(0, maxChars - 1)).trimEnd()}…`;
}

export function boundDiagnostics(
  value: Record<string, unknown> | null | undefined,
  maxChars = INTERPRETATION_ERROR_PARAMETERS.diagnosticsMaxChars,
): Record<string, unknown> | null {
  if (!value) return null;
  try {
    const serialized = JSON.stringify(value);
    if (serialized.length <= maxChars) return value;
    return {
      truncated: true,
      preview: truncateText(serialized, maxChars),
    };
  } catch {
    return { truncated: true, preview: "Diagnostics could not be serialized." };
  }
}
