import { AlertTriangle, CheckCircle2, Loader2 } from "lucide-react";

import type { MealImageUploadResult } from "@/lib/firebase/storage";

export type UploadFeedbackProps = {
  isUploading: boolean;
  showSuccess: boolean;
  progress?: number | null;
  error?: string | null;
  onRetry?: () => void;
  result?: MealImageUploadResult | null;
};

export function UploadFeedback({
  isUploading,
  showSuccess,
  progress,
  error,
  onRetry,
  result,
}: UploadFeedbackProps) {
  if (!isUploading && !showSuccess && !error) {
    return null;
  }

  const percent = typeof progress === "number" ? Math.round(progress * 100) : null;

  return (
    <div className="space-y-2">
      {isUploading && (
        <div className="flex items-center gap-3 rounded-2xl border border-brand bg-brand-light px-4 py-3 text-sm font-medium text-brand-dark shadow-sm">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          <span>
            Uploading your meal photo…
            {typeof percent === "number" ? ` ${percent}%` : ""}
          </span>
        </div>
      )}

      {error && !isUploading && (
        <div className="flex flex-col gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-1 items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0" aria-hidden="true" />
            <div className="space-y-1">
              <p className="font-semibold">We couldn’t upload your meal photo.</p>
              <p className="text-xs text-red-600/90 sm:text-sm">{error}</p>
            </div>
          </div>
          {onRetry ? (
            <button
              type="button"
              onClick={onRetry}
              className="self-start rounded-full bg-white px-4 py-2 text-xs font-semibold text-red-700 shadow-sm transition hover:bg-red-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-600"
            >
              Try again
            </button>
          ) : null}
        </div>
      )}

      {showSuccess && !isUploading && (
        <div className="flex flex-col gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
            <span className="font-medium">Meal photo uploaded! We’ll analyze it shortly.</span>
          </div>
          {result ? (
            <a
              href={result.downloadURL}
              target="_blank"
              rel="noopener noreferrer"
              className="self-start rounded-full bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-emerald-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700"
            >
              Open image
            </a>
          ) : null}
        </div>
      )}
    </div>
  );
}
