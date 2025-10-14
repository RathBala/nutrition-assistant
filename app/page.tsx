"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ChangeEvent } from "react";
import type { User } from "firebase/auth";
import { FirebaseError } from "firebase/app";
import type { UploadTask } from "firebase/storage";

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
import { startMealImageUpload, type MealImageUploadResult } from "@/lib/firebase/storage";
import { AuthScreen } from "@/components/auth/auth-screen";
import { useAuth } from "@/components/auth-provider";

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
  const { user, loading: authLoading, signOut: signOutUser } = useAuth();
  const [signOutPending, setSignOutPending] = useState(false);
  const [signOutError, setSignOutError] = useState<string | null>(null);

  const handleSignOut = async () => {
    if (signOutPending) {
      return;
    }

    setSignOutError(null);
    setSignOutPending(true);

    try {
      await signOutUser();
    } catch {
      setSignOutError("We couldn't sign you out. Please try again.");
    } finally {
      setSignOutPending(false);
    }
  };

  const dismissSignOutError = () => setSignOutError(null);

  if (authLoading) {
    return <AuthLoadingScreen />;
  }

  if (!user) {
    return <AuthScreen />;
  }

  return (
    <Dashboard
      user={user}
      onSignOut={handleSignOut}
      signOutPending={signOutPending}
      signOutError={signOutError}
      onDismissSignOutError={dismissSignOutError}
    />
  );
}

type DashboardProps = {
  user: User;
  onSignOut: () => Promise<void>;
  signOutPending: boolean;
  signOutError: string | null;
  onDismissSignOutError: () => void;
};

