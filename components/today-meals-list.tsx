"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  ImageIcon,
  Loader2,
  RefreshCw,
} from "lucide-react";

import type { MealDraftAnalysis, MealDraftStatus } from "@/lib/firestore/meal-drafts";

const timeFormatter = new Intl.DateTimeFormat("en-US", {
  hour: "numeric",
  minute: "2-digit",
});

const dateTimeAttributeFormatter = (value: Date) => value.toISOString();

const formatNumber = (value: number) =>
  new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(value);

const SkeletonCard = () => (
  <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
    <div className="flex animate-pulse gap-4">
      <div className="h-24 w-24 rounded-xl bg-slate-200 md:h-28 md:w-28" />
      <div className="flex-1 space-y-3 py-2">
        <div className="h-3.5 w-24 rounded bg-slate-200" />
        <div className="h-4 w-3/4 rounded bg-slate-200" />
        <div className="h-3 w-1/2 rounded bg-slate-200" />
        <div className="h-3 w-40 rounded bg-slate-200" />
      </div>
    </div>
  </article>
);

export type TodayMealEntry = {
  id: string;
  kind: "draft" | "log";
  status: MealDraftStatus | "logged";
  name: string;
  slotId: string | null;
  slotName: string;
  loggedAt: Date | null;
  imageUrl: string | null;
  sourceFileName: string | null;
  analysis: MealDraftAnalysis | null;
  isEstimated: boolean;
  draftId: string | null;
  autoPromoteAt: Date | null;
};

type TodayMealsListProps = {
  meals: TodayMealEntry[];
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  onLogMeal?: () => void;
  onRetryDraftAnalysis?: (draftId: string) => Promise<void>;
  onPromoteDraft?: (draftId: string, options: { isEstimated: boolean }) => Promise<void>;
};

type DraftCardProps = {
  meal: TodayMealEntry;
  onPromoteDraft?: (draftId: string, options: { isEstimated: boolean }) => Promise<void>;
  onRetryDraftAnalysis?: (draftId: string) => Promise<void>;
};

const DraftCountdown = ({ target }: { target: Date | null }) => {
  const [remaining, setRemaining] = useState<number | null>(() => {
    if (!target) {
      return null;
    }

    return Math.max(0, target.getTime() - Date.now());
  });

  useEffect(() => {
    if (!target) {
      setRemaining(null);
      return undefined;
    }

    const interval = window.setInterval(() => {
      setRemaining(Math.max(0, target.getTime() - Date.now()));
    }, 1000);

    return () => {
      window.clearInterval(interval);
    };
  }, [target]);

  if (!target || remaining === null) {
    return null;
  }

  const totalSeconds = Math.ceil(remaining / 1000);
  const minutes = Math.floor(totalSeconds / 60)
    .toString()
    .padStart(2, "0");
  const seconds = (totalSeconds % 60).toString().padStart(2, "0");

  return (
    <div className="flex items-center gap-1 text-xs font-semibold text-slate-500">
      <Clock className="h-3.5 w-3.5" aria-hidden />
      Auto-saving in {minutes}:{seconds}
    </div>
  );
};

