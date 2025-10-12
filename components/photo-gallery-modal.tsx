import { CheckCircle2, Images } from "lucide-react";
import Image from "next/image";

import type { GallerySelection } from "./types";

export type PhotoGalleryModalProps = {
  isOpen: boolean;
  images: GallerySelection[];
  selectedImageId: string | null;
  onSelectImage: (imageId: string) => void;
  onConfirm: (file: File, selection: GallerySelection) => void;
  onClose: () => void;
  onBrowseMore: () => void;
};

export function PhotoGalleryModal({
  isOpen,
  images,
  selectedImageId,
  onSelectImage,
  onConfirm,
  onClose,
  onBrowseMore,
}: PhotoGalleryModalProps) {
  if (!isOpen) {
    return null;
  }

  const selectedImage = images.find((image) => image.id === selectedImageId) ?? null;
  const hasImages = images.length > 0;

  return (
    <div className="fixed inset-0 z-50 flex bg-slate-900/70 backdrop-blur-sm transition-opacity">
      <div className="flex h-full w-full items-end justify-center sm:items-stretch sm:justify-end">
        <div
          className="w-full max-h-[85vh] overflow-hidden rounded-t-[32px] border border-slate-200/80 bg-white shadow-2xl animate-sheet-up sm:h-full sm:max-h-none sm:max-w-[420px] sm:rounded-none sm:border-y-0 sm:border-l sm:shadow-xl sm:animate-drawer-in"
          role="dialog"
          aria-modal="true"
        >
          <div className="flex flex-col gap-4 px-6 pb-4 pt-3 sm:pt-6">
            <span className="mx-auto h-1.5 w-16 rounded-full bg-slate-200 sm:hidden" aria-hidden="true" />
            <div className="flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={onClose}
                className="text-sm font-semibold text-slate-500 transition hover:text-slate-900"
              >
                Cancel
              </button>
              <p className="text-sm font-semibold text-slate-900">Recent photos</p>
              <button
                type="button"
                onClick={() => selectedImage && onConfirm(selectedImage.file, selectedImage)}
                disabled={!selectedImage}
                className="text-sm font-semibold text-brand-dark transition disabled:cursor-not-allowed disabled:text-slate-300"
              >
                Add
              </button>
            </div>
          </div>
          <div className="max-h-[70vh] overflow-y-auto px-6 pb-6 sm:max-h-none sm:pb-6">
            {hasImages ? (
              <div className="grid grid-cols-3 gap-3">
                {images.map((image) => {
                  const isSelected = selectedImageId === image.id;

                  return (
                    <button
                      key={image.id}
                      type="button"
                      onClick={() => onSelectImage(image.id)}
                      className={`relative h-28 overflow-hidden rounded-2xl border-2 transition focus:outline-none focus:ring-2 focus:ring-brand ${
                        isSelected ? "border-brand" : "border-transparent hover:border-slate-200"
                      }`}
                      aria-pressed={isSelected}
                    >
                      <Image
                        src={image.previewUrl}
                        alt={image.name}
                        fill
                        sizes="(max-width: 640px) 33vw, 120px"
                        className="object-cover"
                        unoptimized
                      />
                      <span className="absolute inset-x-0 bottom-0 bg-slate-900/60 px-2 py-1 text-[10px] font-medium text-white line-clamp-2">
                        {image.name}
                      </span>
                      {isSelected && (
                        <>
                          <span className="absolute inset-0 bg-slate-900/20" aria-hidden="true" />
                          <CheckCircle2 className="absolute right-2 top-2 h-5 w-5 text-white drop-shadow" aria-hidden="true" />
                        </>
                      )}
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 px-6 py-12 text-center">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-slate-400 shadow-sm">
                  <Images className="h-5 w-5" aria-hidden="true" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-slate-900">No photos yet</p>
                  <p className="text-sm text-slate-500">
                    Choose images from your camera roll or upload new ones to get started.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={onBrowseMore}
                  className="inline-flex items-center justify-center rounded-full bg-brand px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-dark focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                >
                  Browse photos
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
