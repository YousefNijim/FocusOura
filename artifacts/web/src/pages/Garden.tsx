import { useState, useEffect, useMemo } from "react";
import { MobileLayout } from "@/components/MobileLayout";
import { Plus, ChevronLeft, ChevronRight, Leaf, Lock, Pencil, Trash2, Check, X } from "lucide-react";
import petHappy from "@/assets/pet-happy.png";
import {
  BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, ReferenceLine,
} from "recharts";
import {
  format, addDays, subDays, addWeeks, subWeeks, addMonths, subMonths,
  startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth,
} from "date-fns";
import { useUser } from "@/context/UserContext";
import { fetchApi } from "@/utils/api";
import { useToast } from "@/hooks/use-toast";
import { getPetById, getPetMoodFromKey } from "@/constants/pets";

import plantFern      from "@/assets/garden/plant-fern.png";
import plantRose      from "@/assets/garden/plant-rose.png";
import plantBamboo    from "@/assets/garden/plant-bamboo.png";
import plantCactus    from "@/assets/garden/plant-cactus.png";
import plantSucculent from "@/assets/garden/plant-succulent.png";
import plantBonsai    from "@/assets/garden/plant-bonsai.png";
import plantOrchid    from "@/assets/garden/plant-orchid.png";
import plantLavender  from "@/assets/garden/plant-lavender.png";

const PLANT_IMAGES: Record<string, string> = {
  fern:      plantFern,
  rose:      plantRose,
  bamboo:    plantBamboo,
  cactus:    plantCactus,
  succulent: plantSucculent,
  bonsai:    plantBonsai,
  orchid:    plantOrchid,
  lavender:  plantLavender,
};

type ViewMode = "day" | "week" | "month" | "year";
type Session = {
  id: string; subjectId: string; subjectName: string; sessionType: string;
  state: string; startTime: string; endTime: string | null;
  durationMinutes: number; pointsEarned: number;
};

const colorOptions = [
  "#2D6A4F","#52B788","#74C69D","#B7E4C7","#95D5B2","#40916C","#1B4332","#E9C46A",
];

// ─── Isometric Grid Constants ────────────────────────────────────────────────
const GRID_N    = 5;
const TW        = 72;   // tile iso-width
const TH        = 36;   // tile iso-height
const DEPTH     = 13;   // earth side depth
const SVG_W     = 380;
const ORIG_X    = SVG_W / 2;
const ORIG_Y    = 74;   // top padding for tallest plants
const SVG_H     = ORIG_Y + GRID_N * TH + DEPTH + 18;

// ─── Tile geometry ───────────────────────────────────────────────────────────
function topPts(cx: number, cy: number) {
  return `${cx},${cy-TH/2} ${cx+TW/2},${cy} ${cx},${cy+TH/2} ${cx-TW/2},${cy}`;
}
function leftPts(cx: number, cy: number) {
  return `${cx-TW/2},${cy} ${cx},${cy+TH/2} ${cx},${cy+TH/2+DEPTH} ${cx-TW/2},${cy+DEPTH}`;
}
function rightPts(cx: number, cy: number) {
  return `${cx+TW/2},${cy} ${cx},${cy+TH/2} ${cx},${cy+TH/2+DEPTH} ${cx+TW/2},${cy+DEPTH}`;
}


