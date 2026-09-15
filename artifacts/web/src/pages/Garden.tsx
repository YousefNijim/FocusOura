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
import type { Plant } from "@/context/UserContext";
import { fetchApi, describeApiError } from "@/utils/api";
import { useToast } from "@/hooks/use-toast";
import { getPetById, getPetMoodFromKey } from "@/constants/pets";

import PlantArt, { stageForGrowth, toPlantType, MAX_PLANT_LEVEL } from "@/components/garden/PlantArt";
import type { PlantType } from "@/components/garden/PlantArt";
import { PLANT_CATALOG } from "@/constants/plants";

type ViewMode = "day" | "week" | "month" | "year";
type Session = {
  id: string; subjectId: string; subjectName: string; sessionType: string;
  state: string; startTime: string; endTime: string | null;
  durationMinutes: number; pointsEarned: number;
};

const colorOptions = [
  "#2D6A4F","#52B788","#74C69D","#B7E4C7","#95D5B2","#40916C","#1B4332","#E9C46A",
];

// ─── Potting Shelf ────────────────────────────────────────────────────────────
// The plants are drawn as a front elevation and every one of them sits in a
// pot, so they stand on shelves. The previous scene placed them on an
// isometric lawn, where a face-on pot floats above its tile instead of resting
// on it, and its colours were hard-coded so the ground stayed bright green in
// night mode while the plants went teal.
// Two, not three: the app shell is max-w-md, and a pot does not grow with its
// plant — at three across, a level-1 seedling rendered about six pixels tall
// inside a full-size pot and the slot read as empty.
const POTS_PER_SHELF = 2;

