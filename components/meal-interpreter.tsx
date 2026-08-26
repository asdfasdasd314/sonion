"use client";

import { useEffect, useState } from "react";
import type { FormEvent } from "react";

import { createMealCopyDraft, currentLocalMealDateTime } from "@/lib/meal-copy/draft";
import { isValidLocalDate, isValidLocalTime, parseMealRecord, type MealRecord } from "@/lib/meal-history/types";
import type { MealEstimate } from "@/lib/meal-estimation/types";

const MAX_PROMPT_LENGTH = 2_000;
const MAX_REVISION_LENGTH = 1_200;

type MealDraft = {
  id: number;
  prompt: string;
  mealDate: string;
  mealTime: string;
};

type MealInterpreterProps = {
  accessToken: string;
  mealToCopy: MealRecord | null;
  mealToRefine: MealRecord | null;
  onClearCopiedMeal: () => void;
  onClearFocusedMeal: () => void;
  onProcessingQueued?: () => void;
  onMealSaved: () => void;
};

let nextDraftId = 1;

function createMealDraft(): MealDraft {
  const { mealDate, mealTime } = currentLocalMealDateTime();
  return { id: nextDraftId++, prompt: "", mealDate, mealTime };
}

export default function MealInterpreter({
  accessToken,
  mealToCopy,
  mealToRefine,
  onClearCopiedMeal,
  onClearFocusedMeal,
  onProcessingQueued,
  onMealSaved,
}: MealInterpreterProps) {
  const [batchMeals, setBatchMeals] = useState<MealDraft[]>([]);
  const [revision, setRevision] = useState("");
  const [refinementDate, setRefinementDate] = useState("");
  const [refinementTime, setRefinementTime] = useState("");
  const [copyDate, setCopyDate] = useState("");
  const [copyTime, setCopyTime] = useState("");
  const [copySaved, setCopySaved] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCopySaving, setIsCopySaving] = useState(false);
  const [refinementQueued, setRefinementQueued] = useState(false);
  const [error, setError] = useState("");
  const [queueNotice, setQueueNotice] = useState("");

  useEffect(() => {
    if (mealToCopy) {
      const draft = createMealCopyDraft(mealToCopy);
      setCopyDate(draft.mealDate);
      setCopyTime(draft.mealTime);
      setCopySaved(false);
      setError("");
      setQueueNotice("");
      return;
    }

    if (mealToRefine) {
      setRevision("");
      setRefinementDate(mealToRefine.meal_date);
      setRefinementTime(mealToRefine.meal_time.slice(0, 5));
      setRefinementQueued(false);
      setError("");
      setQueueNotice("");
      return;
    }

    setBatchMeals([createMealDraft()]);
    setError("");
    setQueueNotice("");
  }, [mealToCopy, mealToRefine]);

  function updateBatchMeal(id: number, field: "prompt" | "mealDate" | "mealTime", value: string) {
    setBatchMeals((meals) => meals.map((meal) => meal.id === id ? { ...meal, [field]: value } : meal));
    setError("");
    setQueueNotice("");
  }

  function addBatchMeal() {
    setBatchMeals((meals) => [...meals, createMealDraft()]);
    setError("");
    setQueueNotice("");
  }

  function removeBatchMeal(id: number) {
    setBatchMeals((meals) => meals.length > 1 ? meals.filter((meal) => meal.id !== id) : meals);
    setError("");
    setQueueNotice("");
  }

  async function handleBatchSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting || batchMeals.length === 0) return;

    const meals = [] as Array<{ prompt: string; mealDate: string; mealTime: string }>;
    for (const [index, meal] of batchMeals.entries()) {
      const prompt = meal.prompt.trim();
      if (!prompt) {
        setError(`Enter a description for meal ${index + 1}.`);
        return;
      }
      if (prompt.length > MAX_PROMPT_LENGTH) {
        setError(`Keep meal ${index + 1} under ${MAX_PROMPT_LENGTH.toLocaleString()} characters.`);
        return;
      }
      if (!isValidLocalDate(meal.mealDate)) {
        setError(`Choose a valid date for meal ${index + 1}.`);
        return;
      }
      if (!isValidLocalTime(meal.mealTime)) {
        setError(`Choose a valid time for meal ${index + 1}.`);
        return;
      }
      meals.push({ prompt, mealDate: meal.mealDate, mealTime: meal.mealTime });
    }

    setError("");
    setQueueNotice("");
    setIsSubmitting(true);
    try {
      const result = await fetch("/api/estimate", {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({ meals }),
      });
      const payload = (await result.json().catch(() => ({}))) as unknown;
      if (!result.ok) {
        setError(getErrorMessage(payload) ?? "Sonion could not queue these meals.");
        return;
      }
      if (result.status !== 202 || !isAcceptedAck(payload)) {
        setError("Sonion returned an unexpected meal-processing acknowledgment.");
        return;
      }
      setBatchMeals([createMealDraft()]);
      setQueueNotice(`${meals.length} ${meals.length === 1 ? "meal" : "meals"} queued. They will be saved automatically when ready.`);
      onProcessingQueued?.();
    } catch {
      setError("Sonion could not reach the backend. Check that the app is running and try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleRefinementSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!mealToRefine || isSubmitting || refinementQueued) return;

    const instruction = revision.trim();
    if (!instruction) {
      setError("Describe what should change in the saved meal.");
      return;
    }
    if (instruction.length > MAX_REVISION_LENGTH) {
      setError(`Keep the refinement under ${MAX_REVISION_LENGTH.toLocaleString()} characters.`);
      return;
    }
    if (!isValidLocalDate(refinementDate)) {
      setError("Choose a valid meal date before refining.");
      return;
    }
    if (!isValidLocalTime(refinementTime)) {
      setError("Choose a valid meal time before refining.");
      return;
    }

    setError("");
    setQueueNotice("");
    setIsSubmitting(true);
    try {
      const result = await fetch("/api/estimate", {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          refinement: {
            mealId: mealToRefine.id,
            instruction,
            previousEstimate: mealToRefine.meal_snapshot,
            mealDate: refinementDate,
            mealTime: refinementTime,
          },
        }),
      });
      const payload = (await result.json().catch(() => ({}))) as unknown;
      if (!result.ok) {
        setError(getErrorMessage(payload) ?? "Sonion could not queue this refinement.");
        return;
      }
      if (result.status !== 202 || !isAcceptedAck(payload)) {
        setError("Sonion returned an unexpected refinement acknowledgment.");
        return;
      }
      setRefinementQueued(true);
      setQueueNotice("Refinement queued. The saved meal will update automatically when ready.");
      onMealSaved();
      onProcessingQueued?.();
    } catch {
      setError("Sonion could not reach the backend. Check that the app is running and try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleCopySave() {
    if (!mealToCopy || isCopySaving || copySaved) return;
    if (!isValidLocalDate(copyDate)) {
      setError("Choose a valid meal date.");
      return;
    }
    if (!isValidLocalTime(copyTime)) {
      setError("Choose a valid meal time.");
      return;
    }

    setError("");
    setIsCopySaving(true);
    try {
      const result = await fetch("/api/meals", {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({ mealDate: copyDate, mealTime: copyTime, mealSnapshot: mealToCopy.meal_snapshot }),
      });
      const payload = (await result.json().catch(() => ({}))) as unknown;
      if (!result.ok) {
        setError(getErrorMessage(payload) ?? "Sonion could not save this copied meal.");
        return;
      }
      if (!parseMealRecord(payload)) {
        setError("Sonion saved an incomplete copied meal. Refresh your history and try again.");
        return;
      }
      setCopySaved(true);
      onMealSaved();
    } catch {
      setError("Sonion could not reach the meal history service. Try again shortly.");
    } finally {
      setIsCopySaving(false);
    }
  }

  if (mealToCopy) {
    const copySourceLabel = `${mealToCopy.meal_date} · ${mealToCopy.meal_time.slice(0, 5)}`;
    return (
      <section aria-labelledby="interpreter-title" className="panel interpreter-panel">
        <div className="interpreter-mark" aria-hidden="true">✦</div>
        <p className="eyebrow">Meal copy</p>
        <h1 id="interpreter-title">Copy this meal.</h1>
        <p className="interpreter-intro">Save this estimate as a new history entry at another date and time.</p>
        <p className="copy-source-note">Copied from {copySourceLabel}. Saving creates a new history entry.</p>
        <div className="response-slot">
          <div className="response-card">
            <p className="response-label">Saved estimate</p>
            <EstimateTable response={mealToCopy.meal_snapshot} />
          </div>
        </div>
        <div className="save-meal-box">
          <div className="save-meal-fields">
            <label htmlFor="copy-meal-date">Local date<input id="copy-meal-date" onChange={(event) => setCopyDate(event.target.value)} type="date" value={copyDate} /></label>
            <label htmlFor="copy-meal-time">Local time<input id="copy-meal-time" onChange={(event) => setCopyTime(event.target.value)} type="time" value={copyTime} /></label>
          </div>
          <button aria-busy={isCopySaving} className="primary-button save-meal-button" disabled={isCopySaving || copySaved} onClick={() => void handleCopySave()} type="button">
            {isCopySaving ? "Saving..." : copySaved ? "Saved to history" : "Save as new meal"}
          </button>
          {copySaved ? <p className="saved-message">The copied estimate is now in your private meal history.</p> : null}
        </div>
        <div aria-live="assertive" className="message-slot" role="alert">{error ? <p className="error-message">{error}</p> : null}</div>
        <button className="secondary-button cancel-copy-button" onClick={onClearCopiedMeal} type="button">Cancel copy</button>
      </section>
    );
  }

  if (mealToRefine) {
    return (
      <section aria-labelledby="interpreter-title" className="panel interpreter-panel">
        <div className="interpreter-mark" aria-hidden="true">✦</div>
        <p className="eyebrow">Meal refinement</p>
        <h1 id="interpreter-title">Refine this meal.</h1>
        <p className="interpreter-intro">Describe the correction and Sonion will update the saved meal automatically. There is no review or second save step.</p>
        <div className="response-card current-meal-context">
          <p className="response-label">Current saved estimate</p>
          <p className="field-help">{mealToRefine.meal_snapshot.items.length} food items · {mealToRefine.meal_date} at {mealToRefine.meal_time.slice(0, 5)}</p>
        </div>
        <form className="revision-box refinement-form" onSubmit={handleRefinementSubmit}>
          <label htmlFor="meal-revision">What should change?</label>
          <p className="field-help" id="meal-revision-help">For example: “The milk was whole milk, not 2%.”</p>
          <textarea aria-describedby="meal-revision-help revision-count" id="meal-revision" maxLength={MAX_REVISION_LENGTH} onChange={(event) => { setRevision(event.target.value); setError(""); setQueueNotice(""); }} placeholder="Describe the correction..." value={revision} />
          <div className="save-meal-fields refinement-datetime">
            <label htmlFor="refinement-date">Local date<input id="refinement-date" onChange={(event) => setRefinementDate(event.target.value)} type="date" value={refinementDate} /></label>
            <label htmlFor="refinement-time">Local time<input id="refinement-time" onChange={(event) => setRefinementTime(event.target.value)} type="time" value={refinementTime} /></label>
          </div>
          <div className="form-footer">
            <span className="character-count" id="revision-count">{revision.length.toLocaleString()} / {MAX_REVISION_LENGTH.toLocaleString()}</span>
            <button aria-busy={isSubmitting} className="primary-button" disabled={isSubmitting || refinementQueued || !revision.trim()} type="submit">
              {isSubmitting ? "Queueing..." : refinementQueued ? "Refinement queued" : "Refine meal"}
            </button>
          </div>
          {queueNotice ? <p className="queued-message" role="status">{queueNotice}</p> : null}
        </form>
        <div aria-live="assertive" className="message-slot" role="alert">{error ? <p className="error-message">{error}</p> : null}</div>
        <button className="secondary-button cancel-refinement-button" onClick={onClearFocusedMeal} type="button">Cancel refinement</button>
      </section>
    );
  }

  return (
    <section aria-labelledby="interpreter-title" className="panel interpreter-panel">
      <div className="interpreter-mark" aria-hidden="true">✦</div>
      <p className="eyebrow">Meal interpreter</p>
      <h1 id="interpreter-title">Add your meals.</h1>
      <p className="interpreter-intro">Add one or more descriptions, set each local date and time, then interpret them. Sonion will save every result automatically.</p>
      <form className="interpreter-form batch-meal-form" onSubmit={(event) => void handleBatchSubmit(event)}>
        {batchMeals.map((meal, index) => (
          <fieldset className="batch-meal-entry" key={meal.id}>
            <div className="batch-meal-heading">
              <legend>Meal {index + 1}</legend>
              {batchMeals.length > 1 ? <button className="remove-meal-button" onClick={() => removeBatchMeal(meal.id)} type="button">Remove</button> : null}
            </div>
            <label htmlFor={`food-prompt-${meal.id}`}>What did you eat?</label>
            <p className="field-help" id={`food-prompt-help-${meal.id}`}>Try: “two scoops of rice, grilled chicken, and a little broccoli”</p>
            <textarea aria-describedby={`food-prompt-help-${meal.id} prompt-count-${meal.id}`} id={`food-prompt-${meal.id}`} maxLength={MAX_PROMPT_LENGTH} onChange={(event) => updateBatchMeal(meal.id, "prompt", event.target.value)} placeholder="Describe your meal in your own words..." required value={meal.prompt} />
            <div className="save-meal-fields pre-submit-datetime">
              <label htmlFor={`meal-date-${meal.id}`}>Local date<input id={`meal-date-${meal.id}`} onChange={(event) => updateBatchMeal(meal.id, "mealDate", event.target.value)} type="date" value={meal.mealDate} /></label>
              <label htmlFor={`meal-time-${meal.id}`}>Local time<input id={`meal-time-${meal.id}`} onChange={(event) => updateBatchMeal(meal.id, "mealTime", event.target.value)} type="time" value={meal.mealTime} /></label>
            </div>
            <span className="character-count" id={`prompt-count-${meal.id}`}>{meal.prompt.length.toLocaleString()} / {MAX_PROMPT_LENGTH.toLocaleString()}</span>
          </fieldset>
        ))}
        <div className="batch-form-actions">
          <button className="secondary-button" onClick={addBatchMeal} type="button">+ Add another meal</button>
          <button aria-busy={isSubmitting} className="primary-button" disabled={isSubmitting || batchMeals.length === 0} type="submit">{isSubmitting ? "Queueing..." : "Interpret meals"}</button>
        </div>
        {queueNotice ? <p className="queued-message" role="status">{queueNotice}</p> : null}
      </form>
      <div aria-live="assertive" className="message-slot" role="alert">{error ? <p className="error-message">{error}</p> : null}</div>
    </section>
  );
}

