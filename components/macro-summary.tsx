import type { MacroBreakdown } from "./types";

const macroLabels: { key: keyof MacroBreakdown; label: string; unit?: string }[] = [
  { key: "calories", label: "Calories" },
  { key: "protein", label: "Protein", unit: "g" },
  { key: "carbs", label: "Carbs", unit: "g" },
  { key: "fat", label: "Fat", unit: "g" },
];

function formatMacro(value: number) {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(value);
}

export function MacroSummary({
  macros,
  goal,
}: {
  macros: MacroBreakdown;
  goal: Partial<MacroBreakdown>;
}) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-baseline sm:justify-between">
        <h2 className="text-2xl font-semibold text-slate-900">Today’s Intake</h2>
        <p className="text-sm text-slate-500">Updated just now</p>
      </div>
      <div className="mt-6 grid gap-4 sm:grid-cols-4">
        {macroLabels.map(({ key, label, unit }) => {
          const value = macros[key];
          const goalValue = goal[key];
          const percent = goalValue ? Math.min(Math.round((value / goalValue) * 100), 200) : undefined;

          return (
            <div key={key} className="space-y-3 rounded-2xl bg-brand-light/60 p-4">
              <div>
                <p className="text-sm font-medium uppercase tracking-wide text-brand-dark">{label}</p>
                <p className="text-3xl font-semibold text-slate-900">
                  {formatMacro(value)} {unit}
                </p>
              </div>
              {goalValue ? (
                <div className="space-y-1">
                  <div className="h-2 overflow-hidden rounded-full bg-white/70">
                    <div
                      className="h-full rounded-full bg-brand"
                      style={{ width: `${percent ?? 0}%` }}
                      aria-hidden="true"
                    />
                  </div>
                  <p className="text-xs text-brand-dark">
                    {formatMacro(value)} / {formatMacro(goalValue)} {unit ?? ""}
                  </p>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </section>
  );
}
