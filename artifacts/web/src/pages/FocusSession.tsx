import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "react-router-dom";
import { MobileLayout } from "@/components/MobileLayout";
import {
  Play, Pause, Square, ChevronDown, BookOpen, Brain, Dumbbell,
  ChevronLeft, ChevronRight, Sprout, X, Leaf, Timer, Zap, Lock, AlertTriangle,
  Heart, Send, SkipForward, Volume2, VolumeX, CalendarDays,
} from "lucide-react";
import { useUser } from "@/context/UserContext";
import { useSession } from "@/context/SessionContext";
import { fetchApi, pauseSession as apiPauseSession, resumeSession as apiResumeSession } from "@/utils/api";
import { useToast } from "@/hooks/use-toast";
import { PLANT_CATALOG } from "@/constants/plants";
import { useAmbientSound } from "@/hooks/useAmbientSound";
import { AmbientSoundPicker } from "@/components/AmbientSoundPicker";
import { useInventory } from "@/hooks/useInventory";
import { useMotivationMessage } from "@/hooks/useMotivationMessage";
import PlantArt, { stageForGrowth } from "@/components/garden/PlantArt";

const SESSION_TYPES = [
  { id: "routine",    label: "Routine",    icon: BookOpen, multiplier: 1 },
  { id: "homework",   label: "Homework",   icon: Dumbbell, multiplier: 2 },
  { id: "deep_focus", label: "Deep Focus", icon: Brain,    multiplier: 3 },
];

type TimerMode = "countdown" | "stopwatch";

const MAX_COUNTDOWN_MINS  = 120;
const PLANT_INTERVAL_MINS = 25;

interface PlantRecord {
  id: string; subjectId: string | null; subjectName: string;
  plantType: string; growthLevel: number; growthPoints: number;
  maxGrowthPoints: number; accentColor: string; withered?: boolean;
}

// ─── Circular Duration Picker ──────────────────────────────────────────────────
const CX = 50, CY = 50, R = 44;

function polarToCartesian(angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: CX + R * Math.cos(rad), y: CY + R * Math.sin(rad) };
}

function describeArc(endAngleDeg: number) {
  if (endAngleDeg <= 0) return "";
  if (endAngleDeg >= 360) return `M ${CX} ${CY - R} A ${R} ${R} 0 1 1 ${CX - 0.001} ${CY - R} Z`;
  const start = polarToCartesian(0);
  const end   = polarToCartesian(endAngleDeg);
  return `M ${start.x} ${start.y} A ${R} ${R} 0 ${endAngleDeg > 180 ? 1 : 0} 1 ${end.x} ${end.y}`;
}

