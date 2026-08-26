"use client";

import { useEffect, useRef, useState } from "react";

import AuthPanel from "@/components/auth-panel";
import InterpretationErrorsPanel from "@/components/interpretation-errors";
import MealHistory from "@/components/meal-history";
import MealInterpreter from "@/components/meal-interpreter";
import NutritionTargets from "@/components/nutrition-targets";
import { parseInterpretationErrorList } from "@/lib/interpretation-errors/types";
import type { MealRecord } from "@/lib/meal-history/types";
import { parseMealRecordList } from "@/lib/meal-history/types";
import {
  DASHBOARD_POLL_INTERVAL_MS,
  mealListFingerprint,
} from "@/lib/nutrition/dashboard-poll";
import {
  clearStoredSession,
  loadStoredSession,
  refreshSupabaseSession,
  saveStoredSession,
  signOut,
  type SupabaseSession,
} from "@/lib/supabase-auth";

type DashboardView = "tracking" | "calculations";

export default function Home() {
  const [session, setSession] = useState<SupabaseSession | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [dashboardView, setDashboardView] = useState<DashboardView>("tracking");
  const [mealHistoryRefreshKey, setMealHistoryRefreshKey] = useState(0);
  const [errorsRefreshKey, setErrorsRefreshKey] = useState(0);
  const [focusedMeal, setFocusedMeal] = useState<MealRecord | null>(null);
  const [copiedMeal, setCopiedMeal] = useState<MealRecord | null>(null);
  const mealFingerprintRef = useRef<string | null>(null);
  const errorsFingerprintRef = useRef<string | null>(null);

  function handleSelectMeal(meal: MealRecord) {
    setCopiedMeal(null);
    setFocusedMeal(meal);
  }

  function handleCopyMeal(meal: MealRecord) {
    setFocusedMeal(null);
    setCopiedMeal(meal);
  }

  function handleClearFocusedMeal() {
    setFocusedMeal(null);
  }

  function handleClearCopiedMeal() {
    setCopiedMeal(null);
  }

  function bumpHistory() {
    setMealHistoryRefreshKey((key) => key + 1);
  }

  function handleProcessingQueued() {
    setErrorsRefreshKey((key) => key + 1);
  }

  useEffect(() => {
    let isCurrent = true;
    const storedSession = loadStoredSession();

    async function restoreSession() {
      if (!storedSession) {
        if (isCurrent) setIsAuthReady(true);
        return;
      }

      const expiresSoon = storedSession.expires_at
        ? storedSession.expires_at * 1000 < Date.now() + 60_000
        : false;

      if (expiresSoon) {
        try {
          const refreshed = await refreshSupabaseSession(storedSession.refresh_token);
          if (refreshed.session && isCurrent) {
            saveStoredSession(refreshed.session);
            setSession(refreshed.session);
          } else if (isCurrent) {
            clearStoredSession();
          }
        } catch {
          clearStoredSession();
        }
      } else if (isCurrent) {
        setSession(storedSession);
      }

      if (isCurrent) setIsAuthReady(true);
    }

    void restoreSession();
    return () => { isCurrent = false; };
  }, []);

  useEffect(() => {
    if (!session) {
      mealFingerprintRef.current = null;
      errorsFingerprintRef.current = null;
      return;
    }

    let cancelled = false;
    const accessToken = session.access_token;

    async function pollDashboard() {
      if (typeof document !== "undefined" && document.visibilityState === "hidden") return;

      try {
        const [mealsResponse, errorsResponse] = await Promise.all([
          fetch("/api/meals", { cache: "no-store", headers: { Authorization: `Bearer ${accessToken}` } }),
          fetch("/api/interpretation-errors", {
            cache: "no-store",
            headers: { Authorization: `Bearer ${accessToken}` },
          }),
        ]);

        if (cancelled) return;

        if (mealsResponse.ok) {
          const mealsPayload = (await mealsResponse.json().catch(() => ({}))) as unknown;
          const meals = parseMealRecordList(mealsPayload);
          if (meals) {
            const fingerprint = mealListFingerprint(meals);
            if (mealFingerprintRef.current === null) {
              mealFingerprintRef.current = fingerprint;
            } else if (mealFingerprintRef.current !== fingerprint) {
              mealFingerprintRef.current = fingerprint;
              bumpHistory();
            }
          }
        }

        if (errorsResponse.ok) {
          const errorsPayload = (await errorsResponse.json().catch(() => ({}))) as unknown;
          const errors = parseInterpretationErrorList(errorsPayload);
          if (errors) {
            const fingerprint = mealListFingerprint(errors);
            if (errorsFingerprintRef.current === null) {
              errorsFingerprintRef.current = fingerprint;
            } else if (errorsFingerprintRef.current !== fingerprint) {
              errorsFingerprintRef.current = fingerprint;
              setErrorsRefreshKey((key) => key + 1);
            }
          }
        }
      } catch {
        // Light polling is best-effort; keep the last known dashboard state.
      }
    }

    const intervalId = window.setInterval(() => {
      void pollDashboard();
    }, DASHBOARD_POLL_INTERVAL_MS);

    function onVisibility() {
      if (document.visibilityState === "visible") void pollDashboard();
    }
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [session]);

  async function handleSignOut() {
    if (!session || isSigningOut) return;
    setIsSigningOut(true);
    try {
      await signOut(session.access_token);
    } catch {
      // Clear the local session even if the remote logout request is unavailable.
    } finally {
      clearStoredSession();
      setSession(null);
      setDashboardView("tracking");
      setIsSigningOut(false);
    }
  }

  return (
    <main className="app-shell">
      <header className="app-header">
        <div className="brand-lockup">
          <span className="brand-mark" aria-hidden="true">S</span>
          <div><span className="brand-name">Sonion</span><span className="brand-tagline">personal nutrition, simplified</span></div>
        </div>
        {session ? (
          <div className="account-controls">
            <span className="account-email">{session.user.email}</span>
            <button className="sign-out-button" disabled={isSigningOut} onClick={() => void handleSignOut()} type="button">{isSigningOut ? "Signing out..." : "Sign out"}</button>
          </div>
        ) : <span className="private-badge">Private by default</span>}
      </header>

      {!isAuthReady ? (
        <div className="auth-loading">Restoring your secure session...</div>
      ) : session ? (
        <div className="dashboard-stack">
          <nav aria-label="Dashboard views" className="dashboard-nav">
            <div className="dashboard-nav-copy">
              <p className="eyebrow">Your workspace</p>
              <strong>{dashboardView === "tracking" ? "Meal tracking" : "Scientific calculations"}</strong>
            </div>
            <div className="dashboard-nav-actions">
              <button
                aria-pressed={dashboardView === "tracking"}
                className={`dashboard-nav-button${dashboardView === "tracking" ? " is-active" : ""}`}
                onClick={() => setDashboardView("tracking")}
                type="button"
              >
                Meal tracking
              </button>
              <button
                aria-pressed={dashboardView === "calculations"}
                className={`dashboard-nav-button${dashboardView === "calculations" ? " is-active" : ""}`}
                onClick={() => setDashboardView("calculations")}
                type="button"
              >
                Scientific calculations
              </button>
            </div>
          </nav>

          <div className="dashboard-view" hidden={dashboardView !== "tracking"}>
            <div className="dashboard-grid">
              <MealHistory
                accessToken={session.access_token}
                onCopyMeal={handleCopyMeal}
                onSelectMeal={handleSelectMeal}
                refreshKey={mealHistoryRefreshKey}
              />
              <MealInterpreter
                accessToken={session.access_token}
                mealToCopy={copiedMeal}
                mealToRefine={focusedMeal}
                onClearCopiedMeal={handleClearCopiedMeal}
                onClearFocusedMeal={handleClearFocusedMeal}
                onProcessingQueued={handleProcessingQueued}
                onMealSaved={bumpHistory}
              />
            </div>
            <InterpretationErrorsPanel
              accessToken={session.access_token}
              refreshKey={errorsRefreshKey}
            />
          </div>

          <div className="dashboard-view calculations-layout" hidden={dashboardView !== "calculations"}>
            <NutritionTargets />
          </div>
        </div>
      ) : (
        <section className="auth-layout">
          <div className="auth-copy">
            <p className="eyebrow">A quieter way to track</p>
            <h1>Your food, in focus.</h1>
            <p>Sign in to explore the private meal dashboard. Processed estimates can be saved to a meal history that only your account can access.</p>
          </div>
          <AuthPanel onAuthenticated={(nextSession) => setSession(nextSession)} />
        </section>
      )}

      <footer className="app-footer">Early prototype · saved meal history is private to your Supabase account · AI interpretation uses your authenticated session</footer>
    </main>
  );
}
