"use client";

import { useState } from "react";
import type { FormEvent } from "react";

import {
  calculateNutritionTargets,
  roundNutritionValue,
  type NutritionTargetInput,
  type NutritionTargetErrors,
} from "@/lib/nutrition/targets";
import type { ActivityLevel, Goal } from "@/lib/nutrition/types";

type FormValues = {
  weightKg: string;
  heightCm: string;
  age: string;
  activityLevel: ActivityLevel | "";
  goal: Goal | "";
};

const INITIAL_VALUES: FormValues = {
  weightKg: "",
  heightCm: "",
  age: "",
  activityLevel: "",
  goal: "maintain",
};

const ACTIVITY_OPTIONS: { value: ActivityLevel; label: string; detail: string }[] = [
  { value: "sedentary", label: "Sedentary", detail: "little structured movement" },
  { value: "lightly-active", label: "Lightly active", detail: "1–3 active days / week" },
  { value: "moderately-active", label: "Moderately active", detail: "3–5 active days / week" },
  { value: "very-active", label: "Very active", detail: "hard training most days" },
];

const GOAL_OPTIONS: { value: Goal; label: string; detail: string }[] = [
  { value: "maintain", label: "Maintain", detail: "no calorie adjustment" },
  { value: "cut", label: "Cut", detail: "15% calorie reduction" },
  { value: "bulk", label: "Bulk", detail: "10% calorie increase" },
];

function FieldError({ id, message }: { id: string; message?: string }) {
  return message ? <p className="field-error" id={id} role="alert">{message}</p> : null;
}

export default function NutritionTargets() {
  const [values, setValues] = useState<FormValues>(INITIAL_VALUES);
  const [errors, setErrors] = useState<NutritionTargetErrors>({});
  const [result, setResult] = useState<ReturnType<typeof calculateNutritionTargets> | null>(null);

  function updateValue(field: keyof FormValues, value: string) {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
    setResult(null);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const input: Partial<NutritionTargetInput> = {
      weightKg: values.weightKg ? Number(values.weightKg) : Number.NaN,
      heightCm: values.heightCm ? Number(values.heightCm) : Number.NaN,
      age: values.age ? Number(values.age) : Number.NaN,
      activityLevel: values.activityLevel as ActivityLevel,
      goal: values.goal as Goal,
    };
    const calculation = calculateNutritionTargets(input as NutritionTargetInput);

    if (!calculation.ok) {
      setErrors(calculation.errors);
      setResult(null);
      return;
    }

    setErrors({});
    setResult(calculation);
  }

  const targets = result?.ok ? result.targets : null;

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
            <label htmlFor="weight-kg">Weight <span>(kg)</span></label>
            <input aria-describedby="weight-error" aria-invalid={Boolean(errors.weightKg)} id="weight-kg" inputMode="decimal" min="1" onChange={(event) => updateValue("weightKg", event.target.value)} placeholder="70" step="0.1" type="number" value={values.weightKg} />
            <FieldError id="weight-error" message={errors.weightKg} />
          </div>
          <div className="field-group">
            <label htmlFor="height-cm">Height <span>(cm)</span></label>
            <input aria-describedby="height-error" aria-invalid={Boolean(errors.heightCm)} id="height-cm" inputMode="decimal" min="50" onChange={(event) => updateValue("heightCm", event.target.value)} placeholder="175" step="0.1" type="number" value={values.heightCm} />
            <FieldError id="height-error" message={errors.heightCm} />
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
          </div>
          <p className="calculation-note">BMR {roundNutritionValue(targets.bmr).toLocaleString()} · estimated maintenance {roundNutritionValue(targets.tdee).toLocaleString()} cal</p>
          {targets.hasInsufficientCalories ? (
            <p className="warning-message">Protein and fat already exceed this calorie target, so there are no calories left to allocate to carbohydrates.</p>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
