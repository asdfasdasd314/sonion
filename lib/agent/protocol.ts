import type { FoodToolName } from "../food-data/tools";
import { MealSelectionSchema, type MealSelection } from "../meal-estimation/types";

const MAX_DIAGNOSTIC_VALUE_LENGTH = 120;

function serializeTranscriptData(value: unknown): string {
  return (JSON.stringify(value) ?? "null").replace(/</g, "\\u003c");
}

export type ProtocolDiagnosticCode =
  | "INVALID_JSON"
  | "DUPLICATE_ENVELOPE_FIELD"
  | "UNKNOWN_ENVELOPE_FIELD"
  | "MISSING_ENVELOPE_FIELD"
  | "INVALID_ENVELOPE_FIELD"
  | "UNKNOWN_TOOL"
  | "INVALID_TOOL_ARGUMENTS"
  | "PAYLOAD_TOO_LARGE"
  | "EMPTY_RESULT";

export type ProtocolDiagnostic = {
  code: ProtocolDiagnosticCode;
  message: string;
  blockIndex?: number;
  callIndex?: number;
  fieldPath?: string;
  received?: unknown;
  receivedType?: string;
  expected?: string;
  availableTools?: readonly string[];
};

export type ToolCall = {
  name: FoodToolName;
  arguments: Record<string, unknown>;
  callIndex: number;
};

export type ToolResponse = {
  kind: "tools";
  calls: ToolCall[];
};

export type ResultResponse = {
  kind: "result";
  content: MealSelection;
};

export type ParsedAgentResponse =
  | { ok: true; response: ToolResponse | ResultResponse }
  | { ok: false; diagnostics: ProtocolDiagnostic[] };

type JsonEnvelope = Record<string, unknown>;

export type ProtocolLimits = {
  maxModelOutputChars: number;
  maxFinalContentChars: number;
  maxCorrectionOutputChars: number;
};

export const DEFAULT_PROTOCOL_LIMITS: ProtocolLimits = {
  maxModelOutputChars: 24_000,
  maxFinalContentChars: 8_000,
  maxCorrectionOutputChars: 4_000,
};

function diagnostic(
  code: ProtocolDiagnosticCode,
  message: string,
  details: Omit<ProtocolDiagnostic, "code" | "message"> = {},
): ProtocolDiagnostic {
  return { code, message, ...details };
}

function typeOfReceived(value: unknown): string {
  if (value === null) return "null";
  if (Array.isArray(value)) return "array";
  return typeof value;
}

function safeReceived(value: unknown): unknown {
  if (typeof value === "string") {
    return value.length > MAX_DIAGNOSTIC_VALUE_LENGTH
      ? value.slice(0, MAX_DIAGNOSTIC_VALUE_LENGTH) + "…"
      : value;
  }
  if (value === null || typeof value === "number" || typeof value === "boolean") {
    return value;
  }
  return undefined;
}

function fieldDiagnostic(
  code: ProtocolDiagnosticCode,
  message: string,
  value: unknown,
  details: Omit<ProtocolDiagnostic, "code" | "message" | "received" | "receivedType"> = {},
): ProtocolDiagnostic {
  return diagnostic(code, message, {
    ...details,
    received: safeReceived(value),
    receivedType: typeOfReceived(value),
  });
}

function duplicateTopLevelKeys(json: string): string[] {
  const duplicates: string[] = [];
  const keys = new Set<string>();
  let depth = 0;
  let rootObjectComplete = false;
  let index = 0;
  let previousSignificant = "";

  while (index < json.length) {
    const character = json[index];
    if (rootObjectComplete) break;
    if (character === '"') {
      const start = index;
      index += 1;
      let escaped = false;
      while (index < json.length) {
        const current = json[index];
        if (!escaped && current === '"') break;
        escaped = !escaped && current === "\\";
        if (current !== "\\") escaped = false;
        index += 1;
      }
      const end = Math.min(index + 1, json.length);
      if (depth === 1 && (previousSignificant === "{" || previousSignificant === ",")) {
        let lookahead = end;
        while (/\s/.test(json[lookahead] ?? "")) lookahead += 1;
        if (json[lookahead] === ":") {
          const key = JSON.parse(json.slice(start, end)) as string;
          if (keys.has(key) && !duplicates.includes(key)) duplicates.push(key);
          keys.add(key);
        }
      }
      previousSignificant = '"';
      index = end;
      continue;
    }
    if (character === "{" || character === "[") depth += 1;
    if (character === "}" || character === "]") {
      depth -= 1;
      if (depth === 0 && character === "}") rootObjectComplete = true;
    }
    if (!/\s/.test(character)) previousSignificant = character;
    index += 1;
  }

  return duplicates;
}

