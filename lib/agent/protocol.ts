import type { FoodToolName } from "../food-data/tools";

const TOOL_OPEN = String.fromCharCode(96, 96, 96) + "sonion-tool";
const TOOL_CLOSE = "end-tool";
const RESULT_OPEN = String.fromCharCode(96, 96, 96) + "result";
const RESULT_CLOSE = "end";
const MAX_DIAGNOSTIC_VALUE_LENGTH = 120;

function serializeTranscriptData(value: unknown): string {
  return (JSON.stringify(value) ?? "null").replace(/</g, "\\u003c");
}

export type ProtocolDiagnosticCode =
  | "ARBITRARY_TEXT"
  | "MALFORMED_FENCE"
  | "MISSING_TERMINATOR"
  | "INVALID_JSON"
  | "MIXED_RESPONSE"
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
  content: string;
};

export type ParsedAgentResponse =
  | { ok: true; response: ToolResponse | ResultResponse }
  | { ok: false; diagnostics: ProtocolDiagnostic[] };

export type ProtocolLimits = {
  maxModelOutputChars: number;
  maxFinalContentChars: number;
};

export const DEFAULT_PROTOCOL_LIMITS: ProtocolLimits = {
  maxModelOutputChars: 24_000,
  maxFinalContentChars: 8_000,
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
  let index = 0;
  let previousSignificant = "";

  while (index < json.length) {
    const character = json[index];
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
    if (character === "}" || character === "]") depth -= 1;
    if (!/\s/.test(character)) previousSignificant = character;
    index += 1;
  }

  return duplicates;
}

function parseJsonEnvelope(
  body: string,
  blockIndex: number,
): { value?: Record<string, unknown>; diagnostics: ProtocolDiagnostic[] } {
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
      diagnostic("INVALID_JSON", "Tool envelope is not valid JSON.", {
        blockIndex,
        receivedType: "invalid-json",
        expected: "One JSON object containing the tool envelope.",
      }),
    );
    return { diagnostics };
  }

  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    diagnostics.push(
      fieldDiagnostic("INVALID_ENVELOPE_FIELD", "Tool envelope must be a JSON object.", parsed, {
        blockIndex,
        fieldPath: "",
        expected: "object",
      }),
    );
    return { diagnostics };
  }

  return { value: parsed as Record<string, unknown>, diagnostics };
}

