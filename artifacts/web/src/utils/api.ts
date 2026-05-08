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
    throw new Error(`API error ${response.status}: ${text}`);
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
