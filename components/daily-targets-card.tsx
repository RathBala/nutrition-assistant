export type DailyTarget = {
  label: string;
  completed: boolean;
};

export type DailyTargetsCardProps = {
  targets: DailyTarget[];
};

export function DailyTargetsCard({ targets }: DailyTargetsCardProps) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-xl font-semibold text-slate-900">Daily targets</h2>
      <ul className="mt-4 space-y-3 text-sm text-slate-600">
        {targets.map(({ label, completed }) => (
          <li key={label}>
            {completed ? "✅" : "⬜"} {label}
          </li>
        ))}
      </ul>
      <button
        type="button"
        className="mt-6 w-full rounded-full border border-brand bg-white px-4 py-2 text-sm font-semibold text-brand-dark transition hover:bg-brand-light"
      >
        Adjust targets
      </button>
    </section>
  );
}