function parseDelimitedBlocks(
  response: string,
  opener: string,
  closer: string,
): { bodies: string[]; diagnostics: ProtocolDiagnostic[] } {
  const bodies: string[] = [];
  const diagnostics: ProtocolDiagnostic[] = [];
  let cursor = 0;
  let blockIndex = 0;

  while (cursor < response.length) {
    while (/\s/.test(response[cursor] ?? "")) cursor += 1;
    if (cursor >= response.length) break;

    if (!response.startsWith(opener + "\n", cursor) && !response.startsWith(opener + "\r\n", cursor)) {
      diagnostics.push(
        diagnostic("ARBITRARY_TEXT", "Only complete protocol blocks may appear outside a block.", {
          blockIndex,
          expected: opener + " ... " + closer,
        }),
      );
      break;
    }

    const afterOpen = cursor + opener.length;
    const bodyStart = response[afterOpen] === "\r" ? afterOpen + 2 : afterOpen + 1;
    const closerMatch = response.slice(bodyStart).match(new RegExp("\r?\n" + closer + "(?=\r?\n|$)"));
    if (!closerMatch || closerMatch.index === undefined) {
      diagnostics.push(
        diagnostic("MISSING_TERMINATOR", 'Protocol block is missing its "' + closer + '" terminator.', {
          blockIndex,
          expected: "A line containing " + closer + " after the JSON body.",
        }),
      );
      break;
    }

    const bodyEnd = bodyStart + closerMatch.index;
    bodies.push(response.slice(bodyStart, bodyEnd));
    cursor = bodyEnd + closerMatch[0].length;
    blockIndex += 1;
  }

  return { bodies, diagnostics };
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

  const trimmed = response.trim();
  if (!trimmed.startsWith(TOOL_OPEN + "\n") && !trimmed.startsWith(TOOL_OPEN + "\r\n")) {
    return {
      ok: false,
      diagnostics: [
        diagnostic("MALFORMED_FENCE", "Tool response must start with a sonion-tool fence.", {
          expected: TOOL_OPEN + " ... " + TOOL_CLOSE,
        }),
      ],
    };
  }

  const parsedBlocks = parseDelimitedBlocks(trimmed, TOOL_OPEN, TOOL_CLOSE);
  const diagnostics = [...parsedBlocks.diagnostics];
  const calls: ToolCall[] = [];
  const availableTools = options.toolNames ?? [];

  parsedBlocks.bodies.forEach((body, blockIndex) => {
    const envelopeResult = parseJsonEnvelope(body.trim(), blockIndex);
    diagnostics.push(...envelopeResult.diagnostics);
    if (!envelopeResult.value) return;

    const envelope = envelopeResult.value;
    const name = envelope.name;
    const args = envelope.arguments;
    if (typeof name !== "string") {
      diagnostics.push(
        fieldDiagnostic("INVALID_ENVELOPE_FIELD", "Tool name must be a string.", name, {
          blockIndex,
          callIndex: blockIndex,
          fieldPath: "name",
          expected: "string",
        }),
      );
    } else if (!availableTools.includes(name)) {
      diagnostics.push(
        fieldDiagnostic("UNKNOWN_TOOL", 'Unknown tool "' + name + '".', name, {
          blockIndex,
          callIndex: blockIndex,
          fieldPath: "name",
          expected: "One of the registered food tools.",
          availableTools,
        }),
      );
    }
    diagnostics.push(...checkEnvelopeKeys(envelope, ["name", "arguments"], blockIndex));
    if (typeof args !== "object" || args === null || Array.isArray(args)) {
      diagnostics.push(
        fieldDiagnostic("INVALID_ENVELOPE_FIELD", "Tool arguments must be a JSON object.", args, {
          blockIndex,
          callIndex: blockIndex,
          fieldPath: "arguments",
          expected: "object",
        }),
      );
    }
    if (typeof name === "string" && availableTools.includes(name) && typeof args === "object" && args !== null && !Array.isArray(args)) {
      calls.push({ name: name as FoodToolName, arguments: args as Record<string, unknown>, callIndex: blockIndex });
    }
  });

  if (diagnostics.length > 0) return { ok: false, diagnostics };
  if (calls.length === 0) {
    return {
      ok: false,
      diagnostics: [diagnostic("MALFORMED_FENCE", "Tool response did not contain a usable tool call.")],
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

  const trimmed = response.trim();
  if (!trimmed.startsWith(RESULT_OPEN + "\n") && !trimmed.startsWith(RESULT_OPEN + "\r\n")) {
    return {
      ok: false,
      diagnostics: [
        diagnostic("MALFORMED_FENCE", "Result response must start with a result fence.", {
          expected: RESULT_OPEN + " ... " + RESULT_CLOSE,
        }),
      ],
    };
  }

  const parsedBlocks = parseDelimitedBlocks(trimmed, RESULT_OPEN, RESULT_CLOSE);
  const diagnostics = [...parsedBlocks.diagnostics];
  if (parsedBlocks.bodies.length !== 1) {
    diagnostics.push(
      diagnostic("MALFORMED_FENCE", "A result response must contain exactly one result block.", {
        expected: "Exactly one result block.",
      }),
    );
  }
  if (diagnostics.length > 0 || !parsedBlocks.bodies[0]) return { ok: false, diagnostics };

  const envelopeResult = parseJsonEnvelope(parsedBlocks.bodies[0].trim(), 0);
  diagnostics.push(...envelopeResult.diagnostics);
  if (!envelopeResult.value) return { ok: false, diagnostics };

  const envelope = envelopeResult.value;
  diagnostics.push(...checkEnvelopeKeys(envelope, ["content"], 0));
  const content = envelope.content;
  if (typeof content !== "string") {
    diagnostics.push(
      fieldDiagnostic("INVALID_ENVELOPE_FIELD", "Result content must be a string.", content, {
        fieldPath: "content",
        expected: "string",
      }),
    );
  } else if (!content.trim()) {
    diagnostics.push(
      diagnostic("EMPTY_RESULT", "Result content must not be empty.", {
        fieldPath: "content",
        receivedType: "string",
        expected: "A non-empty user-facing interpretation.",
      }),
    );
  } else if (content.length > limits.maxFinalContentChars) {
    diagnostics.push(
      diagnostic("PAYLOAD_TOO_LARGE", "Final result content exceeds the configured size limit.", {
        fieldPath: "content",
        receivedType: "string",
        expected: "At most " + limits.maxFinalContentChars + " characters.",
      }),
    );
  }

  if (diagnostics.length > 0) return { ok: false, diagnostics };
  return { ok: true, response: { kind: "result", content: content.trim() } };
}

export function parseAgentResponse(
  response: string,
  options: { toolNames?: readonly string[]; limits?: ProtocolLimits } = {},
): ParsedAgentResponse {
  const trimmed = response.trim();
  const hasToolMarker =
    trimmed.includes(TOOL_OPEN) || /(?:^|\r?\n)end-tool(?:\r?\n|$)/.test(trimmed);
  const hasResultMarker =
    trimmed.includes(RESULT_OPEN) || /(?:^|\r?\n)end(?:\r?\n|$)/.test(trimmed);

  if (hasToolMarker && hasResultMarker) {
    return {
      ok: false,
      diagnostics: [
        diagnostic("MIXED_RESPONSE", "A model response cannot mix tool blocks and a result block.", {
          expected: "Tool blocks only, or one result block only.",
        }),
      ],
    };
  }
  if (hasToolMarker) return parseToolResponse(response, options);
  if (hasResultMarker) return parseResultResponse(response, options);
  return {
    ok: false,
    diagnostics: [
      diagnostic("ARBITRARY_TEXT", "Model output must contain only protocol blocks.", {
        expected: TOOL_OPEN + " ... " + TOOL_CLOSE + " or " + RESULT_OPEN + " ... " + RESULT_CLOSE,
      }),
    ],
  };
}

export function formatToolResults(
  results: readonly { callIndex: number; name: string; result: unknown }[],
): string {
  return "<sonion-tool-results>\n" + serializeTranscriptData({ results }) + "\n</sonion-tool-results>";
}

export function formatProtocolErrors(diagnostics: readonly ProtocolDiagnostic[]): string {
  return "<sonion-protocol-errors>\n" + serializeTranscriptData({ errors: diagnostics }) + "\n</sonion-protocol-errors>";
}

export function formatToolCall(name: FoodToolName, argumentsValue: Record<string, unknown>): string {
  return TOOL_OPEN + "\n" + JSON.stringify({ name, arguments: argumentsValue }) + "\n" + TOOL_CLOSE;
}

export function formatResult(content: string): string {
  return RESULT_OPEN + "\n" + JSON.stringify({ content }) + "\n" + RESULT_CLOSE;
}
