# Server-side agent tool loop

## Summary

The estimate route runs a server-side JSON protocol loop so the food interpreter can search and inspect the normalized local USDA index without receiving code execution, filesystem, network, or persistence capabilities. The loop continues until the model returns a valid result; protocol, per-turn tool-call, and payload limits still protect the capability boundary. Only the validated structured selection in result.content is passed to the server-side estimator; the browser receives the validated `{ items, totals }` estimate.

## Key Points

- FOOD_TOOLS_SKILL is injected into the model system instruction and documents the two allowed tools, their exact JSON argument shapes, lookup strategy, safety boundaries, and output protocol.
- Correction transcripts identify the structured validation errors and may include a bounded copy of the prior model output as diagnostic data, which the skill instructs the model to use only for repairing its protocol response.
- Model tool calls use one JSON object with `{ "kind": "tools", "calls": [{ "name", "arguments" }] }`; final responses use one `{ "kind": "result", "content": { "items": [...] } }` object.
- The Google AI request asks for `application/json`, and protocol parsing rejects Markdown fences, arbitrary text, invalid JSON, duplicate or unknown envelope fields, mixed tool/result payloads, unknown tools, and oversized responses with structured diagnostics.
- Zod schemas are strict: unknown arguments, missing arguments, invalid types, out-of-range values, and invalid enum values are rejected before execution.
- The runner logs each received tool-call attempt, serializes tool results as data, catches tool failures, redacts exception details, limits per-turn calls/payloads, and never evaluates model output.
- Invalid model responses, including strict tool-argument failures such as unsupported or missing attributes, are logged with their complete returned text and structured diagnostics; those diagnostics plus a bounded raw-output preview are fed back to the model for correction, including oversized responses.
- Meal descriptions and tool results are explicitly delimited as untrusted data to reduce prompt-injection confusion.

## Relevant Files

- lib/agent/food-tools-skill.ts contains the model-facing skill.
- lib/agent/protocol.ts parses and formats tool, result, and internal correction envelopes.
- lib/agent/runner.ts owns the capability sandbox and result-driven orchestration loop.
- lib/food-data/tools.ts provides the strict allowlisted registry.
- app/api/estimate/route.ts authenticates requests, retrieves authoritative records, and returns only the validated meal estimate.
- lib/food-data/errors.ts and app/api/estimate/route.ts keep food-data setup failures separate from Gemma/SDK failures.
- parameter_files/agent-tool-loop.toml records server-only per-turn and payload safety limits.
- test/agent-protocol.test.ts and test/agent-runner.test.ts cover protocol and orchestration behavior.

## Dev Mode

TESTING

## State Log

- Added the strict text protocol, fixed food-tool skill, application capability sandbox, bounded model loop, and internal correction transcripts.
- Ordered unknown-tool diagnostics before envelope-field diagnostics and corrected the protocol test to identify the actual unsupported field.
- Classified food-data registry setup failures before the Gemma call so missing or invalid indexes return a clear 503 setup response while preserving the tool loop and system skill.
- Removed the wall-clock response deadline and added server-console logging for every received tool-call attempt, including calls rejected by runner limits or argument validation.
- Added invalid-output and invalid-tool-argument diagnostics with raw-response logging, echoed a bounded raw response into correction feedback, and made oversized output retryable instead of failing before validation.
- Replaced the fence-delimited model contract with a discriminator-based JSON-only contract and requested JSON MIME responses from Google AI after valid tool JSON was rejected because trailing Markdown fences were parsed as arbitrary text.
- Aligned the unknown-tool protocol assertion with its nested `calls.0.name` diagnostic path so the verification suite matches the JSON envelope.
- Replaced prose final content with a strict Portion Unit selection payload and handed calculations to the server-owned meal-estimation layer.
- Removed the round-count limit so valid multi-step food lookups can continue until the model returns a result; per-turn and payload limits remain the tool-boundary controls.
