import { test } from "node:test";
import assert from "node:assert/strict";

import {
  formatResult,
  formatToolCall,
  parseAgentResponse,
  parseResultResponse,
  parseToolResponse,
} from "../lib/agent/protocol";

const toolNames = ["searchFoods", "getFood"];
const fence = String.fromCharCode(96, 96, 96);

test("parses multiple tool calls and preserves call indexes", () => {
  const response = [
    formatToolCall("searchFoods", { query: "grilled chicken", limit: 5 }),
    formatToolCall("getFood", { fdcId: 12 }),
  ].join("\n\n");
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
  const parsed = parseResultResponse(formatResult("Chicken, prepared with an uncertain portion."));
  assert.deepEqual(parsed, {
    ok: true,
    response: { kind: "result", content: "Chicken, prepared with an uncertain portion." },
  });
});

test("reports unknown tools, unsupported fields, and exact paths", () => {
  const parsed = parseToolResponse(
    [
      fence + "sonion-tool",
      '{"name":"deleteFiles","arguments":{},"extra":true}',
      "end-tool",
    ].join("\n"),
    { toolNames },
  );

  assert.equal(parsed.ok, false);
  if (!parsed.ok) {
    assert.equal(parsed.diagnostics[0]?.code, "UNKNOWN_TOOL");
    assert.equal(parsed.diagnostics[0]?.fieldPath, "name");
    assert.deepEqual(parsed.diagnostics[0]?.availableTools, toolNames);
    assert.equal(parsed.diagnostics[1]?.code, "UNKNOWN_ENVELOPE_FIELD");
    assert.equal(parsed.diagnostics[1]?.fieldPath, "arguments");
  }
});

test("rejects malformed JSON, duplicate fields, mixed output, and arbitrary prose", () => {
  const malformed = parseAgentResponse(
    fence + "sonion-tool\n{\"name\":\nend-tool",
    { toolNames },
  );
  assert.equal(malformed.ok, false);
  if (!malformed.ok) assert.equal(malformed.diagnostics[0]?.code, "INVALID_JSON");

  const duplicate = parseAgentResponse(
    fence + 'sonion-tool\n{"name":"searchFoods","arguments":{},"name":"getFood"}\nend-tool',
    { toolNames },
  );
  assert.equal(duplicate.ok, false);
  if (!duplicate.ok) assert.equal(duplicate.diagnostics[0]?.code, "DUPLICATE_ENVELOPE_FIELD");

  const mixed = parseAgentResponse(formatToolCall("getFood", { fdcId: 1 }) + "\n" + formatResult("no"));
  assert.equal(mixed.ok, false);
  if (!mixed.ok) assert.equal(mixed.diagnostics[0]?.code, "MIXED_RESPONSE");

  const prose = parseAgentResponse("I found the food.");
  assert.equal(prose.ok, false);
  if (!prose.ok) assert.equal(prose.diagnostics[0]?.code, "ARBITRARY_TEXT");
});
