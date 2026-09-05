"use client";

import { useEffect, useState } from "react";
import type { FormEvent } from "react";

import { createMealCopyDraft, currentLocalMealDateTime } from "@/lib/meal-copy/draft";
import {
  buildMealPromptFromAbsoluteItems,
  composeAbsoluteMealPrompt,
  composePercentageMealPrompt,
  DEFAULT_MAX_ITEMS_PER_MEAL,
  type AbsoluteFoodItem,
  type MealEntryMode,
} from "@/lib/meal-batch/proportions";
import { isValidLocalDate, isValidLocalTime, parseMealRecord, type MealRecord } from "@/lib/meal-history/types";
import type { MealEstimate, PortionKind } from "@/lib/meal-estimation/types";

const MAX_REVISION_LENGTH = 1_200;
const MAX_ITEMS_PER_MEAL = DEFAULT_MAX_ITEMS_PER_MEAL;

type ItemDraft = {
  id: number;
  name: string;
  amount: string;
  portionKind: PortionKind;
};

type MealDraft = {
  id: number;
  entryMode: MealEntryMode;
  items: ItemDraft[];
  solidTotalPU: string;
  liquidTotalPU: string;
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

type StructuredMealPayload =
  | {
      entryMode: "absolute";
      items: AbsoluteFoodItem[];
      mealDate: string;
      mealTime: string;
    }
  | {
      entryMode: "percentage";
      items: Array<{ name: string; percentage: number; portionKind: PortionKind }>;
      solidTotalPU: number;
      liquidTotalPU: number;
      mealDate: string;
      mealTime: string;
    };

let nextDraftId = 1;
let nextItemId = 1;

function createItemDraft(portionKind: PortionKind = "solid"): ItemDraft {
  return { id: nextItemId++, name: "", amount: "", portionKind };
}

function createMealDraft(): MealDraft {
  const { mealDate, mealTime } = currentLocalMealDateTime();
  return {
    id: nextDraftId++,
    entryMode: "absolute",
    items: [createItemDraft()],
    solidTotalPU: "",
    liquidTotalPU: "",
    mealDate,
    mealTime,
  };
}

function parseOptionalNumber(raw: string): number | undefined {
  const trimmed = raw.trim();
  if (!trimmed) return undefined;
  const value = Number(trimmed);
  return Number.isFinite(value) ? value : Number.NaN;
}

function resolvePreviewItems(meal: MealDraft): AbsoluteFoodItem[] | null {
  if (meal.entryMode === "absolute") {
    const items = meal.items.map((item) => ({
      name: item.name.trim(),
      portionUnits: Number(item.amount),
      portionKind: item.portionKind,
    }));
    const composed = composeAbsoluteMealPrompt(items, MAX_ITEMS_PER_MEAL);
    return composed.ok ? composed.items : null;
  }

  const items = meal.items.map((item) => ({
    name: item.name.trim(),
    percentage: Number(item.amount),
    portionKind: item.portionKind,
  }));
  const solidTotalPU = parseOptionalNumber(meal.solidTotalPU) ?? 0;
  const liquidTotalPU = parseOptionalNumber(meal.liquidTotalPU) ?? 0;
  const composed = composePercentageMealPrompt(items, solidTotalPU, liquidTotalPU, MAX_ITEMS_PER_MEAL);
  return composed.ok ? composed.items : null;
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

  function updateBatchMeal(
    id: number,
    patch: Partial<Pick<MealDraft, "entryMode" | "solidTotalPU" | "liquidTotalPU" | "mealDate" | "mealTime">>,
  ) {
    setBatchMeals((meals) => meals.map((meal) => meal.id === id ? { ...meal, ...patch } : meal));
    setError("");
    setQueueNotice("");
  }

  function updateBatchItem(mealId: number, itemId: number, patch: Partial<Omit<ItemDraft, "id">>) {
    setBatchMeals((meals) => meals.map((meal) => {
      if (meal.id !== mealId) return meal;
      return {
        ...meal,
        items: meal.items.map((item) => item.id === itemId ? { ...item, ...patch } : item),
      };
    }));
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

  function addFoodItem(mealId: number) {
    setBatchMeals((meals) => meals.map((meal) => {
      if (meal.id !== mealId) return meal;
      if (meal.items.length >= MAX_ITEMS_PER_MEAL) return meal;
      return { ...meal, items: [...meal.items, createItemDraft()] };
    }));
    setError("");
    setQueueNotice("");
  }

  function removeFoodItem(mealId: number, itemId: number) {
    setBatchMeals((meals) => meals.map((meal) => {
      if (meal.id !== mealId) return meal;
      if (meal.items.length <= 1) return meal;
      return { ...meal, items: meal.items.filter((item) => item.id !== itemId) };
    }));
    setError("");
    setQueueNotice("");
  }

  function buildStructuredMeal(meal: MealDraft, index: number): StructuredMealPayload | { error: string } {
    if (!isValidLocalDate(meal.mealDate)) {
      return { error: `Choose a valid date for meal ${index + 1}.` };
    }
    if (!isValidLocalTime(meal.mealTime)) {
      return { error: `Choose a valid time for meal ${index + 1}.` };
    }
    if (meal.items.length === 0) {
      return { error: `Add at least one food for meal ${index + 1}.` };
    }
    if (meal.items.length > MAX_ITEMS_PER_MEAL) {
      return { error: `Meal ${index + 1} can include at most ${MAX_ITEMS_PER_MEAL} foods.` };
    }

    if (meal.entryMode === "absolute") {
      const items = meal.items.map((item) => ({
        name: item.name.trim(),
        portionUnits: Number(item.amount),
        portionKind: item.portionKind,
      }));
      const composed = composeAbsoluteMealPrompt(items, MAX_ITEMS_PER_MEAL);
      if (!composed.ok) return { error: `Meal ${index + 1}: ${composed.message}` };
      return {
        entryMode: "absolute",
        items: composed.items,
        mealDate: meal.mealDate,
        mealTime: meal.mealTime,
      };
    }

    const solidRaw = meal.solidTotalPU.trim();
    const liquidRaw = meal.liquidTotalPU.trim();
    const solidTotalPU = solidRaw === "" ? 0 : Number(solidRaw);
    const liquidTotalPU = liquidRaw === "" ? 0 : Number(liquidRaw);
    const items = meal.items.map((item) => ({
      name: item.name.trim(),
      percentage: Number(item.amount),
      portionKind: item.portionKind,
    }));
    const composed = composePercentageMealPrompt(items, solidTotalPU, liquidTotalPU, MAX_ITEMS_PER_MEAL);
    if (!composed.ok) return { error: `Meal ${index + 1}: ${composed.message}` };
    return {
      entryMode: "percentage",
      items,
      solidTotalPU,
      liquidTotalPU,
      mealDate: meal.mealDate,
      mealTime: meal.mealTime,
    };
  }

  async function handleBatchSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting || batchMeals.length === 0) return;

    const meals: StructuredMealPayload[] = [];
    for (const [index, meal] of batchMeals.entries()) {
      const built = buildStructuredMeal(meal, index);
      if ("error" in built) {
        setError(built.error);
        return;
      }
      meals.push(built);
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
      <p className="interpreter-intro">
        Enter each meal with absolute portion units, or with percentage weights plus solid and liquid totals.
        Percentages are normalized within solid foods and within liquid foods separately, then scaled to those totals.
      </p>
      <form className="interpreter-form batch-meal-form" onSubmit={(event) => void handleBatchSubmit(event)}>
        {batchMeals.map((meal, index) => {
          const previewItems = resolvePreviewItems(meal);
          const amountLabel = meal.entryMode === "absolute" ? "Portion units" : "Percentage weight";
          return (
            <fieldset className="batch-meal-entry" key={meal.id}>
              <div className="batch-meal-heading">
                <legend>Meal {index + 1}</legend>
                {batchMeals.length > 1 ? <button className="remove-meal-button" onClick={() => removeBatchMeal(meal.id)} type="button">Remove</button> : null}
              </div>

              <div className="entry-mode-toggle" role="group" aria-label={`Entry mode for meal ${index + 1}`}>
                <button
                  aria-pressed={meal.entryMode === "absolute"}
                  className={meal.entryMode === "absolute" ? "entry-mode-button is-selected" : "entry-mode-button"}
                  onClick={() => updateBatchMeal(meal.id, { entryMode: "absolute" })}
                  type="button"
                >
                  Absolute PU
                </button>
                <button
                  aria-pressed={meal.entryMode === "percentage"}
                  className={meal.entryMode === "percentage" ? "entry-mode-button is-selected" : "entry-mode-button"}
                  onClick={() => updateBatchMeal(meal.id, { entryMode: "percentage" })}
                  type="button"
                >
                  Percentage
                </button>
              </div>
              <p className="field-help">
                {meal.entryMode === "absolute"
                  ? "Enter a positive portion-unit amount for each food."
                  : "Enter relative percentage weights (they need not sum to 100). Solids normalize among solids; liquids among liquids."}
              </p>

              <div className="food-item-list">
                {meal.items.map((item, itemIndex) => (
                  <div className="food-item-row" key={item.id}>
                    <label className="food-item-name" htmlFor={`food-name-${meal.id}-${item.id}`}>
                      Food
                      <input
                        id={`food-name-${meal.id}-${item.id}`}
                        onChange={(event) => updateBatchItem(meal.id, item.id, { name: event.target.value })}
                        placeholder="e.g. eggs"
                        required
                        type="text"
                        value={item.name}
                      />
                    </label>
                    <label className="food-item-amount" htmlFor={`food-amount-${meal.id}-${item.id}`}>
                      {amountLabel}
                      <input
                        id={`food-amount-${meal.id}-${item.id}`}
                        inputMode="decimal"
                        min="0"
                        onChange={(event) => updateBatchItem(meal.id, item.id, { amount: event.target.value })}
                        placeholder={meal.entryMode === "absolute" ? "1.5" : "30"}
                        required
                        step="any"
                        type="number"
                        value={item.amount}
                      />
                    </label>
                    <label className="food-item-kind" htmlFor={`food-kind-${meal.id}-${item.id}`}>
                      Kind
                      <select
                        id={`food-kind-${meal.id}-${item.id}`}
                        onChange={(event) => updateBatchItem(meal.id, item.id, { portionKind: event.target.value as PortionKind })}
                        value={item.portionKind}
                      >
                        <option value="solid">Solid</option>
                        <option value="liquid">Liquid</option>
                      </select>
                    </label>
                    {meal.items.length > 1 ? (
                      <button
                        aria-label={`Remove food ${itemIndex + 1} from meal ${index + 1}`}
                        className="remove-item-button"
                        onClick={() => removeFoodItem(meal.id, item.id)}
                        type="button"
                      >
                        Remove
                      </button>
                    ) : null}
                  </div>
                ))}
              </div>

              <button
                className="secondary-button add-item-button"
                disabled={meal.items.length >= MAX_ITEMS_PER_MEAL}
                onClick={() => addFoodItem(meal.id)}
                type="button"
              >
                + Add food
              </button>

              {meal.entryMode === "percentage" ? (
                <div className="save-meal-fields proportion-totals">
                  <label htmlFor={`solid-total-${meal.id}`}>
                    Solid total PU
                    <input
                      id={`solid-total-${meal.id}`}
                      inputMode="decimal"
                      min="0"
                      onChange={(event) => updateBatchMeal(meal.id, { solidTotalPU: event.target.value })}
                      placeholder="0"
                      step="any"
                      type="number"
                      value={meal.solidTotalPU}
                    />
                  </label>
                  <label htmlFor={`liquid-total-${meal.id}`}>
                    Liquid total PU
                    <input
                      id={`liquid-total-${meal.id}`}
                      inputMode="decimal"
                      min="0"
                      onChange={(event) => updateBatchMeal(meal.id, { liquidTotalPU: event.target.value })}
                      placeholder="0"
                      step="any"
                      type="number"
                      value={meal.liquidTotalPU}
                    />
                  </label>
                </div>
              ) : null}

              {previewItems ? (
                <div className="resolved-pu-preview" aria-live="polite">
                  <p className="response-label">Resolved portion units</p>
                  <pre className="resolved-pu-text">{buildMealPromptFromAbsoluteItems(previewItems)}</pre>
                </div>
              ) : null}

              <div className="save-meal-fields pre-submit-datetime">
                <label htmlFor={`meal-date-${meal.id}`}>Local date<input id={`meal-date-${meal.id}`} onChange={(event) => updateBatchMeal(meal.id, { mealDate: event.target.value })} type="date" value={meal.mealDate} /></label>
                <label htmlFor={`meal-time-${meal.id}`}>Local time<input id={`meal-time-${meal.id}`} onChange={(event) => updateBatchMeal(meal.id, { mealTime: event.target.value })} type="time" value={meal.mealTime} /></label>
              </div>
            </fieldset>
          );
        })}
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
