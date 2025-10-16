import {
  addDoc,
  collection,
  serverTimestamp,
  type DocumentReference,
  type Firestore,
  type FirestoreDataConverter,
  type Timestamp,
} from "firebase/firestore";

import { getFirebaseFirestore } from "@/lib/firebase/firestore";
import type { MealImageUploadResult } from "@/lib/firebase/storage";
import type { MealDraftAnalysis } from "./meal-drafts";

export type MealLogSlot = {
  id: string;
  name: string;
};

export type MealLogImage = MealImageUploadResult | null;

export type MealLogCreateInput = {
  name: string;
  slot: MealLogSlot;
  image?: MealLogImage;
  sourceFileName?: string | null;
};

export type MealLogDocument = {
  name: string;
  slot: MealLogSlot;
  image: MealLogImage;
  sourceFileName: string | null;
  createdAt: Timestamp | ReturnType<typeof serverTimestamp>;
  updatedAt: Timestamp | ReturnType<typeof serverTimestamp>;
  analysis: MealDraftAnalysis | null;
  isEstimated: boolean;
  sourceDraftId: string | null;
  promotedAt: Timestamp | ReturnType<typeof serverTimestamp>;
};

const mealLogConverter: FirestoreDataConverter<MealLogDocument> = {
  toFirestore: (value) => value,
  fromFirestore: (snapshot) => snapshot.data() as MealLogDocument,
};

export const getMealLogsCollection = (firestore: Firestore, userId: string) =>
  collection(firestore, "users", userId, "mealLogs").withConverter(
    mealLogConverter,
  );

export const logMealEntry = async (
  userId: string,
  input: MealLogCreateInput,
): Promise<DocumentReference<MealLogDocument>> => {
  const firestore = getFirebaseFirestore();
  const collectionRef = getMealLogsCollection(firestore, userId);

  const normalizedName = input.name.trim();
  const normalizedSlotName = input.slot.name.trim();

  const payload: MealLogDocument = {
    name: normalizedName,
    slot: {
      id: input.slot.id,
      name: normalizedSlotName || input.slot.name,
    },
    image: input.image ?? null,
    sourceFileName: input.sourceFileName ?? null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    analysis: null,
    isEstimated: false,
    sourceDraftId: null,
    promotedAt: serverTimestamp(),
  };

  return addDoc(collectionRef, payload);
};
