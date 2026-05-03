import {
  createContext, useContext, useState, useEffect, useCallback, useRef,
} from "react";
import { fetchApi } from "@/utils/api";

const STORAGE_KEY           = "focusoura_active_session";
const PLANT_INTERVAL_MINS   = 25;

// ─── Types ────────────────────────────────────────────────────────────────────
export interface StoredSession {
  sessionId:            string;
  mode:                 "countdown" | "stopwatch";
  plantIndex:           number;
  plantType:            string;
  sessionTypeId:        string;
  sessionTypeMultiplier: number;
  subjectId:            string;
  subjectName:          string;
  countdownMins:        number;
  startTimestamp:       number;   // Date.now() when timer last started/resumed
  accumulatedSecs:      number;   // Seconds accrued before the current run
  state:                "running" | "paused";
}

export interface StartSessionParams {
  plantIndex:           number;
  plantType:            string;
  sessionTypeId:        string;
  sessionTypeMultiplier: number;
  subjectId?:           string;
  subjectName?:         string;
  countdownMins:        number;
  mode:                 "countdown" | "stopwatch";
}

export interface AutoCompleteInfo {
  sessionId:     string;
  sessionTypeId: string;
  actualMinutes: number;
}

interface SessionCtx {
  session:        StoredSession | null;
  elapsedSecs:    number;
  plantsEarned:   number;
  timeLeft:       number;   // countdown only; 0 for stopwatch
  startSession:   (p: StartSessionParams) => Promise<void>;
  pauseSession:   () => void;
  resumeSession:  () => void;
  completeSession: () => Promise<{ actualMinutes: number; earned: number }>;
  stopSession:    () => Promise<{ actualMinutes: number; earned: number }>;
  setAutoCompleteCallback: (cb: ((info: AutoCompleteInfo) => void) | null) => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function load(): StoredSession | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as StoredSession) : null;
  } catch { return null; }
}
function save(s: StoredSession | null) {
  if (s) localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  else    localStorage.removeItem(STORAGE_KEY);
}
function getLiveElapsed(s: StoredSession, now: number): number {
  if (s.state === "paused") return s.accumulatedSecs;
  return s.accumulatedSecs + (now - s.startTimestamp) / 1000;
}

// ─── Context ──────────────────────────────────────────────────────────────────
const Ctx = createContext<SessionCtx>({} as SessionCtx);

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession]  = useState<StoredSession | null>(load);
  const [now, setNow]          = useState(Date.now());
  const completingRef          = useRef(false);
  const autoCompleteCallbackRef = useRef<((info: AutoCompleteInfo) => void) | null>(null);

  const setAutoCompleteCallback = useCallback((cb: ((info: AutoCompleteInfo) => void) | null) => {
    autoCompleteCallbackRef.current = cb;
  }, []);

  // Tick every second when running
  useEffect(() => {
    if (!session || session.state !== "running") return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [session?.sessionId, session?.state]);

  // Catch up immediately when returning from background / lock screen
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible") setNow(Date.now());
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
    };
  }, []);

  const elapsedSecs  = session ? getLiveElapsed(session, now) : 0;
  const actualMins   = Math.floor(elapsedSecs / 60);
  const plantsEarned = Math.floor(actualMins / PLANT_INTERVAL_MINS);
  const timeLeft     = session?.mode === "countdown"
    ? Math.max(0, session.countdownMins * 60 - elapsedSecs)
    : 0;

  // Auto-complete when countdown reaches 0
  useEffect(() => {
    if (
      session?.mode === "countdown" &&
      session.state === "running" &&
      timeLeft <= 0 &&
      !completingRef.current
    ) {
      completingRef.current = true;
      const capturedSession = session;
      const actualMins = Math.max(1, Math.floor(getLiveElapsed(capturedSession, Date.now()) / 60));
      fetchApi(`/sessions/${capturedSession.sessionId}`, {
        method: "PUT",
        body: JSON.stringify({ state: "completed", actualMinutes: actualMins }),
      })
        .catch(() => {})
        .finally(() => {
          autoCompleteCallbackRef.current?.({
            sessionId:     capturedSession.sessionId,
            sessionTypeId: capturedSession.sessionTypeId,
            actualMinutes: actualMins,
          });
          setSession(null);
          save(null);
          completingRef.current = false;
        });
    }
  }, [timeLeft, session?.state]);

  const startSession = useCallback(async (p: StartSessionParams) => {
    const res = await fetchApi<{ id: string }>("/sessions", {
      method: "POST",
      body: JSON.stringify({
        plantType:      p.plantType,
        subjectId:      p.subjectId || undefined,
        sessionType:    p.sessionTypeId,
        durationMinutes: p.countdownMins || 1,
      }),
    });
    const s: StoredSession = {
      sessionId:             res.id,
      mode:                  p.mode,
      plantIndex:            p.plantIndex,
      plantType:             p.plantType,
      sessionTypeId:         p.sessionTypeId,
      sessionTypeMultiplier: p.sessionTypeMultiplier,
      subjectId:             p.subjectId  ?? "",
      subjectName:           p.subjectName ?? "",
      countdownMins:         p.countdownMins,
      startTimestamp:        Date.now(),
      accumulatedSecs:       0,
      state:                 "running",
    };
    setSession(s);
    save(s);
  }, []);

  const pauseSession = useCallback(() => {
    setSession((prev) => {
      if (!prev) return prev;
      const accumulated = getLiveElapsed(prev, Date.now());
      const updated = { ...prev, state: "paused" as const, accumulatedSecs: accumulated };
      save(updated);
      return updated;
    });
  }, []);

  const resumeSession = useCallback(() => {
    setSession((prev) => {
      if (!prev) return prev;
      const updated = { ...prev, state: "running" as const, startTimestamp: Date.now() };
      save(updated);
      return updated;
    });
    setNow(Date.now());
  }, []);

  const completeSession = useCallback(async () => {
    if (!session) return { actualMinutes: 0, earned: 0 };
    const actualMins = Math.max(1, Math.floor(getLiveElapsed(session, Date.now()) / 60));
    const earned     = Math.floor(actualMins / PLANT_INTERVAL_MINS);
    try {
      await fetchApi(`/sessions/${session.sessionId}`, {
        method: "PUT",
        body: JSON.stringify({ state: "completed", actualMinutes: actualMins }),
      });
    } catch {}
    setSession(null);
    save(null);
    return { actualMinutes: actualMins, earned };
  }, [session]);

  const stopSession = useCallback(async () => {
    if (!session) return { actualMinutes: 0, earned: 0 };
    const actualMins = Math.max(1, Math.floor(getLiveElapsed(session, Date.now()) / 60));
    const earned     = Math.floor(actualMins / PLANT_INTERVAL_MINS);
    try {
      await fetchApi(`/sessions/${session.sessionId}`, {
        method: "PUT",
        body: JSON.stringify({ state: "aborted", actualMinutes: actualMins }),
      });
    } catch {}
    setSession(null);
    save(null);
    return { actualMinutes: actualMins, earned };
  }, [session]);

  return (
    <Ctx.Provider value={{
      session, elapsedSecs, plantsEarned, timeLeft,
      startSession, pauseSession, resumeSession, completeSession, stopSession,
      setAutoCompleteCallback,
    }}>
      {children}
    </Ctx.Provider>
  );
}

export function useSession() {
  return useContext(Ctx);
}
