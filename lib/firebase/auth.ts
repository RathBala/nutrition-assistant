"use client";

import { getAuth, type Auth } from "firebase/auth";

import { getFirebaseApp } from "./client";

let cachedAuth: Auth | null = null;

export const getFirebaseAuth = (): Auth => {
  const app = getFirebaseApp();

  if (!cachedAuth) {
    cachedAuth = getAuth(app);
  }

  return cachedAuth;
};
