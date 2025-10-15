"use client";

export function AuthLoadingScreen() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-6">
      <div className="flex flex-col items-center gap-4 rounded-3xl border border-slate-200 bg-white px-12 py-10 text-center shadow-xl">
        <span className="h-12 w-12 animate-spin rounded-full border-[3px] border-emerald-400 border-t-transparent" aria-hidden="true" />
        <div>
          <p className="text-base font-semibold text-slate-900">Just a moment…</p>
          <p className="mt-1 text-sm text-slate-600">We’re verifying your account details.</p>
        </div>
      </div>
    </div>
  );
}
