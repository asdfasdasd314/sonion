import {
  formatProtocolErrors,
  formatToolResults,
  parseAgentResponse,
  type ProtocolDiagnostic,
  type ProtocolLimits,
  type ToolCall,
} from "./protocol";
import { getFoodToolsSkill } from "./food-tools-skill";
import type { FoodToolRegistry } from "../food-data/tools";
import type { MealSelection } from "../meal-estimation/types";

export type AgentGenerationRequest = {
  systemInstruction: string;
  contents: string;
};

export type AgentGenerationAdapter = (
  request: AgentGenerationRequest,
) => Promise<string>;

export type AgentLimits = ProtocolLimits & {
  maxRounds: number;
  maxCallsPerTurn: number;
  maxToolResultChars: number;
};

export const DEFAULT_AGENT_LIMITS: AgentLimits = {
  maxRounds: 8,
  maxCallsPerTurn: 4,
  maxModelOutputChars: 24_000,
  maxCorrectionOutputChars: 4_000,
  maxToolResultChars: 12_000,
  maxFinalContentChars: 8_000,
};

export type RunMealAgentInput = {
  mealPrompt: string;
  tools: FoodToolRegistry;
  generate: AgentGenerationAdapter;
  limits?: Partial<AgentLimits>;
};

export class AgentRunnerError extends Error {
  readonly code:
    | "ROUND_LIMIT"
    | "MODEL_OUTPUT_INVALID"
    | "MODEL_FAILURE"
    | "FINAL_OUTPUT_INVALID";

  readonly diagnostics?: readonly ProtocolDiagnostic[];
  readonly modelOutput?: string;

  constructor(
    code: AgentRunnerError["code"],
    message: string,
    details: { diagnostics?: readonly ProtocolDiagnostic[]; modelOutput?: string } = {},
  ) {
    super(message);
    this.name = "AgentRunnerError";
    this.code = code;
    this.diagnostics = details.diagnostics;
    this.modelOutput = details.modelOutput;
  }
}

function mergedLimits(overrides: Partial<AgentLimits> | undefined): AgentLimits {
  return { ...DEFAULT_AGENT_LIMITS, ...overrides };
}

function mealContents(mealPrompt: string): string {
  return [
    "<sonion-user-meal>",
    (JSON.stringify({ description: mealPrompt }) ?? "null").replace(/</g, "\\u003c"),
    "</sonion-user-meal>",
  ].join("\n");
}

function valueAtPath(value: unknown, path: readonly (string | number)[]): unknown {
  let current = value;
  for (const segment of path) {
    if (typeof current !== "object" || current === null) return undefined;
    current = (current as Record<string, unknown>)[String(segment)];
  }
  return current;
}

function receivedType(value: unknown): string {
  if (value === null) return "null";
  if (Array.isArray(value)) return "array";
  return typeof value;
}

function argumentDiagnostics(
  call: ToolCall,
  tool: NonNullable<FoodToolRegistry[ToolCall["name"]]>,
): ProtocolDiagnostic[] {
  const parsed = tool.argumentsSchema.safeParse(call.arguments);
  if (parsed.success) return [];

  return parsed.error.issues.map((issue) => {
    const issueDetails = issue as typeof issue & { keys?: string[]; expected?: string; received?: string };
    const issuePath = issue.path.map(String);
    const unknownKey = issueDetails.code === "unrecognized_keys" ? issueDetails.keys?.[0] : undefined;
    const fieldPath = unknownKey
      ? "arguments." + unknownKey
      : issuePath.length > 0
        ? "arguments." + issuePath.join(".")
        : "arguments";
    const value = unknownKey ? call.arguments[unknownKey] : valueAtPath(call.arguments, issue.path);
    return {
      code: "INVALID_TOOL_ARGUMENTS",
      message: issue.message,
      blockIndex: call.callIndex,
      callIndex: call.callIndex,
      fieldPath,
      received: typeof value === "string" && value.length > 120 ? value.slice(0, 120) + "…" : value,
      receivedType: receivedType(value),
      expected: issueDetails.expected ?? tool.expectedFields.join(", "),
    };
  });
}

function serializeToolResult(value: unknown, maxChars: number): unknown {
  let serialized: string;
  try {
    serialized = JSON.stringify(value) ?? "null";
  } catch {
    return { error: "TOOL_RESULT_UNSERIALIZABLE" };
  }
  if (serialized.length > maxChars) return { error: "TOOL_RESULT_TOO_LARGE" };
  return value;
}

