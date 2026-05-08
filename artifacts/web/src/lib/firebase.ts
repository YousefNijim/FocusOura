import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, type Auth } from "firebase/auth";
import { API_BASE } from "@/utils/api";


let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let configLoaded = false;
let configPromise: Promise<void> | null = null;

async function loadFirebaseConfig() {
  if (configLoaded) return;
  const res = await fetch(`${API_BASE}/api/config/firebase`);

  if (!res.ok) throw new Error("Firebase not configured on server");
  const config = await res.json();
  if (getApps().length === 0) {
    app = initializeApp(config);
  } else {
    app = getApps()[0];
  }
  auth = getAuth(app);
  configLoaded = true;
}

export async function ensureFirebaseReady(): Promise<void> {
  if (!configPromise) {
    configPromise = loadFirebaseConfig();
  }
  return configPromise;
}

export async function signInWithGoogle(): Promise<string> {
  await ensureFirebaseReady();
  if (!auth) throw new Error("Firebase Auth not initialized");
  const provider = new GoogleAuthProvider();
  const result = await signInWithPopup(auth, provider);
  const idToken = await result.user.getIdToken();
  return idToken;
}
