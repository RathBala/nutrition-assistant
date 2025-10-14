"use client";

import { useCallback, useEffect, useState } from "react";
import type { FirestoreError } from "firebase/firestore";

import {
  DEFAULT_MEAL_SLOTS,
  saveMealSlots,
  subscribeMealSlots,
  type MealSlot,
  type MealSlotsSnapshot,
} from "@/lib/firestore/meal-slots";

const LOAD_ERROR_MESSAGE = "We couldn’t load your meal slots. Try again.";
const SAVE_ERROR_MESSAGE = "We couldn’t save your meal slots. Try again.";

type UseMealSlotsResult = {
  slots: MealSlot[];
  loading: boolean;
  error: string | null;
  isDefault: boolean;
  saving: boolean;
  saveError: string | null;
  save: (slots: MealSlot[]) => Promise<void>;
  clearSaveError: () => void;
  refresh: () => void;
};

export const useMealSlots = (userId: string | null | undefined): UseMealSlotsResult => {
  const [slots, setSlots] = useState<MealSlot[]>(DEFAULT_MEAL_SLOTS);
  const [isDefault, setIsDefault] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [refreshIndex, setRefreshIndex] = useState(0);

  useEffect(() => {
    if (!userId) {
      setSlots(DEFAULT_MEAL_SLOTS);
      setIsDefault(true);
      setLoading(false);
      setError(null);
      return undefined;
    }

    setLoading(true);
    setError(null);

    const unsubscribe = subscribeMealSlots(
      userId,
      (snapshot: MealSlotsSnapshot) => {
        setSlots(snapshot.slots);
        setIsDefault(snapshot.isDefault);
        setLoading(false);
        setError(null);
      },
      (firestoreError: FirestoreError) => {
        console.error("Failed to load meal slots", firestoreError);
        setError(LOAD_ERROR_MESSAGE);
        setLoading(false);
      },
    );

    return () => {
      unsubscribe();
    };
  }, [refreshIndex, userId]);

  const save = useCallback(
    async (nextSlots: MealSlot[]) => {
      if (!userId) {
        setSaveError(SAVE_ERROR_MESSAGE);
        throw new Error("Cannot save meal slots without a user id");
      }

      setSaving(true);
      setSaveError(null);

      try {
        await saveMealSlots(userId, nextSlots);
      } catch (error) {
        console.error("Failed to save meal slots", error);
        setSaveError(SAVE_ERROR_MESSAGE);
        throw error;
      } finally {
        setSaving(false);
      }
    },
    [userId],
  );

  const clearSaveError = useCallback(() => {
    setSaveError(null);
  }, []);

  const refresh = useCallback(() => {
    setRefreshIndex((index) => index + 1);
  }, []);

  return {
    slots,
    loading,
    error,
    isDefault,
    saving,
    saveError,
    save,
    clearSaveError,
    refresh,
  };
};