function EstimateTable({ response }: { response: MealEstimate }) {
  return (
    <div className="estimate-table-wrap">
      <table className="estimate-table">
        <caption className="visually-hidden">Estimated foods and nutrients</caption>
        <thead><tr><th scope="col">Food</th><th scope="col">PU</th><th scope="col">Calories</th><th scope="col">Protein</th><th scope="col">Fat</th><th scope="col">Carbs</th><th scope="col">Fiber</th></tr></thead>
        <tbody>{response.items.map((item, index) => <tr key={`${item.fdcId}-${index}`}><th data-label="Food" scope="row">{item.foodName}<small>{item.portionKind}</small></th><td data-label="PU">{formatValue(item.portionUnits, 2)}</td><td data-label="Calories">{formatValue(item.calories)}</td><td data-label="Protein">{formatValue(item.protein)} g</td><td data-label="Fat">{formatValue(item.fat)} g</td><td data-label="Carbs">{formatValue(item.carbohydrates)} g</td><td data-label="Fiber">{formatValue(item.fiber)} g</td></tr>)}</tbody>
        <tfoot><tr><th scope="row">Meal total</th><td /><td>{formatValue(response.totals.calories)}</td><td>{formatValue(response.totals.protein)} g</td><td>{formatValue(response.totals.fat)} g</td><td>{formatValue(response.totals.carbohydrates)} g</td><td>{formatValue(response.totals.fiber)} g</td></tr></tfoot>
      </table>
    </div>
  );
}

function getErrorMessage(payload: unknown) {
  return typeof payload === "object" && payload !== null && "error" in payload && typeof payload.error === "string"
    ? payload.error
    : undefined;
}

function isAcceptedAck(payload: unknown): boolean {
  return typeof payload === "object"
    && payload !== null
    && "accepted" in payload
    && (payload as { accepted: unknown }).accepted === true;
}

function formatValue(value: number | null, maximumFractionDigits = 1): string {
  return value === null ? "—" : value.toLocaleString(undefined, { maximumFractionDigits });
}