function CircularPicker({
  minutes, onChange, disabled, children,
}: { minutes: number; onChange: (m: number) => void; disabled: boolean; children: React.ReactNode }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const dragging     = useRef(false);

  const getMinutes = (clientX: number, clientY: number) => {
    const el = containerRef.current;
    if (!el) return minutes;
    const rect = el.getBoundingClientRect();
    let angle = (Math.atan2(clientY - rect.top - rect.height / 2, clientX - rect.left - rect.width / 2) * 180) / Math.PI;
    angle = (angle + 90 + 360) % 360;
    const snapped = Math.round((angle / 360) * MAX_COUNTDOWN_MINS / 5) * 5;
    return Math.max(5, Math.min(snapped, MAX_COUNTDOWN_MINS));
  };

  const onDown  = (cx: number, cy: number) => { if (!disabled) { dragging.current = true; onChange(getMinutes(cx, cy)); } };
  const onMove  = (cx: number, cy: number) => { if (dragging.current && !disabled) onChange(getMinutes(cx, cy)); };
  const onUp    = () => { dragging.current = false; };

  const angleDeg  = (minutes / MAX_COUNTDOWN_MINS) * 360;
  const handlePos = polarToCartesian(angleDeg);
  const arcPath   = describeArc(angleDeg);

  return (
    <div
      ref={containerRef}
      className="relative w-52 h-52 touch-none select-none"
      onMouseMove={(e) => onMove(e.clientX, e.clientY)}
      onMouseUp={onUp} onMouseLeave={onUp}
      onTouchMove={(e) => { e.preventDefault(); onMove(e.touches[0].clientX, e.touches[0].clientY); }}
      onTouchEnd={onUp}
    >
      <svg className="w-full h-full" viewBox="0 0 100 100">
        <circle cx={CX} cy={CY} r={R} fill="none" stroke="transparent" strokeWidth="18"
          className={disabled ? "" : "cursor-pointer"}
          onMouseDown={(e) => { e.preventDefault(); onDown(e.clientX, e.clientY); }}
          onTouchStart={(e) => { e.preventDefault(); onDown(e.touches[0].clientX, e.touches[0].clientY); }}
        />
        <circle cx={CX} cy={CY} r={R} fill="none" stroke="hsl(var(--muted))" strokeWidth="6" />
        {arcPath && <path d={arcPath} fill="none" stroke="hsl(var(--primary))" strokeWidth="6" strokeLinecap="round" />}
        {Array.from({ length: 24 }, (_, i) => {
          const a = (i / 24) * 360;
          const inner = polarToCartesian(a);
          const outerR = R + 3;
          const outerRad = ((a - 90) * Math.PI) / 180;
          return (
            <line key={i}
              x1={inner.x} y1={inner.y}
              x2={CX + outerR * Math.cos(outerRad)} y2={CY + outerR * Math.sin(outerRad)}
              stroke={i % 6 === 0 ? "hsl(var(--muted-foreground))" : "hsl(var(--muted))"}
              strokeWidth={i % 6 === 0 ? 1 : 0.5} opacity={0.4}
            />
          );
        })}
        <circle cx={handlePos.x} cy={handlePos.y} r="5"
          fill="hsl(var(--primary))" stroke="hsl(var(--background))" strokeWidth="1.5"
          className={disabled ? "opacity-40" : "cursor-grab active:cursor-grabbing"}
          onMouseDown={(e) => { e.preventDefault(); onDown(e.clientX, e.clientY); }}
          onTouchStart={(e) => { e.preventDefault(); onDown(e.touches[0].clientX, e.touches[0].clientY); }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        {children}
      </div>
    </div>
  );
}

function ProgressRing({
  progress, children,
}: { progress: number; children: React.ReactNode }) {
  return (
    <div className="relative w-52 h-52">
      <svg className="w-full h-full" viewBox="0 0 100 100">
        <circle cx={CX} cy={CY} r={R} fill="none" stroke="hsl(var(--muted))" strokeWidth="6" />
        {describeArc(Math.min(progress * 360, 359.99)) && (
          <path d={describeArc(Math.min(progress * 360, 359.99))} fill="none"
            stroke="hsl(var(--primary))" strokeWidth="6" strokeLinecap="round" />
        )}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">{children}</div>
    </div>
  );
}

// ─── Plant Carousel ────────────────────────────────────────────────────────────
function PlantCarousel({ index, onChange, disabled }: { index: number; onChange: (i: number) => void; disabled: boolean }) {
  const startX = useRef<number | null>(null);
  const prev   = () => onChange((index - 1 + PLANT_CATALOG.length) % PLANT_CATALOG.length);
  const next   = () => onChange((index + 1) % PLANT_CATALOG.length);
  const plant  = PLANT_CATALOG[index];

  return (
    <div className="flex flex-col items-center gap-1 select-none"
      onTouchStart={(e) => { startX.current = e.touches[0].clientX; }}
      onTouchEnd={(e) => {
        if (startX.current === null || disabled) return;
        const dx = e.changedTouches[0].clientX - startX.current;
        if (Math.abs(dx) > 30) dx < 0 ? next() : prev();
        startX.current = null;
      }}
    >
      <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-widest">Choose Plant</p>
      <div className="flex items-center gap-4 mt-1">
        <button onClick={prev} disabled={disabled} className="w-8 h-8 rounded-full glass flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors disabled:opacity-30">
          <ChevronLeft size={16} />
        </button>
        <div className="flex flex-col items-center gap-0.5 w-28">
          <PlantArt type={plant.id} stage={4} className="w-14 h-14 drop-shadow-md transition-all duration-300" />
          <p className="text-sm font-semibold text-foreground">{plant.name}</p>
          <p className="text-[11px] text-muted-foreground">{plant.desc}</p>
        </div>
        <button onClick={next} disabled={disabled} className="w-8 h-8 rounded-full glass flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors disabled:opacity-30">
          <ChevronRight size={16} />
        </button>
      </div>
      <div className="flex gap-1 mt-1.5">
        {PLANT_CATALOG.map((_, i) => (
          <div key={i} className={`h-1.5 rounded-full transition-all ${i === index ? "bg-primary w-3" : "bg-muted w-1.5"}`} />
        ))}
      </div>
    </div>
  );
}

// ─── Wallet Modal ──────────────────────────────────────────────────────────────
function WalletModal({ open, onClose, plants }: { open: boolean; onClose: () => void; plants: PlantRecord[] }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-h-[75vh] bg-card rounded-t-3xl border-t border-border flex flex-col shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border/50">
          <div className="flex items-center gap-2">
            <Sprout size={18} className="text-primary" />
            <span className="font-semibold text-foreground">My Plants</span>
            <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">{plants.length}</span>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full glass flex items-center justify-center text-muted-foreground hover:text-foreground">
            <X size={16} />
          </button>
        </div>
        <div className="overflow-y-auto flex-1 p-4 space-y-3">
          {plants.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground text-sm">
              <Leaf size={32} className="mx-auto mb-3 opacity-30" />
              <p>No plants yet.</p>
              <p className="text-xs mt-1">Complete a focus session to grow your first plant.</p>
            </div>
          ) : plants.map((plant) => {
            const cat = PLANT_CATALOG.find((c) => c.id === plant.plantType) ?? PLANT_CATALOG[1];
            const pct = Math.floor((plant.growthPoints / plant.maxGrowthPoints) * 100);
            return (
              <div key={plant.id} className="glass rounded-xl p-3 flex items-center gap-3">
                <PlantArt type={cat.id} stage={plant.withered ? "withered" : stageForGrowth(plant.growthLevel)} className="w-12 h-12 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <p className="text-sm font-semibold text-foreground">{cat.name}</p>
                    <span className="text-xs text-muted-foreground">Lv.{plant.growthLevel}</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground mb-1.5 truncate">
                    {plant.subjectId ? plant.subjectName : "General Progress"}
                  </p>
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                    <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{plant.growthPoints}/{plant.maxGrowthPoints} pts</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Helpers ───────────────────────────────────────────────────────────────────
function formatTime(secs: number) {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = Math.floor(secs % 60);
  if (h > 0) return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function FocusSession() {
  const location = useLocation();
  const navSubjectId = (location.state as { subjectId?: string } | null)?.subjectId ?? "";
  const { subjects, refreshData }   = useUser();
  const { equipped }                = useInventory();
  const focusBg                     = equipped.focus_bg;
  const { toast }                   = useToast();
  const {
    session, elapsedSecs, plantsEarned, timeLeft,
    startSession,
    pauseSession: ctxPauseSession,
    resumeSession: ctxResumeSession,
    completeSession, stopSession,
    setAutoCompleteCallback,
  } = useSession();

  // Local UI state (doesn't need to survive navigation)
  const [timerMode, setTimerMode]             = useState<TimerMode>(session?.mode ?? "countdown");
  const [plantIndex, setPlantIndex]           = useState(session?.plantIndex ?? 0);
  const [sessionType, setSessionType]         = useState(SESSION_TYPES.find(t => t.id === session?.sessionTypeId) ?? SESSION_TYPES[0]);
  const [selectedSubjectId, setSelectedSubjectId] = useState(session?.subjectId ?? navSubjectId);
  const [countdownMins, setCountdownMins]     = useState(session?.countdownMins ?? 25);
  const [showSubjectPicker, setShowSubjectPicker] = useState(false);
  const [loading, setLoading]                 = useState(false);
  const [showWallet, setShowWallet]           = useState(false);
  const [showGoalPicker, setShowGoalPicker]   = useState(false);
  const [selectedGoalId, setSelectedGoalId]   = useState("");
  const [plants, setPlants]                   = useState<PlantRecord[]>([]);
  const [done, setDone]                       = useState(false);

  // Pause tracking — pauseCountRef keeps the latest count for the auto-complete closure
  const pauseCountRef                         = useRef(0);
  const [pauseCount, setPauseCount]           = useState(0);
  const [completionPauseCount, setCompletionPauseCount] = useState(0);
  const [completionActualMins, setCompletionActualMins] = useState(0);

  const [receivedMessage, setReceivedMessage] = useState<{ id: string; content: string; source?: string } | null>(null);
  const [messageText, setMessageText]         = useState("");
  const [messageSent, setMessageSent]         = useState(false);
  const [messageSending, setMessageSending]   = useState(false);
  const [messageSkipped, setMessageSkipped]   = useState(false);
  const [lastSessionId, setLastSessionId]     = useState<string | null>(null);
  const [wasCompleted, setWasCompleted]       = useState(false);
  const [showSoundPicker, setShowSoundPicker] = useState(false);

  const { sound, volume, isPlaying, setSound, setVolume, SOUND_META } = useAmbientSound();
  const { message: motivationMessage, refetch: refetchMotivation } = useMotivationMessage();

  // Sync local defaults from active session (on page enter)
  useEffect(() => {
    if (session) {
      setTimerMode(session.mode);
      setPlantIndex(session.plantIndex);
      setSessionType(SESSION_TYPES.find(t => t.id === session.sessionTypeId) ?? SESSION_TYPES[0]);
      setSelectedSubjectId(session.subjectId);
      setCountdownMins(session.countdownMins);
      setSelectedGoalId(session.calendarItemId || "");
    }
  }, [session?.sessionId]);

  const { data: calendarItems = [] } = useQuery({
    queryKey: ["calendar"],
    queryFn: () => fetchApi("/calendar"),
  });

  useEffect(() => {
    fetchApi<PlantRecord[]>("/plants").then(setPlants).catch(() => {});
  }, []);

  const isIdle    = !session && !done;
  const isRunning = !!session && session.state === "running";
  const isPaused  = !!session && session.state === "paused";
  const isActive  = isRunning || isPaused;
  const isDone    = done;

  // Register auto-complete callback for when countdown hits 0 in SessionContext
  useEffect(() => {
    setAutoCompleteCallback((info) => {
      fetchApi<PlantRecord[]>("/plants").then(setPlants).catch(() => {});
      refreshData();
      fetchApi<{ id: string; content: string; source?: string }>("/messages/random")
        .then(setReceivedMessage)
        .catch(() => {
          setReceivedMessage({ id: "fallback", content: "Every session you complete is a step forward. Keep going — you're building something great!", source: "system" });
        });
      setLastSessionId(info.sessionId);
      setCompletionActualMins(info.actualMinutes);
      setCompletionPauseCount(pauseCountRef.current);
      setWasCompleted(true);
      setDone(true);
      setSound("off");
      toast({ title: "Session complete!", description: "Time's up — great focus session!" });
    });
    return () => setAutoCompleteCallback(null);
  }, [setAutoCompleteCallback]);

  const isDeepFocus = session?.sessionTypeId === "deep_focus" && isActive;
  const [showDeepFocusExitModal, setShowDeepFocusExitModal] = useState(false);

  useEffect(() => {
    if (!isDeepFocus) return;
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    history.pushState(null, "", window.location.href);
    const handlePopState = () => {
      history.pushState(null, "", window.location.href);
      setShowDeepFocusExitModal(true);
    };
    window.addEventListener("popstate", handlePopState);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      window.removeEventListener("popstate", handlePopState);
    };
  }, [isDeepFocus]);

  const handleStart = async () => {
    setLoading(true);
    setDone(false);
    refetchMotivation();
    try {
      await startSession({
        plantIndex,
        plantType:            PLANT_CATALOG[plantIndex].id,
        sessionTypeId:        sessionType.id,
        sessionTypeMultiplier: sessionType.multiplier,
        subjectId:            selectedSubjectId || undefined,
        subjectName:          subjects.find(s => s.id === selectedSubjectId)?.name,
        calendarItemId:       selectedGoalId || undefined,
        countdownMins,
        mode: timerMode,
      });
    } catch {
      toast({ title: "Error", description: "Could not start session", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handlePause = async () => {
    if (!session) return;
    ctxPauseSession(); // freeze UI immediately
    try {
      const res = await apiPauseSession(session.sessionId);
      pauseCountRef.current = res.pauseCount;
      setPauseCount(res.pauseCount);
    } catch {
      ctxResumeSession(); // revert on API failure
      toast({ title: "Couldn't pause", description: "Please try again", variant: "destructive" });
    }
  };

  const handleResume = async () => {
    if (!session) return;
    try {
      const res = await apiResumeSession(session.sessionId);
      pauseCountRef.current = res.pauseCount;
      setPauseCount(res.pauseCount);
      ctxResumeSession(); // unfreeze UI only after backend confirms
    } catch {
      // Keep paused if resume fails — do not revert
      toast({ title: "Couldn't resume", description: "Please try again", variant: "destructive" });
    }
  };

  const handleComplete = async () => {
    setLoading(true);
    const currentSessionId = session?.sessionId ?? null;
    try {
      const { actualMinutes, earned } = await completeSession();
      setCompletionActualMins(actualMinutes);
      setCompletionPauseCount(pauseCountRef.current);
      const updated = await fetchApi<PlantRecord[]>("/plants");
      setPlants(updated);
      await refreshData();
      if (currentSessionId) setLastSessionId(currentSessionId);
      fetchApi<{ id: string; content: string; source?: string }>("/messages/random")
        .then(setReceivedMessage)
        .catch(() => {
          setReceivedMessage({ id: "fallback", content: "Every session you complete is a step forward. Keep going — you're building something great!", source: "system" });
        });
      setWasCompleted(true);
      setDone(true);
      toast({
        title: "Session complete!",
        description: earned > 0
          ? `${actualMinutes} min studied. ${earned} plant${earned > 1 ? "s" : ""} grew!`
          : `${actualMinutes} min recorded. Reach 25 min to grow a plant.`,
      });
    } catch {
      toast({ title: "Session saved", description: "Great work!" });
      setDone(true);
    } finally {
      setLoading(false);
    }
  };

  const handleStop = async () => {
    setLoading(true);
    const currentSessionId = session?.sessionId ?? null;
    try {
      const { actualMinutes, earned } = await stopSession();
      const updated = await fetchApi<PlantRecord[]>("/plants");
      setPlants(updated);
      await refreshData();
      if (currentSessionId) setLastSessionId(currentSessionId);
      setDone(true);
      toast({
        title: "Session stopped",
        description: earned > 0
          ? `${actualMinutes} min studied. ${earned} plant${earned > 1 ? "s" : ""} grew!`
          : `${actualMinutes} min recorded. Need 25 min to earn a plant.`,
      });
    } catch {
      toast({ title: "Error", description: "Could not save session", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const resetSession = () => {
    setDone(false);
    setReceivedMessage(null);
    setMessageText("");
    setMessageSent(false);
    setMessageSending(false);
    setMessageSkipped(false);
    setLastSessionId(null);
    setWasCompleted(false);
    pauseCountRef.current = 0;
    setPauseCount(0);
    setCompletionPauseCount(0);
    setCompletionActualMins(0);
  };

  const NEGATIVE_WORDS = ["stupid", "dumb", "worthless", "idiot", "useless", "failure", "loser", "hate", "kill", "die"];

  const handleSendMessage = async () => {
    const trimmed = messageText.trim();
    if (trimmed.length < 5) {
      toast({ title: "Too short", description: "Write at least a sentence", variant: "destructive" });
      return;
    }
    if (trimmed.length > 200) {
      toast({ title: "Too long", description: "Keep it to 1-2 sentences", variant: "destructive" });
      return;
    }
    const lower = trimmed.toLowerCase();
    if (NEGATIVE_WORDS.some((w) => lower.includes(w))) {
      toast({ title: "Keep it positive", description: "Please write an encouraging message", variant: "destructive" });
      return;
    }
    setMessageSending(true);
    try {
      await fetchApi("/messages", {
        method: "POST",
        body: JSON.stringify({ content: trimmed, sessionId: lastSessionId }),
      });
      setMessageSent(true);
      toast({ title: "Message sent!", description: "Your words will encourage another student" });
    } catch {
      toast({ title: "Couldn't send", description: "Please try again", variant: "destructive" });
    } finally {
      setMessageSending(false);
    }
  };

  const selectedSubject   = subjects.find((s) => s.id === selectedSubjectId);
  const activePlantType   = PLANT_CATALOG[plantIndex].id;
  const previewPlants     = Math.floor(countdownMins / PLANT_INTERVAL_MINS);
  const actualElapsedMins = Math.floor(elapsedSecs / 60);
  const countdownProgress = session?.mode === "countdown" && session.countdownMins > 0
    ? 1 - timeLeft / (session.countdownMins * 60) : 0;
  const stopwatchProgress = Math.min(elapsedSecs / (MAX_COUNTDOWN_MINS * 60), 1);

  return (
    <MobileLayout>
      {focusBg?.colorValue && (
        <div
          className="fixed inset-0 pointer-events-none z-0 opacity-20 transition-all duration-700"
          style={{ backgroundColor: focusBg.colorValue }}
        />
      )}
      <div className="px-5 pt-5 pb-24 space-y-4 relative z-10">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-serif text-foreground flex items-center gap-2">
              <Leaf size={20} className="text-primary" /> Focus Session
            </h1>
            <div className="flex items-center gap-2 mt-0.5">
              <p className="text-sm text-muted-foreground">Grow your plants while you study</p>
              {(isActive || isDone) && session && (
                <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  session.sessionTypeId === "deep_focus"
                    ? "bg-destructive/15 text-destructive"
                    : session.sessionTypeId === "homework"
                    ? "bg-accent/20 text-accent-foreground"
                    : "bg-primary/10 text-primary"
                }`}>
                  {session.sessionTypeId === "deep_focus" && <Lock size={9} />}
                  {SESSION_TYPES.find(t => t.id === session.sessionTypeId)?.label ?? "Routine"}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowSoundPicker(true)}
              className={`w-10 h-10 rounded-full glass flex items-center justify-center transition-colors relative ${isPlaying ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}
            >
              {isPlaying ? <Volume2 size={18} /> : <VolumeX size={18} />}
              {isPlaying && (
                <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-primary rounded-full animate-pulse" />
              )}
            </button>
            <button onClick={() => setShowWallet(true)}
              title="My Plants"
              className="w-10 h-10 rounded-full glass flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors relative">
              <Sprout size={18} />
              {plants.length > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-primary rounded-full text-[9px] text-primary-foreground flex items-center justify-center font-bold">
                  {plants.length}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Plant Carousel */}
        <div className="glass rounded-2xl p-4">
          <PlantCarousel index={plantIndex} onChange={setPlantIndex} disabled={isActive} />
        </div>

        {/* Mode Toggle (idle only) */}
        {isIdle && (
          <div className="glass rounded-xl p-1 grid grid-cols-2 gap-1">
            {(["countdown", "stopwatch"] as TimerMode[]).map((mode) => (
              <button key={mode}
                onClick={() => setTimerMode(mode)}
                className={`flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium transition-all ${timerMode === mode ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
              >
                {mode === "countdown" ? <Timer size={15} /> : <Zap size={15} />}
                {mode === "countdown" ? "Countdown" : "Stopwatch"}
              </button>
            ))}
          </div>
        )}

        {/* Timer Circle */}
        <div className="flex flex-col items-center gap-3">

          {/* Countdown idle — circular picker */}
          {timerMode === "countdown" && isIdle && (
            <CircularPicker minutes={countdownMins} onChange={setCountdownMins} disabled={false}>
              <PlantArt type={activePlantType} stage={4} className="w-14 h-14 mb-0.5" />
              <span className="text-3xl font-bold text-foreground font-mono leading-none">
                {String(countdownMins).padStart(2, "0")}m
              </span>
              <span className="text-[11px] text-muted-foreground mt-0.5">
                {previewPlants > 0 ? `${previewPlants} plant${previewPlants > 1 ? "s" : ""} will grow` : "Drag to set time"}
              </span>
            </CircularPicker>
          )}

          {/* Stopwatch idle */}
          {timerMode === "stopwatch" && isIdle && (
            <ProgressRing progress={0}>
              <PlantArt type={activePlantType} stage={4} className="w-14 h-14 mb-0.5" />
              <span className="text-3xl font-bold text-foreground font-mono leading-none">00:00</span>
              <span className="text-[11px] text-muted-foreground mt-0.5">Ready</span>
            </ProgressRing>
          )}

          {/* Active countdown */}
          {session?.mode === "countdown" && isActive && (
            <div className={`transition-opacity duration-300 ${isPaused ? "opacity-60" : "opacity-100"}`}>
              <ProgressRing progress={countdownProgress}>
                <PlantArt type={activePlantType} stage={4} className={`w-14 h-14 mb-0.5 ${isRunning ? "animate-float" : ""}`} />
                <span className="text-3xl font-bold text-foreground font-mono leading-none">{formatTime(timeLeft)}</span>
                {isPaused ? (
                  <span className="flex items-center gap-1 text-[11px] text-amber-500 mt-0.5 font-medium">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                    Paused
                  </span>
                ) : (
                  <span className="text-[11px] text-muted-foreground mt-0.5">Focusing</span>
                )}
              </ProgressRing>
            </div>
          )}

          {/* Active stopwatch */}
          {session?.mode === "stopwatch" && isActive && (
            <div className={`transition-opacity duration-300 ${isPaused ? "opacity-60" : "opacity-100"}`}>
              <ProgressRing progress={stopwatchProgress}>
                <PlantArt type={activePlantType} stage={4} className={`w-14 h-14 mb-0.5 ${isRunning ? "animate-float" : ""}`} />
                <span className="text-3xl font-bold text-foreground font-mono leading-none">{formatTime(elapsedSecs)}</span>
                {isPaused ? (
                  <span className="flex items-center gap-1 text-[11px] text-amber-500 mt-0.5 font-medium">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                    Paused
                  </span>
                ) : (
                  <span className="text-[11px] text-muted-foreground mt-0.5">Focusing</span>
                )}
              </ProgressRing>
            </div>
          )}

          {/* Done */}
          {isDone && (
            <ProgressRing progress={1}>
              <PlantArt type={activePlantType} stage={4} className="w-14 h-14 mb-0.5" />
              <span className="text-xl font-bold text-primary font-mono">Done!</span>
              <span className="text-[11px] text-muted-foreground mt-0.5">
                {completionActualMins > 0 ? `${completionActualMins}m studied` : `${actualElapsedMins}m studied`}
              </span>
            </ProgressRing>
          )}

          {/* Controls */}
          <div className="flex gap-3 items-center">
            {isIdle && (
              <button onClick={handleStart} disabled={loading}
                className="flex items-center gap-2 bg-primary text-primary-foreground px-8 py-3 rounded-full font-semibold shadow-lg hover:opacity-90 transition-all active:scale-95 disabled:opacity-50">
                <Play size={18} fill="currentColor" /> Start
              </button>
            )}
            {isActive && (
              <>
                {isRunning ? (
                  <button onClick={handlePause}
                    className="w-12 h-12 rounded-full glass flex items-center justify-center hover:bg-card/80 transition-all">
                    <Pause size={20} className="text-foreground" />
                  </button>
                ) : (
                  <button onClick={handleResume}
                    className="flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2.5 rounded-full font-semibold shadow-lg hover:opacity-90 transition-all active:scale-95">
                    <Play size={16} fill="currentColor" /> Resume
                  </button>
                )}
                <button onClick={handleComplete} disabled={isPaused || loading}
                  className="flex items-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-full font-semibold shadow-lg hover:opacity-90 transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed">
                  Complete
                </button>
                <button onClick={handleStop} disabled={loading}
                  className="w-12 h-12 rounded-full glass flex items-center justify-center hover:bg-card/80 transition-all disabled:opacity-40">
                  <Square size={18} className="text-muted-foreground" />
                </button>
              </>
            )}
            {isDone && (
              <button onClick={resetSession}
                className="flex items-center gap-2 bg-primary text-primary-foreground px-8 py-3 rounded-full font-semibold shadow-lg hover:opacity-90 transition-all active:scale-95">
                New Session
              </button>
            )}
          </div>
        </div>

        {/* ── DONE STATE: Pause stats ─────────────────────────────────────── */}
        {isDone && wasCompleted && completionPauseCount > 0 && (
          <div className="glass rounded-xl px-4 py-3 text-center">
            <p className="text-xs text-muted-foreground">
              Paused {completionPauseCount} time{completionPauseCount !== 1 ? "s" : ""} — actual study time:{" "}
              <span className="font-semibold text-foreground">{completionActualMins} min</span>
            </p>
          </div>
        )}

        {/* ── DONE STATE: Human message received ─────────────────────────── */}
        {isDone && wasCompleted && receivedMessage && (
          <div className="rounded-2xl p-4 space-y-2 border border-[hsl(var(--accent)/0.4)] bg-[hsl(var(--accent)/0.08)]">
            <div className="flex items-center gap-2">
              <Heart size={14} className="text-accent flex-shrink-0" fill="currentColor" />
              <span className="text-[10px] font-bold text-accent uppercase tracking-wider">
                {receivedMessage.source === "human" ? "From a real student" : "Daily encouragement"}
              </span>
            </div>
            <p className="text-sm text-foreground leading-relaxed italic font-medium">
              &ldquo;{receivedMessage.content}&rdquo;
            </p>
            <p className="text-[10px] text-muted-foreground">
              {receivedMessage.source === "human"
                ? "Someone who just finished studying sent this to you ✨"
                : "Be the first to leave a message for someone else!"}
            </p>
          </div>
        )}

        {/* ── DONE STATE: Write a message prompt ──────────────────────────── */}
        {isDone && wasCompleted && !messageSent && !messageSkipped && (
          <div className="glass rounded-2xl p-4 space-y-3 border border-border/60">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Send size={14} className="text-primary" />
                <span className="text-sm font-semibold text-foreground">Encourage another student</span>
              </div>
              <button
                onClick={() => setMessageSkipped(true)}
                className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
              >
                <SkipForward size={12} /> Skip
              </button>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Write 1–2 sentences. It will reach a real student anonymously after their next session.
            </p>
            <textarea
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              placeholder="You can do this. Every session matters..."
              maxLength={200}
              rows={3}
              className="w-full bg-muted/50 border border-border rounded-xl px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-none"
            />
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-muted-foreground">{messageText.length}/200</span>
              <button
                onClick={handleSendMessage}
                disabled={messageSending || messageText.trim().length < 5}
                className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-xl text-sm font-semibold hover:opacity-90 transition-all active:scale-95 disabled:opacity-40"
              >
                {messageSending ? (
                  <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Send size={13} />
                )}
                Send
              </button>
            </div>
          </div>
        )}

        {/* ── DONE STATE: Message sent confirmation ───────────────────────── */}
        {isDone && wasCompleted && messageSent && (
          <div className="rounded-2xl p-4 flex items-center gap-3 border border-primary/30 bg-primary/5">
            <Heart size={18} className="text-primary flex-shrink-0" fill="currentColor" />
            <div>
              <p className="text-sm font-semibold text-foreground">Message sent!</p>
              <p className="text-xs text-muted-foreground">Your words are on their way to a fellow student.</p>
            </div>
          </div>
        )}

        {/* Session Type (idle only) */}
        {isIdle && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Session Type</p>
            <div className="grid grid-cols-3 gap-2">
              {SESSION_TYPES.map((t) => {
                const Icon   = t.icon;
                const active = sessionType.id === t.id;
                return (
                  <button key={t.id} onClick={() => setSessionType(t)}
                    className={`rounded-xl p-3 text-center transition-all ${active ? "bg-primary text-primary-foreground" : "glass text-foreground hover:bg-card/80"}`}>
                    <Icon size={17} className="mx-auto mb-1" />
                    <p className="text-xs font-medium">{t.label}</p>
                    <p className={`text-[10px] ${active ? "text-primary-foreground/70" : "text-muted-foreground"}`}>x{t.multiplier} pts</p>
                  </button>
                );
              })}
            </div>
          </div>
        )}
        {/* Goal Picker (idle only) */}
        {isIdle && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Goal / Task</p>
              <span className="text-[10px] text-muted-foreground italic">Optional</span>
            </div>
            {calendarItems.filter(i => !i.completed).length === 0 ? (
              <div className="glass rounded-xl p-3 text-center text-xs text-muted-foreground">
                No upcoming tasks. Add them on Dashboard.
              </div>
            ) : (
              <>
                <button onClick={() => setShowGoalPicker(!showGoalPicker)}
                  className="w-full glass rounded-xl p-3.5 flex items-center justify-between">
                  <span className="text-sm text-foreground">
                    {calendarItems.find(i => i.id === selectedGoalId)?.title || "No specific goal"}
                  </span>
                  <ChevronDown size={15} className="text-muted-foreground" />
                </button>
                {showGoalPicker && (
                  <div className="glass rounded-xl overflow-hidden mt-1">
                    <button onClick={() => { setSelectedGoalId(""); setShowGoalPicker(false); }}
                      className={`w-full text-left px-4 py-3 text-sm hover:bg-card/80 transition-all border-b border-border/50 ${!selectedGoalId ? "text-primary font-medium" : "text-foreground"}`}>
                      No specific goal
                    </button>
                    {calendarItems.filter(i => !i.completed).map((i) => (
                      <button key={i.id} onClick={() => { 
                        setSelectedGoalId(i.id); 
                        if (i.subjectId) setSelectedSubjectId(i.subjectId);
                        setShowGoalPicker(false); 
                      }}
                        className={`w-full text-left px-4 py-3 text-sm hover:bg-card/80 transition-all border-b border-border/50 last:border-b-0 ${selectedGoalId === i.id ? "text-primary font-medium" : "text-foreground"}`}>
                        <div className="flex items-center justify-between">
                          <span>{i.title}</span>
                          {i.subjectName && <span className="text-[10px] opacity-70 px-1.5 py-0.5 rounded bg-primary/10">{i.subjectName}</span>}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Active session info */}
        {isActive && (
          <div className="glass rounded-xl p-4">
            <div className="grid grid-cols-3 gap-2 text-center">
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Plant</p>
                <p className="text-sm font-medium text-foreground">{PLANT_CATALOG[plantIndex].name}</p>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Elapsed</p>
                <p className="text-sm font-medium text-foreground">{formatTime(elapsedSecs)}</p>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Plants</p>
                <p className="text-sm font-medium text-foreground">
                  {plantsEarned > 0
                    ? `+${plantsEarned}`
                    : `${PLANT_INTERVAL_MINS - (actualElapsedMins % PLANT_INTERVAL_MINS || PLANT_INTERVAL_MINS)}m left`}
                </p>
              </div>
            </div>
            {session?.subjectName && (
              <div className="mt-3 pt-3 border-t border-border/50 text-center">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Subject</p>
                <p className="text-sm font-medium text-foreground">{session.subjectName}</p>
              </div>
            )}
            {session?.calendarItemTitle && (
              <div className="mt-3 pt-3 border-t border-border/50 flex items-center justify-center gap-1.5">
                <CalendarDays size={12} className="text-muted-foreground flex-shrink-0" />
                <p className="text-xs text-muted-foreground truncate">
                  Linked to:{" "}
                  <span className="font-medium text-foreground">{session.calendarItemTitle}</span>
                </p>
              </div>
            )}
          </div>
        )}

        {/* Motivation message — shown while session is active */}
        {isActive && motivationMessage && (
          <p className="text-xs text-muted-foreground italic text-center leading-relaxed px-2">
            &ldquo;{motivationMessage.content}&rdquo;
          </p>
        )}
      </div>

      <WalletModal open={showWallet} onClose={() => setShowWallet(false)} plants={plants} />

      <AmbientSoundPicker
        open={showSoundPicker}
        onClose={() => setShowSoundPicker(false)}
        sound={sound}
        volume={volume}
        onSoundChange={setSound}
        onVolumeChange={setVolume}
        SOUND_META={SOUND_META}
      />

      {/* Deep Focus Exit Warning Modal */}
      {showDeepFocusExitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-5">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div className="relative w-full max-w-sm bg-card rounded-2xl p-6 shadow-2xl border border-destructive/30 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center flex-shrink-0">
                <Lock size={20} className="text-destructive" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground text-base">Deep Focus Lock Active</h3>
                <p className="text-xs text-muted-foreground">Your session is still running</p>
              </div>
            </div>
            <div className="bg-destructive/10 rounded-xl p-3 flex items-start gap-2">
              <AlertTriangle size={15} className="text-destructive flex-shrink-0 mt-0.5" />
              <p className="text-sm text-destructive">
                Leaving now will stop your Deep Focus session and count as an early exit. Your plant progress up to now will still be saved.
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeepFocusExitModal(false)}
                className="flex-1 py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 transition-all"
              >
                Stay Focused
              </button>
              <button
                onClick={async () => {
                  setShowDeepFocusExitModal(false);
                  await handleStop();
                }}
                className="flex-1 py-3 rounded-xl border border-border text-muted-foreground font-medium text-sm hover:bg-muted/60 transition-all"
              >
                End Session
              </button>
            </div>
          </div>
        </div>
      )}
    </MobileLayout>
  );
}
