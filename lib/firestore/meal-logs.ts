import {
  addDoc,
  collection,
  serverTimestamp,
  type DocumentReference,
  type Firestore,
  type Timestamp,
} from "firebase/firestore";

import { getFirebaseFirestore } from "@/lib/firebase/firestore";
import type { MealImageUploadResult } from "@/lib/firebase/storage";

export type MealLogSlot = {
  id: string;
  name: string;
};

export type MealLogImage = MealImageUploadResult;

export type MealLogCreateInput = {
  name: string;
  slot: MealLogSlot;
  image: MealLogImage;
  sourceFileName: string;
};

export type MealLogDocument = {
  name: string;
  slot: MealLogSlot;
  image: MealLogImage;
  sourceFileName: string;
  createdAt: Timestamp | ReturnType<typeof serverTimestamp>;
  updatedAt: Timestamp | ReturnType<typeof serverTimestamp>;
};

export const getMealLogsCollection = (firestore: Firestore, userId: string) =>
  collection(firestore, "users", userId, "mealLogs");

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
    image: input.image,
    sourceFileName: input.sourceFileName,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  return addDoc(collectionRef, payload);
};
