import { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.focusoura.app",
  appName: "FocusOura",
  webDir: "dist/public",
  // ── Android specific ─────────────────────────────────────────────────────
  android: {
    // Allow cleartext (HTTP) traffic to local WiFi server during development.
    // For production, use HTTPS and remove this.
    allowMixedContent: true,
    // Capture console.log from WebView into Android logcat
    loggingBehavior: "debug",
  },
  // ── Server config ─────────────────────────────────────────────────────────
  // Leave empty for production build — the VITE_API_BASE_URL env var in the
  // web bundle controls where API requests go.
  server: {
    // Allows WebView to make HTTP requests to local network addresses
    cleartext: true,
  },
  plugins: {
    // SplashScreen plugin config (optional, comment out if not installed)
    // SplashScreen: {
    //   launchShowDuration: 2000,
    //   backgroundColor: "#2D6A4F",
    // },
  },
};

export default config;
