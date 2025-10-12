import { CameraIcon, UploadIcon } from "lucide-react";

type QuickAddProps = {
  onCapture?: () => void;
  onUpload?: () => void;
};

export function QuickAdd({ onCapture, onUpload }: QuickAddProps) {
  const actions = [
    {
      icon: CameraIcon,
      label: "Capture meal",
      description: "Snap a quick photo to analyze later.",
      handler: onCapture ?? onUpload,
    },
    {
      icon: UploadIcon,
      label: "Upload from gallery",
      description: "Add a saved photo from your device.",
      handler: onUpload,
    },
  ];

  return (
    <section className="rounded-3xl border border-dashed border-slate-300 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-slate-900">Add today’s meals</h2>
          <p className="mt-2 max-w-lg text-sm text-slate-600">
            Start with a photo and fill in any details later. We’ll extract calories and macros instantly.
          </p>
        </div>
        <div className="flex flex-1 flex-col gap-4 sm:flex-row sm:justify-end">
          {actions.map(({ icon: Icon, label, description, handler }) => (
            <button
              key={label}
              type="button"
              onClick={handler ? () => handler() : undefined}
              disabled={!handler}
              className="flex flex-1 min-w-[180px] items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-left transition hover:border-brand hover:bg-brand-light disabled:cursor-not-allowed disabled:opacity-70"
            >
              <span className="mt-0.5 rounded-full bg-brand-light p-2 text-brand-dark">
                <Icon className="h-5 w-5" aria-hidden="true" />
              </span>
              <span>
                <span className="block text-sm font-semibold text-slate-900">{label}</span>
                <span className="mt-1 block text-xs text-slate-500">{description}</span>
              </span>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
