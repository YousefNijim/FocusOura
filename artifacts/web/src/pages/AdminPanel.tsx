import { useState, useEffect } from "react";
import { MobileLayout } from "@/components/MobileLayout";
import {
  Shield, Users, MessageSquare, ChevronLeft, Check, X, Trash2,
  RefreshCw, AlertTriangle, Crown,
} from "lucide-react";
import { fetchApi } from "@/utils/api";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";

interface AdminStats {
  totalUsers: number;
  totalSessions: number;
  totalMessages: number;
  pendingMessages: number;
}

interface AdminMessage {
  id: string;
  content: string;
  approved: boolean;
  isSeeded: boolean;
  createdAt: string;
}

interface AdminUser {
  id: string;
  displayName: string;
  email: string;
  role: string;
  userCode: number | null;
  coinBalance: number;
  sessionCount: number;
  createdAt: string;
}

type Tab = "messages" | "users" | "stats";

export default function AdminPanel() {
  const navigate = useNavigate();
  const { authUser } = useAuth();
  const { toast } = useToast();
  const [tab, setTab] = useState<Tab>("stats");
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [messages, setMessages] = useState<AdminMessage[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [msgFilter, setMsgFilter] = useState<"all" | "pending" | "approved">("all");

  // Guard: only admins can access
  useEffect(() => {
    if (authUser && authUser.role !== "admin") {
      navigate("/", { replace: true });
    }
  }, [authUser, navigate]);

  useEffect(() => {
    loadStats();
  }, []);

  useEffect(() => {
    if (tab === "messages") loadMessages();
    if (tab === "users") loadUsers();
  }, [tab, msgFilter]);

  const loadStats = async () => {
    try {
      const data = await fetchApi<AdminStats>("/admin/stats");
      setStats(data);
    } catch {
      toast({ title: "Error loading stats", variant: "destructive" });
    }
  };

  const loadMessages = async () => {
    setLoading(true);
    try {
      const url = msgFilter === "all" ? "/admin/messages" : `/admin/messages?status=${msgFilter}`;
      const data = await fetchApi<AdminMessage[]>(url);
      setMessages(data);
    } catch {
      toast({ title: "Error loading messages", variant: "destructive" });
    } finally { setLoading(false); }
  };

  const loadUsers = async () => {
    setLoading(true);
    try {
      const data = await fetchApi<AdminUser[]>("/admin/users");
      setUsers(data);
    } catch {
      toast({ title: "Error loading users", variant: "destructive" });
    } finally { setLoading(false); }
  };

  const handleApprove = async (id: string, approved: boolean) => {
    try {
      await fetchApi(`/admin/messages/${id}`, { method: "PATCH", body: JSON.stringify({ approved }) });
      setMessages((prev) => prev.map((m) => m.id === id ? { ...m, approved } : m));
      toast({ title: approved ? "Message approved" : "Message rejected" });
    } catch {
      toast({ title: "Error", variant: "destructive" });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await fetchApi(`/admin/messages/${id}`, { method: "DELETE" });
      setMessages((prev) => prev.filter((m) => m.id !== id));
      toast({ title: "Message deleted" });
    } catch {
      toast({ title: "Error", variant: "destructive" });
    }
  };

  const handleRoleChange = async (userId: string, role: string) => {
    try {
      await fetchApi(`/admin/users/${userId}/role`, { method: "PATCH", body: JSON.stringify({ role }) });
      setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, role } : u));
      toast({ title: `Role updated to ${role}` });
    } catch {
      toast({ title: "Error", variant: "destructive" });
    }
  };

  if (authUser?.role !== "admin") {
    return null;
  }

  const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: "stats",    label: "Stats",    icon: <Shield size={14} /> },
    { key: "messages", label: "Messages", icon: <MessageSquare size={14} /> },
    { key: "users",    label: "Users",    icon: <Users size={14} /> },
  ];

  return (
    <MobileLayout>
      <div className="px-5 pt-5 pb-28 space-y-4">
        {/* Header */}
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)}
            className="w-9 h-9 rounded-full bg-muted flex items-center justify-center hover:bg-muted/80 transition-colors">
            <ChevronLeft size={18} className="text-muted-foreground" />
          </button>
          <div>
            <h1 className="text-xl font-bold tracking-tight flex items-center gap-2">
              <Shield size={18} className="text-primary" /> Admin Panel
            </h1>
            <p className="text-xs text-muted-foreground">Moderation & management</p>
          </div>
        </div>

        {/* Tab bar */}
        <div className="flex bg-muted rounded-2xl p-1">
          {tabs.map(({ key, label, icon }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                tab === key ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {icon} {label}
            </button>
          ))}
        </div>

        {/* ── Stats Tab ── */}
        {tab === "stats" && (
          <div className="space-y-3">
            <button onClick={loadStats} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
              <RefreshCw size={12} /> Refresh
            </button>
            {stats ? (
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "Total Users",       value: stats.totalUsers,       icon: "👥" },
                  { label: "Total Sessions",     value: stats.totalSessions,    icon: "⏱️" },
                  { label: "Total Messages",     value: stats.totalMessages,    icon: "💬" },
                  { label: "Pending Messages",   value: stats.pendingMessages,  icon: "⚠️", warn: stats.pendingMessages > 0 },
                ].map(({ label, value, icon, warn }) => (
                  <div key={label} className={`glass rounded-2xl p-4 border ${warn ? "border-orange-500/30 bg-orange-500/5" : "border-border"}`}>
                    <p className="text-2xl mb-1">{icon}</p>
                    <p className="text-xl font-bold text-foreground">{value}</p>
                    <p className="text-[11px] text-muted-foreground">{label}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex justify-center py-8">
                <div className="w-6 h-6 rounded-full border-2 border-primary border-t-transparent animate-spin" />
              </div>
            )}
          </div>
        )}

        {/* ── Messages Tab ── */}
        {tab === "messages" && (
          <div className="space-y-3">
            <div className="flex gap-2">
              {(["all", "pending", "approved"] as const).map((f) => (
                <button key={f} onClick={() => setMsgFilter(f)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                    msgFilter === f ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                  }`}>
                  {f.charAt(0).toUpperCase() + f.slice(1)}
                </button>
              ))}
              <button onClick={loadMessages} className="ml-auto p-1.5 rounded-xl bg-muted hover:bg-muted/80 transition-colors">
                <RefreshCw size={13} className="text-muted-foreground" />
              </button>
            </div>
            {loading ? (
              <div className="flex justify-center py-8"><div className="w-6 h-6 rounded-full border-2 border-primary border-t-transparent animate-spin" /></div>
            ) : messages.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground text-sm">No messages</div>
            ) : (
              <div className="bg-card border border-border rounded-2xl overflow-hidden">
                {messages.map((m, i) => (
                  <div key={m.id} className={`p-4 space-y-2 ${i > 0 ? "border-t border-border" : ""}`}>
                    <p className="text-sm text-foreground leading-relaxed">{m.content}</p>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                          m.approved ? "bg-green-500/10 text-green-600" : "bg-orange-500/10 text-orange-600"
                        }`}>
                          {m.approved ? "Approved" : "Pending"}
                        </span>
                        {m.isSeeded && <span className="text-[10px] text-muted-foreground">System</span>}
                      </div>
                      <div className="flex gap-1.5">
                        {!m.approved && (
                          <button onClick={() => handleApprove(m.id, true)}
                            className="p-1.5 rounded-xl bg-green-500/10 text-green-600 hover:bg-green-500/20 transition-colors">
                            <Check size={13} />
                          </button>
                        )}
                        {m.approved && !m.isSeeded && (
                          <button onClick={() => handleApprove(m.id, false)}
                            className="p-1.5 rounded-xl bg-orange-500/10 text-orange-600 hover:bg-orange-500/20 transition-colors">
                            <X size={13} />
                          </button>
                        )}
                        {!m.isSeeded && (
                          <button onClick={() => handleDelete(m.id)}
                            className="p-1.5 rounded-xl bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors">
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Users Tab ── */}
        {tab === "users" && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">{users.length} users</p>
              <button onClick={loadUsers} className="p-1.5 rounded-xl bg-muted hover:bg-muted/80 transition-colors">
                <RefreshCw size={13} className="text-muted-foreground" />
              </button>
            </div>
            {loading ? (
              <div className="flex justify-center py-8"><div className="w-6 h-6 rounded-full border-2 border-primary border-t-transparent animate-spin" /></div>
            ) : (
              <div className="bg-card border border-border rounded-2xl overflow-hidden">
                {users.map((u, i) => (
                  <div key={u.id} className={`flex items-center gap-3 px-4 py-3.5 ${i > 0 ? "border-t border-border" : ""}`}>
                    <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 text-sm font-bold text-primary">
                      {u.displayName.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="text-sm font-medium text-foreground truncate">{u.displayName}</p>
                        {u.role === "admin" && <Crown size={11} className="text-yellow-500 flex-shrink-0" />}
                      </div>
                      <p className="text-[10px] text-muted-foreground truncate">{u.email}</p>
                      <p className="text-[10px] text-muted-foreground">{u.sessionCount} sessions · 🪙{u.coinBalance}</p>
                    </div>
                    <button
                      onClick={() => handleRoleChange(u.id, u.role === "admin" ? "student" : "admin")}
                      className={`text-[10px] px-2 py-1 rounded-lg font-semibold transition-colors ${
                        u.role === "admin"
                          ? "bg-yellow-500/10 text-yellow-600 hover:bg-yellow-500/20"
                          : "bg-muted text-muted-foreground hover:bg-primary/10 hover:text-primary"
                      }`}
                    >
                      {u.role === "admin" ? "Admin" : "Promote"}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </MobileLayout>
  );
}
