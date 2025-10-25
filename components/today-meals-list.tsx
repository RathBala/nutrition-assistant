"use client";
import Image from "next/image";
import {
  AlertCircle,
  ImageIcon,
  RefreshCw,
} from "lucide-react";

import type { MealAnalysis } from "@/lib/types/meal-analysis";

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
  name: string;
  slotId: string | null;
  slotName: string;
  loggedAt: Date | null;
  imageUrl: string | null;
  sourceFileName: string | null;
  analysis: MealAnalysis | null;
  isEstimated: boolean;
};

type TodayMealsListProps = {
  meals: TodayMealEntry[];
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  onLogMeal?: () => void;
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
    </div>
  </article>
);

export const TodayMealsList = ({
  meals,
  loading,
  error,
  onRetry,
  onLogMeal,
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
      {meals.map((meal) => (
        <LoggedMealCard key={meal.id} meal={meal} />
      ))}
    </div>
  );
};
