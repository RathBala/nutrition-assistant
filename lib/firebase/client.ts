import {
  getApp,
  getApps,
  initializeApp,
  type FirebaseApp,
  type FirebaseOptions,
} from "firebase/app";
import { getAnalytics, isSupported, type Analytics } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyDToi_CmPMLWB2BR6BKx8WGatqrFHJjk1Q",
  authDomain: "thrive-nutrition-a470c.firebaseapp.com",
  projectId: "thrive-nutrition-a470c",
  storageBucket: "thrive-nutrition-a470c.firebasestorage.app",
  messagingSenderId: "698727992351",
  appId: "1:698727992351:web:d2196259549e94ad65d92a",
  measurementId: "G-ZZLQ7GBHGK",
};

let firebaseApp: FirebaseApp | null = null;
let analyticsPromise: Promise<Analytics | null> | null = null;

const ensureFirebaseApp = (): FirebaseApp => {
  if (!firebaseApp) {
    firebaseApp = getApps().length
      ? getApp()
      : initializeApp(firebaseConfig as FirebaseOptions);
  }

  return firebaseApp;
};

export const getFirebaseAnalytics = async (): Promise<Analytics | null> => {
  if (typeof window === "undefined") {
    return null;
  }

  const app = ensureFirebaseApp();

  if (!analyticsPromise) {
    analyticsPromise = isSupported()
      .then((supported) => (supported ? getAnalytics(app) : null))
      .catch(() => null);
  }

  return analyticsPromise;
};

export const getFirebaseApp = (): FirebaseApp => ensureFirebaseApp();
