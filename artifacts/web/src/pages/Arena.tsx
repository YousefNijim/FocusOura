import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { MobileLayout } from "@/components/MobileLayout";
import { fetchApi } from "@/utils/api";
import { useToast } from "@/hooks/use-toast";
import {
  Swords, Users, Search, UserPlus, Check, X, Link2, Trophy,
  Plus, Clock, Coins, Crown, Loader2, UserMinus,
  Share2, Copy, Flame, Target, Calendar, HandshakeIcon,
  ChevronDown, ChevronUp, ArrowLeft, Zap,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────
type FriendStatus = "pending" | "accepted" | "declined" | null;
type SearchUser = {
  id: string; displayName: string; userCode: number | null;
  friendshipStatus: FriendStatus; friendshipId: string | null;
};
type Friend = { id: string; displayName: string; userCode: number | null; friendshipId: string; since: string };
type FriendRequest = {
  id: string; status: string;
  from?: { id: string; displayName: string; userCode: number | null };
  to?: { id: string; displayName: string; userCode: number | null };
};
type Participant = {
  userId: string; focusMinutes: number; focusHours: number; rank: number;
  user: { displayName: string };
};
type Challenge = {
  id: string; title: string; challengeType: "competitive" | "cooperative";
  durationMinutes: number; targetHours: number; durationDays: number;
  stake: number; prizePool: number; status: string;
  participants: Participant[]; participantCount: number;
  isParticipant: boolean; isCreator: boolean;
  myFocusMinutes: number; myFocusHours: number; myProgress: number;
  cooperativeProgress: number; daysLeft: number;
  creator: { id: string; displayName: string };
  startTime?: string; endTime?: string; winnerId?: string;
};

// ─── Avatar ───────────────────────────────────────────────────────────────────
function Avatar({ name, size = "sm" }: { name: string; size?: "sm" | "md" | "lg" }) {
  const sz = size === "lg" ? "w-12 h-12 text-base" : size === "md" ? "w-10 h-10 text-sm" : "w-8 h-8 text-xs";
  const initials = (name ?? "?").split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
  const colors = ["bg-primary/20 text-primary", "bg-accent/20 text-accent", "bg-yellow-500/20 text-yellow-600"];
  const color = colors[(name ?? "?").charCodeAt(0) % 3];
  return (
    <div className={`${sz} ${color} rounded-full flex items-center justify-center font-semibold flex-shrink-0`}>
      {initials}
    </div>
  );
}

// ─── Progress Bar ─────────────────────────────────────────────────────────────
function ProgressBar({ value, color = "bg-primary" }: { value: number; color?: string }) {
  return (
    <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
      <div
        className={`h-full rounded-full transition-all duration-500 ${color}`}
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  );
}

// ─── Challenge Card ───────────────────────────────────────────────────────────
function ChallengeCard({ ch, onPress }: { ch: Challenge; onPress: () => void }) {
  const isComp = ch.challengeType === "competitive";
  const statusColors: Record<string, string> = {
    open: "bg-blue-500/15 text-blue-600",
    active: "bg-green-500/15 text-green-600",
    completed: "bg-muted text-muted-foreground",
  };
  const topPlayer = ch.participants[0];
  const statusLabel = ch.status === "open" ? "Open" : ch.status === "active" ? `${ch.daysLeft}d left` : "Ended";

  return (
    <button
      onClick={onPress}
      className="w-full text-left bg-card border border-border rounded-2xl p-4 flex flex-col gap-3 hover:border-primary/30 active:scale-[0.98] transition-all"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${isComp ? "bg-red-500/15 text-red-600" : "bg-emerald-500/15 text-emerald-600"}`}>
              {isComp ? "⚔️ Competitive" : "🤝 Cooperative"}
            </span>
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${statusColors[ch.status] ?? "bg-muted text-muted-foreground"}`}>
              {statusLabel}
            </span>
          </div>
          <p className="font-semibold text-sm truncate">{ch.title}</p>
        </div>
        {ch.prizePool > 0 && (
          <div className="flex items-center gap-1 bg-yellow-500/10 rounded-xl px-2.5 py-1 flex-shrink-0">
            <Coins className="w-3.5 h-3.5 text-yellow-500" />
            <span className="text-xs font-bold text-yellow-600">{ch.prizePool}</span>
          </div>
        )}
      </div>

      {/* Stats row */}
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-1">
          <Target className="w-3.5 h-3.5" />
          <span>{ch.targetHours}h target</span>
        </div>
        <div className="flex items-center gap-1">
          <Calendar className="w-3.5 h-3.5" />
          <span>{ch.durationDays}d duration</span>
        </div>
        <div className="flex items-center gap-1">
          <Users className="w-3.5 h-3.5" />
          <span>{ch.participantCount}</span>
        </div>
      </div>

      {/* Progress (active/completed only) */}
      {ch.status !== "open" && (
        <div className="space-y-1">
          {isComp ? (
            <>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">My progress</span>
                <span className="font-medium">{ch.myFocusHours}h / {ch.targetHours}h</span>
              </div>
              <ProgressBar value={ch.myProgress} color="bg-red-500" />
            </>
          ) : (
            <>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Group progress</span>
                <span className="font-medium">{ch.cooperativeProgress}%</span>
              </div>
              <ProgressBar value={ch.cooperativeProgress} color="bg-emerald-500" />
            </>
          )}
        </div>
      )}

      {/* Winner or top player */}
      {ch.status === "completed" && ch.winnerId && ch.winnerId !== "cooperative_success" && topPlayer && (
        <div className="flex items-center gap-2 text-xs text-yellow-600 font-medium">
          <Crown className="w-3.5 h-3.5" />
          <span>{topPlayer.user.displayName} won!</span>
        </div>
      )}
      {ch.status === "completed" && ch.winnerId === "cooperative_success" && (
        <div className="flex items-center gap-2 text-xs text-emerald-600 font-medium">
          <Trophy className="w-3.5 h-3.5" />
          <span>Team succeeded!</span>
        </div>
      )}
      {ch.status === "active" && isComp && topPlayer && ch.participantCount > 1 && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Crown className="w-3.5 h-3.5 text-yellow-500" />
          <span>Leading: {topPlayer.user.displayName} ({topPlayer.focusHours}h)</span>
        </div>
      )}
    </button>
  );
}

