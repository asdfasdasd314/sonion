"use client";

import { useState } from "react";

import { aggregateDailyMacros, aggregateMealMacros, SEEDED_MEAL_DAYS } from "@/lib/nutrition/meals";
import type { MacroTotals, MealDay } from "@/lib/nutrition/types";

function formatDate(date: string) {
  return new Intl.DateTimeFormat("en-US", { weekday: "short", month: "short", day: "numeric" }).format(
    new Date(`${date}T12:00:00`),
  );
}
function MacroSummary({ macros, compact = false }: { macros: MacroTotals; compact?: boolean }) {
  return (
    <div className={compact ? "macro-summary macro-summary-compact" : "macro-summary"}>
      <span><strong>{macros.calories}</strong><small>cal</small></span>
      <span><strong>{macros.protein}g</strong><small>protein</small></span>
      <span><strong>{macros.fat}g</strong><small>fat</small></span>
      <span><strong>{macros.carbohydrates}g</strong><small>carbs</small></span>
    </div>
  );
}

function MealDetails({ day }: { day: MealDay }) {
  return (
    <div className="meal-day-details">
      {day.meals.map((meal) => {
        const mealMacros = aggregateMealMacros(meal);
        return (
          <article className="meal-entry" key={meal.id}>
            <div className="meal-entry-heading">
              <div>
                <h4>{meal.name}</h4>
                <p>{meal.time}</p>
              </div>
              <span className="meal-calories">{mealMacros.calories} cal</span>
            </div>
            <ul className="food-list">
              {meal.foods.map((food) => (
                <li key={food.id}>
                  <span>{food.name}</span>
                  <span className="food-macros">
                    {food.macros.calories} cal · {food.macros.protein}p · {food.macros.fat}f · {food.macros.carbohydrates}c
                  </span>
                </li>
              ))}
            </ul>
          </article>
        );
      })}
    </div>
  );
}

export default function MealHistory() {
  const [expandedDays, setExpandedDays] = useState<string[]>([SEEDED_MEAL_DAYS[0].id]);

  function toggleDay(dayId: string) {
    setExpandedDays((current) =>
      current.includes(dayId) ? current.filter((id) => id !== dayId) : [...current, dayId],
    );
  }

  return (
    <section aria-labelledby="meal-history-title" className="panel history-panel">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Your log</p>
          <h2 id="meal-history-title">Meal history</h2>
        </div>
        <span className="panel-note">Seeded preview</span>
      </div>
      <p className="panel-intro">A quick view of what you have eaten. This list resets when you refresh while the format is being tested.</p>

      <div className="history-list">
        {SEEDED_MEAL_DAYS.map((day) => {
          const isExpanded = expandedDays.includes(day.id);
          const totals = aggregateDailyMacros(day.meals);
          const detailsId = `meal-details-${day.id}`;
          return (
            <div className={`day-card${isExpanded ? " is-expanded" : ""}`} key={day.id}>
              <button
                aria-controls={detailsId}
                aria-expanded={isExpanded}
                className="day-toggle"
                onClick={() => toggleDay(day.id)}
                type="button"
              >
                <span className="day-label">
                  <span className="day-chevron" aria-hidden="true">{isExpanded ? "−" : "+"}</span>
                  <span>
                    <strong>{formatDate(day.date)}</strong>
                    <small>{day.meals.length} meals</small>
                  </span>
                </span>
                <MacroSummary compact macros={totals} />
              </button>
              {isExpanded ? <div id={detailsId}><MealDetails day={day} /></div> : null}
            </div>
          );
        })}
      </div>
    </section>
  );
}
