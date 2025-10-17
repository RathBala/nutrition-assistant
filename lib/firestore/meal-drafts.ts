import {
  addDoc,
  collection,
  deleteField,
  doc,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  type CollectionReference,
  type DocumentReference,
  type Firestore,
  type FirestoreDataConverter,
  type Query,
  type Timestamp,
} from "firebase/firestore";

import { getFirebaseFirestore } from "@/lib/firebase/firestore";
import type { MealImageUploadResult } from "@/lib/firebase/storage";

export type MealDraftStatus = "pending" | "processing" | "draft" | "error";

export type MealDraftSlot = {
  id: string;
  name: string;
};

export type MealDraftImage = MealImageUploadResult | null;

export type MealDraftAnalysisItem = {
  name: string;
  quantity: number;
  unit: string;
};

export type MealDraftAnalysis = {
  calories: number;
  macros: {
    protein: number;
    carbs: number;
    fat: number;
  };
  items: MealDraftAnalysisItem[];
};

export type MealDraftDocument = {
  name: string;
  slot: MealDraftSlot;
  image: MealDraftImage;
  sourceFileName: string | null;
  status: MealDraftStatus;
  createdAt: Timestamp | ReturnType<typeof serverTimestamp>;
  updatedAt: Timestamp | ReturnType<typeof serverTimestamp>;
  analysis?: MealDraftAnalysis | null;
  analysisStartedAt?: Timestamp | ReturnType<typeof serverTimestamp> | null;
  analysisCompletedAt?: Timestamp | ReturnType<typeof serverTimestamp> | null;
  error?: {
    code: string;
    message: string;
  } | null;
  autoPromoteDelayMinutes: number;
};

const mealDraftConverter: FirestoreDataConverter<MealDraftDocument> = {
  toFirestore: (value) => value,
  fromFirestore: (snapshot) => snapshot.data() as MealDraftDocument,
};

export const getMealDraftsCollection = (
  firestore: Firestore,
  userId: string,
): CollectionReference<MealDraftDocument> =>
  collection(firestore, "users", userId, "mealDrafts").withConverter(mealDraftConverter);

export const getMealDraftsQuery = (
  firestore: Firestore,
  userId: string,
): Query<MealDraftDocument> =>
  query(getMealDraftsCollection(firestore, userId), orderBy("createdAt", "desc"));

export type MealDraftCreateInput = {
  name: string;
  slot: MealDraftSlot;
  image: MealDraftImage;
  sourceFileName?: string | null;
  autoPromoteDelayMinutes: number;
};

export const createMealDraft = async (
  userId: string,
  input: MealDraftCreateInput,
): Promise<DocumentReference<MealDraftDocument>> => {
  const firestore = getFirebaseFirestore();
  const collectionRef = getMealDraftsCollection(firestore, userId);

  const normalizedName = input.name.trim();
  const normalizedSlotName = input.slot.name.trim();

  const payload: MealDraftDocument = {
    name: normalizedName,
    slot: {
      id: input.slot.id,
      name: normalizedSlotName || input.slot.name,
    },
    image: input.image ?? null,
    sourceFileName: input.sourceFileName ?? null,
    status: "pending",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    autoPromoteDelayMinutes: Math.max(1, input.autoPromoteDelayMinutes),
  };

  return addDoc(collectionRef, payload);
};

export const retryMealDraftAnalysis = async (
  userId: string,
  draftId: string,
): Promise<void> => {
  const firestore = getFirebaseFirestore();
  const documentRef = doc(firestore, "users", userId, "mealDrafts", draftId).withConverter(
    mealDraftConverter,
  );

  await updateDoc(documentRef, {
    status: "pending",
    analysis: deleteField(),
    analysisStartedAt: deleteField(),
    analysisCompletedAt: deleteField(),
    error: deleteField(),
    updatedAt: serverTimestamp(),
  });
};

