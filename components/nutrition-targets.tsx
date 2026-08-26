"use client";

import { useState } from "react";
import type { FormEvent } from "react";

import {
  calculateNutritionTargets,
  roundNutritionValue,
  type NutritionTargetInput,
  type NutritionTargetErrors,
} from "@/lib/nutrition/targets";
import type { ActivityLevel, Goal, WeightChangeUnit } from "@/lib/nutrition/types";

type NutritionTargetsProps = {
  accessToken: string;
  onTargetsSaved: () => void;
};

type SaveState = "idle" | "saving" | "saved" | "error";

type FormValues = {
  weightLb: string;
  heightIn: string;
  age: string;
  activityLevel: ActivityLevel | "";
  goal: Goal | "";
  weeklyChange: string;
  weeklyChangeUnit: WeightChangeUnit;
};

const INITIAL_VALUES: FormValues = {
  weightLb: "",
  heightIn: "",
  age: "",
  activityLevel: "",
  goal: "maintain",
  weeklyChange: "",
  weeklyChangeUnit: "percent",
};

const ACTIVITY_OPTIONS: { value: ActivityLevel; label: string; detail: string }[] = [
  { value: "sedentary", label: "Sedentary", detail: "little structured movement" },
  { value: "lightly-active", label: "Lightly active", detail: "1–3 active days / week" },
  { value: "moderately-active", label: "Moderately active", detail: "3–5 active days / week" },
  { value: "very-active", label: "Very active", detail: "hard training most days" },
];

const GOAL_OPTIONS: { value: Goal; label: string; detail: string }[] = [
  { value: "maintain", label: "Maintain", detail: "no calorie adjustment" },
  { value: "cut", label: "Cut", detail: "choose a weekly loss" },
  { value: "bulk", label: "Bulk", detail: "choose a weekly gain" },
];

function FieldError({ id, message }: { id: string; message?: string }) {
  return message ? <p className="field-error" id={id} role="alert">{message}</p> : null;
}

