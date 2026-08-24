"use client";

import { useEffect, useState } from "react";

import {
  parseInterpretationErrorList,
  type InterpretationErrorRecord,
} from "@/lib/interpretation-errors/types";

type InterpretationErrorsProps = {
  accessToken: string;
  refreshKey: number;
};

type ErrorsState = "loading" | "ready" | "error" | "unauthorized";

function formatRelativeTime(iso: string) {
  const created = new Date(iso).getTime();
  if (!Number.isFinite(created)) return "Unknown time";
  const deltaSeconds = Math.round((created - Date.now()) / 1000);
  const formatter = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  const abs = Math.abs(deltaSeconds);
  if (abs < 60) return formatter.format(deltaSeconds, "second");
  if (abs < 3_600) return formatter.format(Math.round(deltaSeconds / 60), "minute");
  if (abs < 86_400) return formatter.format(Math.round(deltaSeconds / 3_600), "hour");
  return formatter.format(Math.round(deltaSeconds / 86_400), "day");
}

function formatMealWhen(date: string | null, time: string | null) {
  if (!date && !time) return "No meal date/time";
  const timeLabel = time ? time.slice(0, 5) : "—";
  return `${date ?? "—"} · ${timeLabel}`;
}

export default function InterpretationErrorsPanel({
  accessToken,
  refreshKey,
}: InterpretationErrorsProps) {
  const [expanded, setExpanded] = useState(false);
  const [errors, setErrors] = useState<InterpretationErrorRecord[]>([]);
  const [state, setState] = useState<ErrorsState>("loading");
  const [error, setError] = useState("");
  const [dismissingId, setDismissingId] = useState<string | null>(null);

  useEffect(() => {
    let isCurrent = true;

    async function loadErrors() {
      if (refreshKey === 0) setState("loading");
      setError("");
      try {
        const response = await fetch("/api/interpretation-errors", {
          cache: "no-store",
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        const payload = (await response.json().catch(() => ({}))) as unknown;
        if (!response.ok) {
          if (isCurrent) setState(response.status === 401 ? "unauthorized" : "error");
          if (isCurrent && response.status !== 401) {
            setError(getErrorMessage(payload));
          }
          return;
        }
        const nextErrors = parseInterpretationErrorList(payload);
        if (!nextErrors) throw new Error("The interpretation-errors response was incomplete.");
        if (isCurrent) {
          setErrors((previous) => {
            if (previous.length === 0 && nextErrors.length > 0) setExpanded(true);
            return nextErrors;
          });
          setState("ready");
        }
      } catch (loadError) {
        if (isCurrent) {
          setState("error");
          setError(loadError instanceof Error ? loadError.message : "Could not load interpretation errors.");
        }
      }
    }

    void loadErrors();
    return () => { isCurrent = false; };
  }, [accessToken, refreshKey]);

  async function dismissError(id: string) {
    if (dismissingId) return;
    setDismissingId(id);
    setError("");
    try {
      const response = await fetch(`/api/interpretation-errors/${encodeURIComponent(id)}`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const payload = (await response.json().catch(() => ({}))) as unknown;
      if (!response.ok) {
        if (response.status === 401) setState("unauthorized");
        throw new Error(getErrorMessage(payload));
      }
      setErrors((current) => current.filter((entry) => entry.id !== id));
    } catch (dismissRequestError) {
      setError(
        dismissRequestError instanceof Error
          ? dismissRequestError.message
          : "Could not dismiss that error.",
      );
    } finally {
      setDismissingId(null);
    }
  }

  const detailsId = "interpretation-errors-details";
  const countLabel = state === "ready" ? `${errors.length} open` : "…";

  return (
    <section aria-labelledby="interpretation-errors-title" className="panel errors-panel">
      <button
        aria-controls={detailsId}
        aria-expanded={expanded}
        className="errors-toggle"
        onClick={() => setExpanded((current) => !current)}
        type="button"
      >
        <span className="day-label">
          <span className="day-chevron" aria-hidden="true">{expanded ? "−" : "+"}</span>
          <span>
            <p className="eyebrow">Background jobs</p>
            <strong id="interpretation-errors-title">Interpretation errors</strong>
            <small>{countLabel}</small>
          </span>
        </span>
        <span className="panel-note">Frontend-visible</span>
      </button>

      {expanded ? (
        <div className="errors-panel-body" id={detailsId}>
          <p className="panel-intro">
            Failures from Interpret and Save appear here so you do not need deployment logs. Dismiss when you have reviewed them.
          </p>

          {state === "loading" ? <p className="history-status" role="status">Loading interpretation errors...</p> : null}
          {state === "unauthorized" ? (
            <p className="history-status history-error" role="alert">
              Your session expired. Sign in again to see interpretation errors.
            </p>
          ) : null}
          {state === "error" ? (
            <p className="history-status history-error" role="alert">
              {error || "Could not load interpretation errors. Try again shortly."}
            </p>
          ) : null}
          {state === "ready" && errors.length === 0 ? (
            <p className="history-status">No open interpretation errors.</p>
          ) : null}

          {state === "ready" && errors.length > 0 ? (
            <ul className="errors-list">
              {errors.map((entry) => (
                <li className="error-entry" key={entry.id}>
                  <div className="error-entry-heading">
                    <div>
                      <p className="error-code">{entry.error_code}</p>
                      <p className="error-when">{formatMealWhen(entry.meal_date, entry.meal_time)}</p>
                      <p className="error-relative">{formatRelativeTime(entry.created_at)}</p>
                    </div>
                    <button
                      aria-busy={dismissingId === entry.id}
                      className="secondary-button"
                      disabled={dismissingId !== null}
                      onClick={() => void dismissError(entry.id)}
                      type="button"
                    >
                      {dismissingId === entry.id ? "Dismissing..." : "Dismiss"}
                    </button>
                  </div>
                  <p className="error-message-body">{entry.error_message}</p>
                  <p className="error-prompt-preview">{entry.prompt}</p>
                </li>
              ))}
            </ul>
          ) : null}

          {error && state === "ready" ? (
            <p className="history-status history-error" role="alert">{error}</p>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

function getErrorMessage(payload: unknown) {
  return typeof payload === "object" && payload !== null && "error" in payload && typeof payload.error === "string"
    ? payload.error
    : "Could not load interpretation errors. Try again shortly.";
}