function checkEnvelopeKeys(
  envelope: Record<string, unknown>,
  expectedFields: readonly string[],
  blockIndex: number,
): ProtocolDiagnostic[] {
  const diagnostics: ProtocolDiagnostic[] = [];
  const expected = new Set(expectedFields);
  for (const key of Object.keys(envelope)) {
    if (!expected.has(key)) {
      diagnostics.push(
        diagnostic("UNKNOWN_ENVELOPE_FIELD", 'Envelope field "' + key + '" is not supported.', {
          blockIndex,
          fieldPath: key,
          receivedType: typeOfReceived(envelope[key]),
          expected: expectedFields.join(", "),
        }),
      );
    }
  }
  for (const key of expectedFields) {
    if (!(key in envelope)) {
      diagnostics.push(
        diagnostic("MISSING_ENVELOPE_FIELD", 'Envelope field "' + key + '" is required.', {
          blockIndex,
          fieldPath: key,
          expected: expectedFields.join(", "),
        }),
      );
    }
  }
  return diagnostics;
}

function parseJsonEnvelope(
  body: string,
  blockIndex: number,
): { value?: JsonEnvelope; diagnostics: ProtocolDiagnostic[] } {
  const diagnostics: ProtocolDiagnostic[] = [];
  let duplicateKeys: string[] = [];
  try {
    duplicateKeys = duplicateTopLevelKeys(body);
  } catch {
    // JSON.parse below produces the authoritative malformed-JSON diagnostic.
  }
  for (const key of duplicateKeys) {
    diagnostics.push(
      diagnostic("DUPLICATE_ENVELOPE_FIELD", 'Envelope field "' + key + '" appears more than once.', {
        blockIndex,
        fieldPath: key,
        expected: "Each envelope field must appear exactly once.",
      }),
    );
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(body);
  } catch {
    diagnostics.push(
      diagnostic("INVALID_JSON", "Model output must be exactly one valid JSON document.", {
        blockIndex,
        receivedType: "invalid-json",
        expected: "One JSON object containing either a tools or result envelope.",
      }),
    );
    return { diagnostics };
  }

  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    diagnostics.push(
      fieldDiagnostic("INVALID_ENVELOPE_FIELD", "Model output must be a JSON object.", parsed, {
        blockIndex,
        fieldPath: "",
        expected: "object",
      }),
    );
    return { diagnostics };
  }

  return { value: parsed as JsonEnvelope, diagnostics };
}

