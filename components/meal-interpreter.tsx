"use client";

import { useEffect, useState } from "react";
import type { FormEvent } from "react";

import { canStartMealSave, saveStateAfterResponse, type MealSaveState } from "@/lib/meal-history/save";
import { isValidLocalDate, isValidLocalTime, parseMealRecord } from "@/lib/meal-history/types";
import { parseMealEstimate, type MealEstimate } from "@/lib/meal-estimation/types";

const MAX_PROMPT_LENGTH = 2_000;

type MealInterpreterProps = {
  accessToken: string;
  onMealSaved: () => void;
};

export default function MealInterpreter({ accessToken, onMealSaved }: MealInterpreterProps) {
  const [prompt, setPrompt] = useState("");
  const [response, setResponse] = useState<MealEstimate | null>(null);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mealDate, setMealDate] = useState("");
  const [mealTime, setMealTime] = useState("");
  const [saveState, setSaveState] = useState<MealSaveState>("idle");
  const [saveError, setSaveError] = useState("");

  useEffect(() => {
    const now = new Date();
    const pad = (value: number) => String(value).padStart(2, "0");
    setMealDate(`${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`);
    setMealTime(`${pad(now.getHours())}:${pad(now.getMinutes())}`);
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting || saveState === "saving") return;

    const trimmedPrompt = prompt.trim();
    setResponse(null);
    setError("");
    setSaveState("idle");
    setSaveError("");

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

  async function handleSaveMeal() {
    if (!canStartMealSave(response, saveState)) return;
    setSaveError("");

    if (!isValidLocalDate(mealDate)) {
      setSaveState("error");
      setSaveError("Choose a valid meal date.");
      return;
    }
    if (!isValidLocalTime(mealTime)) {
      setSaveState("error");
      setSaveError("Choose a valid local meal time.");
      return;
    }

    setSaveState("saving");
    try {
      const result = await fetch("/api/meals", {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({ mealDate, mealTime, mealSnapshot: response }),
      });
      const payload = (await result.json().catch(() => ({}))) as unknown;
      if (!result.ok) {
        setSaveState(saveStateAfterResponse(false));
        setSaveError(getErrorMessage(payload) ?? "Sonion could not save this meal.");
        return;
      }
      if (!parseMealRecord(payload)) {
        setSaveState(saveStateAfterResponse(false));
        setSaveError("Sonion saved an incomplete meal record. Refresh your history and try again.");
        return;
      }
      setSaveState(saveStateAfterResponse(true));
      onMealSaved();
    } catch {
      setSaveState("error");
      setSaveError("Sonion could not reach the meal history service. Try again shortly.");
    }
  }

  return (
    <section aria-labelledby="interpreter-title" className="panel interpreter-panel">
      <div className="interpreter-mark" aria-hidden="true">✦</div>
      <p className="eyebrow">Meal interpreter</p>
      <h1 id="interpreter-title">Describe it. We&apos;ll break it down.</h1>
      <p className="interpreter-intro">Write what you ate in plain language, review the estimate, and save it to your private meal history.</p>

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
              <p className="warning-message" role="status">Some nutrient values were missing from the USDA records. Calories use available values and are derived from complete macros when possible; other affected meal totals are shown as —.</p>
            ) : null}
            <div className="save-meal-box">
              <p className="response-label">Save this meal</p>
              <div className="save-meal-fields">
                <label htmlFor="meal-date">Local date<input id="meal-date" onChange={(event) => { setMealDate(event.target.value); setSaveState("idle"); }} type="date" value={mealDate} /></label>
                <label htmlFor="meal-time">Local time<input id="meal-time" onChange={(event) => { setMealTime(event.target.value); setSaveState("idle"); }} type="time" value={mealTime} /></label>
              </div>
              <button aria-busy={saveState === "saving"} className="primary-button save-meal-button" disabled={saveState === "saving" || saveState === "saved"} onClick={() => void handleSaveMeal()} type="button">
                {saveState === "saving" ? "Saving..." : saveState === "saved" ? "Saved to history" : "Save meal"}
              </button>
              <div aria-live="polite" className="save-status">
                {saveState === "error" ? <p className="error-message">{saveError}</p> : null}
                {saveState === "saved" ? <p className="saved-message">This processed estimate is now in your private meal history.</p> : null}
              </div>
            </div>
          </div>
        ) : null}
      </section>
    </section>
  );
}

function getErrorMessage(payload: unknown) {
  return typeof payload === "object" && payload !== null && "error" in payload && typeof payload.error === "string"
    ? payload.error
    : undefined;
}

function formatValue(value: number | null, maximumFractionDigits = 1): string {
  return value === null ? "—" : value.toLocaleString(undefined, { maximumFractionDigits });
}
