"use client";

import { useEffect, useState } from "react";

import AuthPanel from "@/components/auth-panel";
import MealHistory from "@/components/meal-history";
import MealInterpreter from "@/components/meal-interpreter";
import NutritionTargets from "@/components/nutrition-targets";
import type { MealRecord } from "@/lib/meal-history/types";
import {
  clearStoredSession,
  loadStoredSession,
  refreshSupabaseSession,
  saveStoredSession,
  signOut,
  type SupabaseSession,
} from "@/lib/supabase-auth";

export default function Home() {
  const [session, setSession] = useState<SupabaseSession | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [mealHistoryRefreshKey, setMealHistoryRefreshKey] = useState(0);
  const [focusedMeal, setFocusedMeal] = useState<MealRecord | null>(null);

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
        <div className="dashboard-grid">
          <MealHistory accessToken={session.access_token} onSelectMeal={setFocusedMeal} refreshKey={mealHistoryRefreshKey} />
          <MealInterpreter
            accessToken={session.access_token}
            mealToRefine={focusedMeal}
            onClearFocusedMeal={() => setFocusedMeal(null)}
            onMealSaved={() => setMealHistoryRefreshKey((key) => key + 1)}
          />
          <NutritionTargets />
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
