"use client";

import { useEffect, useState } from "react";

import { groupMealsByDate } from "@/lib/meal-history/mapping";
import { parseMealRecordList, type MealRecord } from "@/lib/meal-history/types";
import { aggregateDailyMacros, aggregateMealMacros, formatMacroValue } from "@/lib/nutrition/meals";
import type { MacroTotals, MealDay } from "@/lib/nutrition/types";

type MealHistoryProps = {
  accessToken: string;
  onCopyMeal: (meal: MealRecord) => void;
  onSelectMeal: (meal: MealRecord) => void;
  refreshKey: number;
};

type HistoryState = "loading" | "ready" | "error" | "unauthorized";

function formatDate(date: string) {
  return new Intl.DateTimeFormat("en-US", { weekday: "short", month: "short", day: "numeric" }).format(
    new Date(`${date}T12:00:00`),
  );
}

function formatTime(time: string) {
  const [hours, minutes] = time.split(":").map(Number);
  const date = new Date(2000, 0, 1, hours, minutes);
  return new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" }).format(date);
}

function MacroSummary({ macros, compact = false }: { macros: MacroTotals; compact?: boolean }) {
  return (
    <div className={compact ? "macro-summary macro-summary-compact" : "macro-summary"}>
      <span><strong>{formatMacroValue(macros.calories)}</strong><small>cal</small></span>
      <span><strong>{formatMacroValue(macros.protein, "g")}</strong><small>protein</small></span>
      <span><strong>{formatMacroValue(macros.fat, "g")}</strong><small>fat</small></span>
      <span><strong>{formatMacroValue(macros.carbohydrates, "g")}</strong><small>carbs</small></span>
    </div>
  );
}

type MealDetailsProps = {
  day: MealDay;
  onCopyMeal: (meal: MealRecord) => void;
  onSelectMeal: (meal: MealRecord) => void;
  recordsById: Map<string, MealRecord>;
  deletingMealId: string | null;
  deleteError: string;
  pendingDeleteMealId: string | null;
  onCancelDelete: () => void;
  onConfirmDelete: (mealId: string) => void;
  onRequestDelete: (mealId: string) => void;
};

