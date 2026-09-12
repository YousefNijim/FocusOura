export const getToken = (): string | null => {
  return localStorage.getItem("focusoura_token");
};

export const setToken = (token: string): void => {
  localStorage.setItem("focusoura_token", token);
};

export const clearToken = (): void => {
  localStorage.removeItem("focusoura_token");
  localStorage.removeItem("focusoura_user_id");
};

export const getUserId = (): string => {
  let id = localStorage.getItem("focusoura_user_id");
  if (!id) {
    id = "user_" + Date.now() + "_" + Math.random().toString(36).slice(2, 7);
    localStorage.setItem("focusoura_user_id", id);
  }
  return id;
};

// In development: Vite proxies /api/* to localhost:8080 — base is empty string
// In production: VITE_API_BASE_URL points to the deployed API server (e.g. Railway)
export const API_BASE = (import.meta.env.VITE_API_BASE_URL ?? "").replace(/\/$/, "");


/** sessionStorage key the verification banner uses to stay dismissed. */
export const VERIFY_BANNER_DISMISSED_KEY = "focusoura_verify_banner_dismissed";

/** Fired when the API refuses an action because the email is unverified. */
export const VERIFICATION_REQUIRED_EVENT = "focusoura:verification-required";

/**
 * An HTTP failure with the server's own message and code preserved.
 *
 * The previous wrapper threw `new Error("API error 403: {...json...}")`, which
 * meant callers could only show a generic message — the API was already saying
 * exactly what was wrong and the UI was throwing it away.
 */
export class ApiError extends Error {
  readonly status: number;
  readonly code?: string;

  constructor(status: number, message: string, code?: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }

  get isVerificationRequired(): boolean {
    return this.status === 403 && this.code === "EMAIL_NOT_VERIFIED";
  }
}

/**
 * Turns a thrown value into something worth showing a person. `fallback` is
 * used only when the server said nothing useful.
 */
export function describeApiError(
  err: unknown,
  fallback: string,
): { title: string; description: string } {
  if (err instanceof ApiError) {
    if (err.isVerificationRequired) {
      return {
        title: "Verify your email first",
        description:
          "We sent you a link when you signed up. Check your inbox, or use the banner at the top of the screen to send it again.",
      };
    }
    if (err.message) return { title: "Error", description: err.message };
  }
  return { title: "Error", description: fallback };
}

export async function fetchApi<T = unknown>(
  path: string,
  options?: RequestInit
): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  } else {
    headers["x-user-id"] = getUserId();
  }
  const response = await fetch(`${API_BASE}/api${path}`, {
    ...options,
    headers: {
      ...headers,
      ...options?.headers,
    },
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    let serverMessage = "";
    let code: string | undefined;
    try {
      const body = JSON.parse(text);
      if (typeof body?.error === "string") serverMessage = body.error;
      if (typeof body?.code === "string") code = body.code;
    } catch {
      // Not JSON — fall back to the raw text below.
    }

    const error = new ApiError(
      response.status,
      serverMessage || text || `Request failed with ${response.status}`,
      code,
    );

    // A blocked action is the moment the banner matters most, so bring it
    // back even if the user dismissed it earlier in the session.
    if (error.isVerificationRequired) {
      try {
        sessionStorage.removeItem(VERIFY_BANNER_DISMISSED_KEY);
      } catch {
        // Private browsing can throw on storage access; the event still fires.
      }
      window.dispatchEvent(new Event(VERIFICATION_REQUIRED_EVENT));
    }

    throw error;
  }

  if (response.status === 204 || response.headers.get("content-length") === "0") {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

export type PauseResponse = {
  sessionId: string;
  status: "paused";
  pausedAt: string;
  pauseCount: number;
};

export type ResumeResponse = {
  sessionId: string;
  status: "active";
  totalPausedMs: number;
  pauseCount: number;
};

export const pauseSession  = (sessionId: string) =>
  fetchApi<PauseResponse>(`/sessions/${sessionId}/pause`, { method: "POST" });

export const resumeSession = (sessionId: string) =>
  fetchApi<ResumeResponse>(`/sessions/${sessionId}/resume`, { method: "POST" });
