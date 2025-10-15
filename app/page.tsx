"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ChangeEvent } from "react";
import type { User } from "firebase/auth";
import { FirebaseError } from "firebase/app";
import type { UploadTask } from "firebase/storage";

import { AiRecap } from "@/components/ai-recap";
import { DailyTargetsCard } from "@/components/daily-targets-card";
import type { DailyTarget } from "@/components/daily-targets-card";
import { MacroSummary } from "@/components/macro-summary";
import { PageHeader } from "@/components/page-header";
import { LogMealFab } from "@/components/log-meal-fab";
import { MealDetailsModal, type MealDetailsSubmitPayload } from "@/components/meal-details-modal";
import { UploadFeedback } from "@/components/upload-feedback";
import type { GallerySelection, MacroBreakdown } from "@/components/types";
import { startMealImageUpload, type MealImageUploadResult } from "@/lib/firebase/storage";
import { AuthScreen } from "@/components/auth/auth-screen";
import { AuthLoadingScreen } from "@/components/auth/auth-loading-screen";
import { AppShell } from "@/components/app-shell";
import { useAuth } from "@/components/auth-provider";
import { useSignOutAction } from "@/hooks/use-sign-out-action";
import { useMealSlots } from "@/hooks/use-meal-slots";
import { logMealEntry } from "@/lib/firestore/meal-logs";
import { TodayMealsList } from "@/components/today-meals-list";
import { useTodayMealLogs } from "@/hooks/use-today-meal-logs";

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

const SAVE_MEAL_ERROR_MESSAGE = "We couldn’t save your meal. Please try again.";

type PendingMealDetails = {
  name: string;
  slotId: string;
  slotName: string;
  sourceFileName: string | null;
};

