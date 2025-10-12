"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ChangeEvent } from "react";

import { AiRecap } from "@/components/ai-recap";
import { DailyTargetsCard } from "@/components/daily-targets-card";
import type { DailyTarget } from "@/components/daily-targets-card";
import { MacroSummary } from "@/components/macro-summary";
import { MealCard } from "@/components/meal-card";
import { PageHeader } from "@/components/page-header";
import { PhotoGalleryModal } from "@/components/photo-gallery-modal";
import { QuickAdd } from "@/components/quick-add";
import { UploadFeedback } from "@/components/upload-feedback";
import type { GallerySelection, MacroBreakdown, MealEntry } from "@/components/types";

const todayMacros: MacroBreakdown = {
  calories: 1480,
  protein: 92,
  carbs: 165,
  fat: 42,
};

const macroGoals: Partial<MacroBreakdown> = {
  calories: 2100,
  protein: 130,
  carbs: 240,
  fat: 60,
};

const meals: MealEntry[] = [
  {
    id: "breakfast",
    name: "Greek Yogurt Parfait",
    time: "8:05 AM",
    notes: "High-protein yogurt topped with berries, granola, and a drizzle of honey.",
    imageUrl: "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=800&q=80",
    macros: {
      calories: 420,
      protein: 32,
      carbs: 48,
      fat: 12,
    },
    tags: ["Breakfast", "High protein"],
  },
  {
    id: "lunch",
    name: "Salmon Poke Bowl",
    time: "12:42 PM",
    notes: "Wild salmon, sushi rice, cucumber, edamame, and sesame ginger dressing.",
    imageUrl: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=800&q=80",
    macros: {
      calories: 560,
      protein: 38,
      carbs: 62,
      fat: 18,
    },
    tags: ["Lunch", "Omega-3"],
  },
  {
    id: "snack",
    name: "Matcha Protein Shake",
    time: "3:15 PM",
    notes: "Pea protein, almond milk, banana, and matcha powder blended with ice.",
    imageUrl: "https://images.unsplash.com/photo-1484980859177-5ac1249fda6f?auto=format&fit=crop&w=800&q=80",
    macros: {
      calories: 240,
      protein: 22,
      carbs: 32,
      fat: 6,
    },
    tags: ["Snack", "On the go"],
  },
  {
    id: "dinner",
    name: "Lemon Herb Chicken",
    time: "7:02 PM",
    notes: "Grilled chicken breast, roasted vegetables, and quinoa.",
    imageUrl: "https://images.unsplash.com/photo-1466978913421-dad2ebd01d17?auto=format&fit=crop&w=800&q=80",
    macros: {
      calories: 260,
      protein: 30,
      carbs: 23,
      fat: 6,
    },
    tags: ["Dinner", "Low carb"],
  },
];

const aiMessage =
  "Nice balance today! You're 620 calories under your goal, so there's room for a nourishing dessert or a larger dinner. Consider adding leafy greens to boost fiber and keep hydration up this evening.";

const dailyTargets: DailyTarget[] = [
  {
    label: "Stay within 2100 kcal goal",
    completed: true,
  },
  {
    label: "Hit 90g+ protein",
    completed: true,
  },
  {
    label: "Add 2 cups of vegetables at dinner",
    completed: false,
  },
];