async function executeCalls(
  calls: readonly ToolCall[],
  tools: FoodToolRegistry,
  limits: AgentLimits,
): Promise<{
  results: { callIndex: number; name: string; result: unknown }[];
  diagnostics: ProtocolDiagnostic[];
}> {
  const diagnostics: ProtocolDiagnostic[] = [];
  const results: { callIndex: number; name: string; result: unknown }[] = [];

  for (const call of calls) {
    console.log("Meal agent tool call.", {
      callIndex: call.callIndex,
      name: call.name,
      arguments: call.arguments,
    });
  }

  if (calls.length > limits.maxCallsPerTurn) {
    diagnostics.push({
      code: "INVALID_TOOL_ARGUMENTS",
      message: "This response contains too many tool calls for one turn.",
      expected: "At most " + limits.maxCallsPerTurn + " tool calls per turn.",
      received: calls.length,
      receivedType: "number",
    });
    return { results, diagnostics };
  }
  for (const call of calls) {
    const tool = tools[call.name];
    const argumentErrors = argumentDiagnostics(call, tool);
    if (argumentErrors.length > 0) {
      diagnostics.push(...argumentErrors);
      results.push({
        callIndex: call.callIndex,
        name: call.name,
        result: { error: "INVALID_TOOL_ARGUMENTS", diagnostics: argumentErrors },
      });
      continue;
    }

    try {
      const result = await tool.execute(call.arguments);
      results.push({
        callIndex: call.callIndex,
        name: call.name,
        result: serializeToolResult(result, limits.maxToolResultChars),
      });
    } catch {
      results.push({
        callIndex: call.callIndex,
        name: call.name,
        result: { error: "TOOL_EXECUTION_FAILED", message: "The read-only food tool failed." },
      });
    }
  }

  return { results, diagnostics };
}

async function runLoop(input: RunMealAgentInput, limits: AgentLimits): Promise<MealSelection> {
  let contents = mealContents(input.mealPrompt);

  for (let round = 0; round < limits.maxRounds; round += 1) {
    let modelOutput: string;
    try {
      modelOutput = await input.generate({
        systemInstruction: getFoodToolsSkill(),
        contents,
      });
    } catch {
      throw new AgentRunnerError("MODEL_FAILURE", "The model provider failed.");
    }

    const parsed = parseAgentResponse(modelOutput, {
      toolNames: Object.keys(input.tools),
      limits,
    });

    if (!parsed.ok) {
      console.error("Meal agent returned invalid model output.", {
        round: round + 1,
        diagnostics: parsed.diagnostics,
        modelOutput,
      });
      if (round + 1 >= limits.maxRounds) {
        throw new AgentRunnerError(
          "MODEL_OUTPUT_INVALID",
          "The model returned invalid protocol output.",
          { diagnostics: parsed.diagnostics, modelOutput },
        );
      }
      contents += "\n\n" + formatProtocolErrors(
        parsed.diagnostics,
        modelOutput,
        limits.maxCorrectionOutputChars,
      );
      continue;
    }

    if (parsed.response.kind === "result") return parsed.response.content;

    const execution = await executeCalls(
      parsed.response.calls,
      input.tools,
      limits,
    );

    if (execution.results.length > 0) {
      contents += "\n\n" + formatToolResults(execution.results);
    }
    if (execution.diagnostics.length > 0) {
      console.error("Meal agent returned invalid tool arguments.", {
        round: round + 1,
        diagnostics: execution.diagnostics,
        modelOutput,
      });
      if (round + 1 >= limits.maxRounds) {
        throw new AgentRunnerError(
          "MODEL_OUTPUT_INVALID",
          "The model returned invalid tool arguments.",
          { diagnostics: execution.diagnostics, modelOutput },
        );
      }
      contents += "\n\n" + formatProtocolErrors(
        execution.diagnostics,
        modelOutput,
        limits.maxCorrectionOutputChars,
      );
    }
  }

  throw new AgentRunnerError("ROUND_LIMIT", "The agent exceeded its round limit.");
}

export async function runMealAgent(input: RunMealAgentInput): Promise<MealSelection> {
  const limits = mergedLimits(input.limits);
  if (!input.mealPrompt.trim()) {
    throw new AgentRunnerError("MODEL_OUTPUT_INVALID", "The meal prompt must not be empty.");
  }

  return runLoop(input, limits);
}
