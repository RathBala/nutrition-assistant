"use client";

import { useMemo, useState } from "react";
import {
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  updateProfile,
} from "firebase/auth";

import { getFirebaseAuth } from "@/lib/firebase/auth";

const initialFormState = {
  fullName: "",
  email: "",
  password: "",
  confirmPassword: "",
};

type AuthMode = "signIn" | "signUp";

type FirebaseError = {
  code?: string;
  message?: string;
};

const firebaseErrorMessages: Record<string, string> = {
  "auth/email-already-in-use": "This email is already registered. Try signing in instead.",
  "auth/invalid-credential": "The email and password combination didn\'t match our records.",
  "auth/invalid-email": "Please enter a valid email address.",
  "auth/user-disabled": "This account has been disabled.",
  "auth/user-not-found": "We couldn\'t find an account with that email. Try creating one instead.",
  "auth/wrong-password": "Incorrect password. Double-check and try again.",
  "auth/weak-password": "Your password should be at least 8 characters.",
};

const getInitials = (fullName: string, email: string) => {
  if (fullName.trim()) {
    return fullName
      .split(/\s+/)
      .map((part) => part[0]?.toUpperCase())
      .join("")
      .slice(0, 2);
  }

  return email.charAt(0).toUpperCase();
};

const getFriendlyName = (fullName: string, email: string) => {
  if (fullName.trim()) {
    return fullName.trim();
  }

  return email.split("@")[0] ?? "there";
};

export function AuthScreen() {
  const [mode, setMode] = useState<AuthMode>("signIn");
  const [formState, setFormState] = useState({ ...initialFormState });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resetMessage, setResetMessage] = useState<string | null>(null);
  const [isResetting, setIsResetting] = useState(false);

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

    if (isSignUp && formState.password !== formState.confirmPassword) {
      setError("Passwords need to match. Try again.");
      return;
    }

    if (isSignUp && !isPasswordLongEnough) {
      setError("Use at least 8 characters to create a strong password.");
      return;
    }

    setIsSubmitting(true);

    try {
      if (isSignUp) {
        const credentials = await createUserWithEmailAndPassword(
          auth,
          formState.email,
          formState.password,
        );

        if (formState.fullName.trim()) {
          await updateProfile(credentials.user, { displayName: formState.fullName.trim() });
        }
      } else {
        await signInWithEmailAndPassword(auth, formState.email, formState.password);
      }
    } catch (firebaseError) {
      setError(getErrorMessage(firebaseError));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePasswordReset = async () => {
    setError(null);
    setResetMessage(null);

    if (!formState.email) {
      setError("Enter the email you registered with and we\'ll send reset instructions.");
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
      return (
        !formState.fullName.trim() ||
        !formState.confirmPassword ||
        formState.password !== formState.confirmPassword ||
        !isPasswordLongEnough
      );
    }

    return false;
  }, [formState, isPasswordLongEnough, isSignUp, isSubmitting]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-emerald-100 via-white to-slate-100 px-4 py-16">
      <div className="grid w-full max-w-5xl overflow-hidden rounded-3xl bg-white shadow-2xl ring-1 ring-slate-100 md:grid-cols-[1.1fr_1fr]">
        <div className="relative hidden flex-col justify-between bg-emerald-600 px-10 py-12 text-emerald-50 md:flex">
          <div className="space-y-6">
            <span className="inline-flex items-center rounded-full bg-emerald-500/30 px-3 py-1 text-xs font-medium uppercase tracking-[0.3em] text-emerald-50">
              Nutrition Assistant
            </span>
            <h2 className="text-3xl font-semibold leading-tight text-white">
              Fuel your goals with mindful meal tracking
            </h2>
            <p className="text-sm text-emerald-100/90">
              Upload meal photos, monitor macros, and get gentle prompts that help you stay on track—without the guilt trip.
            </p>
          </div>
          <div className="rounded-2xl bg-white/10 p-6 backdrop-blur">
              <p className="text-sm text-emerald-100/90">
                “Having a calm place to track meals makes a huge difference. Nutrition Assistant keeps me motivated with small,
                doable nudges.”
              </p>
            <div className="mt-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20 text-sm font-semibold uppercase text-white">
                {getInitials(formState.fullName, formState.email || "A")}
              </div>
              <div className="text-sm">
                <p className="font-semibold text-white">{getFriendlyName(formState.fullName, formState.email || "A")}</p>
                <p className="text-emerald-100/80">Nutrition Enthusiast</p>
              </div>
            </div>
          </div>
        </div>

        <div className="px-6 py-10 sm:px-10">
          <div className="mb-8 space-y-2 text-center md:text-left">
            <h1 className="text-3xl font-semibold text-slate-900 sm:text-4xl">{welcomeHeading}</h1>
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
            {isSignUp ? (
              <div className="space-y-2">
                <label htmlFor="fullName" className="text-sm font-medium text-slate-700">
                  Full name
                </label>
                <input
                  id="fullName"
                  name="fullName"
                  type="text"
                  autoComplete="name"
                  placeholder="Taylor Nutrition"
                  value={formState.fullName}
                  onChange={handleChange}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50/60 px-4 py-3 text-sm text-slate-900 shadow-sm transition focus:border-emerald-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-200"
                />
              </div>
            ) : null}

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
                className="w-full rounded-2xl border border-slate-200 bg-slate-50/60 px-4 py-3 text-sm text-slate-900 shadow-sm transition focus:border-emerald-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-200"
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
                className="w-full rounded-2xl border border-slate-200 bg-slate-50/60 px-4 py-3 text-sm text-slate-900 shadow-sm transition focus:border-emerald-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-200"
              />
              {isSignUp ? (
                <p className="text-xs text-slate-500">Use at least 8 characters and include something memorable.</p>
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

            {isSignUp ? (
              <div className="space-y-2">
                <label htmlFor="confirmPassword" className="text-sm font-medium text-slate-700">
                  Confirm password
                </label>
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  placeholder="••••••••"
                  value={formState.confirmPassword}
                  onChange={handleChange}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50/60 px-4 py-3 text-sm text-slate-900 shadow-sm transition focus:border-emerald-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-200"
                />
              </div>
            ) : null}

            <button
              type="submit"
              disabled={submitDisabled}
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-500/30 transition hover:bg-emerald-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 disabled:cursor-not-allowed disabled:bg-emerald-400"
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

          <div className="mt-6 text-center text-sm text-slate-600 md:text-left">
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
    </div>
  );
}
