import { CheckCircle2, Loader2 } from "lucide-react";

export type UploadFeedbackProps = {
  isUploading: boolean;
  showSuccess: boolean;
};

export function UploadFeedback({ isUploading, showSuccess }: UploadFeedbackProps) {
  if (!isUploading && !showSuccess) {
    return null;
  }

  return (
    <div className="space-y-2">
      {isUploading && (
        <div className="flex items-center gap-3 rounded-2xl border border-brand bg-brand-light px-4 py-3 text-sm font-medium text-brand-dark shadow-sm">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          Uploading your meal photo…
        </div>
      )}
      {showSuccess && !isUploading && (
        <div className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700 shadow-sm">
          <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
          Meal photo uploaded! We’ll analyze it shortly.
        </div>
      )}
    </div>
  );
}
