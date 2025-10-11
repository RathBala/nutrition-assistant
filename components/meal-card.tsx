import Image from "next/image";
import type { MealEntry } from "./types";

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(value);
}

export function MealCard({ meal }: { meal: MealEntry }) {
  return (
    <article className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md md:grid-cols-[160px_1fr]">
      <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-slate-100 md:aspect-[4/3]">
        <Image
          src={meal.imageUrl}
          alt={meal.name}
          fill
          className="object-cover"
          sizes="(min-width: 768px) 160px, 100vw"
          priority
        />
      </div>
      <div className="flex flex-col justify-between gap-4">
        <header className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-wide text-brand-dark">{meal.time}</p>
            <h3 className="text-xl font-semibold text-slate-900">{meal.name}</h3>
          </div>
          <div className="flex flex-wrap gap-2">
            {meal.tags.map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-brand-light px-3 py-1 text-xs font-semibold text-brand-dark"
              >
                {tag}
              </span>
            ))}
          </div>
        </header>
        {meal.notes ? <p className="text-sm text-slate-600">{meal.notes}</p> : null}
        <dl className="flex flex-wrap gap-4 text-sm font-medium text-slate-700">
          <div>
            <dt className="text-xs uppercase tracking-wide text-slate-500">Calories</dt>
            <dd className="text-lg font-semibold text-slate-900">{formatNumber(meal.macros.calories)}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-slate-500">Protein</dt>
            <dd>{formatNumber(meal.macros.protein)} g</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-slate-500">Carbs</dt>
            <dd>{formatNumber(meal.macros.carbs)} g</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-slate-500">Fat</dt>
            <dd>{formatNumber(meal.macros.fat)} g</dd>
          </div>
        </dl>
      </div>
    </article>
  );
}