const DraftAnalysisSummary = ({ analysis }: { analysis: MealDraftAnalysis | null }) => {
  if (!analysis) {
    return (
      <p className="text-sm text-slate-600">
        Nutrition analysis will appear here once processing completes.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-brand-dark">
          Estimated macros
        </p>
        <p className="text-sm text-slate-600">Based on AI recognition — editable later.</p>
      </div>
      <dl className="flex flex-wrap gap-4 text-sm font-medium text-slate-700">
        <div>
          <dt className="text-xs uppercase tracking-wide text-slate-500">Calories</dt>
          <dd className="text-lg font-semibold text-slate-900">{formatNumber(analysis.calories)}</dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wide text-slate-500">Protein</dt>
          <dd>{formatNumber(analysis.macros.protein)} g</dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wide text-slate-500">Carbs</dt>
          <dd>{formatNumber(analysis.macros.carbs)} g</dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wide text-slate-500">Fat</dt>
          <dd>{formatNumber(analysis.macros.fat)} g</dd>
        </div>
      </dl>
      {analysis.items.length > 0 ? (
        <div className="text-xs text-slate-500">
          <p className="font-semibold uppercase tracking-wide text-slate-500">Items detected</p>
          <ul className="mt-1 flex flex-wrap gap-2">
            {analysis.items.map((item) => (
              <li
                key={`${item.name}-${item.unit}`}
                className="rounded-full border border-slate-200 px-3 py-1 text-xs font-medium text-slate-600"
              >
                {item.name}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
};

const PendingDraftCard = ({ meal }: { meal: TodayMealEntry }) => (
  <article className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-[112px_1fr]">
    <div className="relative h-24 w-full overflow-hidden rounded-xl border border-slate-100 bg-slate-50 md:h-full">
      {meal.imageUrl ? (
        <Image
          src={meal.imageUrl}
          alt={meal.name}
          fill
          className="object-cover"
          sizes="(min-width: 768px) 112px, 100vw"
        />
      ) : (
        <div className="flex h-full items-center justify-center text-slate-400">
          <ImageIcon aria-hidden className="h-8 w-8" />
          <span className="sr-only">No photo available</span>
        </div>
      )}
    </div>
    <div className="flex flex-col justify-between gap-3">
      <header className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-brand-dark">
            {meal.slotName}
          </p>
          <h3 className="text-lg font-semibold text-slate-900">{meal.name}</h3>
        </div>
        <div className="flex items-center gap-2 text-sm font-medium text-brand">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          Pending analysis
        </div>
      </header>
      <p className="text-sm text-slate-600">We’re analyzing your meal in the background.</p>
      <footer className="text-xs font-medium text-slate-500">
        {meal.sourceFileName ? `Uploaded from ${meal.sourceFileName}` : "Photo uploads are optional."}
      </footer>
    </div>
  </article>
);

const ErrorDraftCard = ({ meal, onRetryDraftAnalysis }: DraftCardProps) => {
  const [retrying, setRetrying] = useState(false);
  const [retryError, setRetryError] = useState<string | null>(null);

  const handleRetry = async () => {
    if (!meal.draftId || !onRetryDraftAnalysis) {
      return;
    }

    setRetrying(true);
    setRetryError(null);

    try {
      await onRetryDraftAnalysis(meal.draftId);
    } catch (error) {
      console.error("Failed to retry draft analysis", error);
      setRetryError("We couldn’t restart the analysis. Please try again.");
    } finally {
      setRetrying(false);
    }
  };

  return (
    <article className="grid gap-4 rounded-2xl border border-red-200 bg-red-50 p-4 shadow-sm md:grid-cols-[112px_1fr]">
      <div className="relative h-24 w-full overflow-hidden rounded-xl border border-red-100 bg-white/70 md:h-full">
        {meal.imageUrl ? (
          <Image
            src={meal.imageUrl}
            alt={meal.name}
            fill
            className="object-cover"
            sizes="(min-width: 768px) 112px, 100vw"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-red-400">
            <ImageIcon aria-hidden className="h-8 w-8" />
            <span className="sr-only">No photo available</span>
          </div>
        )}
      </div>
      <div className="flex flex-col gap-3">
        <header className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-red-600">
              {meal.slotName}
            </p>
            <h3 className="text-lg font-semibold text-red-900">Couldn’t analyze {meal.name}</h3>
          </div>
          <div className="flex items-center gap-2 text-sm font-medium text-red-700">
            <AlertCircle className="h-4 w-4" aria-hidden />
            Action needed
          </div>
        </header>
        <p className="text-sm text-red-700">
          We couldn’t analyze your meal. You can retry the AI analysis or log the meal manually later.
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleRetry}
            disabled={retrying || !onRetryDraftAnalysis}
            className="inline-flex items-center gap-2 rounded-full bg-red-600 px-4 py-2 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshCw className="h-4 w-4" aria-hidden />
            {retrying ? "Retrying…" : "Retry analysis"}
          </button>
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-full border border-red-200 bg-white px-4 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-100"
            disabled
            aria-disabled
            title="Manual entry coming soon"
          >
            Enter manually
          </button>
        </div>
        {retryError ? <p className="text-xs text-red-700">{retryError}</p> : null}
      </div>
    </article>
  );
};

const ReadyDraftCard = ({ meal, onPromoteDraft }: DraftCardProps) => {
  const [promoting, setPromoting] = useState(false);
  const [promoteError, setPromoteError] = useState<string | null>(null);
  const [autoPromoteTriggered, setAutoPromoteTriggered] = useState(false);

  useEffect(() => {
    if (!meal.draftId || !onPromoteDraft || autoPromoteTriggered) {
      return undefined;
    }

    if (!meal.autoPromoteAt) {
      return undefined;
    }

    const now = Date.now();
    const target = meal.autoPromoteAt.getTime();
    const delay = Math.max(0, target - now);

    const timeout = window.setTimeout(async () => {
      setAutoPromoteTriggered(true);
      try {
        await onPromoteDraft(meal.draftId!, { isEstimated: true });
      } catch (error) {
        console.error("Auto-promotion failed", error);
        setPromoteError("We couldn’t auto-save this meal. Please review it manually.");
      }
    }, delay);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [autoPromoteTriggered, meal, onPromoteDraft]);

  const handlePromote = async () => {
    if (!meal.draftId || !onPromoteDraft) {
      return;
    }

    setPromoting(true);
    setPromoteError(null);

    try {
      await onPromoteDraft(meal.draftId, { isEstimated: false });
    } catch (error) {
      console.error("Failed to promote meal draft", error);
      setPromoteError("We couldn’t save this meal yet. Please try again.");
    } finally {
      setPromoting(false);
    }
  };

  return (
    <article className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-[112px_1fr]">
      <div className="relative h-24 w-full overflow-hidden rounded-xl border border-slate-100 bg-slate-50 md:h-full">
        {meal.imageUrl ? (
          <Image
            src={meal.imageUrl}
            alt={meal.name}
            fill
            className="object-cover"
            sizes="(min-width: 768px) 112px, 100vw"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-slate-400">
            <ImageIcon aria-hidden className="h-8 w-8" />
            <span className="sr-only">No photo available</span>
          </div>
        )}
      </div>
      <div className="flex flex-col gap-4">
        <header className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-brand-dark">
              {meal.slotName}
            </p>
            <h3 className="text-lg font-semibold text-slate-900">Review {meal.name}</h3>
          </div>
          <div className="flex items-center gap-2 text-sm font-semibold text-brand">
            <CheckCircle2 className="h-4 w-4" aria-hidden />
            Draft ready
          </div>
        </header>
        <DraftAnalysisSummary analysis={meal.analysis} />
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={handlePromote}
            disabled={promoting || !onPromoteDraft}
            className="inline-flex items-center gap-2 rounded-full bg-brand-dark px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand disabled:cursor-not-allowed disabled:opacity-60"
          >
            {promoting ? "Saving…" : "Save now"}
          </button>
          <p className="text-xs text-slate-500">
            Tweaking portions will come later — you can edit in the log after saving.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <DraftCountdown target={meal.autoPromoteAt} />
          {promoteError ? <p className="text-xs text-red-600">{promoteError}</p> : null}
        </div>
      </div>
    </article>
  );
};

const LoggedMealCard = ({ meal }: { meal: TodayMealEntry }) => (
  <article className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md md:grid-cols-[112px_1fr]">
    <div className="relative h-24 w-full overflow-hidden rounded-xl border border-slate-100 bg-slate-50 md:h-full">
      {meal.imageUrl ? (
        <Image
          src={meal.imageUrl}
          alt={meal.name}
          fill
          className="object-cover"
          sizes="(min-width: 768px) 112px, 100vw"
        />
      ) : (
        <div className="flex h-full items-center justify-center text-slate-400">
          <ImageIcon aria-hidden className="h-8 w-8" />
          <span className="sr-only">No photo available</span>
        </div>
      )}
    </div>
    <div className="flex flex-col justify-between gap-3">
      <header className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-brand-dark">
            {meal.slotName}
          </p>
          <h3 className="text-lg font-semibold text-slate-900">{meal.name}</h3>
        </div>
        {meal.loggedAt ? (
          <time
            dateTime={dateTimeAttributeFormatter(meal.loggedAt)}
            className="text-sm font-medium text-slate-500"
          >
            {timeFormatter.format(meal.loggedAt)}
          </time>
        ) : null}
      </header>
      {meal.analysis ? (
        <dl className="flex flex-wrap gap-4 text-sm font-medium text-slate-700">
          <div>
            <dt className="text-xs uppercase tracking-wide text-slate-500">Calories</dt>
            <dd className="text-lg font-semibold text-slate-900">{formatNumber(meal.analysis.calories)}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-slate-500">Protein</dt>
            <dd>{formatNumber(meal.analysis.macros.protein)} g</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-slate-500">Carbs</dt>
            <dd>{formatNumber(meal.analysis.macros.carbs)} g</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-slate-500">Fat</dt>
            <dd>{formatNumber(meal.analysis.macros.fat)} g</dd>
          </div>
        </dl>
      ) : (
        <p className="text-sm text-slate-600">Nutrition analysis will appear here soon.</p>
      )}
      <footer className="text-xs font-medium text-slate-500">
        {meal.isEstimated ? "Saved automatically — double-check portions later." : "Saved from your review."}
      </footer>
    </div>
  </article>
);

export const TodayMealsList = ({
  meals,
  loading,
  error,
  onRetry,
  onLogMeal,
  onRetryDraftAnalysis,
  onPromoteDraft,
}: TodayMealsListProps) => {
  if (loading) {
    return (
      <div className="space-y-5" aria-live="polite" aria-busy="true">
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>
    );
  }

  if (error) {
    return (
      <div
        role="alert"
        className="space-y-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
      >
        <div className="flex items-start gap-3">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <p>{error}</p>
        </div>
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex items-center gap-2 rounded-full bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700"
        >
          <RefreshCw className="h-4 w-4" aria-hidden />
          Try again
        </button>
      </div>
    );
  }

  if (meals.length === 0) {
    return (
      <div className="space-y-4 rounded-2xl border border-dashed border-slate-200 bg-white p-6 text-center shadow-sm">
        <h3 className="text-lg font-semibold text-slate-900">No meals logged yet today</h3>
        <p className="text-sm text-slate-600">
          Snap a quick photo or enter a description to start building your meal journal.
        </p>
        {onLogMeal ? (
          <button
            type="button"
            onClick={onLogMeal}
            className="inline-flex items-center justify-center rounded-full bg-brand-dark px-5 py-2 text-sm font-semibold text-white transition hover:bg-brand"
          >
            Log a meal
          </button>
        ) : null}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {meals.map((meal) => {
        if (meal.kind === "draft") {
          if (meal.status === "pending" || meal.status === "processing") {
            return <PendingDraftCard key={meal.id} meal={meal} />;
          }

          if (meal.status === "error") {
            return (
              <ErrorDraftCard
                key={meal.id}
                meal={meal}
                onRetryDraftAnalysis={onRetryDraftAnalysis}
              />
            );
          }

          return (
            <ReadyDraftCard
              key={meal.id}
              meal={meal}
              onPromoteDraft={onPromoteDraft}
            />
          );
        }

        return <LoggedMealCard key={meal.id} meal={meal} />;
      })}
    </div>
  );
};