export default function Home() {
  const { user, loading: authLoading, signOut: signOutUser } = useAuth();
  const {
    handleSignOut,
    pending: signOutPending,
    error: signOutError,
    dismissError: dismissSignOutError,
  } = useSignOutAction(signOutUser);

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
  onSignOut: () => void;
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
  const [pendingMealDetails, setPendingMealDetails] = useState<PendingMealDetails | null>(null);
  const [pendingUploadResult, setPendingUploadResult] = useState<MealImageUploadResult | null>(null);
  const [isSavingMeal, setIsSavingMeal] = useState(false);
  const [mealSaveError, setMealSaveError] = useState<string | null>(null);
  const [feedbackErrorTitle, setFeedbackErrorTitle] = useState<string | null>(null);
  const uploadTaskRef = useRef<UploadTask | null>(null);
  const pendingSelectionRef = useRef<GallerySelection | null>(null);
  const isMountedRef = useRef(true);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const { slots: mealSlots, loading: mealSlotsLoading } = useMealSlots(user.uid);
  const {
    meals: todayMeals,
    loading: todayMealsLoading,
    error: todayMealsError,
    refresh: refreshTodayMeals,
  } = useTodayMealLogs(user.uid);

  const sortedTodayMeals = useMemo(() => {
    if (todayMeals.length === 0) {
      return todayMeals;
    }

    const slotOrder = new Map(mealSlots.map((slot, index) => [slot.id, index]));
    const fallbackOrder = new Map(todayMeals.map((meal, index) => [meal.id, index]));

    return [...todayMeals].sort((a, b) => {
      const slotIndexA = slotOrder.get(a.slotId ?? "") ?? Number.MAX_SAFE_INTEGER;
      const slotIndexB = slotOrder.get(b.slotId ?? "") ?? Number.MAX_SAFE_INTEGER;

      if (slotIndexA !== slotIndexB) {
        return slotIndexA - slotIndexB;
      }

      const fallbackIndexA = fallbackOrder.get(a.id) ?? 0;
      const fallbackIndexB = fallbackOrder.get(b.id) ?? 0;

      return fallbackIndexA - fallbackIndexB;
    });
  }, [mealSlots, todayMeals]);

  const clearPendingMealState = useCallback(() => {
    setIsSavingMeal(false);
    setMealSaveError(null);
    setPendingUploadResult(null);
    setPendingMealDetails(null);
    setFeedbackErrorTitle(null);

    if (pendingSelectionRef.current) {
      URL.revokeObjectURL(pendingSelectionRef.current.previewUrl);
      pendingSelectionRef.current = null;
    }
  }, []);

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

  const beginMealDetails = useCallback(
    (options?: { openPicker?: "file" }) => {
      if (uploadTaskRef.current) {
        uploadTaskRef.current.cancel();
        uploadTaskRef.current = null;
      }

      clearPendingMealState();
      setGallerySelections((previous) => {
        revokePreviews(previous);
        return [];
      });
      setSelectedImageId(null);
      setUploadError(null);
      setMealSaveError(null);
      setFeedbackErrorTitle(null);
      setUploadProgress(null);
      setIsUploading(false);
      setShowSuccess(false);
      setIsGalleryOpen(true);

      if (options?.openPicker === "file") {
        openFilePicker();
      }
    },
    [
      clearPendingMealState,
      openFilePicker,
      revokePreviews,
    ],
  );

  const handleOpenMealDetails = useCallback(() => {
    beginMealDetails();
  }, [beginMealDetails]);

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;

    if (!files || files.length === 0) {
      event.target.value = "";
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
    setPendingMealDetails(null);
    setPendingUploadResult(null);
    setMealSaveError(null);
    setFeedbackErrorTitle(null);
    setIsSavingMeal(false);

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

  const handleRemoveSelectedImage = useCallback(() => {
    pendingSelectionRef.current = null;
    setGallerySelections((previous) => {
      if (!selectedImageId) {
        revokePreviews(previous);
        setSelectedImageId(null);
        return [];
      }

      const removedItems = previous.filter((item) => item.id === selectedImageId);
      const remaining = previous.filter((item) => item.id !== selectedImageId);

      revokePreviews(removedItems);

      if (remaining.length === 0) {
        setSelectedImageId(null);
      } else if (!remaining.some((item) => item.id === selectedImageId)) {
        setSelectedImageId(remaining[0].id);
      }

      return remaining;
    });
    setUploadError(null);
    setMealSaveError(null);
    setFeedbackErrorTitle(null);
  }, [revokePreviews, selectedImageId]);

  const attemptSaveMeal = useCallback(
    async (
      uploadResult: MealImageUploadResult | null,
      overrideDetails?: PendingMealDetails | null,
    ) => {
      const details = overrideDetails ?? pendingMealDetails;

      if (!details) {
        return;
      }

      setIsSavingMeal(true);
      setMealSaveError(null);
      setUploadError(null);
      setFeedbackErrorTitle(null);

      try {
        const savedDocRef = await logMealEntry(user.uid, {
          name: details.name,
          slot: { id: details.slotId, name: details.slotName },
          image: uploadResult ?? null,
          sourceFileName: details.sourceFileName ?? null,
        });

        if (!isMountedRef.current) {
          return;
        }

        clearPendingMealState();
        setLastUploadResult(uploadResult ?? null);
        setShowSuccess(true);
        refreshTodayMeals();
        console.info("Meal entry saved", savedDocRef.id);
      } catch (error) {
        console.error("Failed to save meal entry", error);

        if (!isMountedRef.current) {
          return;
        }

        setIsSavingMeal(false);
        setMealSaveError(SAVE_MEAL_ERROR_MESSAGE);
        setUploadError(SAVE_MEAL_ERROR_MESSAGE);
        setFeedbackErrorTitle("We couldn’t save your meal.");
      }
    },
    [clearPendingMealState, pendingMealDetails, refreshTodayMeals, user.uid],
  );

  const startUploadForSelection = useCallback(
    (selection: GallerySelection, details: PendingMealDetails) => {
      if (uploadTaskRef.current) {
        uploadTaskRef.current.cancel();
        uploadTaskRef.current = null;
      }

      pendingSelectionRef.current = selection;
      setPendingMealDetails(details);
      setIsGalleryOpen(false);
      setIsUploading(true);
      setShowSuccess(false);
      setUploadError(null);
      setFeedbackErrorTitle(null);
      setUploadProgress(0);
      setLastUploadResult(null);
      setMealSaveError(null);
      setIsSavingMeal(false);
      setPendingUploadResult(null);

      const { task, completion } = startMealImageUpload(user.uid, selection.file, (progress) => {
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
          setUploadProgress(null);
          setUploadError(null);
          setSelectedImageId(null);
          setPendingUploadResult(result);
          setLastUploadResult(result);

          setGallerySelections((previous) => {
            revokePreviews(previous.filter((item) => item.id !== selection.id));
            return [];
          });

          attemptSaveMeal(result, details);
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

          const describedError = describeUploadError(error);
          setUploadError(describedError);
          setFeedbackErrorTitle("We couldn’t upload your meal photo.");
        })
        .finally(() => {
          uploadTaskRef.current = null;
        });
    },
    [attemptSaveMeal, describeUploadError, revokePreviews, user.uid],
  );

  const handleSubmitMealFromModal = useCallback(
    ({ selection, name, slotId, slotName }: MealDetailsSubmitPayload) => {
      const details: PendingMealDetails = {
        name,
        slotId,
        slotName,
        sourceFileName: selection?.name ?? null,
      };

      setPendingMealDetails(details);

      if (selection) {
        setSelectedImageId(null);
        setGallerySelections((previous) => {
          revokePreviews(previous.filter((item) => item.id !== selection.id));
          return [];
        });

        startUploadForSelection(selection, details);
        return;
      }

      setIsGalleryOpen(false);
      setShowSuccess(false);
      setUploadError(null);
      setFeedbackErrorTitle(null);
      setUploadProgress(null);
      setSelectedImageId(null);
      setGallerySelections((previous) => {
        revokePreviews(previous);
        return [];
      });
      pendingSelectionRef.current = null;
      setPendingUploadResult(null);
      setLastUploadResult(null);
      attemptSaveMeal(null, details);
    },
    [
      attemptSaveMeal,
      revokePreviews,
      startUploadForSelection,
    ],
  );

  const handleRetryFlow = useCallback(() => {
    if (mealSaveError && pendingMealDetails) {
      setMealSaveError(null);
      setUploadError(null);
      setFeedbackErrorTitle(null);
      attemptSaveMeal(pendingUploadResult ?? null, pendingMealDetails);
      return;
    }

    if (uploadError && pendingSelectionRef.current && pendingMealDetails) {
      setUploadError(null);
      setFeedbackErrorTitle(null);
      startUploadForSelection(pendingSelectionRef.current, pendingMealDetails);
      return;
    }

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

    beginMealDetails({ openPicker: "file" });
  }, [
    attemptSaveMeal,
    beginMealDetails,
    gallerySelections,
    mealSaveError,
    pendingMealDetails,
    pendingUploadResult,
    startUploadForSelection,
    uploadError,
  ]);

  const handleCloseGallery = () => {
    clearPendingMealState();
    setIsGalleryOpen(false);
    setSelectedImageId(null);
    setUploadError(null);
    setUploadProgress(null);
    setGallerySelections((previous) => {
      revokePreviews(previous);
      return [];
    });
  };

  return (
    <AppShell user={user} onSignOut={onSignOut} signOutPending={signOutPending}>
      <UploadFeedback
        isUploading={isUploading}
        isSaving={isSavingMeal}
        showSuccess={showSuccess}
        progress={uploadProgress}
        errorTitle={feedbackErrorTitle}
        error={uploadError}
        onRetry={handleRetryFlow}
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
      />

      <MacroSummary macros={todayMacros} goal={macroGoals} />

      <section className="grid gap-6 lg:grid-cols-[1fr_minmax(260px,320px)]">
        <div className="space-y-5">
          <TodayMealsList
            meals={sortedTodayMeals}
            loading={todayMealsLoading}
            error={todayMealsError}
            onRetry={refreshTodayMeals}
            onLogMeal={handleOpenMealDetails}
          />
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
      <MealDetailsModal
        isOpen={isGalleryOpen}
        images={gallerySelections}
        selectedImageId={selectedImageId}
        onSelectImage={handleSelectImage}
        onSubmit={handleSubmitMealFromModal}
        onClose={handleCloseGallery}
        onBrowseMore={openFilePicker}
        onRemoveImage={handleRemoveSelectedImage}
        slots={mealSlots}
        isLoadingSlots={mealSlotsLoading}
      />
      <LogMealFab onClick={handleOpenMealDetails} />
    </AppShell>
  );
}