export function parseToolResponse(
  response: string,
  options: { toolNames?: readonly string[]; limits?: ProtocolLimits } = {},
): ParsedAgentResponse {
  const limits = options.limits ?? DEFAULT_PROTOCOL_LIMITS;
  if (response.length > limits.maxModelOutputChars) {
    return {
      ok: false,
      diagnostics: [
        diagnostic("PAYLOAD_TOO_LARGE", "Model output exceeds the configured size limit.", {
          receivedType: "string",
          expected: "At most " + limits.maxModelOutputChars + " characters.",
        }),
      ],
    };
  }

  const envelopeResult = parseJsonEnvelope(response.trim(), 0);
  const diagnostics = [...envelopeResult.diagnostics];
  if (!envelopeResult.value) return { ok: false, diagnostics };

  const envelope = envelopeResult.value;
  diagnostics.push(...checkEnvelopeKeys(envelope, ["kind", "calls"], 0));
  if (envelope.kind !== "tools") {
    diagnostics.push(
      fieldDiagnostic("INVALID_ENVELOPE_FIELD", 'Tool response kind must be "tools".', envelope.kind, {
        blockIndex: 0,
        fieldPath: "kind",
        expected: '"tools"',
      }),
    );
  }

  const callsValue = envelope.calls;
  const calls: ToolCall[] = [];
  const availableTools = options.toolNames ?? [];
  if (!Array.isArray(callsValue)) {
    diagnostics.push(
      fieldDiagnostic("INVALID_ENVELOPE_FIELD", "Tool response calls must be a JSON array.", callsValue, {
        blockIndex: 0,
        fieldPath: "calls",
        expected: "array",
      }),
    );
  } else if (callsValue.length === 0) {
    diagnostics.push(
      diagnostic("MISSING_ENVELOPE_FIELD", "Tool response calls must contain at least one call.", {
        blockIndex: 0,
        fieldPath: "calls",
        expected: "A non-empty array of tool calls.",
      }),
    );
  }

  if (Array.isArray(callsValue)) {
    callsValue.forEach((callValue, callIndex) => {
      if (typeof callValue !== "object" || callValue === null || Array.isArray(callValue)) {
        diagnostics.push(
          fieldDiagnostic("INVALID_ENVELOPE_FIELD", "Each tool call must be a JSON object.", callValue, {
            blockIndex: callIndex,
            callIndex,
            fieldPath: "calls." + callIndex,
            expected: "object",
          }),
        );
        return;
      }

      const call = callValue as JsonEnvelope;
      const name = call.name;
      const args = call.arguments;
      if (typeof name !== "string") {
        diagnostics.push(
          fieldDiagnostic("INVALID_ENVELOPE_FIELD", "Tool name must be a string.", name, {
            blockIndex: callIndex,
            callIndex,
            fieldPath: "calls." + callIndex + ".name",
            expected: "string",
          }),
        );
      } else if (!availableTools.includes(name)) {
        diagnostics.push(
          fieldDiagnostic("UNKNOWN_TOOL", 'Unknown tool "' + name + '".', name, {
            blockIndex: callIndex,
            callIndex,
            fieldPath: "calls." + callIndex + ".name",
            expected: "One of the registered food tools.",
            availableTools,
          }),
        );
      }
      diagnostics.push(...checkEnvelopeKeys(call, ["name", "arguments"], callIndex));
      if (typeof args !== "object" || args === null || Array.isArray(args)) {
        diagnostics.push(
          fieldDiagnostic("INVALID_ENVELOPE_FIELD", "Tool arguments must be a JSON object.", args, {
            blockIndex: callIndex,
            callIndex,
            fieldPath: "calls." + callIndex + ".arguments",
            expected: "object",
          }),
        );
      }
      if (typeof name === "string" && availableTools.includes(name) && typeof args === "object" && args !== null && !Array.isArray(args)) {
        calls.push({ name: name as FoodToolName, arguments: args as Record<string, unknown>, callIndex });
      }
    });
  }

  if (diagnostics.length > 0) return { ok: false, diagnostics };
  if (calls.length === 0) {
    return {
      ok: false,
      diagnostics: [diagnostic("MISSING_ENVELOPE_FIELD", "Tool response did not contain a usable tool call.")],
    };
  }
  return { ok: true, response: { kind: "tools", calls } };
}

