import { CheckCircle2 } from "lucide-react";
import Image from "next/image";

import type { GalleryImage } from "./types";

export type PhotoGalleryModalProps = {
  isOpen: boolean;
  images: GalleryImage[];
  selectedImage: string | null;
  onSelectImage: (image: string) => void;
  onConfirm: () => void;
  onClose: () => void;
};

export function PhotoGalleryModal({
  isOpen,
  images,
  selectedImage,
  onSelectImage,
  onConfirm,
  onClose,
}: PhotoGalleryModalProps) {
  if (!isOpen) {
    return null;
  }

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
                onClick={onConfirm}
                disabled={!selectedImage}
                className="text-sm font-semibold text-brand-dark transition disabled:cursor-not-allowed disabled:text-slate-300"
              >
                Add
              </button>
            </div>
          </div>
          <div className="max-h-[70vh] overflow-y-auto px-6 pb-6 sm:max-h-none sm:pb-6">
            <div className="grid grid-cols-3 gap-3">
              {images.map((image) => {
                const isSelected = selectedImage === image.src;

                return (
                  <button
                    key={image.src}
                    type="button"
                    onClick={() => onSelectImage(image.src)}
                    className={`relative h-28 overflow-hidden rounded-2xl border-2 transition focus:outline-none focus:ring-2 focus:ring-brand ${
                      isSelected ? "border-brand" : "border-transparent hover:border-slate-200"
                    }`}
                    aria-pressed={isSelected}
                  >
                    <Image src={image.src} alt={image.alt} fill sizes="(max-width: 640px) 33vw, 120px" className="object-cover" />
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
          </div>
        </div>
      </div>
    </div>
  );
}
