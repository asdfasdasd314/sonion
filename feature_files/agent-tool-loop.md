# Server-side agent tool loop

## Summary

The estimate route runs a bounded, server-side text-protocol loop so the food interpreter can search and inspect the normalized local USDA index without receiving code execution, filesystem, network, or persistence capabilities. Only validated result.content is returned to the browser.

## Key Points

- FOOD_TOOLS_SKILL is injected into the model system instruction and documents the two allowed tools, their exact JSON argument shapes, lookup strategy, safety boundaries, and output protocol.
- Model tool calls use one or more anchored sonion-tool blocks with { "name", "arguments" } JSON envelopes. Final responses use exactly one result block with a string content field.
- Protocol parsing rejects arbitrary text, malformed fences, invalid JSON, duplicate or unknown envelope fields, mixed tool/result output, unknown tools, and oversized payloads with structured diagnostics.
- Zod schemas are strict: unknown arguments, missing arguments, invalid types, out-of-range values, and invalid enum values are rejected before execution.
- The runner serializes tool results as data, catches tool failures, redacts exception details, limits rounds/calls/payloads/deadline, and never evaluates model output.
- Meal descriptions and tool results are explicitly delimited as untrusted data to reduce prompt-injection confusion.

## Relevant Files

- lib/agent/food-tools-skill.ts contains the model-facing skill.
- lib/agent/protocol.ts parses and formats tool, result, and internal correction envelopes.
- lib/agent/runner.ts owns the capability sandbox and bounded orchestration loop.
- lib/food-data/tools.ts provides the strict allowlisted registry.
- app/api/estimate/route.ts authenticates requests and returns only the validated final content.
- parameter_files/agent-tool-loop.toml records server-only safety limits.
- test/agent-protocol.test.ts and test/agent-runner.test.ts cover protocol and orchestration behavior.

## Dev Mode

TESTING

## State Log

- Added the strict text protocol, fixed food-tool skill, application capability sandbox, bounded model loop, and internal correction transcripts.
- Ordered unknown-tool diagnostics before envelope-field diagnostics and corrected the protocol test to identify the actual unsupported field.
