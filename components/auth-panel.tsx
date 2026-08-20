"use client";

import { useState } from "react";
import type { FormEvent } from "react";

import {
  saveStoredSession,
  signInWithPassword,
  signUpWithPassword,
  type SupabaseSession,
} from "@/lib/supabase-auth";

type AuthMode = "sign-in" | "sign-up";

type AuthPanelProps = {
  onAuthenticated: (session: SupabaseSession) => void;
};

export default function AuthPanel({ onAuthenticated }: AuthPanelProps) {
  const [mode, setMode] = useState<AuthMode>("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isSignUp = mode === "sign-up";

  function changeMode(nextMode: AuthMode) {
    setMode(nextMode);
    setError("");
    setMessage("");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isSubmitting) {
      return;
    }

    const trimmedEmail = email.trim();
    setError("");
    setMessage("");

    if (!trimmedEmail || !trimmedEmail.includes("@")) {
      setError("Enter a valid email address.");
      return;
    }

    if (password.length < 6) {
      setError("Your password must be at least 6 characters.");
      return;
    }

    setIsSubmitting(true);

    try {
      const result = isSignUp
        ? await signUpWithPassword(trimmedEmail, password)
        : await signInWithPassword(trimmedEmail, password);

      if (!result.session) {
        setMessage("Account created. Check your email to confirm your account, then sign in.");
        setMode("sign-in");
        setPassword("");
        return;
      }

      saveStoredSession(result.session);
      onAuthenticated(result.session);
    } catch (authError) {
      setError(authError instanceof Error ? authError.message : "Authentication failed. Try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-[0_24px_80px_-32px_rgba(15,23,42,0.35)] sm:p-8">
      <div className="flex rounded-full bg-slate-100 p-1 text-sm font-semibold">
        <button
          className={`flex-1 rounded-full px-4 py-2.5 transition ${!isSignUp ? "bg-white text-slate-950 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}
          onClick={() => changeMode("sign-in")}
          type="button"
        >
          Sign in
        </button>
        <button
          className={`flex-1 rounded-full px-4 py-2.5 transition ${isSignUp ? "bg-white text-slate-950 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}
          onClick={() => changeMode("sign-up")}
          type="button"
        >
          Create account
        </button>
      </div>

      <div className="mt-7">
        <h2 className="text-2xl font-semibold tracking-tight text-slate-950">
          {isSignUp ? "Start your personal nutrition log" : "Welcome back"}
        </h2>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          {isSignUp
            ? "Use an email and password so your future meals stay connected to you."
            : "Sign in to access your meal interpreter and personal tracking space."}
        </p>
      </div>

      <form className="mt-7" onSubmit={handleSubmit}>
        <label className="block text-sm font-semibold text-slate-900" htmlFor="auth-email">
          Email address
        </label>
        <input
          autoComplete="email"
          className="mt-2 w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-base text-slate-900 outline-none transition focus:border-emerald-700 focus:bg-white focus:ring-4 focus:ring-emerald-100"
          id="auth-email"
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@example.com"
          required
          type="email"
          value={email}
        />

        <label className="mt-5 block text-sm font-semibold text-slate-900" htmlFor="auth-password">
          Password
        </label>
        <input
          autoComplete={isSignUp ? "new-password" : "current-password"}
          className="mt-2 w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-base text-slate-900 outline-none transition focus:border-emerald-700 focus:bg-white focus:ring-4 focus:ring-emerald-100"
          id="auth-password"
          minLength={6}
          onChange={(event) => setPassword(event.target.value)}
          required
          type="password"
          value={password}
        />

        <div aria-live="assertive" className="mt-4 min-h-6" role="alert">
          {error ? <p className="rounded-xl bg-red-50 px-4 py-3 text-sm leading-6 text-red-800">{error}</p> : null}
        </div>
        <div aria-live="polite" className="min-h-6">
          {message ? <p className="rounded-xl bg-emerald-50 px-4 py-3 text-sm leading-6 text-emerald-900">{message}</p> : null}
        </div>

        <button
          aria-busy={isSubmitting}
          className="mt-4 w-full rounded-full bg-emerald-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-800 focus:outline-none focus:ring-4 focus:ring-emerald-200 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={isSubmitting}
          type="submit"
        >
          {isSubmitting ? "Working..." : isSignUp ? "Create account" : "Sign in"}
        </button>
      </form>
    </div>
  );
}