export default function Home() {
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  const [selectedImageId, setSelectedImageId] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [gallerySelections, setGallerySelections] = useState<GallerySelection[]>([]);
  const uploadTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const lastSelectedFileRef = useRef<File | null>(null);

  const revokePreviews = useCallback((items: GallerySelection[]) => {
    items.forEach((item) => {
      URL.revokeObjectURL(item.previewUrl);
    });
  }, []);

  useEffect(() => {
    if (!showSuccess) {
      return;
    }

    const timeout = setTimeout(() => setShowSuccess(false), 4000);

    return () => clearTimeout(timeout);
  }, [showSuccess]);

  useEffect(() => {
    return () => {
      if (uploadTimeoutRef.current) {
        clearTimeout(uploadTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    return () => {
      revokePreviews(gallerySelections);
    };
  }, [gallerySelections, revokePreviews]);

  useEffect(() => {
    if (gallerySelections.length === 0) {
      setSelectedImageId(null);
      return;
    }

    const hasSelected = gallerySelections.some(
      (item) => item.id === selectedImageId,
    );

    if (!hasSelected) {
      setSelectedImageId(gallerySelections[0].id);
    }
  }, [gallerySelections, selectedImageId]);

  const openFilePicker = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleOpenGallery = () => {
    setIsGalleryOpen(true);
    if (gallerySelections.length === 0) {
      setSelectedImageId(null);
    }
    openFilePicker();
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;

    if (!files) {
      return;
    }

    const nextSelections = Array.from(files).map((file, index) => ({
      id: `${file.name}-${file.lastModified}-${index}`,
      file,
      previewUrl: URL.createObjectURL(file),
      name: file.name,
    }));

    setGallerySelections((previous) => {
      revokePreviews(previous);
      return nextSelections;
    });

    setSelectedImageId(nextSelections[0]?.id ?? null);
    setIsGalleryOpen(true);

    // Reset the input so the same file can be selected again if needed.
    event.target.value = "";
  };

  const handleSelectImage = (imageId: string) => {
    setSelectedImageId(imageId);
  };

  const handleConfirmUpload = (file: File, selection: GallerySelection) => {
    if (!file || !selection) {
      return;
    }

    setIsGalleryOpen(false);
    setIsUploading(true);
    setShowSuccess(false);

    lastSelectedFileRef.current = file;

    if (uploadTimeoutRef.current) {
      clearTimeout(uploadTimeoutRef.current);
    }

    uploadTimeoutRef.current = setTimeout(() => {
      setIsUploading(false);
      setShowSuccess(true);
      uploadTimeoutRef.current = null;
    }, 1200);

    setSelectedImageId(null);
    setGallerySelections((previous) => {
      revokePreviews(previous);
      return [];
    });
  };

  const handleCloseGallery = () => {
    setIsGalleryOpen(false);
    setSelectedImageId(null);
    setGallerySelections((previous) => {
      revokePreviews(previous);
      return [];
    });
  };

  return (
    <>
      <header className="border-b border-slate-200 bg-white/80 py-4 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-white/60">
        <div className="mx-auto flex max-w-6xl items-center px-4 sm:px-6 lg:px-8">
          <a
            href="/"
            className="text-lg font-semibold tracking-[0.4em] text-slate-900"
            style={{ fontVariant: "small-caps" }}
            aria-label="Thrive home"
          >
            thrive
          </a>
        </div>
      </header>

      <main className="mx-auto flex max-w-6xl flex-col gap-8 px-4 pb-16 pt-10 sm:px-6 lg:px-8">
        <UploadFeedback isUploading={isUploading} showSuccess={showSuccess} />

        <PageHeader
          eyebrow="Nutrition Assistant"
          title="Your meals for Tuesday, June 4"
        description="Upload photos of what you eat and get instant calorie estimates, macro breakdowns, and gentle coaching from your AI companion."
        onLogMeal={handleOpenGallery}
      />

      <QuickAdd />
      <MacroSummary macros={todayMacros} goal={macroGoals} />

      <section className="grid gap-6 lg:grid-cols-[1fr_minmax(260px,320px)]">
        <div className="space-y-5">
          {meals.map((meal) => (
            <MealCard key={meal.id} meal={meal} />
          ))}
        </div>
        <div className="space-y-5">
          <AiRecap message={aiMessage} />
          <DailyTargetsCard targets={dailyTargets} />
        </div>
      </section>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="sr-only"
        onChange={handleFileChange}
      />

      <PhotoGalleryModal
        isOpen={isGalleryOpen}
        images={gallerySelections}
        selectedImageId={selectedImageId}
        onSelectImage={handleSelectImage}
        onConfirm={handleConfirmUpload}
        onClose={handleCloseGallery}
        onBrowseMore={openFilePicker}
      />
    </main>
  </>
  );
}
