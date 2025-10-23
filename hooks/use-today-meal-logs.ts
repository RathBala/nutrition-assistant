"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Timestamp,
  onSnapshot,
  orderBy,
  query,
  where,
  type FirestoreError,
} from "firebase/firestore";

import { getFirebaseFirestore } from "@/lib/firebase/firestore";
import {
  getMealLogsCollection,
  type MealAnalysis,
  type MealAnalysisStatus,
} from "@/lib/firestore/meal-logs";

const LOAD_ERROR_MESSAGE = "We couldn’t load today’s meals. Please try again.";

type TodayMealLog = {
  id: string;
  name: string;
  slotId: string | null;
  slotName: string;
  loggedAt: Date | null;
  imageUrl: string | null;
  sourceFileName: string | null;
  analysis: MealAnalysis | null;
  analysisStatus: MealAnalysisStatus;
  analysisErrorCode: string | null;
  analysisErrorMessage: string | null;
};

type UseTodayMealLogsResult = {
  meals: TodayMealLog[];
  loading: boolean;
  error: string | null;
  refresh: () => void;
};

const getTodayRange = () => {
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);

  return {
    start: Timestamp.fromDate(startOfDay),
    end: Timestamp.fromDate(endOfDay),
  };
};

export const useTodayMealLogs = (userId: string | null | undefined): UseTodayMealLogsResult => {
  const [meals, setMeals] = useState<TodayMealLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshIndex, setRefreshIndex] = useState(0);

  useEffect(() => {
    if (!userId) {
      console.log("[useTodayMealLogs] No userId provided; clearing meals");
      setMeals([]);
      setLoading(false);
      setError(null);
      return undefined;
    }

    console.log("[useTodayMealLogs] Subscribing to today meal logs", { userId });
    setLoading(true);
    setError(null);

    const firestore = getFirebaseFirestore();
    const collectionRef = getMealLogsCollection(firestore, userId);
    const { start, end } = getTodayRange();

    const mealsQuery = query(
      collectionRef,
      where("createdAt", ">=", start),
      where("createdAt", "<", end),
      orderBy("createdAt", "desc"),
    );

    const unsubscribe = onSnapshot(
      mealsQuery,
      (snapshot) => {
        const nextMeals: TodayMealLog[] = snapshot.docs.map((doc) => {
          const data = doc.data();
          const createdAtField = data.createdAt as unknown;
          const createdAt = createdAtField instanceof Timestamp ? createdAtField.toDate() : null;

          const imageField = data.image as { downloadURL?: string } | null | undefined;
          const imageUrl = imageField?.downloadURL ?? null;

          return {
            id: doc.id,
            name: data.name ?? "Untitled meal",
            slotId: data.slot?.id ?? null,
            slotName: data.slot?.name ?? data.slot?.id ?? "Meal",
            loggedAt: createdAt,
            imageUrl,
            sourceFileName: data.sourceFileName ?? null,
            analysis: (data.analysis as MealAnalysis | null | undefined) ?? null,
            analysisStatus: (data.analysisStatus as MealAnalysisStatus | undefined) ?? "pending",
            analysisErrorCode: data.analysisError?.code ?? null,
            analysisErrorMessage: data.analysisError?.message ?? null,
          };
        });

        console.log("[useTodayMealLogs] Snapshot received", {
          userId,
          count: nextMeals.length,
          ids: nextMeals.map((meal) => meal.id),
          slotIds: nextMeals.map((meal) => meal.slotId),
        });

        setMeals(nextMeals);
        setLoading(false);
        setError(null);
      },
      (firestoreError: FirestoreError) => {
        console.error("Failed to load today’s meals", firestoreError);
        setMeals([]);
        setLoading(false);
        setError(LOAD_ERROR_MESSAGE);
      },
    );

    return () => {
      unsubscribe();
    };
  }, [refreshIndex, userId]);

  const refresh = useCallback(() => {
    setRefreshIndex((index) => index + 1);
  }, []);

  return { meals, loading, error, refresh };
};

export type { TodayMealLog };