function Dashboard({
  user,
  onSignOut,
  signOutPending,
  signOutError,
  onDismissSignOutError,
}: DashboardProps) {
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  const [selectedImageId, setSelectedImageId] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [gallerySelections, setGallerySelections] = useState<GallerySelection[]>([]);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [lastUploadResult, setLastUploadResult] = useState<MealImageUploadResult | null>(null);
  const uploadTaskRef = useRef<UploadTask | null>(null);
  const pendingSelectionRef = useRef<GallerySelection | null>(null);
  const isMountedRef = useRef(true);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);

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
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;

      if (uploadTaskRef.current) {
        uploadTaskRef.current.cancel();
        uploadTaskRef.current = null;
      }

      if (pendingSelectionRef.current) {
        URL.revokeObjectURL(pendingSelectionRef.current.previewUrl);
        pendingSelectionRef.current = null;
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

    const hasSelected = gallerySelections.some((item) => item.id === selectedImageId);

    if (!hasSelected) {
      setSelectedImageId(gallerySelections[0].id);
    }
  }, [gallerySelections, selectedImageId]);

  const describeUploadError = useCallback((error: unknown): string => {
    if (error instanceof FirebaseError) {
      switch (error.code) {
        case "storage/unauthorized":
        case "storage/unauthenticated":
          return "You don’t have permission to upload images right now. Please sign in again.";
        case "storage/quota-exceeded":
          return "We’ve hit our storage limit. Please try again in a little while.";
        case "storage/retry-limit-exceeded":
        case "storage/network-request-failed":
          return "The upload kept failing due to a network issue. Check your connection and try again.";
        case "storage/invalid-checksum":
          return "The upload looked corrupted. Try with a fresh photo.";
        case "storage/invalid-argument":
          return "That file type isn’t supported for uploads.";
        case "storage/unknown":
          return "Something unexpected happened on the server. Please try again.";
        default:
          return "Something went wrong while uploading. Please try again.";
      }
    }

    return "Something went wrong while uploading. Please try again.";
  }, []);

  const openFilePicker = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const openCameraPicker = useCallback(() => {
    cameraInputRef.current?.click();
  }, []);

  const handleOpenGallery = useCallback(() => {
    setSelectedImageId(null);
    setUploadError(null);
    setShowSuccess(false);
    setUploadProgress(null);
    openFilePicker();
  }, [openFilePicker]);

  const handleCaptureMeal = useCallback(() => {
    setSelectedImageId(null);
    setUploadError(null);
    setShowSuccess(false);
    setUploadProgress(null);
    openCameraPicker();
  }, [openCameraPicker]);

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;

    if (!files || files.length === 0) {
      event.target.value = "";

      if (gallerySelections.length === 0) {
        setSelectedImageId(null);
        setIsGalleryOpen(false);
      }

      return;
    }

    if (uploadTaskRef.current) {
      uploadTaskRef.current.cancel();
      uploadTaskRef.current = null;
    }

    if (isUploading) {
      setIsUploading(false);
    }

    const nextSelections = Array.from(files).map((file, index) => ({
      id: `${file.name}-${file.lastModified}-${index}`,
      file,
      previewUrl: URL.createObjectURL(file),
      name: file.name,
    }));

    pendingSelectionRef.current = null;
    setLastUploadResult(null);
    setUploadProgress(null);
    setUploadError(null);
    setShowSuccess(false);

    setGallerySelections((previous) => {
      revokePreviews(previous);
      return nextSelections;
    });

    setSelectedImageId(nextSelections[0]?.id ?? null);
    setIsGalleryOpen(true);

    event.target.value = "";
  };

  const handleSelectImage = (imageId: string) => {
    setSelectedImageId(imageId);
  };

  const handleConfirmUpload = (file: File, selection: GallerySelection) => {
    if (!file || !selection) {
      return;
    }

    if (uploadTaskRef.current) {
      uploadTaskRef.current.cancel();
      uploadTaskRef.current = null;
    }

    pendingSelectionRef.current = selection;
    setIsGalleryOpen(false);
    setIsUploading(true);
    setShowSuccess(false);
    setUploadError(null);
    setUploadProgress(0);
    setLastUploadResult(null);

    const { task, completion } = startMealImageUpload(user.uid, file, (progress) => {
      if (isMountedRef.current) {
        setUploadProgress(progress);
      }
    });

    uploadTaskRef.current = task;

    completion
      .then((result) => {
        if (!isMountedRef.current) {
          return;
        }

        setIsUploading(false);
        setShowSuccess(true);
        setUploadProgress(null);
        setUploadError(null);
        setLastUploadResult(result);
        setSelectedImageId(null);

        setGallerySelections((previous) => {
          revokePreviews(previous);
          return [];
        });

        pendingSelectionRef.current = null;

        console.info("Meal image uploaded", result);
      })
      .catch((error) => {
        if (!isMountedRef.current) {
          return;
        }

        setIsUploading(false);
        setUploadProgress(null);
        setShowSuccess(false);

        if (error instanceof FirebaseError && error.code === "storage/canceled") {
          return;
        }

        setUploadError(describeUploadError(error));
      })
      .finally(() => {
        uploadTaskRef.current = null;
      });
  };

  const handleRetryUpload = () => {
    setUploadError(null);
    setShowSuccess(false);
    setUploadProgress(null);

    if (gallerySelections.length > 0) {
      setIsGalleryOpen(true);
      return;
    }

    if (pendingSelectionRef.current) {
      const selection = pendingSelectionRef.current;
      setGallerySelections([selection]);
      setSelectedImageId(selection.id);
      setIsGalleryOpen(true);
      return;
    }

    openFilePicker();
  };

  const handleCloseGallery = () => {
    setIsGalleryOpen(false);
    setSelectedImageId(null);
    setUploadError(null);
    setUploadProgress(null);
    pendingSelectionRef.current = null;
    setGallerySelections((previous) => {
      revokePreviews(previous);
      return [];
    });
  };

  const userEmail = user.email ?? "";
  const userDisplayName = user.displayName?.trim() || userEmail.split("@")[0] || "Member";
  const userInitials =
    user.displayName?.trim()
      ? user.displayName
          .trim()
          .split(/\s+/)
          .map((part) => part[0]?.toUpperCase() ?? "")
          .join("")
          .slice(0, 2) || "U"
      : userEmail.split("@")[0]?.slice(0, 2).toUpperCase() || "U";

  const handleSignOutClick = () => {
    void onSignOut();
  };

  return (
    <>
      <header className="border-b border-slate-200 bg-white/80 py-4 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-white/60">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <a
            href="/"
            className="text-lg font-semibold tracking-[0.4em] text-slate-900"
            style={{ fontVariant: "small-caps" }}
            aria-label="Thrive home"
          >
            thrive
          </a>
          <div className="flex items-center gap-4">
            <div className="hidden text-right text-xs sm:block">
              <p className="font-semibold text-slate-900">{userDisplayName}</p>
              {userEmail ? <p className="text-slate-500">{userEmail}</p> : null}
            </div>
            <div
              className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-sm font-semibold uppercase text-emerald-700"
              aria-hidden="true"
            >
              {userInitials}
            </div>
            <button
              type="button"
              onClick={handleSignOutClick}
              disabled={signOutPending}
              className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-100 disabled:cursor-not-allowed disabled:text-slate-400"
            >
              {signOutPending ? (
                <>
                  <span className="h-3.5 w-3.5 animate-spin rounded-full border border-slate-400 border-t-transparent" aria-hidden="true" />
                  Signing out…
                </>
              ) : (
                "Sign out"
              )}
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto flex max-w-6xl flex-col gap-8 px-4 pb-16 pt-10 sm:px-6 lg:px-8">
        <UploadFeedback
          isUploading={isUploading}
          showSuccess={showSuccess}
          progress={uploadProgress}
          error={uploadError}
          onRetry={handleRetryUpload}
          result={lastUploadResult}
        />

        {signOutError ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert" aria-live="assertive">
            <div className="flex items-start justify-between gap-4">
              <p>{signOutError}</p>
              <button
                type="button"
                onClick={onDismissSignOutError}
                className="text-xs font-semibold text-red-700/80 transition hover:text-red-800"
              >
                Dismiss
              </button>
            </div>
          </div>
        ) : null}

        <PageHeader
          eyebrow="Nutrition Assistant"
          title="Your meals for Tuesday, June 4"
          description="Upload photos of what you eat and get instant calorie estimates, macro breakdowns, and gentle coaching from your AI companion."
          onLogMeal={handleOpenGallery}
        />

        <QuickAdd onCapture={handleCaptureMeal} onUpload={handleOpenGallery} />
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
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
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

function AuthLoadingScreen() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50">
      <div className="flex flex-col items-center gap-4 rounded-3xl border border-slate-200 bg-white px-12 py-10 text-center shadow-xl">
        <span className="h-12 w-12 animate-spin rounded-full border-[3px] border-emerald-400 border-t-transparent" aria-hidden="true" />
        <div>
          <p className="text-base font-semibold text-slate-900">Just a moment…</p>
          <p className="mt-1 text-sm text-slate-600">We’re verifying your account details.</p>
        </div>
      </div>
    </div>
  );
}
