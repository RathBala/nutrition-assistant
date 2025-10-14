import { useEffect, useMemo, useState, type FormEvent } from "react";
import Image from "next/image";
import { Loader2 } from "lucide-react";

import type { MealSlot } from "@/lib/firestore/meal-slots";

export type LogMealDetailsModalProps = {
  isOpen: boolean;
  previewUrl: string | null;
  fileName: string | null;
  initialName?: string | null;
  slots: MealSlot[];
  isLoadingSlots: boolean;
  isSaving: boolean;
  error?: string | null;
  onCancel: () => void;
  onConfirm: (details: { name: string; slotId: string; slotName: string }) => void;
};

export function LogMealDetailsModal({
  isOpen,
  previewUrl,
  fileName,
  initialName,
  slots,
  isLoadingSlots,
  isSaving,
  error,
  onCancel,
  onConfirm,
}: LogMealDetailsModalProps) {
  const [name, setName] = useState("");
  const [selectedSlotId, setSelectedSlotId] = useState<string>("");

  const hasPreview = Boolean(previewUrl);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setName(initialName?.trim() ?? "");
  }, [initialName, isOpen]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setSelectedSlotId((current) => {
      if (current && slots.some((slot) => slot.id === current)) {
        return current;
      }

      return slots[0]?.id ?? "";
    });
  }, [isOpen, slots]);

  const selectedSlot = useMemo(
    () => slots.find((slot) => slot.id === selectedSlotId) ?? null,
    [selectedSlotId, slots],
  );

  if (!isOpen) {
    return null;
  }

  const isNameValid = name.trim().length > 0;
  const isSlotValid = Boolean(selectedSlot);
  const canSubmit = isNameValid && isSlotValid && !isSaving;

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!canSubmit || !selectedSlot) {
      return;
    }

    onConfirm({
      name: name.trim(),
      slotId: selectedSlot.id,
      slotName: selectedSlot.name,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex bg-slate-900/70 backdrop-blur-sm transition-opacity">
      <div className="flex h-full w-full items-end justify-center sm:items-stretch sm:justify-end">
        <div
          className="w-full max-h-[90vh] overflow-hidden rounded-t-[32px] border border-slate-200/80 bg-white shadow-2xl animate-sheet-up sm:h-full sm:max-h-none sm:max-w-[420px] sm:rounded-none sm:border-y-0 sm:border-l sm:shadow-xl sm:animate-drawer-in"
          role="dialog"
          aria-modal="true"
          aria-labelledby="log-meal-dialog-title"
        >
          <form className="flex h-full flex-col" onSubmit={handleSubmit}>
            <div className="flex items-center justify-between gap-3 px-6 pb-3 pt-4 sm:pt-6">
              <button
                type="button"
                onClick={onCancel}
                className="text-sm font-semibold text-slate-500 transition hover:text-slate-900 disabled:cursor-not-allowed disabled:text-slate-300"
                disabled={isSaving}
              >
                Cancel
              </button>
              <p id="log-meal-dialog-title" className="text-sm font-semibold text-slate-900">
                Add meal details
              </p>
              <button
                type="submit"
                className="inline-flex items-center justify-center rounded-full bg-brand px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-dark focus:outline-none focus-visible:ring-2 focus-visible:ring-brand disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500"
                disabled={!canSubmit || isSaving}
              >
                {isSaving ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                    Saving…
                  </span>
                ) : (
                  "Save meal"
                )}
              </button>
            </div>

            <div className="flex-1 space-y-6 overflow-y-auto px-6 pb-8">
              {hasPreview ? (
                <div className="overflow-hidden rounded-3xl border border-slate-200">
                  <Image
                    src={previewUrl as string}
                    alt={fileName ?? "Meal photo preview"}
                    width={720}
                    height={720}
                    className="h-60 w-full object-cover"
                    unoptimized
                  />
                </div>
              ) : null}

              <div className="space-y-2">
                <label htmlFor="meal-name" className="block text-sm font-semibold text-slate-900">
                  Meal name
                </label>
                <input
                  id="meal-name"
                  type="text"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="e.g. Veggie omelette"
                  autoFocus
                  required
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/50"
                />
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-slate-900">Meal slot</p>
                  {isLoadingSlots ? (
                    <span className="text-xs text-slate-500">Loading slots…</span>
                  ) : null}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {slots.map((slot) => {
                    const isSelected = slot.id === selectedSlotId;

                    return (
                      <label
                        key={slot.id}
                        className={`flex cursor-pointer flex-col rounded-2xl border px-4 py-3 text-sm font-medium transition focus-within:outline-none focus-within:ring-2 focus-within:ring-brand ${
                          isSelected ? "border-brand bg-brand-light text-brand-dark" : "border-slate-200 text-slate-600 hover:border-brand/60"
                        }`}
                      >
                        <input
                          type="radio"
                          name="meal-slot"
                          value={slot.id}
                          checked={isSelected}
                          onChange={() => setSelectedSlotId(slot.id)}
                          className="sr-only"
                          disabled={isSaving}
                        />
                        {slot.name}
                      </label>
                    );
                  })}
                  {slots.length === 0 ? (
                    <p className="col-span-2 rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500">
                      Add a meal slot from settings to continue.
                    </p>
                  ) : null}
                </div>
              </div>

              {error ? (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              ) : null}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
