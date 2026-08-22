"use client";

import { useEffect, useState } from "react";
import type { FormEvent } from "react";

import { canStartMealSave, saveStateAfterResponse, type MealSaveState } from "@/lib/meal-history/save";
import { isValidLocalDate, isValidLocalTime, parseMealRecord, type MealRecord } from "@/lib/meal-history/types";
import { parseMealEstimate, type MealEstimate } from "@/lib/meal-estimation/types";

const MAX_PROMPT_LENGTH = 2_000;
const MAX_REVISION_LENGTH = 1_200;

type MealInterpreterProps = {
  accessToken: string;
  mealToRefine: MealRecord | null;
  onClearFocusedMeal: () => void;
  onMealSaved: () => void;
};

export default function MealInterpreter({ accessToken, mealToRefine, onClearFocusedMeal, onMealSaved }: MealInterpreterProps) {
  const [prompt, setPrompt] = useState("");
  const [originalPrompt, setOriginalPrompt] = useState("");
  const [hasSubmittedPrompt, setHasSubmittedPrompt] = useState(false);
  const [response, setResponse] = useState<MealEstimate | null>(null);
  const [revision, setRevision] = useState("");
  const [revisionSubmitted, setRevisionSubmitted] = useState(false);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mealDate, setMealDate] = useState("");
  const [mealTime, setMealTime] = useState("");
  const [saveState, setSaveState] = useState<MealSaveState>("idle");
  const [saveError, setSaveError] = useState("");

  useEffect(() => {
    if (mealToRefine) {
      setPrompt(mealToRefine.meal_prompt ?? "");
      setOriginalPrompt(mealToRefine.meal_prompt ?? "");
      setHasSubmittedPrompt(true);
      setResponse(mealToRefine.meal_snapshot);
      setRevision("");
      setRevisionSubmitted(false);
      setError("");
      setSaveState("idle");
      setSaveError("");
      setMealDate(mealToRefine.meal_date);
      setMealTime(mealToRefine.meal_time.slice(0, 5));
      return;
    }

    resetForNewMeal();
  }, [mealToRefine]);

  function resetForNewMeal() {
    const now = new Date();
    const pad = (value: number) => String(value).padStart(2, "0");
    setPrompt("");
    setOriginalPrompt("");
    setHasSubmittedPrompt(false);
    setResponse(null);
    setRevision("");
    setRevisionSubmitted(false);
    setError("");
    setSaveState("idle");
    setSaveError("");
    setMealDate(`${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`);
    setMealTime(`${pad(now.getHours())}:${pad(now.getMinutes())}`);
  }

  async function requestEstimate(sourcePrompt: string, revisionText = "") {
    setError("");
    setSaveState("idle");
    setSaveError("");
    if (revisionText) {
      setRevisionSubmitted(false);
    } else {
      setResponse(null);
    }

    setIsSubmitting(true);
    try {
      const result = await fetch("/api/estimate", {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: composeEstimatePrompt(sourcePrompt, revisionText, response) }),
      });
      const payload = (await result.json().catch(() => ({}))) as unknown;

      if (!result.ok) {
        setError(getErrorMessage(payload) ?? "Sonion could not interpret that prompt.");
        return;
      }
      const estimate = parseMealEstimate(payload);
      if (!estimate) {
        setError("Sonion returned an incomplete meal estimate. Try submitting the meal again.");
        return;
      }
      setResponse(estimate);
      if (revisionText) setRevisionSubmitted(true);
    } catch {
      setError("Sonion could not reach the backend. Check that the app is running and try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting || hasSubmittedPrompt) return;

    const trimmedPrompt = prompt.trim();
    if (!trimmedPrompt) {
      setError("Enter a food description before submitting.");
      return;
    }
    if (trimmedPrompt.length > MAX_PROMPT_LENGTH) {
      setError(`Keep the prompt under ${MAX_PROMPT_LENGTH.toLocaleString()} characters.`);
      return;
    }

    // Lock the submitted wording before the network request starts. It is the
    // source of truth for every later revision and save.
    setOriginalPrompt(trimmedPrompt);
    setPrompt(trimmedPrompt);
    setHasSubmittedPrompt(true);
    void requestEstimate(trimmedPrompt);
  }

  function handleRevisionSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting || !response) return;

    const trimmedRevision = revision.trim();
    if (!trimmedRevision) {
      setError("Describe what needs to be corrected before submitting the revision.");
      return;
    }
    if (trimmedRevision.length > MAX_REVISION_LENGTH) {
      setError(`Keep the revision under ${MAX_REVISION_LENGTH.toLocaleString()} characters.`);
      return;
    }

    void requestEstimate(originalPrompt, trimmedRevision);
  }

  async function handleSaveMeal() {
    if (!response || !canStartMealSave(response, saveState)) return;
    if (mealToRefine && !revisionSubmitted) {
      setSaveError("Submit a revision before saving this updated meal.");
      setSaveState("error");
      return;
    }
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
      const isUpdate = mealToRefine !== null;
      const endpoint = mealToRefine ? `/api/meals/${mealToRefine.id}` : "/api/meals";
      const result = await fetch(endpoint, {
        method: isUpdate ? "PATCH" : "POST",
        headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
        body: JSON.stringify(isUpdate
          ? { mealDate, mealTime, mealSnapshot: response }
          : { mealDate, mealTime, mealPrompt: originalPrompt, mealSnapshot: response }),
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

  const isFocusedMeal = Boolean(mealToRefine);
  const displayedOriginalPrompt = originalPrompt || "Original description unavailable for this older saved meal. The saved foods will be used as revision context.";

  return (
    <section aria-labelledby="interpreter-title" className="panel interpreter-panel">
      <div className="interpreter-mark" aria-hidden="true">✦</div>
      <p className="eyebrow">{isFocusedMeal ? "Meal refinement" : "Meal interpreter"}</p>
      <h1 id="interpreter-title">{isFocusedMeal ? "Refine this meal." : "Describe it. We&apos;ll break it down."}</h1>
      <p className="interpreter-intro">
        {isFocusedMeal
          ? "Review the original description and estimate, explain what needs correcting, then save the revised meal when it looks right."
          : "Write what you ate in plain language, review the estimate, and save it to your private meal history."}
      </p>

      {!hasSubmittedPrompt ? (
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
      ) : (
        <section aria-label="Original meal description" className="original-prompt-box">
          <p className="response-label">Original description · locked</p>
          <p className="original-prompt">{displayedOriginalPrompt}</p>
          {!response && isSubmitting ? <p className="processing-message">Updating the estimate...</p> : null}
          {!response && !isSubmitting ? <button className="secondary-button" onClick={() => void requestEstimate(originalPrompt)} type="button">Try interpretation again</button> : null}
        </section>
      )}

      <div aria-live="assertive" className="message-slot" role="alert">
        {error ? <p className="error-message">{error}</p> : null}
      </div>
      <section aria-label="Sonion response" aria-live="polite" className="response-slot">
        {hasSubmittedPrompt ? (
          <div className="response-card">
            <p className="response-label">AI-produced estimate</p>
            {response ? <EstimateTable response={response} /> : null}
            {response ? <EstimateWarnings response={response} /> : null}
            {response ? (
              <form className="revision-box" onSubmit={handleRevisionSubmit}>
                <p className="response-label">Revision</p>
                <label htmlFor="meal-revision">What did Sonion get wrong, or what did you forget to mention?</label>
                <p className="field-help" id="meal-revision-help">For example: “The milk was whole milk, not 2%.”</p>
                <textarea
                  aria-describedby="meal-revision-help revision-count"
                  id="meal-revision"
                  maxLength={MAX_REVISION_LENGTH}
                  onChange={(event) => {
                    setRevision(event.target.value);
                    setRevisionSubmitted(false);
                    setSaveState("idle");
                    setSaveError("");
                  }}
                  placeholder="Describe the correction or anything you forgot..."
                  value={revision}
                />
                <div className="form-footer">
                  <span className="character-count" id="revision-count">{revision.length.toLocaleString()} / {MAX_REVISION_LENGTH.toLocaleString()}</span>
                  <button aria-busy={isSubmitting} className="primary-button" disabled={isSubmitting || !revision.trim()} type="submit">
                    {isSubmitting ? "Revising..." : "Submit revision"}
                  </button>
                </div>
                {revisionSubmitted ? <p className="submitted-message">Revision submitted. Review the new estimate, then save it manually when it is correct.</p> : null}
                {isFocusedMeal && !revisionSubmitted ? <p className="field-help revision-save-help">Submit a revision before saving this focused meal.</p> : null}
              </form>
            ) : null}
            {response ? (
              <div className="save-meal-box">
                <p className="response-label">{isFocusedMeal ? "Save revised meal" : "Save this meal"}</p>
                <div className="save-meal-fields">
                  <label htmlFor="meal-date">Local date<input id="meal-date" onChange={(event) => { setMealDate(event.target.value); setSaveState("idle"); }} type="date" value={mealDate} /></label>
                  <label htmlFor="meal-time">Local time<input id="meal-time" onChange={(event) => { setMealTime(event.target.value); setSaveState("idle"); }} type="time" value={mealTime} /></label>
                </div>
                <button aria-busy={saveState === "saving"} className="primary-button save-meal-button" disabled={saveState === "saving" || saveState === "saved" || (isFocusedMeal && !revisionSubmitted)} onClick={() => void handleSaveMeal()} type="button">
                  {saveState === "saving" ? "Saving..." : saveState === "saved" ? "Saved to history" : isFocusedMeal ? "Save revised meal" : "Save meal"}
                </button>
                <div aria-live="polite" className="save-status">
                  {saveState === "error" ? <p className="error-message">{saveError}</p> : null}
                  {saveState === "saved" ? <p className="saved-message">{isFocusedMeal ? "The revised estimate replaced the old meal in your history." : "This processed estimate is now in your private meal history."}</p> : null}
                </div>
              </div>
            ) : null}
            {isFocusedMeal ? <button className="secondary-button cancel-refinement-button" onClick={onClearFocusedMeal} type="button">Cancel refinement</button> : null}
          </div>
        ) : null}
      </section>
      {saveState === "saved" && !isFocusedMeal ? <button className="secondary-button start-another-button" onClick={resetForNewMeal} type="button">Start another meal</button> : null}
    </section>
  );
}

function EstimateTable({ response }: { response: MealEstimate }) {
  return (
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
  );
}

function EstimateWarnings({ response }: { response: MealEstimate }) {
  return (
    <>
      {response.items.some((item) => item.densitySource.type === "fallback") ? (
        <p className="warning-message" role="status">Some weights use an estimated fallback density because USDA volume data was unavailable.</p>
      ) : null}
      {response.items.some((item) => [item.calories, item.protein, item.fat, item.carbohydrates].some((value) => value === null)) ? (
        <p className="warning-message" role="status">Some nutrient values were missing from the USDA records. Calories use available values and are derived from complete macros when possible; other affected meal totals are shown as —.</p>
      ) : null}
    </>
  );
}

function composeEstimatePrompt(originalPrompt: string, revision: string, previousEstimate: MealEstimate | null) {
  if (!revision) return originalPrompt;
  const context = originalPrompt || `Saved foods: ${previousEstimate?.items.map((item) => `${item.portionUnits} ${item.portionKind} unit(s) of ${item.foodName}`).join(", ") ?? "the saved meal"}`;
  return `Original meal description:\n${context}\n\nUser revision to apply:\n${revision}`;
}

function getErrorMessage(payload: unknown) {
  return typeof payload === "object" && payload !== null && "error" in payload && typeof payload.error === "string"
    ? payload.error
    : undefined;
}

function formatValue(value: number | null, maximumFractionDigits = 1): string {
  return value === null ? "—" : value.toLocaleString(undefined, { maximumFractionDigits });
}