function MealDetails({
  day,
  onCopyMeal,
  onSelectMeal,
  recordsById,
  deletingMealId,
  deleteError,
  pendingDeleteMealId,
  onCancelDelete,
  onConfirmDelete,
  onRequestDelete,
}: MealDetailsProps) {
  return (
    <div className="meal-day-details">
      {day.meals.map((meal) => {
        const mealMacros = aggregateMealMacros(meal);
        const record = recordsById.get(meal.id);
        const isDeletePending = pendingDeleteMealId === meal.id;
        const isDeleting = deletingMealId === meal.id;
        const confirmationId = `delete-meal-confirmation-${meal.id}`;
        return (
          <article className="meal-entry" key={meal.id}>
            <button
              aria-controls={isDeletePending ? confirmationId : undefined}
              aria-expanded={isDeletePending}
              aria-label={`Delete meal recorded at ${formatTime(meal.time)}`}
              className="meal-delete-button"
              disabled={deletingMealId !== null}
              onClick={() => onRequestDelete(meal.id)}
              type="button"
            >
              ×
            </button>
            {isDeletePending ? (
              <div aria-labelledby={`${confirmationId}-title`} className="meal-delete-confirmation" id={confirmationId} role="dialog">
                <p id={`${confirmationId}-title`}>Delete this meal from your history?</p>
                <div className="meal-delete-actions">
                  <button className="secondary-button" disabled={isDeleting} onClick={onCancelDelete} type="button">Cancel</button>
                  <button aria-busy={isDeleting} className="primary-button" disabled={isDeleting} onClick={() => onConfirmDelete(meal.id)} type="button">
                    {isDeleting ? "Deleting..." : "Delete"}
                  </button>
                </div>
                {deleteError ? <p className="meal-delete-error" role="alert">{deleteError}</p> : null}
              </div>
            ) : null}
            <div className="meal-entry-heading">
              <div>
                <h4>{formatTime(meal.time)}</h4>
                <p>{meal.foods.length} foods</p>
              </div>
              <span className="meal-calories">{formatMacroValue(mealMacros.calories, " cal")}</span>
            </div>
            <div className="meal-total-line">Meal total · {formatMacroValue(mealMacros.protein, "g protein")} · {formatMacroValue(mealMacros.fat, "g fat")} · {formatMacroValue(mealMacros.carbohydrates, "g carbs")}</div>
            <ul className="food-list">
              {meal.foods.map((food) => (
                <li key={food.id}>
                  <span>
                    {food.name}
                    <small className="food-portion">{formatMacroValue(food.portionUnits, "", 2)} PU · {food.portionKind} · {formatMacroValue(food.estimatedMilliliters)} ml · {formatMacroValue(food.estimatedGrams)} g</small>
                  </span>
                  <span className="food-macros">
                    {formatMacroValue(food.macros.calories, " cal")} · {formatMacroValue(food.macros.protein, "p")} · {formatMacroValue(food.macros.fat, "f")} · {formatMacroValue(food.macros.carbohydrates, "c")}
                    <small className="density-note">{food.densitySource.type === "usda" ? `USDA · ${food.densitySource.portionDescription}` : `Fallback density · ${food.densitySource.portionKind}`}</small>
                  </span>
                </li>
              ))}
            </ul>
            {record ? (
              <div className="meal-entry-actions">
                <button className="meal-copy-button" onClick={() => onCopyMeal(record)} type="button">Copy this meal</button>
                <button className="meal-refine-button" onClick={() => onSelectMeal(record)} type="button">Refine this meal</button>
              </div>
            ) : null}
          </article>
        );
      })}
    </div>
  );
}