// ─── Challenge Detail Sheet ───────────────────────────────────────────────────
function ChallengeDetailSheet({ ch, onClose, onJoin, joining }: {
  ch: Challenge; onClose: () => void;
  onJoin: () => void; joining: boolean;
}) {
  const isComp = ch.challengeType === "competitive";
  const statusLabel = ch.status === "open" ? "Open — waiting for players" :
    ch.status === "active" ? `${ch.daysLeft} day${ch.daysLeft !== 1 ? "s" : ""} remaining` : "Ended";

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-background rounded-t-3xl shadow-2xl pb-28 overflow-hidden">
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
        </div>

        <div className="px-5 pb-4 overflow-y-auto max-h-[80vh]">
          {/* Header */}
          <div className="flex items-center gap-2 mb-4">
            <button onClick={onClose} className="p-1.5 rounded-xl bg-muted hover:bg-muted/80">
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="flex-1">
              <p className="font-bold text-base">{ch.title}</p>
              <p className="text-xs text-muted-foreground">{statusLabel}</p>
            </div>
          </div>

          {/* Type + info chips */}
          <div className="flex flex-wrap gap-2 mb-4">
            <span className={`text-xs font-semibold px-3 py-1 rounded-full ${isComp ? "bg-red-500/15 text-red-600" : "bg-emerald-500/15 text-emerald-600"}`}>
              {isComp ? "⚔️ Competitive" : "🤝 Cooperative"}
            </span>
            <span className="text-xs font-semibold px-3 py-1 rounded-full bg-muted text-muted-foreground">
              🎯 {ch.targetHours}h target
            </span>
            <span className="text-xs font-semibold px-3 py-1 rounded-full bg-muted text-muted-foreground">
              📅 {ch.durationDays} days
            </span>
            {ch.prizePool > 0 && (
              <span className="text-xs font-semibold px-3 py-1 rounded-full bg-yellow-500/15 text-yellow-600">
                🪙 {ch.prizePool} prize pool
              </span>
            )}
          </div>

          {/* Description */}
          <div className="bg-muted/50 rounded-2xl p-4 mb-4 text-sm text-muted-foreground">
            {isComp
              ? `All participants compete to study the most hours by the deadline. The person with the most hours wins the entire prize pool.`
              : `All participants work together. Everyone must reach the ${ch.targetHours}h target for the team to win.`
            }
          </div>

          {/* My progress (if participant) */}
          {ch.isParticipant && ch.status === "active" && (
            <div className="bg-card border border-border rounded-2xl p-4 mb-4">
              <p className="text-xs font-semibold text-muted-foreground mb-2">MY PROGRESS</p>
              <div className="flex items-end justify-between mb-2">
                <span className="text-2xl font-bold">{ch.myFocusHours}h</span>
                <span className="text-sm text-muted-foreground">/ {ch.targetHours}h</span>
              </div>
              <ProgressBar value={ch.myProgress} color={isComp ? "bg-red-500" : "bg-emerald-500"} />
              {!isComp && (
                <div className="mt-3 pt-3 border-t border-border">
                  <p className="text-xs font-semibold text-muted-foreground mb-2">GROUP PROGRESS</p>
                  <div className="flex items-end justify-between mb-2">
                    <span className="text-lg font-bold">{ch.cooperativeProgress}%</span>
                  </div>
                  <ProgressBar value={ch.cooperativeProgress} color="bg-emerald-500" />
                </div>
              )}
            </div>
          )}

          {/* Leaderboard / participants */}
          <div className="mb-4">
            <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">
              {isComp ? "Leaderboard" : "Participants"} ({ch.participantCount})
            </p>
            <div className="space-y-2">
              {ch.participants.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">No participants yet</p>
              )}
              {ch.participants.map((p, i) => (
                <div key={p.userId}
                  className={`flex items-center gap-3 p-3 rounded-xl ${i === 0 && ch.status !== "open" && isComp ? "bg-yellow-500/10 border border-yellow-500/20" : "bg-muted/50"}`}>
                  <div className="w-7 text-center">
                    {i === 0 && ch.status !== "open" && isComp
                      ? <Crown className="w-4 h-4 text-yellow-500 mx-auto" />
                      : <span className="text-sm font-bold text-muted-foreground">#{p.rank}</span>
                    }
                  </div>
                  <Avatar name={p.user.displayName} size="sm" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{p.user.displayName}</p>
                    {ch.status !== "open" && (
                      <>
                        <ProgressBar
                          value={(p.focusMinutes / ch.durationMinutes) * 100}
                          color={isComp ? (i === 0 ? "bg-yellow-500" : "bg-muted-foreground") : "bg-emerald-500"}
                        />
                      </>
                    )}
                  </div>
                  {ch.status !== "open" && (
                    <span className="text-xs font-bold flex-shrink-0">{p.focusHours}h</span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Join button */}
          {!ch.isParticipant && ch.status !== "completed" && (
            <button
              onClick={onJoin}
              disabled={joining}
              className="w-full py-3.5 rounded-2xl bg-primary text-primary-foreground font-semibold text-sm flex items-center justify-center gap-2 hover:bg-primary/90 active:scale-[0.98] transition-all disabled:opacity-60"
            >
              {joining ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
              {joining ? "Joining..." : ch.stake > 0 ? `Join for ${ch.stake} coins` : "Join Free"}
            </button>
          )}
          {ch.isParticipant && ch.status === "open" && (
            <div className="w-full py-3 rounded-2xl bg-muted text-muted-foreground font-semibold text-sm text-center">
              ✓ You joined — waiting for the challenge to start
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Create Challenge Sheet ───────────────────────────────────────────────────
function CreateChallengeSheet({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [title, setTitle] = useState("");
  const [challengeType, setChallengeType] = useState<"competitive" | "cooperative">("competitive");
  const [targetHours, setTargetHours] = useState(10);
  const [durationDays, setDurationDays] = useState(7);
  const [entryFee, setEntryFee] = useState(0);

  const createMutation = useMutation({
    mutationFn: () => fetchApi("/challenges", {
      method: "POST",
      body: JSON.stringify({ title, challengeType, targetHours, durationDays, entryFee }),
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["challenges"] });
      toast({ title: "Challenge created!", description: "Share it with friends to get them to join." });
      onCreated();
    },
    onError: (e: any) => toast({ title: "Error", description: e.message ?? "Could not create challenge", variant: "destructive" }),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-background rounded-t-3xl shadow-2xl pb-28 overflow-hidden">
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
        </div>
        <div className="px-5 pb-4 overflow-y-auto max-h-[85vh]">
          <div className="flex items-center gap-2 mb-5">
            <button onClick={onClose} className="p-1.5 rounded-xl bg-muted hover:bg-muted/80">
              <ArrowLeft className="w-4 h-4" />
            </button>
            <p className="font-bold text-base">Create Challenge</p>
          </div>

          {/* Title */}
          <div className="mb-4">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">Title</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Weekly Math Sprint"
              className="w-full px-4 py-3 rounded-xl bg-muted border border-border text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>

          {/* Type */}
          <div className="mb-4">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">Challenge Type</label>
            <div className="grid grid-cols-2 gap-2">
              {(["competitive", "cooperative"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setChallengeType(t)}
                  className={`py-3 px-3 rounded-xl border text-sm font-medium flex flex-col items-center gap-1 transition-all ${
                    challengeType === t
                      ? t === "competitive" ? "border-red-500 bg-red-500/10 text-red-600" : "border-emerald-500 bg-emerald-500/10 text-emerald-600"
                      : "border-border bg-muted text-muted-foreground hover:border-muted-foreground"
                  }`}
                >
                  <span className="text-xl">{t === "competitive" ? "⚔️" : "🤝"}</span>
                  <span>{t === "competitive" ? "Competitive" : "Cooperative"}</span>
                  <span className="text-[10px] opacity-70 text-center">
                    {t === "competitive" ? "Most hours wins" : "All must reach target"}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Target Hours */}
          <div className="mb-4">
            <div className="flex justify-between mb-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Target Hours</label>
              <span className="text-xs font-bold text-primary">{targetHours}h</span>
            </div>
            <input
              type="range" min={1} max={100} step={1} value={targetHours}
              onChange={(e) => setTargetHours(Number(e.target.value))}
              className="w-full accent-primary"
            />
            <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
              <span>1h</span><span>50h</span><span>100h</span>
            </div>
          </div>

          {/* Duration Days */}
          <div className="mb-4">
            <div className="flex justify-between mb-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Duration</label>
              <span className="text-xs font-bold text-primary">{durationDays} day{durationDays !== 1 ? "s" : ""}</span>
            </div>
            <input
              type="range" min={1} max={30} step={1} value={durationDays}
              onChange={(e) => setDurationDays(Number(e.target.value))}
              className="w-full accent-primary"
            />
            <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
              <span>1 day</span><span>2 weeks</span><span>30 days</span>
            </div>
          </div>

          {/* Entry Fee */}
          <div className="mb-6">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">Entry Fee (coins)</label>
            <div className="flex items-center gap-2">
              <Coins className="w-4 h-4 text-yellow-500 flex-shrink-0" />
              <input
                type="number" min={0} step={10} value={entryFee}
                onChange={(e) => setEntryFee(Math.max(0, Number(e.target.value)))}
                className="flex-1 px-4 py-3 rounded-xl bg-muted border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                placeholder="0 (free to join)"
              />
            </div>
            {entryFee > 0 && (
              <p className="text-xs text-muted-foreground mt-1.5">
                Each participant pays {entryFee} coins. Winner takes all.
              </p>
            )}
          </div>

          {/* Summary */}
          <div className="bg-muted/50 rounded-2xl p-4 mb-4 flex flex-col gap-1.5 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Type</span>
              <span className="font-medium">{challengeType === "competitive" ? "⚔️ Competitive" : "🤝 Cooperative"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Goal</span>
              <span className="font-medium">{targetHours} hours</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Duration</span>
              <span className="font-medium">{durationDays} days</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Entry fee</span>
              <span className="font-medium">{entryFee > 0 ? `${entryFee} coins` : "Free"}</span>
            </div>
          </div>

          <button
            onClick={() => createMutation.mutate()}
            disabled={!title.trim() || createMutation.isPending}
            className="w-full py-3.5 rounded-2xl bg-primary text-primary-foreground font-semibold text-sm flex items-center justify-center gap-2 hover:bg-primary/90 active:scale-[0.98] transition-all disabled:opacity-50"
          >
            {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            {createMutation.isPending ? "Creating..." : "Create Challenge"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Friends public profile ───────────────────────────────────────────────────
type FriendPublicProfile = {
  id: string; displayName: string; avatarUrl: string | null; userCode: number | null;
  memberSince: string | null; plantCount: number; totalStudyMinutes: number;
  completedSessions: number; currentStreak: number;
};

function FriendProfileModal({ userId, onClose }: { userId: string; onClose: () => void }) {
  const { data: profile, isLoading } = useQuery<FriendPublicProfile>({
    queryKey: ["friend-profile", userId],
    queryFn: () => fetchApi(`/users/profile/${userId}`),
  });
  const hrs = Math.floor((profile?.totalStudyMinutes ?? 0) / 60);
  const mins = (profile?.totalStudyMinutes ?? 0) % 60;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-background rounded-t-3xl shadow-2xl pb-28 overflow-hidden">
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
        </div>
        <div className="px-5 pb-4">
          {isLoading ? (
            <div className="flex justify-center py-10"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
          ) : profile ? (
            <>
              <div className="flex items-center gap-4 mb-5">
                <Avatar name={profile.displayName} size="lg" />
                <div>
                  <p className="font-bold text-lg">{profile.displayName}</p>
                  {profile.userCode != null && (
                    <p className="text-xs text-muted-foreground">#{String(profile.userCode).padStart(4, "0")}</p>
                  )}
                  {profile.memberSince && (
                    <p className="text-xs text-muted-foreground">Joined {new Date(profile.memberSince).toLocaleDateString()}</p>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "Study Time", value: hrs > 0 ? `${hrs}h ${mins}m` : `${mins}m`, icon: Clock },
                  { label: "Sessions", value: profile.completedSessions, icon: Flame },
                  { label: "Plants", value: profile.plantCount, icon: "🌿" },
                  { label: "Streak", value: `${profile.currentStreak} days`, icon: Zap },
                ].map(({ label, value, icon: Icon }) => (
                  <div key={label} className="bg-muted/50 rounded-2xl p-3">
                    <p className="text-xs text-muted-foreground mb-1">{label}</p>
                    <p className="font-bold text-sm">{String(value)}</p>
                  </div>
                ))}
              </div>
            </>
          ) : <p className="text-center text-muted-foreground py-10">Profile not found</p>}
        </div>
      </div>
    </div>
  );
}

// ─── Challenges Tab ───────────────────────────────────────────────────────────
function ChallengesTab() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [filter, setFilter] = useState<"all" | "open" | "active" | "completed">("all");
  const [selectedChallenge, setSelectedChallenge] = useState<Challenge | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  const { data: challenges = [], isLoading, isError, refetch } = useQuery<Challenge[]>({
    queryKey: ["challenges"],
    queryFn: () => fetchApi("/challenges"),
    refetchInterval: 30000,
    retry: 1,
  });

  const joinMutation = useMutation({
    mutationFn: (id: string) => fetchApi(`/challenges/${id}/join`, { method: "POST" }),
    onSuccess: (data: Challenge) => {
      qc.invalidateQueries({ queryKey: ["challenges"] });
      setSelectedChallenge(data);
      toast({ title: "Joined!", description: "You're in the challenge. Good luck!" });
    },
    onError: (e: any) => toast({ title: "Couldn't join", description: e.message ?? "Error", variant: "destructive" }),
  });

  const filtered = challenges.filter((c) => filter === "all" ? true : c.status === filter);

  const filterLabels: { key: typeof filter; label: string }[] = [
    { key: "all", label: "All" },
    { key: "open", label: "Open" },
    { key: "active", label: "Active" },
    { key: "completed", label: "Ended" },
  ];

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-muted-foreground">{challenges.length} challenge{challenges.length !== 1 ? "s" : ""}</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-1.5 bg-primary text-primary-foreground text-xs font-semibold px-3.5 py-2 rounded-xl hover:bg-primary/90 active:scale-[0.97] transition-all"
        >
          <Plus className="w-3.5 h-3.5" /> New Challenge
        </button>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {filterLabels.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={`flex-shrink-0 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              filter === key ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            {label}
            {key !== "all" && (
              <span className="ml-1 opacity-70">
                ({challenges.filter((c) => c.status === key).length})
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Challenge list */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : isError ? (
        <div className="flex flex-col items-center gap-3 py-12 text-center">
          <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center text-3xl">📡</div>
          <p className="font-semibold">Couldn't load challenges</p>
          <p className="text-sm text-muted-foreground">Check your connection and try again.</p>
          <button
            onClick={() => refetch()}
            className="mt-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold flex items-center gap-2"
          >
            <Loader2 className="w-4 h-4" /> Retry
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-12 text-center">
          <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center text-3xl">⚔️</div>
          <p className="font-semibold">No challenges here</p>
          <p className="text-sm text-muted-foreground">Create one and challenge your friends!</p>
          <button
            onClick={() => setShowCreate(true)}
            className="mt-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold"
          >
            Create Challenge
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map((ch) => (
            <ChallengeCard key={ch.id} ch={ch} onPress={() => setSelectedChallenge(ch)} />
          ))}
        </div>
      )}

      {/* Detail sheet */}
      {selectedChallenge && (
        <ChallengeDetailSheet
          ch={selectedChallenge}
          onClose={() => setSelectedChallenge(null)}
          onJoin={() => joinMutation.mutate(selectedChallenge.id)}
          joining={joinMutation.isPending}
        />
      )}

      {/* Create sheet */}
      {showCreate && (
        <CreateChallengeSheet
          onClose={() => setShowCreate(false)}
          onCreated={() => setShowCreate(false)}
        />
      )}
    </div>
  );
}

// ─── Friends Tab ──────────────────────────────────────────────────────────────
function FriendsTab() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchUser[]>([]);
  const [selectedFriendId, setSelectedFriendId] = useState<string | null>(null);
  const [codeCopied, setCodeCopied] = useState(false);
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const { data: friends = [], isError: friendsError, refetch: refetchFriends } = useQuery<Friend[]>({
    queryKey: ["friends"],
    queryFn: () => fetchApi("/friends"),
    retry: 1,
  });
  const { data: requestsData } = useQuery<{ incoming: FriendRequest[]; outgoing: FriendRequest[] }>({
    queryKey: ["friend-requests"],
    queryFn: () => fetchApi("/friends/requests"),
    retry: 1,
  });

  // Get the current user's code from localStorage cache
  const myUserCode = (() => {
    try {
      const cached = localStorage.getItem("focusoura_user_cache");
      if (cached) {
        const u = JSON.parse(cached);
        return u?.userCode != null ? String(u.userCode).padStart(4, "0") : null;
      }
    } catch {}
    return null;
  })();

  const handleCopyCode = () => {
    if (!myUserCode) return;
    navigator.clipboard.writeText(`#${myUserCode}`).then(() => {
      setCodeCopied(true);
      toast({ title: "Code copied!", description: `Share your code #${myUserCode} with friends.` });
      setTimeout(() => setCodeCopied(false), 2000);
    }).catch(() => toast({ title: "Couldn't copy", variant: "destructive" }));
  };

  const incomingRequests = requestsData?.incoming?.filter((r) => r.from && r.status === "pending") ?? [];

  const handleSearch = (q: string) => {
    setSearchQuery(q);
    clearTimeout(searchTimeout.current);
    if (!q.trim()) { setSearchResults([]); return; }
    searchTimeout.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetchApi(`/friends/search?q=${encodeURIComponent(q)}`);
        setSearchResults(Array.isArray(res) ? res : []);
      } catch { setSearchResults([]); }
      finally { setSearching(false); }
    }, 400);
  };

  const sendRequest = useMutation({
    mutationFn: (toId: string) => fetchApi("/friends/request", { method: "POST", body: JSON.stringify({ receiverId: toId }) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["friends"] }); toast({ title: "Request sent!" }); handleSearch(searchQuery); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
  const acceptRequest = useMutation({
    mutationFn: (id: string) => fetchApi(`/friends/${id}/accept`, { method: "PUT" }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["friends"] }); qc.invalidateQueries({ queryKey: ["friend-requests"] }); toast({ title: "Friend added!" }); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
  const declineRequest = useMutation({
    mutationFn: (id: string) => fetchApi(`/friends/${id}/decline`, { method: "PUT" }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["friend-requests"] }); },
  });
  const removeFriend = useMutation({
    mutationFn: (friendshipId: string) => fetchApi(`/friends/${friendshipId}`, { method: "DELETE" }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["friends"] }); toast({ title: "Removed" }); },
  });

  return (
    <div className="flex flex-col gap-4">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          value={searchQuery}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder="Search by name or #code"
          className="w-full pl-10 pr-4 py-3 rounded-2xl bg-muted border border-border text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
        />
        {searching && <Loader2 className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />}
      </div>

      {/* Search results */}
      {searchResults.length > 0 && (
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <p className="text-xs font-semibold text-muted-foreground px-4 pt-3 pb-1 uppercase tracking-wide">Search Results</p>
          {searchResults.map((u) => (
            <div key={u.id} className="flex items-center gap-3 px-4 py-3 border-t border-border first:border-0">
              <Avatar name={u.displayName} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{u.displayName}</p>
                {u.userCode != null && <p className="text-xs text-muted-foreground">#{String(u.userCode).padStart(4, "0")}</p>}
              </div>
              {u.friendshipStatus === "accepted" ? (
                <span className="text-xs text-green-600 font-medium">Friends</span>
              ) : u.friendshipStatus === "pending" ? (
                <span className="text-xs text-muted-foreground">Pending</span>
              ) : (
                <button
                  onClick={() => sendRequest.mutate(u.id)}
                  disabled={sendRequest.isPending}
                  className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  <UserPlus className="w-3.5 h-3.5" /> Add
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Incoming requests */}
      {incomingRequests.length > 0 && (
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <p className="text-xs font-semibold text-muted-foreground px-4 pt-3 pb-1 uppercase tracking-wide">
            Requests ({incomingRequests.length})
          </p>
          {incomingRequests.map((r) => (
            <div key={r.id} className="flex items-center gap-3 px-4 py-3 border-t border-border first:border-0">
              <Avatar name={r.from!.displayName} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{r.from!.displayName}</p>
                {r.from!.userCode != null && <p className="text-xs text-muted-foreground">#{String(r.from!.userCode).padStart(4, "0")}</p>}
              </div>
              <div className="flex gap-2">
                <button onClick={() => acceptRequest.mutate(r.id)} className="p-1.5 rounded-xl bg-green-500/15 text-green-600 hover:bg-green-500/25">
                  <Check className="w-4 h-4" />
                </button>
                <button onClick={() => declineRequest.mutate(r.id)} className="p-1.5 rounded-xl bg-red-500/15 text-red-600 hover:bg-red-500/25">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Friends list */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Friends ({friends.length})
          </p>
          {myUserCode && (
            <button
              onClick={handleCopyCode}
              className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-xl bg-muted text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-all"
            >
              {codeCopied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
              {codeCopied ? "Copied!" : `Share #${myUserCode}`}
            </button>
          )}
        </div>
        {friendsError ? (
          <div className="flex flex-col items-center gap-2 py-8 text-center">
            <p className="text-sm text-muted-foreground">Couldn't load friends. <button onClick={() => refetchFriends()} className="text-primary underline">Retry</button></p>
          </div>
        ) : friends.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-10 text-center">
            <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center text-2xl">👥</div>
            <p className="font-semibold text-sm">No friends yet</p>
            <p className="text-xs text-muted-foreground">Search by name or share your code above</p>
            {myUserCode && (
              <button
                onClick={handleCopyCode}
                className="flex items-center gap-2 px-4 py-2 rounded-xl border border-border text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <Share2 className="w-3.5 h-3.5" />
                Copy my friend code
              </button>
            )}
          </div>
        ) : (
          <div className="bg-card border border-border rounded-2xl overflow-hidden">
            {friends.map((f) => (
              <div key={f.id} className="flex items-center gap-3 px-4 py-3 border-t border-border first:border-0">
                <button onClick={() => setSelectedFriendId(f.id)} className="flex items-center gap-3 flex-1 min-w-0 text-left">
                  <Avatar name={f.displayName} />
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{f.displayName}</p>
                    {f.userCode != null && <p className="text-xs text-muted-foreground">#{String(f.userCode).padStart(4, "0")}</p>}
                  </div>
                </button>
                <button
                  onClick={() => removeFriend.mutate(f.friendshipId)}
                  className="p-1.5 rounded-xl bg-muted hover:bg-red-500/15 hover:text-red-600 text-muted-foreground transition-colors"
                >
                  <UserMinus className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {selectedFriendId && (
        <FriendProfileModal userId={selectedFriendId} onClose={() => setSelectedFriendId(null)} />
      )}
    </div>
  );
}

// ─── Arena Page ───────────────────────────────────────────────────────────────
export default function Arena() {
  const [tab, setTab] = useState<"challenges" | "friends">("challenges");

  return (
    <MobileLayout>
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="px-5 pt-5 pb-4">
          <h1 className="text-2xl font-bold tracking-tight">Arena</h1>
          <p className="text-sm text-muted-foreground">Compete or collaborate to study more</p>
        </div>

        {/* Tab bar */}
        <div className="px-5 pb-4">
          <div className="flex bg-muted rounded-2xl p-1">
            {[
              { key: "challenges", label: "Challenges", icon: Swords },
              { key: "friends", label: "Friends", icon: Users },
            ].map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setTab(key as typeof tab)}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                  tab === key ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className="w-4 h-4" />
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 pb-28">
          {tab === "challenges" ? <ChallengesTab /> : <FriendsTab />}
        </div>
      </div>
    </MobileLayout>
  );
}
