import { initializeApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";

const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

/**
 * Shared Firebase app, or `null` when the config is absent (dev/test without
 * secrets — account features hide and the rest of the app works unchanged,
 * mirroring how analytics no-ops without a PostHog key). The web config is not
 * secret; it ships in the client bundle.
 */
const app: FirebaseApp | null =
  config.apiKey && config.projectId ? initializeApp(config) : null;

export const auth: Auth | null = app ? getAuth(app) : null;
export const db: Firestore | null = app ? getFirestore(app) : null;
