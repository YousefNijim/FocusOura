import { useState, useEffect } from "react";
import { MobileLayout } from "@/components/MobileLayout";
import { BarChart2, Clock, Flame, Leaf, Target, Trophy, TrendingUp, ChevronLeft, Sprout } from "lucide-react";
import { fetchApi } from "@/utils/api";
import { useNavigate } from "react-router-dom";

type DailyPoint = { date: string; minutes: number };
type SubjectPoint = { subjectId: string; name: string; color: string; minutes: number; count: number };
type TypePoint = { type: string; count: number; minutes: number };

type AnalyticsData = {
  totalFocusMinutes: number;
  totalSessions: number;
  completedSessions: number;
  currentStreak: number;
  longestStreak: number;
  todayMinutes: number;
  weekMinutes: number;
  avgDailyMinutes: number;
  bestDayMinutes: number;
  plantsGrown: number;
  dailyBreakdown: DailyPoint[];
  subjectBreakdown: SubjectPoint[];
  sessionTypeBreakdown: TypePoint[];
};

const SESSION_TYPE_LABELS: Record<string, { label: string; color: string }> = {
  routine:   { label: "Routine",    color: "bg-blue-400" },
  homework:  { label: "Homework",   color: "bg-amber-400" },
  deep_focus:{ label: "Deep Focus", color: "bg-primary" },
};

function fmtMinutes(m: number): string {
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  const rem = m % 60;
  return rem === 0 ? `${h}h` : `${h}h ${rem}m`;
}

function shortDay(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00");
  return d.toLocaleDateString("en", { weekday: "short" });
}

