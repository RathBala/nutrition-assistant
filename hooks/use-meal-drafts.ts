"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Timestamp,
  onSnapshot,
  type FirestoreError,
} from "firebase/firestore";

import { getFirebaseFirestore } from "@/lib/firebase/firestore";
import {
  getMealDraftsQuery,
  type MealDraftAnalysis,
  type MealDraftAnalysisItem,
  type MealDraftDocument,
  type MealDraftStatus,
} from "@/lib/firestore/meal-drafts";

const LOAD_ERROR_MESSAGE = "We couldn’t load your pending meals. Please try again.";

export type MealDraft = {
  id: string;
  name: string;
  slotId: string | null;
  slotName: string;
  status: MealDraftStatus;
  createdAt: Date | null;
  imageUrl: string | null;
  sourceFileName: string | null;
  analysis: MealDraftAnalysis | null;
  analysisStartedAt: Date | null;
  analysisCompletedAt: Date | null;
  errorCode: string | null;
  errorMessage: string | null;
  autoPromoteDelayMinutes: number;
  autoPromoteAt: Date | null;
};

export type UseMealDraftsResult = {
  drafts: MealDraft[];
  loading: boolean;
  error: string | null;
  refresh: () => void;
};

const coerceTimestamp = (value: unknown): Date | null => {
  if (value instanceof Timestamp) {
    return value.toDate();
  }

  return null;
};

const coerceAnalysis = (value: unknown): MealDraftAnalysis | null => {
  if (!value || typeof value !== "object") {
    return null;
  }

  const analysis = value as MealDraftAnalysis;

  if (typeof analysis.calories !== "number") {
    return null;
  }

  if (!analysis.macros || typeof analysis.macros !== "object") {
    return null;
  }

  const rawItems = Array.isArray(analysis.items) ? analysis.items : [];

  const items = rawItems
    .map((rawItem) => {
      if (!rawItem || typeof rawItem !== "object") {
        return null;
      }

      const name = typeof (rawItem as { name?: unknown }).name === "string"
        ? (rawItem as { name: string }).name
        : "Item";

      const quantityValue = Number((rawItem as { quantity?: number | string }).quantity ?? 1);
      const quantity = Number.isFinite(quantityValue) ? quantityValue : 1;

      const unitValue = (rawItem as { unit?: unknown }).unit;
      const unit = typeof unitValue === "string" && unitValue.trim() ? unitValue : "serving";

      return {
        name,
        quantity,
        unit,
      };
    })
    .filter((item): item is MealDraftAnalysisItem => item !== null);

  return {
    calories: analysis.calories,
    macros: {
      protein: Number((analysis.macros as { protein?: number }).protein ?? 0),
      carbs: Number((analysis.macros as { carbs?: number }).carbs ?? 0),
      fat: Number((analysis.macros as { fat?: number }).fat ?? 0),
    },
    items,
  };
};

const mapDraftDocument = (id: string, data: MealDraftDocument): MealDraft => {
  const status = data.status as MealDraftStatus;

  const imageField = data.image;
  const imageUrl = imageField?.downloadURL ?? null;

  const analysis = coerceAnalysis(data.analysis);
  const analysisCompletedAt = coerceTimestamp(data.analysisCompletedAt);

  return {
    id,
    name: data.name ?? "Untitled meal",
    slotId: data.slot?.id ?? null,
    slotName: data.slot?.name ?? data.slot?.id ?? "Meal",
    status: status ?? "pending",
    createdAt: coerceTimestamp(data.createdAt),
    imageUrl,
    sourceFileName: data.sourceFileName ?? null,
    analysis,
    analysisStartedAt: coerceTimestamp(data.analysisStartedAt),
    analysisCompletedAt,
    errorCode: data.error?.code ?? null,
    errorMessage: data.error?.message ?? null,
    autoPromoteDelayMinutes: Number(data.autoPromoteDelayMinutes ?? 5) || 5,
    autoPromoteAt: (() => {
      if (!analysisCompletedAt) {
        return null;
      }

      const minutes = Number(data.autoPromoteDelayMinutes ?? 5) || 5;

      return new Date(analysisCompletedAt.getTime() + minutes * 60_000);
    })(),
  };
};

export const useMealDrafts = (userId: string | null | undefined): UseMealDraftsResult => {
  const [drafts, setDrafts] = useState<MealDraft[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshIndex, setRefreshIndex] = useState(0);

  useEffect(() => {
    if (!userId) {
      setDrafts([]);
      setLoading(false);
      setError(null);
      return undefined;
    }

    setLoading(true);
    setError(null);

    const firestore = getFirebaseFirestore();
    const draftsQuery = getMealDraftsQuery(firestore, userId);

    const unsubscribe = onSnapshot(
      draftsQuery,
      (snapshot) => {
        const nextDrafts = snapshot.docs.map((doc) => mapDraftDocument(doc.id, doc.data()));
        setDrafts(nextDrafts);
        setLoading(false);
        setError(null);
      },
      (firestoreError: FirestoreError) => {
        console.error("Failed to load meal drafts", firestoreError);
        setDrafts([]);
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

  return { drafts, loading, error, refresh };
};

