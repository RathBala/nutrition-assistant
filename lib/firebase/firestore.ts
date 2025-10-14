"use client";

import { getFirestore, type Firestore } from "firebase/firestore";

import { getFirebaseApp } from "./client";

let cachedFirestore: Firestore | null = null;

export const getFirebaseFirestore = (): Firestore => {
  const app = getFirebaseApp();

  if (!cachedFirestore) {
    cachedFirestore = getFirestore(app);
  }

  return cachedFirestore;
};