function PottingShelf({
  plants,
  subjects,
  onSelect,
  onAdd,
}: {
  plants: Plant[];
  subjects: { id: string; name: string; accentColor: string }[];
  onSelect: (plant: Plant) => void;
  onAdd: () => void;
}) {
  // One trailing slot invites the next subject, so a full shelf still shows
  // where the next plant would go.
  const slots: (Plant | null)[] = [...plants, null];
  const shelves: (Plant | null)[][] = [];
  for (let i = 0; i < slots.length; i += POTS_PER_SHELF) {
    shelves.push(slots.slice(i, i + POTS_PER_SHELF));
  }

  return (
    <div className="flex flex-col gap-5">
      {shelves.map((shelf, shelfIndex) => (
        <div key={shelfIndex}>
          <div className="grid grid-cols-2 gap-3 items-end px-1.5">
            {shelf.map((plant, i) =>
              plant ? (
                <button
                  key={plant.id}
                  onClick={() => onSelect(plant)}
                  className="group rounded-t-xl transition-transform duration-200 hover:-translate-y-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                  aria-label={`${subjects.find((s) => s.id === plant.subjectId)?.name ?? "General"} plant`}
                >
                  <PlantArt
                    type={toPlantType(plant.plantType)}
                    stage={plant.withered ? "withered" : stageForGrowth(plant.growthLevel)}
                    className="w-full h-auto max-h-[150px]"
                  />
                </button>
              ) : (
                <button
                  key={`add-${shelfIndex}-${i}`}
                  onClick={onAdd}
                  aria-label="Add a subject"
                  className="group/add flex items-end justify-center h-[150px] text-muted-foreground hover:text-primary transition-colors"
                >
                  {/* Sits on the plank like a real pot — its caption goes in the
                      row below, where every other caption lives. */}
                  <span className="w-[62px] h-[40px] rounded-t-[3px] rounded-b-xl border-[1.5px] border-dashed border-border group-hover/add:border-primary flex items-center justify-center text-xl leading-none">
                    +
                  </span>
                </button>
              ),
            )}
          </div>

          {/* the plank the pots stand on */}
          <div
            className="h-3 rounded-[3px]"
            style={{
              background: "linear-gradient(var(--shelf-top) 0 4px, var(--shelf-face) 4px 100%)",
              borderBottom: "3px solid var(--shelf-edge)",
              boxShadow: "0 5px 10px -4px var(--shelf-shadow)",
            }}
          />

          <div className="grid grid-cols-2 gap-3 px-1.5 mt-2.5">
            {shelf.map((plant, i) => {
              if (!plant) {
                return (
                  <p key={`gap-${shelfIndex}-${i}`} className="text-[11px] text-center text-muted-foreground">
                    Add subject
                  </p>
                );
              }
              const subject = subjects.find((s) => s.id === plant.subjectId);
              const pct = Math.min(
                100,
                Math.round((plant.growthPoints / Math.max(1, plant.maxGrowthPoints)) * 100),
              );
              // A plant at the final level is finished: it drops the progress bar
              // and counts blooms instead of pretending to still be growing.
              const grown = !plant.withered && plant.growthLevel >= MAX_PLANT_LEVEL;
              return (
                  <div key={`meta-${plant.id}`} className="text-center min-w-0">
                    <p className="text-[11px] font-medium truncate">{subject?.name ?? "General"}</p>
                    <p className="text-[9.5px] font-mono text-muted-foreground tabular-nums">
                      {plant.withered
                        ? "withered"
                        : grown
                          ? plant.blooms
                            ? `fully grown · ${plant.blooms} bloom${plant.blooms > 1 ? "s" : ""}`
                            : "fully grown"
                          : `Lv ${plant.growthLevel} · ${pct}%`}
                    </p>
                    {grown ? (
                      <div className="mt-1 text-[10px]" style={{ color: subject?.accentColor ?? "var(--accent)" }}>
                        ✿
                      </div>
                    ) : (
                      <div className="w-[70%] mx-auto h-[3px] rounded-sm bg-border overflow-hidden mt-1">
                        <div
                          className="h-full rounded-sm"
                          style={{
                            width: `${pct}%`,
                            background: plant.withered ? "var(--dead-mid)" : subject?.accentColor ?? "var(--accent)",
                          }}
                        />
                      </div>
                    )}
                  </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
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
    } catch (err) {
      toast({ ...describeApiError(err, "Could not add subject"), variant: "destructive" });
    } finally { setAdding(false); }
  };

  // Subject edit/delete
  const [editingSubjectId, setEditingSubjectId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editColor, setEditColor] = useState("");
  const [editPlantType, setEditPlantType] = useState<PlantType>("fern");
  const [editSaving, setEditSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const startEdit = (plant: typeof plants[number]) => {
    const subject = subjects.find((s) => s.id === plant.subjectId);
    if (!subject) return;
    setEditingSubjectId(subject.id);
    setEditName(subject.name);
    setEditColor(subject.accentColor);
    setEditPlantType(toPlantType(plant.plantType));
    setDeleteConfirm(null);
  };

  const handleSaveEdit = async (subjectId: string) => {
    if (!editName.trim()) return;
    setEditSaving(true);
    try {
      await fetchApi(`/subjects/${subjectId}`, {
        method: "PUT",
        body: JSON.stringify({ name: editName.trim(), accentColor: editColor, plantType: editPlantType }),
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
        <div
          className="rounded-3xl border border-border p-4 pb-3"
          style={{ background: "var(--garden-wall)" }}
        >
          <div className="flex items-baseline justify-between mb-3">
            <span className="text-[10px] font-mono tracking-widest uppercase text-muted-foreground">
              Garden {new Date().getFullYear()}
            </span>
            <span className="text-[11px] font-mono tabular-nums text-muted-foreground">
              {plants.length} planted · {stats?.fullyGrownCount ?? 0} grown
            </span>
          </div>

          {loading ? (
            <div className="flex items-center justify-center" style={{ minHeight: "200px" }}>
              <div className="w-8 h-8 rounded-full border-2 border-border border-t-primary animate-spin" />
            </div>
          ) : (
            <PottingShelf
              plants={plants}
              subjects={subjects}
              onSelect={startEdit}
              onAdd={() => setShowAdd(true)}
            />
          )}
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
                // The General plant has no subject, so its subjectId is null — and so
                // is the initial editing state. Comparing them directly made
                // `null === null` true, which opened the edit panel on every account
                // from first render, with the delete confirmation already armed.
                const isEditing = plant.subjectId != null && editingSubjectId === plant.subjectId;
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

                        {/* The species belongs to the subject, so it is editable here.
                            Swapping it re-skins the plant and keeps its level, points
                            and blooms — the history is the user's, not the drawing's. */}
                        <div>
                          <p className="text-[9px] uppercase tracking-wider text-muted-foreground mb-1">Species</p>
                          <div className="grid grid-cols-4 gap-1">
                            {PLANT_CATALOG.map((species) => (
                              <button
                                key={species.id}
                                onClick={() => setEditPlantType(species.id)}
                                aria-label={species.name}
                                aria-pressed={editPlantType === species.id}
                                className={`rounded-lg p-0.5 border transition-colors ${
                                  editPlantType === species.id
                                    ? "border-primary bg-primary/10"
                                    : "border-transparent hover:border-border"
                                }`}
                              >
                                <PlantArt type={species.id} stage={4} className="w-full h-auto" />
                              </button>
                            ))}
                          </div>
                        </div>
                        {plant.subjectId != null && deleteConfirm === plant.subjectId ? (
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
                          <PlantArt
                            type={toPlantType((plant as any).plantType)}
                            stage={(plant as any).withered ? "withered" : stageForGrowth(plant.growthLevel)}
                            className="w-full h-full drop-shadow-md"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-foreground truncate capitalize">
                            {subject?.name || "General"}
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
