import { getFirebaseAuth, getFirestoreClient, getStorageClient } from "./client";

import type { FirestoreError, Unsubscribe, QueryDocumentSnapshot } from "firebase/firestore";
import {
  Timestamp,
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";
import { deleteObject, getDownloadURL, ref, uploadBytes } from "firebase/storage";

export type LoggedMeal = {
  id: string;
  imageUrl: string;
  storagePath: string;
  originalFileName?: string;
  createdAt: Date;
};

type MealDocument = {
  imageUrl: string;
  storagePath: string;
  originalFileName?: string;
  createdAt?: Timestamp;
  ownerId?: string;
};

const sanitizeFileName = (value: string) => value.replace(/[^\w.-]+/g, "-");

const getUserMealsCollection = (userId: string) => {
  const firestore = getFirestoreClient();

  if (!firestore) {
    throw new Error("Firebase has not been configured. Check environment variables.");
  }

  return collection(firestore, "users", userId, "meals");
};

const convertMealSnapshot = (document: QueryDocumentSnapshot<MealDocument>): LoggedMeal => {
  const data = document.data();
  const createdAt = data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date();

  return {
    id: document.id,
    imageUrl: data.imageUrl,
    storagePath: data.storagePath,
    originalFileName: data.originalFileName,
    createdAt,
  };
};

export const subscribeToMeals = (
  userId: string,
  onUpdate: (meals: LoggedMeal[]) => void,
  onError?: (error: FirestoreError) => void,
): Unsubscribe => {
  const mealsCollection = getUserMealsCollection(userId);
  const mealsQuery = query(mealsCollection, orderBy("createdAt", "desc"));

  return onSnapshot(
    mealsQuery,
    (snapshot) => {
      const meals = snapshot.docs.map((document) =>
        convertMealSnapshot(document as QueryDocumentSnapshot<MealDocument>),
      );

      onUpdate(meals);
    },
    (error) => {
      onError?.(error);
    },
  );
};

export const logMealImage = async (userId: string, file: File): Promise<void> => {
  const storage = getStorageClient();
  const firestore = getFirestoreClient();

  if (!storage || !firestore) {
    throw new Error("Firebase has not been configured. Check environment variables.");
  }

  const sanitizedName = sanitizeFileName(file.name || "meal-photo");
  const timestamp = Date.now();
  const storagePath = `users/${userId}/meal-photos/${timestamp}-${sanitizedName}`;
  const fileRef = ref(storage, storagePath);
  let shouldCleanupStorage = false;

  try {
    const uploadResult = await uploadBytes(fileRef, file, {
      contentType: file.type || "image/jpeg",
    });

    shouldCleanupStorage = true;

    const downloadUrl = await getDownloadURL(uploadResult.ref);
    const documentRef = doc(getUserMealsCollection(userId));
    const documentData = {
      imageUrl: downloadUrl,
      storagePath,
      originalFileName: file.name,
      createdAt: serverTimestamp(),
      ownerId: userId,
    };

    await setDoc(documentRef, documentData);

    shouldCleanupStorage = false;
  } catch (error) {
    if (shouldCleanupStorage) {
      await deleteObject(fileRef).catch(() => {
        // Ignore secondary cleanup errors to avoid masking the original failure.
      });
    }

    throw error instanceof Error
      ? error
      : new Error("Unexpected error while logging meal image.");
  }
};

export const signInAnonymouslyIfNeeded = async (): Promise<string | null> => {
  const auth = getFirebaseAuth();

  if (!auth) {
    return null;
  }

  if (auth.currentUser) {
    return auth.currentUser.uid;
  }

  const { signInAnonymously } = await import("firebase/auth");
  const credential = await signInAnonymously(auth);

  return credential.user.uid;
};
