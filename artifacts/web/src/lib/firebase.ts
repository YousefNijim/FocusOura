import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  type Auth,
} from "firebase/auth";
import { API_BASE } from "@/utils/api";
import { isWebView } from "@/lib/environment";

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

// Returns the ID token on popup success, or null in all other cases:
//   - WebView: posts GOOGLE_SIGN_IN to native (native opens Chrome Custom Tab)
//   - Custom Tab (?return=native): uses signInWithRedirect (page navigates away)
//   - Desktop: uses signInWithPopup (returns token immediately)
export async function signInWithGoogle(): Promise<string | null> {
  await ensureFirebaseReady();
  if (!auth) throw new Error("Firebase Auth not initialized");
  const provider = new GoogleAuthProvider();
  provider.addScope("email");
  provider.addScope("profile");

  if (isWebView()) {
    // Google blocks OAuth inside WebViews — delegate to native Chrome Custom Tab
    if ((window as any).ReactNativeWebView) {
      (window as any).ReactNativeWebView.postMessage(
        JSON.stringify({ type: "GOOGLE_SIGN_IN" })
      );
    }
    return null;
  }

  if (new URLSearchParams(window.location.search).get("return") === "native") {
    // Opened by native app in Chrome Custom Tab — use redirect (popup unreliable in Custom Tab)
    await signInWithRedirect(auth, provider);
    return null; // page navigates away
  }

  // Desktop browser — popup gives the best UX
  const result = await signInWithPopup(auth, provider);
  return result.user.getIdToken();
}

// Call on every page load to pick up the result of a redirect sign-in.
// Returns the ID token if Google just redirected back, otherwise null.
export async function getGoogleRedirectResult(): Promise<string | null> {
  await ensureFirebaseReady();
  if (!auth) return null;
  const result = await getRedirectResult(auth);
  if (!result) return null;
  return result.user.getIdToken();
}