export default function MealHistory({ accessToken, onCopyMeal, onSelectMeal, refreshKey }: MealHistoryProps) {
  const [days, setDays] = useState<MealDay[]>([]);
  const [records, setRecords] = useState<MealRecord[]>([]);
  const [expandedDays, setExpandedDays] = useState<string[]>([]);
  const [state, setState] = useState<HistoryState>("loading");
  const [error, setError] = useState("");
  const [pendingDeleteMealId, setPendingDeleteMealId] = useState<string | null>(null);
  const [deletingMealId, setDeletingMealId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState("");

  useEffect(() => {
    let isCurrent = true;
    setState("loading");
    setError("");

    async function loadMeals() {
      try {
        const response = await fetch("/api/meals", { cache: "no-store", headers: { Authorization: `Bearer ${accessToken}` } });
        const payload = (await response.json().catch(() => ({}))) as unknown;
        if (!response.ok) {
          if (isCurrent) setState(response.status === 401 ? "unauthorized" : "error");
          if (isCurrent && response.status !== 401) setError(getErrorMessage(payload));
          return;
        }
        const records = parseMealRecordList(payload);
        if (!records) throw new Error("The meal history response was incomplete.");
        if (isCurrent) {
          setRecords(records);
          const nextDays = groupMealsByDate(records);
          setDays(nextDays);
          setExpandedDays((current) => current.length ? current.filter((id) => nextDays.some((day) => day.id === id)) : nextDays[0] ? [nextDays[0].id] : []);
          setState("ready");
        }
      } catch (loadError) {
        if (isCurrent) {
          setState("error");
          setError(loadError instanceof Error ? loadError.message : "Could not load meal history.");
        }
      }
    }

    void loadMeals();
    return () => { isCurrent = false; };
  }, [accessToken, refreshKey]);

  function toggleDay(dayId: string) {
    setExpandedDays((current) => current.includes(dayId) ? current.filter((id) => id !== dayId) : [...current, dayId]);
  }

  const recordsById = new Map(records.map((record) => [record.id, record]));

  function requestDelete(mealId: string) {
    setDeleteError("");
    setPendingDeleteMealId(mealId);
  }

  function cancelDelete() {
    if (deletingMealId !== null) return;
    setDeleteError("");
    setPendingDeleteMealId(null);
  }

  async function confirmDelete(mealId: string) {
    setDeletingMealId(mealId);
    setDeleteError("");
    try {
      const response = await fetch(`/api/meals/${encodeURIComponent(mealId)}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const payload = (await response.json().catch(() => ({}))) as unknown;
      if (!response.ok) {
        if (response.status === 401) setState("unauthorized");
        throw new Error(getErrorMessage(payload));
      }

      const dayContainingMeal = days.find((day) => day.meals.some((meal) => meal.id === mealId));
      setDays((current) => current
        .map((day) => ({ ...day, meals: day.meals.filter((meal) => meal.id !== mealId) }))
        .filter((day) => day.meals.length > 0));
      if (dayContainingMeal?.meals.length === 1) {
        setExpandedDays((current) => current.filter((dayId) => dayId !== dayContainingMeal.id));
      }
      setPendingDeleteMealId(null);
    } catch (deleteRequestError) {
      setDeleteError(deleteRequestError instanceof Error ? deleteRequestError.message : "Could not delete this meal.");
    } finally {
      setDeletingMealId(null);
    }
  }

  return (
    <section aria-labelledby="meal-history-title" className="panel history-panel">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Your log</p>
          <h2 id="meal-history-title">Meal history</h2>
        </div>
        <span className="panel-note">Supabase history</span>
      </div>
      <p className="panel-intro">Saved meals grouped by the local date and time you recorded them. Nutrition stays tied to the processed estimate.</p>

      {state === "loading" ? <p className="history-status" role="status">Loading your meals...</p> : null}
      {state === "unauthorized" ? <p className="history-status history-error" role="alert">Your session expired. Sign in again to see your private meal history.</p> : null}
      {state === "error" ? <p className="history-status history-error" role="alert">{error || "Could not load meal history. Try again shortly."}</p> : null}
      {state === "ready" && days.length === 0 ? <p className="history-status">No saved meals yet. Interpret a meal and save it to start your history.</p> : null}

      {state === "ready" && days.length > 0 ? (
        <div className="history-list">
          {days.map((day) => {
            const isExpanded = expandedDays.includes(day.id);
            const totals = aggregateDailyMacros(day.meals);
            const detailsId = `meal-details-${day.id}`;
            return (
              <div className={`day-card${isExpanded ? " is-expanded" : ""}`} key={day.id}>
                <button aria-controls={detailsId} aria-expanded={isExpanded} className="day-toggle" onClick={() => toggleDay(day.id)} type="button">
                  <span className="day-label">
                    <span className="day-chevron" aria-hidden="true">{isExpanded ? "−" : "+"}</span>
                    <span><strong>{formatDate(day.date)}</strong><small>{day.meals.length} meals</small></span>
                  </span>
                  <MacroSummary compact macros={totals} />
                </button>
                {isExpanded ? (
                  <div id={detailsId}>
                    <MealDetails
                      day={day}
                      deleteError={deleteError}
                      deletingMealId={deletingMealId}
                      onCancelDelete={cancelDelete}
                      onConfirmDelete={(mealId) => void confirmDelete(mealId)}
                      onCopyMeal={onCopyMeal}
                      onRequestDelete={requestDelete}
                      pendingDeleteMealId={pendingDeleteMealId}
                      onSelectMeal={onSelectMeal}
                      recordsById={recordsById}
                    />
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      ) : null}
    </section>
  );
}

function getErrorMessage(payload: unknown) {
  return typeof payload === "object" && payload !== null && "error" in payload && typeof payload.error === "string"
    ? payload.error
    : "Could not load meal history. Try again shortly.";
}
