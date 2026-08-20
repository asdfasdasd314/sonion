"use client";

import { useState } from "react";
import type { FormEvent } from "react";

const MAX_PROMPT_LENGTH = 2_000;

type ApiPayload = {
  response?: string;
  error?: string;
};

export default function Home() {
  const [prompt, setPrompt] = useState("");
  const [response, setResponse] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isSubmitting) {
      return;
    }

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
        headers: { "Content-Type": "application/json" },
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
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-6 py-8 sm:px-10 sm:py-12">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-900 text-lg text-emerald-50 shadow-sm">
            S
          </span>
          <span className="text-lg font-semibold tracking-tight text-slate-900">Sonion</span>
        </div>
        <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-800">
          Gemma prototype
        </span>
      </header>

      <section className="grid flex-1 items-center gap-12 py-16 lg:grid-cols-[0.9fr_1.1fr] lg:gap-20">
        <div>
          <p className="mb-5 text-sm font-semibold uppercase tracking-[0.2em] text-emerald-700">
            Describe, don&apos;t measure
          </p>
          <h1 className="max-w-xl text-5xl font-semibold leading-[1.04] tracking-[-0.04em] text-slate-950 sm:text-6xl">
            Tell us what you ate.
          </h1>
          <p className="mt-6 max-w-lg text-lg leading-8 text-slate-600">
            Sonion uses Gemma to turn everyday food descriptions into a clear interpretation. No scales, spreadsheets, or nutrition math in this first prototype.
          </p>
        </div>

        <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-[0_24px_80px_-32px_rgba(15,23,42,0.35)] sm:p-8">
          <form onSubmit={handleSubmit}>
            <label className="block text-sm font-semibold text-slate-900" htmlFor="food-prompt">
              What did you eat?
            </label>
            <p className="mt-2 text-sm leading-6 text-slate-500" id="food-prompt-help">
              Try: &quot;two scoops of rice, grilled chicken, and a little broccoli&quot;
            </p>
            <textarea
              aria-describedby="food-prompt-help"
              className="mt-5 min-h-40 w-full resize-y rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-base leading-7 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-700 focus:bg-white focus:ring-4 focus:ring-emerald-100"
              id="food-prompt"
              maxLength={MAX_PROMPT_LENGTH}
              onChange={(event) => setPrompt(event.target.value)}
              placeholder="Describe your meal in your own words..."
              required
              value={prompt}
            />
            <div className="mt-3 flex items-center justify-between gap-4">
              <span className="text-xs text-slate-400">{prompt.length.toLocaleString()} / {MAX_PROMPT_LENGTH.toLocaleString()}</span>
              <button
                aria-busy={isSubmitting}
                className="rounded-full bg-emerald-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-800 focus:outline-none focus:ring-4 focus:ring-emerald-200 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={isSubmitting}
                type="submit"
              >
                {isSubmitting ? "Interpreting..." : "Interpret meal"}
              </button>
            </div>
          </form>

          <div aria-live="assertive" className="mt-5 min-h-6" role="alert">
            {error ? <p className="rounded-xl bg-red-50 px-4 py-3 text-sm leading-6 text-red-800">{error}</p> : null}
          </div>

          <section aria-live="polite" className="mt-1" aria-label="Sonion response">
            {response ? (
              <div className="rounded-2xl bg-emerald-50 px-5 py-4 text-sm leading-7 text-emerald-950">
                <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">Interpretation</p>
                <p className="whitespace-pre-wrap">{response}</p>
              </div>
            ) : null}
          </section>
        </div>
      </section>

      <footer className="border-t border-slate-200 pt-5 text-xs leading-5 text-slate-500">
        Early prototype: responses interpret food descriptions only. Nutrition totals, calculations, database lookups, persistence, authentication, and custom tools are not connected yet.
      </footer>
    </main>
  );
}
