import { getApp, getApps, initializeApp } from "firebase/app";
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

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

let analyticsPromise: Promise<Analytics | null> | null = null;

export const getFirebaseAnalytics = async (): Promise<Analytics | null> => {
  if (typeof window === "undefined") {
    return null;
  }

  if (!analyticsPromise) {
    analyticsPromise = isSupported()
      .then((supported) => (supported ? getAnalytics(app) : null))
      .catch(() => null);
  }

  return analyticsPromise;
};

export { app };
