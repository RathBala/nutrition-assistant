"use client";

import { getStorage, ref, uploadBytesResumable, getDownloadURL, type FirebaseStorage, type UploadTask } from "firebase/storage";
import type { UploadMetadata } from "firebase/storage";

import { getFirebaseApp } from "./client";

let storageInstance: FirebaseStorage | null = null;

export const getFirebaseStorage = (): FirebaseStorage => {
  if (!storageInstance) {
    const app = getFirebaseApp();
    storageInstance = getStorage(app);
  }

  return storageInstance;
};

const sanitizeFileName = (fileName: string): string => {
  const trimmed = fileName.trim();
  if (!trimmed) {
    return "meal-photo";
  }

  const normalized = trimmed
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]/g, "-");

  return normalized || "meal-photo";
};

const buildMealImagePath = (uid: string, fileName: string): string => {
  const safeName = sanitizeFileName(fileName);
  const timestamp = new Date()
    .toISOString()
    .replace(/[:.]/g, "-");

  return `meal-images/${uid}/${timestamp}-${safeName}`;
};

export type MealImageUploadResult = {
  storagePath: string;
  downloadURL: string;
  uploadedAt: string;
  size: number;
  contentType: string | null;
};

export type MealImageUploadHandle = {
  task: UploadTask;
  storagePath: string;
  completion: Promise<MealImageUploadResult>;
};

export const startMealImageUpload = (
  uid: string,
  file: File,
  onProgress?: (progress: number) => void,
): MealImageUploadHandle => {
  const storage = getFirebaseStorage();
  const storagePath = buildMealImagePath(uid, file.name);
  const storageRef = ref(storage, storagePath);
  const metadata: UploadMetadata | undefined = file.type
    ? { contentType: file.type }
    : undefined;

  const task = uploadBytesResumable(storageRef, file, metadata);

  const completion = new Promise<MealImageUploadResult>((resolve, reject) => {
    const unsubscribe = task.on(
      "state_changed",
      (snapshot) => {
        if (snapshot.totalBytes > 0) {
          const progress = snapshot.bytesTransferred / snapshot.totalBytes;
          onProgress?.(Math.min(Math.max(progress, 0), 1));
        }
      },
      (error) => {
        unsubscribe();
        reject(error);
      },
      async () => {
        try {
          const downloadURL = await getDownloadURL(task.snapshot.ref);
          unsubscribe();
          resolve({
            storagePath,
            downloadURL,
            uploadedAt: new Date().toISOString(),
            size: task.snapshot.totalBytes,
            contentType: task.snapshot.metadata?.contentType ?? file.type ?? null,
          });
        } catch (error) {
          unsubscribe();
          reject(error);
        }
      },
    );
  });

  return { task, storagePath, completion };
};
