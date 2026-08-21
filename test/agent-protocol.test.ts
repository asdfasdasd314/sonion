import { test } from "node:test";
import assert from "node:assert/strict";

import {
  formatResult,
  formatToolCall,
  formatToolCalls,
  parseAgentResponse,
  parseResultResponse,
  parseToolResponse,
} from "../lib/agent/protocol";
import type { MealSelection } from "../lib/meal-estimation/types";

const toolNames = ["searchFoods", "getFood"];
const selection: MealSelection = {
  items: [{ itemName: "chicken", fdcId: 12, portionUnits: 1.5, portionKind: "solid" }],
};

test("parses multiple tool calls and preserves call indexes", () => {
  const response = formatToolCalls([
    { name: "searchFoods", arguments: { query: "grilled chicken", limit: 5 } },
    { name: "getFood", arguments: { fdcId: 12 } },
  ]);
  const parsed = parseToolResponse(response, { toolNames });

  assert.equal(parsed.ok, true);
  if (parsed.ok && parsed.response.kind === "tools") {
    assert.deepEqual(parsed.response.calls, [
      { name: "searchFoods", arguments: { query: "grilled chicken", limit: 5 }, callIndex: 0 },
      { name: "getFood", arguments: { fdcId: 12 }, callIndex: 1 },
    ]);
  }
});

test("extracts only validated result content", () => {
  const parsed = parseResultResponse(formatResult(selection));
  assert.deepEqual(parsed, {
    ok: true,
    response: { kind: "result", content: selection },
  });
});

test("rejects prose, empty selections, and nutrition fields in the result payload", () => {
  const prose = parseResultResponse(JSON.stringify({ kind: "result", content: "chicken" }));
  assert.equal(prose.ok, false);

  const empty = parseResultResponse(JSON.stringify({ kind: "result", content: { items: [] } }));
  assert.equal(empty.ok, false);

  const nutrition = parseResultResponse(JSON.stringify({
    kind: "result",
    content: {
      items: [{ itemName: "chicken", fdcId: 12, portionUnits: 1, portionKind: "solid", grams: 150 }],
    },
  }));
  assert.equal(nutrition.ok, false);
  if (!nutrition.ok) assert.ok(nutrition.diagnostics.some((item) => item.fieldPath?.includes("grams")));
});

test("reports unknown tools, unsupported fields, and exact paths", () => {
  const parsed = parseToolResponse(
    JSON.stringify({
      kind: "tools",
      calls: [{ name: "deleteFiles", arguments: {}, extra: true }],
    }),
    { toolNames },
  );

  assert.equal(parsed.ok, false);
  if (!parsed.ok) {
    assert.equal(parsed.diagnostics[0]?.code, "UNKNOWN_TOOL");
    assert.equal(parsed.diagnostics[0]?.fieldPath, "calls.0.name");
    assert.deepEqual(parsed.diagnostics[0]?.availableTools, toolNames);
    assert.equal(parsed.diagnostics[1]?.code, "UNKNOWN_ENVELOPE_FIELD");
    assert.equal(parsed.diagnostics[1]?.fieldPath, "extra");
  }
});

test("rejects malformed JSON, duplicate fields, mixed output, arbitrary prose, and fences", () => {
  const malformed = parseAgentResponse('{"kind":"tools","calls":[{"name":}]}', { toolNames });
  assert.equal(malformed.ok, false);
  if (!malformed.ok) assert.equal(malformed.diagnostics[0]?.code, "INVALID_JSON");

  const duplicate = parseAgentResponse(
    '{"kind":"tools","calls":[],"kind":"tools"}',
    { toolNames },
  );
  assert.equal(duplicate.ok, false);
  if (!duplicate.ok) assert.equal(duplicate.diagnostics[0]?.code, "DUPLICATE_ENVELOPE_FIELD");

  const mixed = parseAgentResponse(formatToolCall("getFood", { fdcId: 1 }) + "\n" + formatResult(selection));
  assert.equal(mixed.ok, false);
  if (!mixed.ok) assert.equal(mixed.diagnostics[0]?.code, "INVALID_JSON");

  const prose = parseAgentResponse("I found the food.");
  assert.equal(prose.ok, false);
  if (!prose.ok) assert.equal(prose.diagnostics[0]?.code, "INVALID_JSON");

  const fenced = parseAgentResponse(
    [
      "```sonion-tool",
      '{"name":"searchFoods","arguments":{"query":"rice"}}',
      "end-tool",
      "```",
    ].join("\n"),
    { toolNames },
  );
  assert.equal(fenced.ok, false);
  if (!fenced.ok) assert.equal(fenced.diagnostics[0]?.code, "INVALID_JSON");
});