export function parseResultResponse(
  response: string,
  options: { limits?: ProtocolLimits } = {},
): ParsedAgentResponse {
  const limits = options.limits ?? DEFAULT_PROTOCOL_LIMITS;
  if (response.length > limits.maxModelOutputChars) {
    return {
      ok: false,
      diagnostics: [
        diagnostic("PAYLOAD_TOO_LARGE", "Model output exceeds the configured size limit.", {
          receivedType: "string",
          expected: "At most " + limits.maxModelOutputChars + " characters.",
        }),
      ],
    };
  }

  const envelopeResult = parseJsonEnvelope(response.trim(), 0);
  const diagnostics = [...envelopeResult.diagnostics];
  if (!envelopeResult.value) return { ok: false, diagnostics };

  const envelope = envelopeResult.value;
  diagnostics.push(...checkEnvelopeKeys(envelope, ["kind", "content"], 0));
  if (envelope.kind !== "result") {
    diagnostics.push(
      fieldDiagnostic("INVALID_ENVELOPE_FIELD", 'Result response kind must be "result".', envelope.kind, {
        blockIndex: 0,
        fieldPath: "kind",
        expected: '"result"',
      }),
    );
  }
  const content = envelope.content;
  const parsedContent = MealSelectionSchema.safeParse(content);
  if (!parsedContent.success) {
    for (const issue of parsedContent.error.issues) {
      diagnostics.push(
        fieldDiagnostic("INVALID_ENVELOPE_FIELD", "Result content is not a valid meal selection.", content, {
          fieldPath: ["content", ...issue.path.map(String)].join("."),
          expected: issue.message,
        }),
      );
    }
    return { ok: false, diagnostics };
  } else {
    const serializedContent = JSON.stringify(parsedContent.data);
    if (serializedContent.length > limits.maxFinalContentChars) {
      diagnostics.push(
        diagnostic("PAYLOAD_TOO_LARGE", "Final result content exceeds the configured size limit.", {
          fieldPath: "content",
          receivedType: "object",
          expected: "At most " + limits.maxFinalContentChars + " characters.",
        }),
      );
    }
  }

  if (diagnostics.length > 0) return { ok: false, diagnostics };
  return { ok: true, response: { kind: "result", content: parsedContent.data } };
}

export function parseAgentResponse(
  response: string,
  options: { toolNames?: readonly string[]; limits?: ProtocolLimits } = {},
): ParsedAgentResponse {
  const limits = options.limits ?? DEFAULT_PROTOCOL_LIMITS;
  if (response.length > limits.maxModelOutputChars) {
    return {
      ok: false,
      diagnostics: [
        diagnostic("PAYLOAD_TOO_LARGE", "Model output exceeds the configured size limit.", {
          receivedType: "string",
          expected: "At most " + limits.maxModelOutputChars + " characters.",
        }),
      ],
    };
  }

  const parsed = parseJsonEnvelope(response.trim(), 0);
  if (!parsed.value) return { ok: false, diagnostics: parsed.diagnostics };

  if (parsed.value.kind === "tools") return parseToolResponse(response, options);
  if (parsed.value.kind === "result") return parseResultResponse(response, options);

  return {
    ok: false,
    diagnostics: [
      ...parsed.diagnostics,
      fieldDiagnostic("INVALID_ENVELOPE_FIELD", 'Response kind must be either "tools" or "result".', parsed.value.kind, {
        blockIndex: 0,
        fieldPath: "kind",
        expected: '"tools" or "result"',
      }),
    ],
  };
}

export function formatToolResults(
  results: readonly { callIndex: number; name: string; result: unknown }[],
): string {
  return "<sonion-tool-results>\n" + serializeTranscriptData({ results }) + "\n</sonion-tool-results>";
}

export function formatProtocolErrors(
  diagnostics: readonly ProtocolDiagnostic[],
  modelOutput?: string,
  maxCorrectionOutputChars = DEFAULT_PROTOCOL_LIMITS.maxCorrectionOutputChars,
): string {
  const output = modelOutput === undefined
    ? undefined
    : modelOutput.length > maxCorrectionOutputChars
      ? modelOutput.slice(0, maxCorrectionOutputChars) + "…"
      : modelOutput;
  const payload = output === undefined ? { errors: diagnostics } : { errors: diagnostics, modelOutput: output };
  return "<sonion-protocol-errors>\n" + serializeTranscriptData(payload) + "\n</sonion-protocol-errors>";
}

export function formatToolCall(name: FoodToolName, argumentsValue: Record<string, unknown>): string {
  return formatToolCalls([{ name, arguments: argumentsValue }]);
}

export function formatToolCalls(
  calls: readonly { name: FoodToolName; arguments: Record<string, unknown> }[],
): string {
  return JSON.stringify({ kind: "tools", calls });
}

export function formatResult(content: MealSelection): string {
  return JSON.stringify({ kind: "result", content });
}