export default function Analytics() {
  const navigate = useNavigate();
  const [data, setData]       = useState<AnalyticsData | null>(null);
  const [loading, setLoading]   = useState(true);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    fetchApi<AnalyticsData>("/analytics")
      .then(setData)
      .catch(() => setHasError(true))
      .finally(() => setLoading(false));
  }, []);

  const maxDaily = data ? Math.max(1, ...data.dailyBreakdown.map((d) => d.minutes)) : 1;
  const maxSubject = data?.subjectBreakdown[0]?.minutes ?? 1;
  const totalTypeMinutes = data?.sessionTypeBreakdown.reduce((s, t) => s + t.minutes, 0) ?? 1;

  return (
    <MobileLayout>
      <div className="px-5 pt-6 pb-28 space-y-5">
        {/* Header */}
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-full glass flex items-center justify-center">
            <ChevronLeft size={18} className="text-foreground" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-foreground">Analytics</h1>
            <p className="text-xs text-muted-foreground">Your focus journey</p>
          </div>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="glass rounded-2xl h-24 animate-pulse" />
            ))}
          </div>
        ) : hasError ? (
          <div className="glass rounded-2xl p-8 text-center">
            <p className="text-muted-foreground text-sm">Failed to load analytics. Check your connection and try again.</p>
          </div>
        ) : !data ? (
          <div className="glass rounded-2xl p-8 text-center">
            <p className="text-muted-foreground text-sm">No data yet — start a session!</p>
          </div>
        ) : (
          <>
            {/* Hero: Total study time */}
            <div className="bg-primary rounded-2xl p-5 text-primary-foreground">
              <div className="flex items-center gap-2 mb-1">
                <Clock size={16} className="text-primary-foreground/70" />
                <span className="text-sm text-primary-foreground/70">Total Study Time</span>
              </div>
              <p className="text-4xl font-bold mb-3">{fmtMinutes(data.totalFocusMinutes)}</p>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <p className="text-xl font-bold">{data.completedSessions}</p>
                  <p className="text-xs text-primary-foreground/70">Sessions</p>
                </div>
                <div>
                  <p className="text-xl font-bold">{data.currentStreak}</p>
                  <p className="text-xs text-primary-foreground/70">Day Streak</p>
                </div>
                <div>
                  <p className="text-xl font-bold">{data.plantsGrown}</p>
                  <p className="text-xs text-primary-foreground/70">Plants</p>
                </div>
              </div>
            </div>

            {/* Quick stats */}
            <div className="grid grid-cols-2 gap-3">
              {[
                { icon: TrendingUp, label: "Avg Daily",    value: fmtMinutes(data.avgDailyMinutes), color: "text-blue-500"  },
                { icon: Trophy,     label: "Best Day",     value: fmtMinutes(data.bestDayMinutes),  color: "text-amber-500" },
                { icon: Flame,      label: "Best Streak",  value: `${data.longestStreak}d`,          color: "text-red-500"   },
                { icon: Target,     label: "This Week",    value: fmtMinutes(data.weekMinutes),      color: "text-primary"   },
              ].map(({ icon: Icon, label, value, color }) => (
                <div key={label} className="glass rounded-2xl p-4">
                  <Icon size={18} className={`${color} mb-2`} />
                  <p className="text-lg font-bold text-foreground">{value}</p>
                  <p className="text-xs text-muted-foreground">{label}</p>
                </div>
              ))}
            </div>

            {/* 7-day bar chart */}
            <div className="glass rounded-2xl p-4 space-y-3">
              <div className="flex items-center gap-2">
                <BarChart2 size={16} className="text-primary" />
                <span className="text-sm font-semibold text-foreground">Last 7 Days</span>
              </div>
              <div className="flex items-end gap-2 h-28">
                {data.dailyBreakdown.map((d) => {
                  const pct = Math.max(4, (d.minutes / maxDaily) * 100);
                  return (
                    <div key={d.date} className="flex-1 flex flex-col items-center gap-1">
                      <div className="w-full flex flex-col justify-end" style={{ height: "88px" }}>
                        <div
                          className="w-full rounded-t-md bg-primary/80 transition-all duration-500 relative group"
                          style={{ height: `${pct}%` }}
                        >
                          {d.minutes > 0 && (
                            <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-[9px] text-muted-foreground whitespace-nowrap">
                              {fmtMinutes(d.minutes)}
                            </span>
                          )}
                        </div>
                      </div>
                      <span className="text-[10px] text-muted-foreground">{shortDay(d.date)}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Subject breakdown */}
            {data.subjectBreakdown.length > 0 && (
              <div className="glass rounded-2xl p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <Leaf size={16} className="text-primary" />
                  <span className="text-sm font-semibold text-foreground">By Subject</span>
                </div>
                <div className="space-y-2.5">
                  {data.subjectBreakdown.map((s) => (
                    <div key={s.subjectId} className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-foreground font-medium">{s.name}</span>
                        <span className="text-xs text-muted-foreground">{fmtMinutes(s.minutes)}</span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2">
                        <div
                          className="h-2 rounded-full transition-all duration-700"
                          style={{
                            width: `${Math.max(4, (s.minutes / maxSubject) * 100)}%`,
                            backgroundColor: s.color,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Session type breakdown */}
            {data.sessionTypeBreakdown.length > 0 && (
              <div className="glass rounded-2xl p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <Target size={16} className="text-primary" />
                  <span className="text-sm font-semibold text-foreground">Session Types</span>
                </div>
                {/* Stacked bar */}
                <div className="flex h-3 rounded-full overflow-hidden gap-0.5">
                  {data.sessionTypeBreakdown.map((t) => {
                    const pct = (t.minutes / totalTypeMinutes) * 100;
                    const meta = SESSION_TYPE_LABELS[t.type] ?? { label: t.type, color: "bg-muted-foreground" };
                    return (
                      <div
                        key={t.type}
                        className={`${meta.color} rounded-full`}
                        style={{ width: `${pct}%` }}
                      />
                    );
                  })}
                </div>
                <div className="space-y-2">
                  {data.sessionTypeBreakdown.map((t) => {
                    const meta = SESSION_TYPE_LABELS[t.type] ?? { label: t.type, color: "bg-muted-foreground" };
                    return (
                      <div key={t.type} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className={`w-2.5 h-2.5 rounded-full ${meta.color}`} />
                          <span className="text-sm text-foreground">{meta.label}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-sm font-medium text-foreground">{fmtMinutes(t.minutes)}</span>
                          <span className="text-xs text-muted-foreground ml-1.5">({t.count} sessions)</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Empty state if no sessions */}
            {data.completedSessions === 0 && (
              <div className="glass rounded-2xl p-8 text-center space-y-4">
                <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                  <Sprout size={36} className="text-primary" />
                </div>
                <div className="space-y-1">
                  <p className="font-bold text-foreground text-lg">Your journey starts here</p>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Complete your first focus session to see your analytics and start growing your garden.
                  </p>
                </div>
                <button
                  onClick={() => navigate("/focus")}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 active:scale-95 transition-all"
                >
                  <Sprout size={16} />
                  Start Your First Session
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </MobileLayout>
  );
}
