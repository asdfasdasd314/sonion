import assert from "node:assert/strict";
import test, { afterEach } from "node:test";

import { DELETE, PATCH } from "../app/api/meals/[id]/route";
import { GET, POST } from "../app/api/meals/route";

process.env.NEXT_PUBLIC_SUPABASE_URL ??= "https://test.supabase.local";
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??= "test-anon-key";

const accessToken = "verified-access-token";
const userId = "11111111-1111-4111-8111-111111111111";
const mealId = "22222222-2222-4222-8222-222222222222";
const snapshot = {
  items: [{
    foodName: "Rice",
    fdcId: 1,
    portionUnits: 1,
    portionKind: "solid",
    estimatedMilliliters: 150,
    estimatedGrams: 100,
    densitySource: { type: "fallback", gramsPerMilliliter: 0.75, portionKind: "solid" },
    calories: 130,
    protein: null,
    fat: 0.3,
    carbohydrates: 28,
  }],
  totals: { calories: 130, protein: null, fat: 0.3, carbohydrates: 28 },
};
const savedMeal = {
  id: mealId,
  user_id: userId,
  meal_date: "2026-08-21",
  meal_time: "08:05:00",
  meal_snapshot: snapshot,
  created_at: "2026-08-21T12:00:00.000Z",
  updated_at: "2026-08-21T12:00:00.000Z",
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

test("meal GET rejects unauthenticated requests before contacting Supabase", async () => {
  const calls = mockFetch([]);
  const response = await GET(new Request("http://localhost/api/meals"));
  assert.equal(response.status, 401);
  assert.equal(calls.length, 0);
});

test("meal GET verifies the bearer token and lists only the authenticated user's response", async () => {
  const calls = mockFetch([{ body: { id: userId } }, { body: [savedMeal] }]);
  const response = await GET(authenticatedRequest("http://localhost/api/meals"));
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { meals: [savedMeal] });
  assert.match(String(calls[1]?.input), /select=id,user_id,meal_date,meal_time,meal_snapshot,created_at,updated_at/);
  assert.match(String(calls[1]?.input), /order=meal_date.desc,meal_time.desc/);
  assert.equal((calls[1]?.init?.headers as Headers).get("Authorization"), `Bearer ${accessToken}`);
});

test("meal POST derives user_id from the verified auth response", async () => {
  const calls = mockFetch([{ body: { id: userId } }, { body: [savedMeal] }]);
  const response = await POST(authenticatedRequest("http://localhost/api/meals", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mealDate: "2026-08-21", mealTime: "08:05", mealSnapshot: snapshot }),
  }));
  assert.equal(response.status, 201);
  const body = JSON.parse(String(calls[1]?.init?.body)) as Record<string, unknown>;
  assert.equal(body.user_id, userId);
  assert.equal("userId" in body, false);
});

test("PATCH and DELETE use the bearer token and a specific meal ID for owner-safe operations", async () => {
  const patchCalls = mockFetch([{ body: { id: userId } }, { body: [savedMeal] }]);
  const patchResponse = await PATCH(authenticatedRequest(`http://localhost/api/meals/${mealId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mealTime: "09:10" }),
  }), { params: Promise.resolve({ id: mealId }) });
  assert.equal(patchResponse.status, 200);
  assert.match(String(patchCalls[1]?.input), new RegExp(`id=eq\\.${mealId}`));
  const patchBody = JSON.parse(String(patchCalls[1]?.init?.body)) as Record<string, unknown>;
  assert.equal(patchBody.meal_time, "09:10");
  const deleteCalls = mockFetch([{ body: { id: userId } }, { status: 204 }]);
  const deleteResponse = await DELETE(authenticatedRequest(`http://localhost/api/meals/${mealId}`, { method: "DELETE" }), { params: Promise.resolve({ id: mealId }) });
  assert.equal(deleteResponse.status, 204);
  assert.match(String(deleteCalls[1]?.input), new RegExp(`id=eq\\.${mealId}`));
});