// ─── Isometric Garden SVG ─────────────────────────────────────────────────────
function IsoGarden({ plants, subjects }: {
  plants: { id: string; growthLevel: number; subjectId: string; plantType?: string }[];
  subjects: { id: string; name: string; accentColor: string }[];
}) {
  const tiles = useMemo(() => {
    const t = [];
    for (let row = 0; row < GRID_N; row++) {
      for (let col = 0; col < GRID_N; col++) {
        const cx = ORIG_X + (col - row) * TW / 2;
        const cy = ORIG_Y + (col + row) * TH / 2;
        const shade = (row + col) % 2 === 0;
        t.push({ row, col, cx, cy, shade });
      }
    }
    return t.sort((a, b) => (a.row + a.col) - (b.row + b.col));
  }, []);

  const plantMap = useMemo(() => {
    const m = new Map<string, typeof plants[number]>();
    plants.slice(0, GRID_N * GRID_N).forEach((p, i) => {
      m.set(`${Math.floor(i / GRID_N)}-${i % GRID_N}`, p);
    });
    return m;
  }, [plants]);

  return (
    <svg
      width="100%"
      viewBox={`0 0 ${SVG_W} ${SVG_H}`}
      style={{ display: "block", overflow: "visible" }}
    >
      <defs>
        <filter id="shadow" x="-25%" y="-25%" width="150%" height="150%">
          <feDropShadow dx="0" dy="4" stdDeviation="3.5" floodColor="#1a3a0e" floodOpacity="0.45" />
        </filter>
        <filter id="softShadow" x="-25%" y="-25%" width="150%" height="150%">
          <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#0d2208" floodOpacity="0.3" />
        </filter>
        {/* Grass texture pattern */}
        <pattern id="grassTex" x="0" y="0" width="12" height="12" patternUnits="userSpaceOnUse">
          <circle cx="3"  cy="4"  r="1"   fill="#000" opacity="0.04" />
          <circle cx="9"  cy="8"  r="0.8" fill="#000" opacity="0.04" />
          <circle cx="6"  cy="2"  r="0.7" fill="#fff" opacity="0.06" />
        </pattern>
      </defs>

      {/* ── Tile faces ── */}
      {tiles.map(({ row, col, cx, cy, shade }) => {
        // Grass shades
        const topFill  = shade ? "#79C94E" : "#6BBE43";
        const leftFill = row === GRID_N - 1 ? "#8B6543" : (shade ? "#4D9E2E" : "#438C27");
        const rightFill= col === GRID_N - 1 ? "#7A5438" : (shade ? "#3E8023" : "#35711D");

        return (
          <g key={`${row}-${col}`}>
            {/* Left depth face */}
            <polygon points={leftPts(cx, cy)} fill={leftFill} />
            {/* Right depth face */}
            <polygon points={rightPts(cx, cy)} fill={rightFill} />
            {/* Top grass face */}
            <polygon points={topPts(cx, cy)} fill={topFill} stroke="#3A8020" strokeWidth="0.5" />
            {/* Grass texture overlay */}
            <polygon points={topPts(cx, cy)} fill="url(#grassTex)" />
          </g>
        );
      })}

      {/* ── Outer earth border lines ── */}
      {/* Bottom-left edge line */}
      {Array.from({ length: GRID_N }, (_, i) => {
        const cx = ORIG_X + (0 - i) * TW / 2;
        const cy = ORIG_Y + (0 + i) * TH / 2;
        return (
          <line key={`bl${i}`}
            x1={cx - TW / 2} y1={cy + DEPTH}
            x2={cx} y2={cy + TH / 2 + DEPTH}
            stroke="#5A3E26" strokeWidth="0.8"
          />
        );
      })}

      {/* ── Plants layer ── */}
      {tiles.map(({ row, col, cx, cy }) => {
        const plant = plantMap.get(`${row}-${col}`);
        if (!plant) {
          // Subtle grass blades on empty tiles
          const seed = (row * 13 + col * 7) % 4;
          if (seed < 2) {
            return (
              <g key={`grass-${row}-${col}`}>
                <ellipse cx={cx - 4} cy={cy - TH / 2 + 3} rx="2.5" ry="1.2" fill="#4FA82E" opacity="0.4" />
                <ellipse cx={cx + 4} cy={cy - TH / 2 + 4} rx="2" ry="1"    fill="#4FA82E" opacity="0.4" />
              </g>
            );
          }
          return null;
        }

        // Scale by growth level: lvl1=0.55, lvl2=0.75, lvl3+=1.0
        const scale = plant.growthLevel >= 3 ? 1.0 : plant.growthLevel >= 2 ? 0.75 : 0.55;
        const SIZE  = 54 * scale;
        const imgSrc = PLANT_IMAGES[plant.plantType ?? "fern"] ?? PLANT_IMAGES["fern"];

        // Center the image on the tile top, anchored at the base
        const ix = cx - SIZE / 2;
        const iy = cy - TH / 2 - SIZE + 6;

        return (
          <image
            key={`plant-${row}-${col}`}
            href={imgSrc}
            x={ix}
            y={iy}
            width={SIZE}
            height={SIZE}
            style={{ filter: "drop-shadow(0px 4px 5px rgba(0,30,0,0.5))" }}
          />
        );
      })}
    </svg>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
const PET_UNLOCK_THRESHOLD = 5;

export default function Garden() {
  const { user, subjects, plants, stats, loading, refreshData } = useUser();
  const { toast } = useToast();
  const [viewMode, setViewMode]     = useState<ViewMode>("week");
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [sessions, setSessions]     = useState<Session[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [showAdd, setShowAdd]       = useState(false);
  const [newName, setNewName]       = useState("");
  const [newColor, setNewColor]     = useState(colorOptions[0]);
  const [adding, setAdding]         = useState(false);

  useEffect(() => {
    setLoadingSessions(true);
    fetchApi<Session[]>("/sessions?limit=500")
      .then(setSessions).catch(() => {}).finally(() => setLoadingSessions(false));
  }, []);

  const filteredSessions = useMemo(() => {
    const completed = sessions.filter((s) => s.state === "completed");
    const t = selectedDate;
    if (viewMode === "day")   return completed.filter((s) => new Date(s.startTime) >= startOfDay(t)  && new Date(s.startTime) <= endOfDay(t));
    if (viewMode === "week")  return completed.filter((s) => new Date(s.startTime) >= startOfWeek(t, { weekStartsOn: 0 }) && new Date(s.startTime) <= endOfWeek(t, { weekStartsOn: 0 }));
    if (viewMode === "month") return completed.filter((s) => new Date(s.startTime) >= startOfMonth(t) && new Date(s.startTime) <= endOfMonth(t));
    return completed.filter((s) => new Date(s.startTime).getFullYear() === t.getFullYear());
  }, [sessions, selectedDate, viewMode]);

  const totalMinutes = filteredSessions.reduce((sum, s) => sum + (s.durationMinutes || 0), 0);

  const chartData = useMemo(() => {
    if (viewMode === "day") {
      const data = Array.from({ length: 12 }, (_, i) => ({ label: `${i*2}:00`, minutes: 0 }));
      filteredSessions.forEach((s) => { data[Math.floor(new Date(s.startTime).getHours() / 2)].minutes += s.durationMinutes || 0; });
      return data;
    }
    if (viewMode === "week") {
      const data = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map((l) => ({ label: l, minutes: 0 }));
      filteredSessions.forEach((s) => { data[new Date(s.startTime).getDay()].minutes += s.durationMinutes || 0; });
      return data;
    }
    if (viewMode === "month") {
      const days = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0).getDate();
      const data = Array.from({ length: days }, (_, i) => ({ label: (i+1) % 5 === 1 ? `${i+1}` : "", minutes: 0 }));
      filteredSessions.forEach((s) => { const d = new Date(s.startTime).getDate() - 1; if (d >= 0 && d < data.length) data[d].minutes += s.durationMinutes || 0; });
      return data;
    }
    const data = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"].map((l) => ({ label: l, minutes: 0 }));
    filteredSessions.forEach((s) => { data[new Date(s.startTime).getMonth()].minutes += s.durationMinutes || 0; });
    return data;
  }, [filteredSessions, viewMode, selectedDate]);

  const fullyGrownCount = stats?.fullyGrownCount ?? 0;
  const petUnlocked     = stats?.petUnlocked ?? false;
  const petMoodKey      = stats?.petMood ?? "neutral";
  const petMood         = getPetMoodFromKey(petMoodKey);
  const selectedPetId   = user?.selectedPetId ?? "mochi";
  const activePet       = getPetById(selectedPetId);
  const plantsToUnlock  = Math.max(0, PET_UNLOCK_THRESHOLD - fullyGrownCount);

  const nav = (dir: -1 | 1) => {
    if (viewMode === "day")   setSelectedDate((d) => dir > 0 ? addDays(d,1)    : subDays(d,1));
    else if (viewMode==="week")  setSelectedDate((d) => dir > 0 ? addWeeks(d,1)  : subWeeks(d,1));
    else if (viewMode==="month") setSelectedDate((d) => dir > 0 ? addMonths(d,1) : subMonths(d,1));
    else setSelectedDate((d) => new Date(d.getFullYear() + dir, d.getMonth(), 1));
  };

  const dateLabel = useMemo(() => {
    if (viewMode === "day")   return format(selectedDate, "MMMM d, yyyy");
    if (viewMode === "week") {
      const s = startOfWeek(selectedDate, { weekStartsOn: 0 });
      const e = endOfWeek(selectedDate, { weekStartsOn: 0 });
      return `${format(s,"MMM d")} – ${format(e,"MMM d, yyyy")}`;
    }
    if (viewMode === "month") return format(selectedDate, "MMMM yyyy");
    return `${selectedDate.getFullYear()}`;
  }, [viewMode, selectedDate]);

  const handleAddSubject = async () => {
    if (!newName.trim()) return;
    setAdding(true);
    try {
      await fetchApi("/subjects", { method: "POST", body: JSON.stringify({ name: newName.trim(), accentColor: newColor }) });
      setNewName(""); setShowAdd(false);
      await refreshData();
      toast({ title: "Subject added!", description: `${newName} added to your garden.` });
    } catch {
      toast({ title: "Error", description: "Could not add subject", variant: "destructive" });
    } finally { setAdding(false); }
  };

  // Subject edit/delete
  const [editingSubjectId, setEditingSubjectId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editColor, setEditColor] = useState("");
  const [editSaving, setEditSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const startEdit = (plant: typeof plants[number]) => {
    const subject = subjects.find((s) => s.id === plant.subjectId);
    if (!subject) return;
    setEditingSubjectId(subject.id);
    setEditName(subject.name);
    setEditColor(subject.accentColor);
    setDeleteConfirm(null);
  };

  const handleSaveEdit = async (subjectId: string) => {
    if (!editName.trim()) return;
    setEditSaving(true);
    try {
      await fetchApi(`/subjects/${subjectId}`, {
        method: "PUT",
        body: JSON.stringify({ name: editName.trim(), accentColor: editColor }),
      });
      setEditingSubjectId(null);
      await refreshData();
      toast({ title: "Subject updated!" });
    } catch {
      toast({ title: "Error", description: "Could not update subject", variant: "destructive" });
    } finally { setEditSaving(false); }
  };

  const handleDeleteSubject = async (subjectId: string) => {
    try {
      await fetchApi(`/subjects/${subjectId}`, { method: "DELETE" });
      setEditingSubjectId(null);
      setDeleteConfirm(null);
      await refreshData();
      toast({ title: "Subject removed" });
    } catch {
      toast({ title: "Error", description: "Could not delete subject", variant: "destructive" });
    }
  };

  return (
    <MobileLayout>
      <div className="px-4 pt-6 pb-6 space-y-4">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-serif text-foreground flex items-center gap-2">
              <Leaf size={20} className="text-primary" /> My Garden
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              {plants.length} plant{plants.length !== 1 ? "s" : ""} growing
            </p>
          </div>
          <button
            onClick={() => setShowAdd(!showAdd)}
            className="w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center shadow-md hover:bg-[var(--color-primary-dark)] transition"
          >
            <Plus size={20} />
          </button>
        </div>

        {/* Add Subject */}
        {showAdd && (
          <div className="glass rounded-2xl p-4 space-y-3 border border-border">
            <p className="font-semibold text-foreground text-sm">New Subject</p>
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAddSubject()}
              placeholder="e.g. Mathematics, Physics..."
              className="w-full bg-white/60 dark:bg-white/10 border border-border rounded-xl px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
              maxLength={40}
            />
            <div className="flex gap-2 flex-wrap">
              {colorOptions.map((c) => (
                <button key={c} onClick={() => setNewColor(c)}
                  className="w-7 h-7 rounded-full border-2 transition-all"
                  style={{ backgroundColor: c, borderColor: newColor === c ? "#000" : "transparent" }}
                />
              ))}
            </div>
            <div className="flex gap-2">
              <button onClick={() => setShowAdd(false)} className="flex-1 py-2 rounded-xl border border-border text-sm text-muted-foreground">Cancel</button>
              <button onClick={handleAddSubject} disabled={adding || !newName.trim()}
                className="flex-1 py-2 rounded-xl bg-primary text-white text-sm font-medium disabled:opacity-50">
                {adding ? "Adding..." : "Plant it 🌱"}
              </button>
            </div>
          </div>
        )}

        {/* ── Isometric Garden ── */}
        <div className="relative rounded-3xl overflow-hidden"
          style={{ background: "linear-gradient(160deg,#1a3d10 0%,#0f2a08 100%)", minHeight: "270px" }}
        >
          {/* Stars/sky dots */}
          <div className="absolute inset-0 overflow-hidden opacity-30">
            {[...Array(18)].map((_, i) => (
              <div key={i} className="absolute w-0.5 h-0.5 rounded-full bg-white"
                style={{ left: `${(i * 37 + 11) % 100}%`, top: `${(i * 19 + 7) % 45}%`, opacity: 0.4 + (i % 3) * 0.2 }}
              />
            ))}
          </div>

          {loading ? (
            <div className="flex items-center justify-center" style={{ minHeight: "270px" }}>
              <div className="w-8 h-8 rounded-full border-2 border-white/30 border-t-white animate-spin" />
            </div>
          ) : plants.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3" style={{ minHeight: "270px" }}>
              <div className="text-5xl animate-bounce">🌱</div>
              <p className="text-white/80 text-sm font-semibold">Your garden is empty</p>
              <p className="text-white/50 text-xs">Add a subject &amp; complete a focus session</p>
              <button
                onClick={() => setShowAdd(true)}
                className="mt-1 flex items-center gap-1.5 bg-white/20 backdrop-blur-sm text-white text-xs font-semibold px-4 py-2 rounded-full hover:bg-white/30 transition-all"
              >
                <Plus size={13} /> Add a Subject
              </button>
            </div>
          ) : (
            <div className="px-2 pt-2 pb-1">
              <IsoGarden plants={plants} subjects={subjects} />
            </div>
          )}

          {/* Stats overlay */}
          <div className="absolute bottom-3 right-4 flex items-center gap-3">
            <div className="flex items-center gap-1.5 bg-black/30 backdrop-blur-sm rounded-full px-3 py-1">
              <span className="text-green-300 text-sm">🌿</span>
              <span className="text-white/90 text-sm font-bold">{plants.length}</span>
            </div>
            <div className="flex items-center gap-1.5 bg-black/30 backdrop-blur-sm rounded-full px-3 py-1">
              <span className="text-yellow-300 text-sm">⭐</span>
              <span className="text-white/90 text-sm font-bold">{stats?.fullyGrownCount ?? 0}</span>
            </div>
          </div>

          {/* Garden label */}
          <div className="absolute top-3 left-4">
            <span className="text-white/50 text-xs font-mono">GARDEN {new Date().getFullYear()}</span>
          </div>
        </div>

        {/* View Tabs */}
        <div className="flex gap-1 bg-muted rounded-xl p-1">
          {(["day","week","month","year"] as ViewMode[]).map((v) => (
            <button key={v} onClick={() => setViewMode(v)}
              className={`flex-1 py-1.5 rounded-lg text-sm font-medium transition-all ${viewMode===v ? "bg-white dark:bg-card shadow text-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >
              {v.charAt(0).toUpperCase() + v.slice(1)}
            </button>
          ))}
        </div>

        {/* Date Navigation */}
        <div className="flex items-center justify-between px-1">
          <button onClick={() => nav(-1)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-muted transition">
            <ChevronLeft size={18} className="text-muted-foreground" />
          </button>
          <button onClick={() => setSelectedDate(new Date())} className="flex items-center gap-1.5 text-sm font-medium text-foreground hover:text-primary transition">
            {dateLabel} <span className="text-xs text-primary">↺</span>
          </button>
          <button onClick={() => nav(1)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-muted transition">
            <ChevronRight size={18} className="text-muted-foreground" />
          </button>
        </div>

        {/* Study Pet Companion */}
        {petUnlocked ? (
          <div className="glass rounded-2xl p-4 border border-border">
            <div className="flex items-center gap-4">
              <div className="relative flex-shrink-0">
                {selectedPetId === "mochi" ? (
                  <img src={petHappy} alt="Study Pet" width={56} height={56} className="animate-float" />
                ) : (
                  <div className="w-14 h-14 flex items-center justify-center text-4xl animate-float">{activePet.emoji}</div>
                )}
                <span className="absolute -bottom-1 -right-1 text-base">{petMood.emoji}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-foreground text-sm">{activePet.name}</p>
                <p className="text-xs text-muted-foreground">{petMood.description}</p>
                <div className="mt-1.5 flex items-center gap-2">
                  <div className="flex-1 bg-muted rounded-full h-1.5">
                    <div className="h-full rounded-full transition-all duration-500"
                      style={{ width: petMood.key==="happy" ? "100%" : petMood.key==="neutral" ? "55%" : "20%", backgroundColor: activePet.accentColor }} />
                  </div>
                  <span className="text-[10px] text-muted-foreground whitespace-nowrap">{petMood.label}</span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="glass rounded-2xl p-4 border border-border">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                <Lock size={22} className="text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-foreground text-sm">Study Pet</p>
                <p className="text-xs text-muted-foreground mb-1.5">
                  Fully grow {plantsToUnlock} more plant{plantsToUnlock !== 1 ? "s" : ""} to unlock your companion
                </p>
                <div className="flex-1 bg-muted rounded-full h-1.5">
                  <div className="h-full rounded-full bg-primary transition-all duration-500"
                    style={{ width: `${Math.min(100,(fullyGrownCount/PET_UNLOCK_THRESHOLD)*100)}%` }} />
                </div>
                <p className="text-[10px] text-muted-foreground mt-0.5">{fullyGrownCount} / {PET_UNLOCK_THRESHOLD} fully grown</p>
              </div>
            </div>
          </div>
        )}

        {/* Focused Time Chart */}
        <div className="glass rounded-2xl p-4 space-y-3 border border-border">
          <div className="flex items-center justify-between">
            <p className="font-semibold text-foreground">Focused Time</p>
            <span className="text-sm font-semibold text-primary">{totalMinutes} min</span>
          </div>
          <div style={{ height: "130px" }}>
            {loadingSessions ? (
              <div className="h-full flex items-center justify-center">
                <div className="w-5 h-5 rounded-full border-2 border-primary border-t-transparent animate-spin" />
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} barSize={viewMode==="month" ? 5 : 14} margin={{ top:4, right:0, left:-20, bottom:0 }}>
                  <XAxis dataKey="label" tick={{ fontSize:9, fill:"var(--color-text-muted,#9CA3AF)" }} axisLine={false} tickLine={false} />
                  <ReferenceLine y={0} stroke="var(--color-border,#E5E7EB)" strokeDasharray="4 2"
                    label={{ value:"0 M", position:"left", fontSize:8, fill:"var(--color-text-muted,#9CA3AF)" }} />
                  <Tooltip formatter={(v: number) => [`${v} min`,"Focus"]}
                    contentStyle={{ borderRadius:"12px", border:"none", fontSize:"12px", backgroundColor:"white", boxShadow:"0 4px 20px rgba(0,0,0,0.1)" }}
                    cursor={{ fill:"rgba(45,106,79,0.08)" }} />
                  <Bar dataKey="minutes" fill="#52B788" radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Plants grid */}
        {plants.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-semibold text-foreground px-1">Your Plants</p>
            <div className="grid grid-cols-2 gap-3">
              {plants.map((plant) => {
                const subject = subjects.find((s) => s.id === plant.subjectId);
                const progress = Math.min(100, Math.round((plant.growthPoints / plant.maxGrowthPoints) * 100));
                const isEditing = editingSubjectId === plant.subjectId;
                return (
                  <div key={plant.id} className="glass rounded-2xl border border-border overflow-hidden relative">
                    {isEditing ? (
                      /* ── Inline Edit Panel ── */
                      <div className="p-3 space-y-2">
                        <p className="text-xs font-semibold text-foreground">Edit Subject</p>
                        <input
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="w-full text-sm bg-muted rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/30"
                          maxLength={40}
                        />
                        <div className="flex gap-1.5 flex-wrap">
                          {colorOptions.map((c) => (
                            <button key={c} onClick={() => setEditColor(c)}
                              className="w-5 h-5 rounded-full border-2 transition-all"
                              style={{ backgroundColor: c, borderColor: editColor === c ? "#fff" : "transparent" }}
                            />
                          ))}
                        </div>
                        {deleteConfirm === plant.subjectId ? (
                          <div className="space-y-1.5">
                            <p className="text-[10px] text-destructive font-medium">Delete this subject and its plant?</p>
                            <div className="flex gap-1.5">
                              <button onClick={() => setDeleteConfirm(null)}
                                className="flex-1 py-1.5 rounded-xl border border-border text-[11px] text-muted-foreground">Cancel</button>
                              <button onClick={() => plant.subjectId && handleDeleteSubject(plant.subjectId)}
                                className="flex-1 py-1.5 rounded-xl bg-destructive text-white text-[11px] font-semibold">Delete</button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex gap-1.5">
                            <button onClick={() => setDeleteConfirm(plant.subjectId ?? null)}
                              className="p-1.5 rounded-xl bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors">
                              <Trash2 size={13} />
                            </button>
                            <button onClick={() => setEditingSubjectId(null)}
                              className="flex-1 py-1.5 rounded-xl border border-border text-[11px] text-muted-foreground">
                              <X size={13} className="inline mr-1" />Cancel
                            </button>
                            <button onClick={() => plant.subjectId && handleSaveEdit(plant.subjectId)}
                              disabled={editSaving || !editName.trim()}
                              className="flex-1 py-1.5 rounded-xl bg-primary text-white text-[11px] font-semibold disabled:opacity-50">
                              <Check size={13} className="inline mr-1" />{editSaving ? "..." : "Save"}
                            </button>
                          </div>
                        )}
                      </div>
                    ) : (
                      /* ── Normal Plant Card ── */
                      <div className="p-3 flex items-center gap-3">
                        <div className="w-10 h-10 flex-shrink-0 relative">
                          <img
                            src={PLANT_IMAGES[(plant as any).plantType ?? "fern"] ?? PLANT_IMAGES["fern"]}
                            alt={(plant as any).plantType ?? "plant"}
                            className="w-full h-full object-contain drop-shadow-md"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-foreground truncate capitalize">
                            {subject?.name || "Unknown"}
                          </p>
                          <p className="text-[10px] text-muted-foreground capitalize">Lvl {plant.growthLevel} · {(plant as any).plantType ?? "fern"}</p>
                          <div className="mt-1 w-full bg-muted rounded-full h-1.5">
                            <div className="bg-primary h-full rounded-full transition-all"
                              style={{ width: `${progress}%` }} />
                          </div>
                          <p className="text-[9px] text-muted-foreground mt-0.5">{progress}%</p>
                        </div>
                        {subject && (
                          <button onClick={() => startEdit(plant)}
                            className="flex-shrink-0 w-7 h-7 rounded-full bg-muted hover:bg-muted/80 flex items-center justify-center transition-colors">
                            <Pencil size={12} className="text-muted-foreground" />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

      </div>
    </MobileLayout>
  );
}