export default function NutritionTargets({ accessToken, onTargetsSaved }: NutritionTargetsProps) {
  const [values, setValues] = useState<FormValues>(INITIAL_VALUES);
  const [errors, setErrors] = useState<NutritionTargetErrors>({});
  const [result, setResult] = useState<ReturnType<typeof calculateNutritionTargets> | null>(null);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [saveError, setSaveError] = useState("");

  function updateValue(field: keyof FormValues, value: string) {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
    setResult(null);
    setSaveState("idle");
    setSaveError("");
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const input: Partial<NutritionTargetInput> = {
      weightLb: values.weightLb ? Number(values.weightLb) : Number.NaN,
      heightIn: values.heightIn ? Number(values.heightIn) : Number.NaN,
      age: values.age ? Number(values.age) : Number.NaN,
      activityLevel: values.activityLevel as ActivityLevel,
      goal: values.goal as Goal,
      weeklyChange: values.weeklyChange ? Number(values.weeklyChange) : Number.NaN,
      weeklyChangeUnit: values.weeklyChangeUnit,
    };
    const calculation = calculateNutritionTargets(input as NutritionTargetInput);

    if (!calculation.ok) {
      setErrors(calculation.errors);
      setResult(null);
      return;
    }

    setErrors({});
    setResult(calculation);
    setSaveState("idle");
    setSaveError("");
  }

  const targets = result?.ok ? result.targets : null;

  async function handleSave() {
    if (!targets || saveState === "saving") return;
    setSaveState("saving");
    setSaveError("");
    try {
      const response = await fetch("/api/nutrition-targets", {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({ targets }),
      });
      const payload = (await response.json().catch(() => ({}))) as unknown;
      if (!response.ok) throw new Error(getErrorMessage(payload));
      setSaveState("saved");
      onTargetsSaved();
    } catch (error) {
      setSaveState("error");
      setSaveError(error instanceof Error ? error.message : "Could not save your daily targets.");
    }
  }

  return (
    <section aria-labelledby="targets-title" className="panel targets-panel">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Personal math</p>
          <h2 id="targets-title">Daily targets</h2>
        </div>
        <span className="panel-note">Mifflin–St Jeor</span>
      </div>
      <p className="panel-intro">Use your basics to get a starting point for calories and macros. Think of it as a useful estimate, not a prescription.</p>

      <form className="target-form" onSubmit={handleSubmit} noValidate>
        <div className="form-grid two-up">
          <div className="field-group">
            <label htmlFor="weight-lb">Weight <span>(lb)</span></label>
            <input aria-describedby="weight-error" aria-invalid={Boolean(errors.weightLb)} id="weight-lb" inputMode="decimal" min="1" onChange={(event) => updateValue("weightLb", event.target.value)} placeholder="154" step="0.1" type="number" value={values.weightLb} />
            <FieldError id="weight-error" message={errors.weightLb} />
          </div>
          <div className="field-group">
            <label htmlFor="height-in">Height <span>(in)</span></label>
            <input aria-describedby="height-error" aria-invalid={Boolean(errors.heightIn)} id="height-in" inputMode="decimal" min="19.7" onChange={(event) => updateValue("heightIn", event.target.value)} placeholder="69" step="0.1" type="number" value={values.heightIn} />
            <FieldError id="height-error" message={errors.heightIn} />
          </div>
        </div>

        <div className="field-group">
          <label htmlFor="age">Age <span>(years)</span></label>
          <input aria-describedby="age-error" aria-invalid={Boolean(errors.age)} id="age" inputMode="numeric" min="13" onChange={(event) => updateValue("age", event.target.value)} placeholder="30" step="1" type="number" value={values.age} />
          <FieldError id="age-error" message={errors.age} />
        </div>

        <div className="field-group">
          <label htmlFor="activity-level">Activity level</label>
          <select aria-describedby="activity-error" aria-invalid={Boolean(errors.activityLevel)} id="activity-level" onChange={(event) => updateValue("activityLevel", event.target.value)} value={values.activityLevel}>
            <option disabled value="">Choose one</option>
            {ACTIVITY_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label} — {option.detail}</option>)}
          </select>
          <FieldError id="activity-error" message={errors.activityLevel} />
        </div>

        <fieldset className="field-group goal-fieldset">
          <legend>Goal</legend>
          <div className="goal-options">
            {GOAL_OPTIONS.map((option) => (
              <label className={`goal-option${values.goal === option.value ? " is-selected" : ""}`} key={option.value}>
                <input checked={values.goal === option.value} name="goal" onChange={() => updateValue("goal", option.value)} type="radio" value={option.value} />
                <span><strong>{option.label}</strong><small>{option.detail}</small></span>
              </label>
            ))}
          </div>
          <FieldError id="goal-error" message={errors.goal} />
        </fieldset>

        {values.goal === "cut" || values.goal === "bulk" ? (
          <div className="field-group weekly-change-group">
            <label htmlFor="weekly-change">{values.goal === "cut" ? "Lose" : "Gain"} <span>per week</span></label>
            <div className="weekly-change-controls">
              <input aria-describedby="weekly-change-error" aria-invalid={Boolean(errors.weeklyChange)} id="weekly-change" inputMode="decimal" min="0.1" onChange={(event) => updateValue("weeklyChange", event.target.value)} placeholder="1" step="0.1" type="number" value={values.weeklyChange ?? ""} />
              <select aria-label="Weekly change unit" aria-describedby="weekly-change-unit-error" aria-invalid={Boolean(errors.weeklyChangeUnit)} id="weekly-change-unit" onChange={(event) => updateValue("weeklyChangeUnit", event.target.value as WeightChangeUnit)} value={values.weeklyChangeUnit}>
                <option value="percent">% of body weight</option>
                <option value="pounds">lb of body weight</option>
              </select>
            </div>
            <p className="field-help">Set the amount of body weight you want to {values.goal === "cut" ? "lose" : "gain"} each week.</p>
            <FieldError id="weekly-change-error" message={errors.weeklyChange} />
            <FieldError id="weekly-change-unit-error" message={errors.weeklyChangeUnit} />
          </div>
        ) : null}

        <button className="secondary-button" type="submit">Calculate targets</button>
      </form>

      {targets ? (
        <div aria-live="polite" className="target-results">
          <div className="calorie-result">
            <span>Daily calorie target</span>
            <strong>{roundNutritionValue(targets.targetCalories).toLocaleString()} <small>cal</small></strong>
          </div>
          <div className="target-macros">
            <div><strong>{roundNutritionValue(targets.proteinGrams)}g</strong><span>protein</span></div>
            <div><strong>{roundNutritionValue(targets.fatGrams)}g</strong><span>fat</span></div>
            <div><strong>{roundNutritionValue(targets.carbohydratesGrams)}g</strong><span>carbs</span></div>
            <div><strong>{roundNutritionValue(targets.fiberGrams)}g</strong><span>fiber</span></div>
          </div>
          <p className="calculation-note">BMR {roundNutritionValue(targets.bmr).toLocaleString()} · estimated maintenance {roundNutritionValue(targets.tdee).toLocaleString()} cal · {targets.weeklyChangePounds === 0 ? "maintaining" : `${targets.weeklyChangePounds < 0 ? "losing" : "gaining"} ${Math.abs(targets.weeklyChangePounds).toFixed(2)} lb/week`}</p>
          {targets.hasInsufficientCalories ? (
            <p className="warning-message">Protein and fat already exceed this calorie target, so there are no calories left to allocate to carbohydrates.</p>
          ) : null}
          <button className="save-target-button secondary-button" disabled={saveState === "saving"} onClick={() => void handleSave()} type="button">
            {saveState === "saving" ? "Saving targets..." : saveState === "saved" ? "Targets saved" : "Save these targets"}
          </button>
          {saveState === "saved" ? <p className="saved-message">Your saved target will appear above meal history.</p> : null}
          {saveState === "error" ? <p className="error-message" role="alert">{saveError || "Could not save your daily targets."}</p> : null}
        </div>
      ) : null}
    </section>
  );
}

function getErrorMessage(payload: unknown) {
  return typeof payload === "object" && payload !== null && "error" in payload && typeof payload.error === "string"
    ? payload.error
    : "Could not save your daily targets.";
}
