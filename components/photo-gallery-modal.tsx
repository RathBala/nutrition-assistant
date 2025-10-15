import { CheckCircle2, Images, Loader2 } from "lucide-react";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";

import type { MealSlot } from "@/lib/firestore/meal-slots";

import type { GallerySelection } from "./types";

const deriveMealNameFromFile = (fileName: string | null | undefined): string => {
  if (!fileName) {
    return "";
  }

  const withoutExtension = fileName.replace(/\.[^/.]+$/, "");
  const normalized = withoutExtension
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!normalized) {
    return "";
  }

  return normalized
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
};

export type MealDetailsSubmitPayload = {
  selection: GallerySelection | null;
  name: string;
  slotId: string;
  slotName: string;
};

export type PhotoGalleryModalProps = {
  isOpen: boolean;
  images: GallerySelection[];
  selectedImageId: string | null;
  onSelectImage: (imageId: string) => void;
  onSubmit: (payload: MealDetailsSubmitPayload) => void;
  onClose: () => void;
  onBrowseMore: () => void;
  onRemoveImage: () => void;
  slots: MealSlot[];
  isLoadingSlots: boolean;
};

export function PhotoGalleryModal({
  isOpen,
  images,
  selectedImageId,
  onSelectImage,
  onSubmit,
  onClose,
  onBrowseMore,
  onRemoveImage,
  slots,
  isLoadingSlots,
}: PhotoGalleryModalProps) {
  const [mealName, setMealName] = useState("");
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setMealName("");
      setSelectedSlotId(null);
    }
  }, [isOpen]);

  const selectedImage = useMemo(
    () => images.find((image) => image.id === selectedImageId) ?? null,
    [images, selectedImageId],
  );

  useEffect(() => {
    if (!selectedImage) {
      return;
    }

    const derived = deriveMealNameFromFile(selectedImage.name);

    setMealName((current) => {
      if (current.trim().length > 0) {
        return current;
      }

      return derived || selectedImage.name || "";
    });
  }, [selectedImage]);

  useEffect(() => {
    if (selectedSlotId) {
      return;
    }

    if (slots.length > 0) {
      setSelectedSlotId(slots[0].id);
    }
  }, [selectedSlotId, slots]);

  const hasMultipleImages = images.length > 1;

  useEffect(() => {
    if (typeof document === "undefined") {
      return undefined;
    }

    if (!isOpen) {
      return undefined;
    }

    const { body, documentElement } = document;
    const previousBodyOverflow = body.style.overflow;
    const previousHtmlOverflow = documentElement.style.overflow;

    body.style.overflow = "hidden";
    documentElement.style.overflow = "hidden";

    return () => {
      body.style.overflow = previousBodyOverflow;
      documentElement.style.overflow = previousHtmlOverflow;
    };
  }, [isOpen]);

  const handleSubmit = () => {
    const trimmedName = mealName.trim();

    if (!trimmedName) {
      return;
    }

    const slot = slots.find((candidate) => candidate.id === selectedSlotId);

    if (!slot) {
      return;
    }

    onSubmit({
      selection: selectedImage ?? null,
      name: trimmedName,
      slotId: slot.id,
      slotName: slot.name,
    });
  };

  const canSubmit = Boolean(
    mealName.trim().length > 0 && selectedSlotId && !isLoadingSlots,
  );

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex bg-slate-900/70 backdrop-blur-sm transition-opacity">
      <div className="flex h-full w-full items-end justify-center sm:items-stretch sm:justify-end">
        <div
          className="mx-5 my-6 max-h-[92vh] overflow-hidden rounded-t-[32px] border border-slate-200/80 bg-white shadow-2xl animate-sheet-up sm:mx-0 sm:my-0 sm:h-full sm:max-h-none sm:max-w-[420px] sm:rounded-none sm:border-y-0 sm:border-l sm:shadow-xl sm:animate-drawer-in"
          role="dialog"
          aria-modal="true"
          aria-labelledby="add-meal-details-title"
        >
          <div className="flex flex-col gap-4 px-4 pb-4 pt-3 sm:px-6 sm:pt-6">
            <span className="mx-auto h-1.5 w-12 rounded-full bg-slate-200 sm:hidden" aria-hidden="true" />
            <div className="flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={onClose}
                className="text-sm font-semibold text-slate-500 transition hover:text-slate-900"
              >
                Cancel
              </button>
              <p id="add-meal-details-title" className="text-sm font-semibold text-slate-900">
                Add meal details
              </p>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={!canSubmit}
                className="rounded-full bg-brand px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-dark focus:outline-none focus-visible:ring-2 focus-visible:ring-brand disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
              >
                Save meal
              </button>
            </div>
          </div>
          <div className="max-h-[80vh] overflow-y-auto overscroll-y-contain px-4 pb-6 sm:px-6 sm:pb-8">
            <div className="space-y-6">
              <div className="space-y-3">
                <button
                  type="button"
                  onClick={onBrowseMore}
                  className="group relative block w-full overflow-hidden rounded-3xl border border-dashed border-slate-200 bg-slate-50 text-left transition focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                  aria-label={selectedImage ? "Change meal photo" : "Add a meal photo"}
                >
                  <div className="relative aspect-[4/3] w-full">
                    {selectedImage ? (
                      <>
                        <Image
                          src={selectedImage.previewUrl}
                          alt={selectedImage.name}
                          fill
                          sizes="(max-width: 640px) 90vw, 360px"
                          className="object-cover"
                          unoptimized
                        />
                        <span
                          className="pointer-events-none absolute inset-0 bg-slate-900/0 transition group-hover:bg-slate-900/10"
                          aria-hidden="true"
                        />
                        <span className="pointer-events-none absolute bottom-3 left-3 rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-slate-900 shadow-sm">
                          Tap to change photo
                        </span>
                      </>
                    ) : (
                      <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
                        <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-slate-400 shadow-sm">
                          <Images className="h-5 w-5" aria-hidden="true" />
                        </span>
                        <div className="space-y-1">
                          <p className="text-sm font-semibold text-slate-900">Add a meal photo</p>
                          <p className="text-xs text-slate-500">Tap to upload (optional)</p>
                        </div>
                      </div>
                    )}
                  </div>
                </button>

                {selectedImage ? (
                  <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white/90 px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
                    <p className="truncate text-xs font-medium text-slate-600">{selectedImage.name}</p>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={onBrowseMore}
                        className="text-xs font-semibold text-brand-dark transition hover:text-brand"
                      >
                        Change
                      </button>
                      <span className="h-3 w-px bg-slate-200" aria-hidden="true" />
                      <button
                        type="button"
                        onClick={onRemoveImage}
                        className="text-xs font-semibold text-slate-500 transition hover:text-slate-700"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="text-center text-xs text-slate-500">Meal photos are optional. Tap above to add one.</p>
                )}
              </div>

              <div className="space-y-4">
                <label className="block space-y-1" htmlFor="meal-name-input">
                  <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Meal name</span>
                  <input
                    id="meal-name-input"
                    value={mealName}
                    onChange={(event) => {
                      setMealName(event.target.value);
                    }}
                    placeholder="Add a short description"
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand"
                    autoComplete="off"
                    spellCheck
                  />
                </label>
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Meal slot</p>
                  {isLoadingSlots ? (
                    <div className="flex items-center gap-2 rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-500">
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                      Loading your slots…
                    </div>
                  ) : slots.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {slots.map((slot) => {
                        const isSelected = selectedSlotId === slot.id;

                        return (
                          <button
                            key={slot.id}
                            type="button"
                            onClick={() => setSelectedSlotId(slot.id)}
                            className={`rounded-full px-4 py-2 text-sm font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-brand ${
                              isSelected
                                ? "bg-brand text-white shadow-sm hover:bg-brand-dark"
                                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                            }`}
                            aria-pressed={isSelected}
                          >
                            {slot.name}
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-500">
                      You don’t have any meal slots yet. Add some in settings to organize your meals.
                    </div>
                  )}
                </div>
              </div>

              {hasMultipleImages ? (
                <div className="space-y-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Or pick a different photo</p>
                  <div className="grid grid-cols-4 gap-2 sm:grid-cols-5">
                    {images.map((image) => {
                      const isSelected = selectedImageId === image.id;

                      return (
                        <button
                          key={image.id}
                          type="button"
                          onClick={() => onSelectImage(image.id)}
                          className={`relative h-20 overflow-hidden rounded-2xl border-2 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-brand ${
                            isSelected ? "border-brand" : "border-transparent hover:border-slate-200"
                          }`}
                          aria-pressed={isSelected}
                        >
                          <Image
                            src={image.previewUrl}
                            alt={image.name}
                            fill
                            sizes="(max-width: 640px) 25vw, 80px"
                            className="object-cover"
                            unoptimized
                          />
                          <span className="absolute inset-x-0 bottom-0 bg-slate-900/60 px-1.5 py-1 text-[10px] font-medium text-white line-clamp-2">
                            {image.name}
                          </span>
                          {isSelected && (
                            <>
                              <span className="absolute inset-0 bg-slate-900/10" aria-hidden="true" />
                              <CheckCircle2 className="absolute right-1.5 top-1.5 h-4 w-4 text-white drop-shadow" aria-hidden="true" />
                            </>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
