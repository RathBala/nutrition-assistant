"use client";

import { AuthLoadingScreen } from "@/components/auth/auth-loading-screen";
import { AuthScreen } from "@/components/auth/auth-screen";
import { AppShell } from "@/components/app-shell";
import { useAuth } from "@/components/auth-provider";
import { MealSlotsForm } from "@/components/settings/meal-slots-form";
import { useSignOutAction } from "@/hooks/use-sign-out-action";

export default function SettingsPage() {
  const { user, loading: authLoading, signOut: signOutUser } = useAuth();
  const {
    handleSignOut,
    pending: signOutPending,
    error: signOutError,
    dismissError: dismissSignOutError,
  } = useSignOutAction(signOutUser);

  if (authLoading) {
    return <AuthLoadingScreen />;
  }

  if (!user) {
    return <AuthScreen />;
  }

  return (
    <AppShell user={user} onSignOut={handleSignOut} signOutPending={signOutPending}>
      {signOutError ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert" aria-live="assertive">
          <div className="flex items-start justify-between gap-4">
            <p>{signOutError}</p>
            <button
              type="button"
              onClick={dismissSignOutError}
              className="text-xs font-semibold text-red-700/80 transition hover:text-red-800"
            >
              Dismiss
            </button>
          </div>
        </div>
      ) : null}

      <section className="space-y-8">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">Settings</p>
          <h1 className="text-3xl font-semibold text-slate-900 sm:text-4xl">Meal slots</h1>
          <p className="text-sm text-slate-600 sm:max-w-2xl">
            Manage the list of meal slots that appear when you log meals. Add, rename, or remove entries to match your daily routine.
          </p>
        </div>

        <MealSlotsForm userId={user.uid} />
      </section>
    </AppShell>
  );
}
