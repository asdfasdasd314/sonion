"use client";

import { useState } from "react";
import type { FormEvent } from "react";

const MAX_PROMPT_LENGTH = 2_000;

type ApiPayload = {
  response?: string;
  error?: string;
};

type MealInterpreterProps = {
  accessToken: string;
};

export default function MealInterpreter({ accessToken }: MealInterpreterProps) {
  const [prompt, setPrompt] = useState("");
  const [response, setResponse] = useState("");
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
      const payload = (await result.json().catch(() => ({}))) as ApiPayload;

      if (!result.ok) {
        setError(payload.error ?? "Sonion could not interpret that prompt.");
        return;
      }
      setResponse(payload.response ?? "Sonion returned no interpretation.");
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
            <p className="response-label">Interpretation</p>
            <p className="response-text">{response}</p>
          </div>
        ) : null}
      </section>
    </section>
  );
}
