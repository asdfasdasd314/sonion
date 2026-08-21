"use client";

import { useState } from "react";
import type { FormEvent } from "react";

import { parseMealEstimate, type MealEstimate } from "@/lib/meal-estimation/types";

const MAX_PROMPT_LENGTH = 2_000;

type MealInterpreterProps = {
  accessToken: string;
};

export default function MealInterpreter({ accessToken }: MealInterpreterProps) {
  const [prompt, setPrompt] = useState("");
  const [response, setResponse] = useState<MealEstimate | null>(null);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) return;

    const trimmedPrompt = prompt.trim();
    setResponse("");
    setError("");

    if (!trimmedPrompt) {
      setError("Enter a food description before submitting.");
      return;
    }
    if (trimmedPrompt.length > MAX_PROMPT_LENGTH) {
      setError(`Keep the prompt under ${MAX_PROMPT_LENGTH.toLocaleString()} characters.`);
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await fetch("/api/estimate", {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: trimmedPrompt }),
      });
      const payload = (await result.json().catch(() => ({}))) as unknown;

      if (!result.ok) {
        const errorMessage = typeof payload === "object" && payload !== null && "error" in payload && typeof payload.error === "string"
          ? payload.error
          : undefined;
        setError(errorMessage ?? "Sonion could not interpret that prompt.");
        return;
      }
      const estimate = parseMealEstimate(payload);
      if (!estimate) {
        setError("Sonion returned an incomplete meal estimate. Try submitting the meal again.");
        return;
      }
      setResponse(estimate);
    } catch {
      setError("Sonion could not reach the backend. Check that the app is running and try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section aria-labelledby="interpreter-title" className="panel interpreter-panel">
      <div className="interpreter-mark" aria-hidden="true">✦</div>
      <p className="eyebrow">Meal interpreter</p>
      <h1 id="interpreter-title">Describe it. We&apos;ll break it down.</h1>
      <p className="interpreter-intro">Write what you ate in plain language and Sonion will estimate the foods and macros. Nothing is saved to your meal history yet.</p>

      <form className="interpreter-form" onSubmit={handleSubmit}>
        <label htmlFor="food-prompt">What did you eat?</label>
        <p className="field-help" id="food-prompt-help">Try: “two scoops of rice, grilled chicken, and a little broccoli”</p>
        <textarea
          aria-describedby="food-prompt-help prompt-count"
          id="food-prompt"
          maxLength={MAX_PROMPT_LENGTH}
          onChange={(event) => setPrompt(event.target.value)}
          placeholder="Describe your meal in your own words..."
          required
          value={prompt}
        />
        <div className="form-footer">
          <span className="character-count" id="prompt-count">{prompt.length.toLocaleString()} / {MAX_PROMPT_LENGTH.toLocaleString()}</span>
          <button aria-busy={isSubmitting} className="primary-button" disabled={isSubmitting} type="submit">
            {isSubmitting ? "Interpreting..." : "Interpret meal"}
          </button>
        </div>
      </form>

      <div aria-live="assertive" className="message-slot" role="alert">
        {error ? <p className="error-message">{error}</p> : null}
      </div>
      <section aria-label="Sonion response" aria-live="polite" className="response-slot">
        {response ? (
          <div className="response-card">
            <p className="response-label">Estimated meal</p>
            <div className="estimate-table-wrap">
              <table className="estimate-table">
                <caption className="visually-hidden">Estimated foods, portions, volume, weight, and nutrients</caption>
                <thead>
                  <tr>
                    <th scope="col">Food</th>
                    <th scope="col">PU</th>
                    <th scope="col">Volume</th>
                    <th scope="col">Weight</th>
                    <th scope="col">Calories</th>
                    <th scope="col">Protein</th>
                    <th scope="col">Fat</th>
                    <th scope="col">Carbs</th>
                  </tr>
                </thead>
                <tbody>
                  {response.items.map((item, index) => (
                    <tr key={`${item.fdcId}-${index}`}>
                      <th data-label="Food" scope="row">{item.foodName}<small>{item.portionKind}</small></th>
                      <td data-label="PU">{formatValue(item.portionUnits, 2)}</td>
                      <td data-label="Volume">{formatValue(item.estimatedMilliliters)} ml</td>
                      <td data-label="Weight">{formatValue(item.estimatedGrams)} g</td>
                      <td data-label="Calories">{formatValue(item.calories)}</td>
                      <td data-label="Protein">{formatValue(item.protein)} g</td>
                      <td data-label="Fat">{formatValue(item.fat)} g</td>
                      <td data-label="Carbs">{formatValue(item.carbohydrates)} g</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <th scope="row">Meal total</th>
                    <td />
                    <td />
                    <td />
                    <td>{formatValue(response.totals.calories)}</td>
                    <td>{formatValue(response.totals.protein)} g</td>
                    <td>{formatValue(response.totals.fat)} g</td>
                    <td>{formatValue(response.totals.carbohydrates)} g</td>
                  </tr>
                </tfoot>
              </table>
            </div>
            {response.items.some((item) => item.densitySource.type === "fallback") ? (
              <p className="warning-message" role="status">Some weights use an estimated fallback density because USDA volume data was unavailable.</p>
            ) : null}
            {response.items.some((item) => [item.calories, item.protein, item.fat, item.carbohydrates].some((value) => value === null)) ? (
              <p className="warning-message" role="status">Some nutrient values were missing from the USDA records, so the related meal totals are shown as —.</p>
            ) : null}
          </div>
        ) : null}
      </section>
    </section>
  );
}

function formatValue(value: number | null, maximumFractionDigits = 1): string {
  return value === null ? "—" : value.toLocaleString(undefined, { maximumFractionDigits });
}
