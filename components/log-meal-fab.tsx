import { Plus } from "lucide-react";

type LogMealFabProps = {
  onClick: () => void;
  label?: string;
};

export function LogMealFab({ onClick, label = "Log a new meal" }: LogMealFabProps) {
  return (
    <div className="pointer-events-none fixed bottom-6 right-6 z-40 sm:bottom-8 sm:right-8">
      <button
        type="button"
        onClick={onClick}
        className="pointer-events-auto flex items-center gap-2 rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-slate-900/25 transition hover:bg-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
        aria-label={label}
      >
        <Plus aria-hidden="true" className="h-5 w-5" />
        <span className="hidden sm:inline">{label}</span>
      </button>
    </div>
  );
}
