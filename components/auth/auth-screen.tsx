"use client";

import { useMemo, useState } from "react";
import {
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
} from "firebase/auth";

import { getFirebaseAuth } from "@/lib/firebase/auth";

const initialFormState = {
  email: "",
  password: "",
};

type AuthMode = "signIn" | "signUp";

type FirebaseError = {
  code?: string;
  message?: string;
};

const firebaseErrorMessages: Record<string, string> = {
  "auth/email-already-in-use": "This email is already registered. Try signing in instead.",
  "auth/invalid-credential": "The email and password combination didn't match our records.",
  "auth/invalid-email": "Please enter a valid email address.",
  "auth/user-disabled": "This account has been disabled.",
  "auth/user-not-found": "We couldn't find an account with that email. Try creating one instead.",
  "auth/wrong-password": "Incorrect password. Double-check and try again.",
  "auth/weak-password": "Your password should be at least 8 characters.",
};

export function AuthScreen() {
  const [mode, setMode] = useState<AuthMode>("signIn");
  const [formState, setFormState] = useState({ ...initialFormState });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resetMessage, setResetMessage] = useState<string | null>(null);
  const [isResetting, setIsResetting] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  const isSignUp = mode === "signUp";
  const isPasswordLongEnough = formState.password.length >= 8;

  const welcomeHeading = isSignUp ? "Create your account" : "Welcome back";
  const welcomeDescription = isSignUp
    ? "Stay accountable with a simple food journal, daily targets, and encouraging feedback tailored to you."
    : "Sign in to continue tracking your meals, macros, and personalized coaching insights.";

  const toggleMode = () => {
    setFormState({ ...initialFormState, email: formState.email });
    setError(null);
    setResetMessage(null);
    setMode((current) => (current === "signIn" ? "signUp" : "signIn"));
  };

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setFormState((previous) => ({ ...previous, [name]: value }));
  };

  const getErrorMessage = (firebaseError: unknown) => {
    if (firebaseError && typeof firebaseError === "object") {
      const { code, message } = firebaseError as FirebaseError;

      if (code && firebaseErrorMessages[code]) {
        return firebaseErrorMessages[code];
      }

      if (typeof message === "string" && message.trim()) {
        return message;
      }
    }

    return "Something went wrong. Please try again.";
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setError(null);
    setResetMessage(null);

    const auth = getFirebaseAuth();

    if (isSignUp && !isPasswordLongEnough) {
      setError("Use at least 8 characters to create a strong password.");
      return;
    }

    setIsSubmitting(true);

    try {
      if (isSignUp) {
        await createUserWithEmailAndPassword(auth, formState.email, formState.password);
      } else {
        await signInWithEmailAndPassword(auth, formState.email, formState.password);
      }
    } catch (firebaseError) {
      setError(getErrorMessage(firebaseError));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    setResetMessage(null);

    const auth = getFirebaseAuth();
    const provider = new GoogleAuthProvider();

    setIsGoogleLoading(true);

    try {
      await signInWithPopup(auth, provider);
    } catch (firebaseError) {
      setError(getErrorMessage(firebaseError));
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const handlePasswordReset = async () => {
    setError(null);
    setResetMessage(null);

    if (!formState.email) {
      setError("Enter the email you registered with and we'll send reset instructions.");
      return;
    }

    const auth = getFirebaseAuth();

    setIsResetting(true);

    try {
      await sendPasswordResetEmail(auth, formState.email);
      setResetMessage("Password reset email sent! Check your inbox.");
    } catch (firebaseError) {
      setError(getErrorMessage(firebaseError));
    } finally {
      setIsResetting(false);
    }
  };

  const submitDisabled = useMemo(() => {
    if (isSubmitting) {
      return true;
    }

    if (!formState.email || !formState.password) {
      return true;
    }

    if (isSignUp) {
      return !isPasswordLongEnough;
    }

    return false;
  }, [formState, isPasswordLongEnough, isSignUp, isSubmitting]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-12">
      <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 shadow-xl shadow-slate-900/5">
        <div className="mb-8 space-y-2 text-center">
          <span className="inline-flex items-center justify-center rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium uppercase tracking-[0.3em] text-emerald-700">
            Nutrition Assistant
          </span>
          <h1 className="text-2xl font-semibold text-slate-900 sm:text-3xl">{welcomeHeading}</h1>
          <p className="text-sm text-slate-600">{welcomeDescription}</p>
        </div>

        {error ? (
          <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert" aria-live="assertive">
            {error}
          </div>
        ) : null}

        {resetMessage ? (
          <div className="mb-6 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700" role="status" aria-live="polite">
            {resetMessage}
          </div>
        ) : null}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <label htmlFor="email" className="text-sm font-medium text-slate-700">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              value={formState.email}
              onChange={handleChange}
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm transition focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-200"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="password" className="text-sm font-medium text-slate-700">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete={isSignUp ? "new-password" : "current-password"}
              placeholder="••••••••"
              value={formState.password}
              onChange={handleChange}
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm transition focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-200"
            />
            {isSignUp ? (
              <p className="text-xs text-slate-500">Use at least 8 characters to create a strong password.</p>
            ) : (
              <button
                type="button"
                onClick={handlePasswordReset}
                disabled={isResetting}
                className="text-xs font-medium text-emerald-600 transition hover:text-emerald-700 disabled:cursor-not-allowed disabled:text-emerald-400"
              >
                {isResetting ? "Sending reset instructions…" : "Forgot your password?"}
              </button>
            )}
          </div>

          <button
            type="submit"
            disabled={submitDisabled}
            className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-500/20 transition hover:bg-emerald-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 disabled:cursor-not-allowed disabled:bg-emerald-400"
          >
            {isSubmitting ? (
              <span className="flex items-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" aria-hidden="true" />
                {isSignUp ? "Creating your account…" : "Signing you in…"}
              </span>
            ) : (
              <span>{isSignUp ? "Create account" : "Sign in"}</span>
            )}
          </button>
        </form>

        <div className="mt-6 flex items-center gap-4">
          <div className="h-px flex-1 bg-slate-200" aria-hidden="true" />
          <span className="text-xs font-medium uppercase tracking-[0.25em] text-slate-400">Or</span>
          <div className="h-px flex-1 bg-slate-200" aria-hidden="true" />
        </div>

        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={isSubmitting || isGoogleLoading}
          className="mt-6 inline-flex w-full items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 disabled:cursor-not-allowed disabled:opacity-70"
        >
          <span className="inline-flex h-5 w-5 items-center justify-center" aria-hidden="true">
            <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.56c2.08-1.92 3.28-4.76 3.28-8.1z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.56-2.77c-.98.66-2.23 1.06-3.72 1.06-2.86 0-5.28-1.93-6.15-4.53H2.18v2.84A11 11 0 0 0 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.85 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18A11 11 0 0 0 1 12c0 1.76.42 3.42 1.18 4.93l3.67-2.84z"
              />
              <path
                fill="#EA4335"
                d="M12 4.88c1.62 0 3.07.56 4.22 1.64l3.16-3.16C17.46 1.63 14.97.5 12 .5A11 11 0 0 0 2.18 7.07l3.67 2.84C6.72 6.81 9.14 4.88 12 4.88z"
              />
            </svg>
          </span>
          <span>{isGoogleLoading ? "Connecting to Google…" : "Continue with Google"}</span>
        </button>

        <div className="mt-6 text-center text-sm text-slate-600">
          {isSignUp ? (
            <p>
              Already have an account?{" "}
              <button
                type="button"
                onClick={toggleMode}
                className="font-semibold text-emerald-600 transition hover:text-emerald-700"
              >
                Sign in instead
              </button>
            </p>
          ) : (
            <p>
              New to Nutrition Assistant?{" "}
              <button
                type="button"
                onClick={toggleMode}
                className="font-semibold text-emerald-600 transition hover:text-emerald-700"
              >
                Create an account
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
