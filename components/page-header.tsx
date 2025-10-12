export type PageHeaderProps = {
  eyebrow: string;
  title: string;
  description: string;
  onLogMeal: () => void;
};

export function PageHeader({ eyebrow, title, description, onLogMeal }: PageHeaderProps) {
  return (
    <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-brand-dark">{eyebrow}</p>
        <h1 className="mt-2 text-3xl font-semibold text-slate-900 sm:text-4xl">{title}</h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-600">{description}</p>
      </div>
      <button
        type="button"
        onClick={onLogMeal}
        className="inline-flex items-center justify-center gap-2 rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-700"
      >
        Log a new meal
      </button>
    </header>
  );
}
