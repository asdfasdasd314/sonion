import assert from "node:assert/strict";
import test, { afterEach } from "node:test";

import { GET } from "../app/api/interpretation-errors/route";
import { PATCH } from "../app/api/interpretation-errors/[id]/route";

process.env.NEXT_PUBLIC_SUPABASE_URL ??= "https://test.supabase.local";
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??= "test-anon-key";

const accessToken = "verified-access-token";
const userId = "11111111-1111-4111-8111-111111111111";
const errorId = "33333333-3333-4333-8333-333333333333";
const errorRow = {
  id: errorId,
  user_id: userId,
  created_at: "2026-08-23T12:00:00.000Z",
  source: "interpret_and_save",
  prompt: "eggs and toast",
  meal_date: "2026-08-23",
  meal_time: "08:15:00",
  error_code: "MODEL_FAILURE",
  error_message: "Google AI could not process this meal description.",
  diagnostics: null,
  dismissed_at: null,
};

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
});

function mockFetch(responses: Array<{ status?: number; body?: unknown }>) {
  const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];
  globalThis.fetch = async (input, init) => {
    calls.push({ input, init });
    const next = responses.shift() ?? { status: 500, body: { message: "unexpected request" } };
    return new Response(next.body === undefined ? null : JSON.stringify(next.body), {
      status: next.status ?? 200,
      headers: { "Content-Type": "application/json" },
    });
  };
  return calls;
}

function authenticatedRequest(url: string, init: RequestInit = {}) {
  return new Request(url, {
    ...init,
    headers: { ...(init.headers ?? {}), Authorization: `Bearer ${accessToken}` },
  });
}

test("interpretation-errors GET rejects unauthenticated requests", async () => {
  const calls = mockFetch([]);
  const response = await GET(new Request("http://localhost/api/interpretation-errors"));
  assert.equal(response.status, 401);
  assert.equal(calls.length, 0);
});

test("interpretation-errors GET lists owner rows newest first and excludes dismissed", async () => {
  const calls = mockFetch([{ body: { id: userId } }, { body: [errorRow] }]);
  const response = await GET(authenticatedRequest("http://localhost/api/interpretation-errors"));
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { errors: [errorRow] });
  assert.match(String(calls[1]?.input), /dismissed_at=is\.null/);
  assert.match(String(calls[1]?.input), /order=created_at\.desc/);
});

test("interpretation-errors PATCH soft-dismisses by id", async () => {
  const dismissed = { ...errorRow, dismissed_at: "2026-08-23T13:00:00.000Z" };
  const calls = mockFetch([{ body: { id: userId } }, { body: [dismissed] }]);
  const response = await PATCH(
    authenticatedRequest(`http://localhost/api/interpretation-errors/${errorId}`, { method: "PATCH" }),
    { params: Promise.resolve({ id: errorId }) },
  );
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), dismissed);
  assert.match(String(calls[1]?.input), new RegExp(`id=eq\\.${errorId}`));
  const body = JSON.parse(String(calls[1]?.init?.body)) as { dismissed_at: string };
  assert.ok(typeof body.dismissed_at === "string" && body.dismissed_at.length > 0);
});
